#!/usr/bin/env python3
"""Validate UI handoff fixtures/display models ONLY, never a game or browser test."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CHECKS = 0


def require(condition, message):
    global CHECKS
    CHECKS += 1
    if not condition:
        raise AssertionError(message)


def unique(items):
    return len(items) == len(set(items))


def comma_valid(order, commas):
    return (len(commas) <= 3 and unique(commas) and all(x in order[:-1] for x in commas))


def ranges_valid(ranges, max_ranges=3):
    if not isinstance(ranges, list) or (max_ranges is not None and len(ranges) > max_ranges):
        return False
    previous_end = 0
    for r in ranges:
        if not isinstance(r, dict) or set(r) != {'start', 'endExclusive'}:
            return False
        a, b = r['start'], r['endExclusive']
        if type(a) is not int or type(b) is not int or not (0 <= a < b <= 14) or a < previous_end:
            return False
        previous_end = b
    return True


def integer(value, minimum=0):
    return type(value) is int and value >= minimum


def identifier(value):
    return isinstance(value, str) and bool(value)


def record(value, fields, label):
    require(isinstance(value, dict) and set(value) == set(fields.split()), label + ': exact nested fields')


def check_tile(tile, label):
    record(tile, 'tileId char', label)
    require(identifier(tile['tileId']) and isinstance(tile['char'], str) and len(tile['char']) == 1,
            label + ': physical ID / single character')


def check_source(source, label):
    require(isinstance(source, dict) and source.get('kind') in {'SELF', 'DISCARD'}, label + ': source kind')
    fields = 'kind playerId' + (' discardId responseWindowId borrowedTileId' if source['kind'] == 'DISCARD' else '')
    record(source, fields, label)
    require(all(identifier(v) for k, v in source.items() if k != 'kind'), label + ': source IDs')


def check_draft(draft, label, sentence=False):
    record(draft, 'orderedTileIds commaAfterTileIds', label)
    order, commas = draft['orderedTileIds'], draft['commaAfterTileIds']
    require(isinstance(order, list) and all(identifier(x) for x in order) and unique(order), label + ': ordered IDs')
    require(not sentence or len(order) == 14, label + ': fourteen sentence IDs')
    require(isinstance(commas, list) and all(identifier(x) for x in commas) and comma_valid(order, commas),
            label + ': comma anchors')


def check_public_sentence(value, label):
    record(value, 'sentence tiles', label)
    check_draft(value['sentence'], label + '.sentence', sentence=True)
    require(isinstance(value['tiles'], list), label + ': visible tile array')
    for i, tile in enumerate(value['tiles']):
        check_tile(tile, f'{label}.tiles[{i}]')
    ids = [tile['tileId'] for tile in value['tiles']]
    require(unique(ids) and set(ids) == set(value['sentence']['orderedTileIds']), label + ': sentence tile map')


def check_vote_counts(value, label, settled=False):
    require(integer(value['reviewerCount'], 1) and integer(value['threshold'], 1), label + ': review counts')
    require(value['threshold'] == value['reviewerCount'] // 2 + 1, label + ': frozen majority')
    if settled:
        require(all(integer(value[k]) for k in ['approveCount', 'rejectCount', 'abstainCount']), label + ': settled counts')
        require(sum(value[k] for k in ['approveCount', 'rejectCount', 'abstainCount']) == value['reviewerCount'],
                label + ': settled denominator')
        require(type(value['passed']) is bool and value['passed'] == (value['approveCount'] >= value['threshold']),
                label + ': settled result')
        # Each ballot has at most three ranges; their anonymous union can have more.
        require(ranges_valid(value['mergedObjectionRanges'], max_ranges=None), label + ': anonymous union ranges')
    else:
        require(integer(value['submittedBallotCount']) and value['submittedBallotCount'] <= value['reviewerCount'],
                label + ': anonymous submitted count')


def check_public_schema(p, label):
    """Exact DTO field allowlists; a blacklist alone cannot prove fixture privacy."""
    require(integer(p['capacity'], 2) and p['capacity'] <= 6, label + ': capacity')
    require(all(identifier(p[k]) for k in ['roomId', 'hostId']) and
            (p['roundId'] is None or identifier(p['roundId'])), label + ': room IDs')
    require(integer(p['stateVersion']) and integer(p['wallRemaining']), label + ': room versions/counts')
    require(p['rulesVersion'] == '1.0.0' and p['deckVersion'] == 'daily-v1' and type(p['closeAfterRound']) is bool,
            label + ': room configuration')
    require(p['dealerSeat'] is None or (integer(p['dealerSeat']) and p['dealerSeat'] < p['capacity']), label + ': dealer seat')
    require(isinstance(p['players'], list), label + ': player array')
    for i, player in enumerate(p['players']):
        at = f'{label}.players[{i}]'
        record(player, 'playerId seat nickname presence connected ready handCount eatCount wins graceEndsAt', at)
        require(identifier(player['playerId']) and isinstance(player['nickname'], str), at + ': player identity')
        require(integer(player['seat']) and player['seat'] < p['capacity'], at + ': seat')
        require(player['presence'] in {'HUMAN', 'DISCONNECTED_GRACE', 'BOT'} and
                type(player['connected']) is bool and type(player['ready']) is bool, at + ': presence')
        require(all(integer(player[k]) for k in ['handCount', 'eatCount', 'wins']), at + ': player counts')
        require(player['graceEndsAt'] is None or integer(player['graceEndsAt']), at + ': grace deadline')

    phase = p['phase']
    extras = {'LOBBY': '', 'ROOM_CLOSED': '', 'TURN_ACTION': 'actorId mustDiscard isEatTurn',
              'DISCARD_RESPONSE': 'responseWindowId discardId discarderId submittedResponseCount',
              'HU_COMPOSE': 'applicantId source', 'HU_VOTE': 'proposal',
              'ROUND_FINISHED': 'reason winnerId'}
    require(isinstance(phase, dict) and phase.get('kind') in extras, label + ': phase kind')
    record(phase, 'kind phaseId deadline ' + extras[phase['kind']], label + '.phase')
    require(identifier(phase['phaseId']), label + ': phase ID')
    if phase['deadline'] is not None:
        record(phase['deadline'], 'endsAt remainingMsWhenPaused', label + '.phase.deadline')
        require(integer(phase['deadline']['endsAt']) and
                (phase['deadline']['remainingMsWhenPaused'] is None or integer(phase['deadline']['remainingMsWhenPaused'])),
                label + ': phase deadline')
    if phase['kind'] == 'TURN_ACTION':
        require(identifier(phase['actorId']) and type(phase['mustDiscard']) is bool and type(phase['isEatTurn']) is bool,
                label + ': turn fields')
    elif phase['kind'] == 'DISCARD_RESPONSE':
        require(all(identifier(phase[k]) for k in ['responseWindowId', 'discardId', 'discarderId']) and
                integer(phase['submittedResponseCount']), label + ': response fields')
    elif phase['kind'] == 'HU_COMPOSE':
        require(identifier(phase['applicantId']), label + ': applicant')
        check_source(phase['source'], label + '.phase.source')
    elif phase['kind'] == 'HU_VOTE':
        proposal = phase['proposal']
        record(proposal, 'proposalId applicantId source snapshot reviewerCount threshold submittedBallotCount', label + '.proposal')
        require(identifier(proposal['proposalId']) and identifier(proposal['applicantId']), label + ': proposal IDs')
        check_source(proposal['source'], label + '.proposal.source')
        check_public_sentence(proposal['snapshot'], label + '.proposal.snapshot')
        check_vote_counts(proposal, label + '.proposal')
        require(proposal['reviewerCount'] < p['capacity'], label + ': reviewers exclude applicant')
    elif phase['kind'] == 'ROUND_FINISHED':
        require(phase['reason'] in {'WIN', 'DRAW', 'EXPIRED', 'TERMINATED'} and
                (phase['winnerId'] is None or identifier(phase['winnerId'])), label + ': final result')

    suspension = p['suspension']
    suspension_extras = {'RUNNING': '', 'PAUSED_CLAIMANT_GRACE': 'applicantId endsAt',
                         'PAUSED_ALL_OFFLINE': 'expiresAt', 'PAUSED_RECOVERY': 'expiresAt'}
    require(isinstance(suspension, dict) and suspension.get('kind') in suspension_extras, label + ': suspension kind')
    record(suspension, 'kind ' + suspension_extras[suspension['kind']], label + '.suspension')
    for key in ['endsAt', 'expiresAt']:
        if key in suspension:
            require(integer(suspension[key]), label + ': suspension deadline')
    if 'applicantId' in suspension:
        require(identifier(suspension['applicantId']), label + ': suspension applicant')

    require(isinstance(p['discards'], list) and isinstance(p['history'], list), label + ': public arrays')
    for i, discard in enumerate(p['discards']):
        at = f'{label}.discards[{i}]'
        record(discard, 'discardId playerId tile status', at)
        require(identifier(discard['discardId']) and identifier(discard['playerId']) and
                discard['status'] in {'AVAILABLE', 'RESERVED', 'CLAIMED'}, at + ': discard fields')
        check_tile(discard['tile'], at + '.tile')
    for i, entry in enumerate(p['history']):
        at = f'{label}.history[{i}]'
        record(entry, 'proposalId applicantId source snapshot outcome result', at)
        require(identifier(entry['proposalId']) and identifier(entry['applicantId']) and
                entry['outcome'] in {'APPROVED', 'REJECTED', 'WITHDRAWN'}, at + ': history fields')
        check_source(entry['source'], at + '.source')
        check_public_sentence(entry['snapshot'], at + '.snapshot')
        if entry['result'] is not None:
            record(entry['result'], 'reviewerCount threshold approveCount rejectCount abstainCount passed mergedObjectionRanges', at + '.result')
            check_vote_counts(entry['result'], at + '.result', settled=True)


def check_no_secrets(value, path='public'):
    forbidden = {'wallOrder', 'wallCursor', 'rngState', 'credentialHash', 'recoveryCode',
                 'sessionToken', 'activeSessionId', 'ballotsByReviewer', 'reviewerIds',
                 'hand', 'draft', 'candidateDraft', 'handTileIds'}
    if isinstance(value, dict):
        require(not (set(value) & forbidden), f'{path}: forbidden hidden-data field')
        for key, v in value.items():
            check_no_secrets(v, f'{path}.{key}')
    elif isinstance(value, list):
        for i, v in enumerate(value):
            check_no_secrets(v, f'{path}[{i}]')


def validate(data):
    global CHECKS
    CHECKS = 0
    DATA = data
    require(DATA['schemaVersion'] == 1, 'schemaVersion')
    require(DATA['upstreamCommit'] == '6830301df3061cdd25350cf56807473e5505b311', 'upstream pin')
    expected_top = {'schemaVersion', 'purpose', 'upstreamCommit', 'seatCases', 'visibleTiles',
                    'draftCases', 'mobileLayoutCases', 'objectionCases', 'animationCases',
                    'projectionCases', 'renderModeCases', 'tilePoolBudgets', 'notRun'}
    require(set(DATA) == expected_top, 'fixture top-level schema')
    case_ids = [c['id'] for group in ['seatCases', 'draftCases', 'mobileLayoutCases',
        'objectionCases', 'animationCases', 'projectionCases', 'renderModeCases'] for c in DATA[group]]
    require(unique(case_ids), 'unique case IDs')

    # All rotations, not only viewer=0 or the final seat.
    expected_pairs = {(n, me) for n in range(2, 7) for me in range(n)}
    require({(c['count'], c['mySeat']) for c in DATA['seatCases']} == expected_pairs, 'all 20 seat rotations')
    require(len(DATA['seatCases']) == 20, 'seat case count')
    for c in DATA['seatCases']:
        n, me = c['count'], c['mySeat']
        rel = [(s - me + n) % n for s in range(n)]
        relations = [('SELF' if r == 0 else 'NEXT_AND_PREVIOUS' if n == 2 else
                      'NEXT' if r == 1 else 'PREVIOUS' if r == n - 1 else 'OTHER') for r in rel]
        require(c['expectedRelativeByLogicalSeat'] == rel, c['id'] + ': relative rotation')
        require(c['expectedRelationsByLogicalSeat'] == relations, c['id'] + ': relation')
        require(c['expectedNextSeat'] == (me + 1) % n, c['id'] + ': next')
        require(c['expectedPreviousSeat'] == (me - 1 + n) % n, c['id'] + ': previous')

    # Same character never implies same physical identity.
    tiles = DATA['visibleTiles']
    tile_ids = [t['tileId'] for t in tiles]
    require(len(tiles) == 14 and unique(tile_ids), '14 unique physical IDs')
    require(all(set(t) == {'tileId', 'char'} and len(t['char']) == 1 for t in tiles), 'tile schema')
    require(tiles[0]['char'] == tiles[-1]['char'] and tiles[0]['tileId'] != tiles[-1]['tileId'], 'duplicate character fixture')
    for c in DATA['draftCases']:
        hand = c['handTileIds']
        require(unique(hand), c['id'] + ': hand IDs unique')
        order = []
        for tile_id in c['orderedTileIds'] + hand:
            if tile_id in hand and tile_id not in order:
                order.append(tile_id)
        commas = []
        for anchor in c['commaAfterTileIds']:
            if anchor in hand and anchor != order[-1] and anchor not in commas:
                commas.append(anchor)
        require(order == c['expectedOrderedTileIds'], c['id'] + ': order reconcile model')
        require(commas == c['expectedCommaAfterTileIds'], c['id'] + ': anchor model')
        require(comma_valid(order, commas), c['id'] + ': legal commas')

    require({(c['viewportWidth'], c['tileCount']) for c in DATA['mobileLayoutCases']} ==
            {(w, n) for w in [390, 430] for n in [13, 14]}, 'all mobile widths/hand sizes')
    for c in DATA['mobileLayoutCases']:
        width = 2 * c['padding'] + 7 * c['tileWidth'] + 6 * c['gap'] + c['commaOverlayAddsWidth']
        require(width <= c['viewportWidth'], c['id'] + ': horizontal budget')
        require(c['columns'] == 7 and c['commaOverlayAddsWidth'] == 0, c['id'] + ': overlay is width-neutral')
        require(c['minimumAlternativeTarget'] >= 44 and c['tileWidth'] >= 44, c['id'] + ': touch target budget')
        require(c['expectedRowCounts'] == [7, c['tileCount'] - 7], c['id'] + ': two rows')
        require(len(c['cells']) == c['tileCount'], c['id'] + ': every tile has a cell')
        require(unique([x['tileId'] for x in c['cells']]), c['id'] + ': no duplicate tile cell')
        for i, cell in enumerate(c['cells']):
            require((cell['row'], cell['column']) == (i // 7, i % 7), c['id'] + ': cell index')
        require('t06' in c['commaAfterTileIds'], c['id'] + ': cross-row left anchor present')
        require(comma_valid([x['tileId'] for x in c['cells']], c['commaAfterTileIds']), c['id'] + ': comma anchors')

    for c in DATA['objectionCases']:
        require(c['characterCount'] == 14, c['id'] + ': frozen character count')
        require(ranges_valid(c['ranges']) == c['expectedValid'], c['id'] + ': half-open range model')
    for c in DATA['animationCases']:
        require(set(c['captured']) == {'roomId', 'roundId', 'phaseId', 'publicRevision', 'controlEpoch',
            'draftVersion', 'candidateDraftVersion', 'renderRevision'}, c['id'] + ': complete stamp schema')
        require((c['captured'] == c['current']) == c['expectedMayCompleteCosmeticCleanup'], c['id'] + ': stamp equality model')

    public_keys = {'visibility', 'roomId', 'roundId', 'stateVersion', 'rulesVersion', 'deckVersion', 'capacity',
                   'closeAfterRound', 'hostId', 'dealerSeat', 'players', 'wallRemaining', 'phase', 'suspension', 'discards', 'history'}
    private_keys = {'visibility', 'playerId', 'controlEpoch', 'seat', 'basedOnStateVersion', 'hand', 'draft',
                    'draftVersion', 'candidateDraft', 'forbiddenImmediateDiscardTileId', 'ownResponse', 'ownBallot', 'isFrozenReviewer'}
    for c in DATA['projectionCases']:
        p, s, want = c['public'], c['self'], c['expected']
        require(set(p) == public_keys and p['visibility'] == 'PUBLIC', c['id'] + ': public schema')
        require(set(s) == private_keys and s['visibility'] == 'PRIVATE_PLAYER', c['id'] + ': private schema')
        check_public_schema(p, c['id'] + '.public')
        check_no_secrets(p, c['id'] + '.public')
        require(unique([pl['playerId'] for pl in p['players']]), c['id'] + ': unique player IDs')
        require(unique([pl['seat'] for pl in p['players']]), c['id'] + ': unique seats')
        require(all(0 <= pl['seat'] < p['capacity'] for pl in p['players']), c['id'] + ': seats within capacity')
        if p['phase']['kind'] == 'TURN_ACTION':
            require(any(pl['playerId'] == p['phase']['actorId'] for pl in p['players']), c['id'] + ': actor occupies a seat')
        if s['seat'] is None:
            require(p['phase']['kind'] in {'LOBBY', 'ROUND_FINISHED', 'ROOM_CLOSED'} and
                    not s['hand'] and s['candidateDraft'] is None,
                    c['id'] + ': released seat only outside an active round')
        require(unique([t['tileId'] for t in s['hand']]), c['id'] + ': own physical identity')
        matches = [pl for pl in p['players'] if pl['playerId'] == s['playerId']]
        reason = ('UNKNOWN_VIEWER' if s['seat'] is not None and not matches else 'SEAT_MISMATCH' if s['seat'] is not None and matches[0]['seat'] != s['seat'] else
                  'VERSION_MISMATCH' if s['basedOnStateVersion'] != p['stateVersion'] else None)
        if reason:
            require(want == {'kind': 'WAIT_FOR_COHERENT_RESYNC', 'reason': reason}, c['id'] + ': pair gate model')
            continue
        require(want['kind'] == 'READY', c['id'] + ': ready model')
        require((s['seat'] is None and not s['hand']) or (matches and matches[0]['handCount'] == len(s['hand'])), c['id'] + ': private/public count coherent')
        own_ids = [t['tileId'] for t in s['hand']]
        require(set(s['draft']['orderedTileIds']) == set(own_ids) and
            unique(s['draft']['orderedTileIds']), c['id'] + ': ordinary draft stays own hand')
        require(comma_valid(s['draft']['orderedTileIds'], s['draft']['commaAfterTileIds']), c['id'] + ': private comma validity')
        candidate = s['candidateDraft']
        rack_ids = s['draft']['orderedTileIds']
        rack_commas = s['draft']['commaAfterTileIds']
        if candidate:
            record(candidate, 'phaseId source candidateDraftVersion sentence', c['id'] + '.candidate')
            source = candidate['source']
            require(p['phase']['kind'] == 'HU_COMPOSE' and candidate['phaseId'] == p['phase']['phaseId'], c['id'] + ': candidate phase binding')
            require(p['phase']['applicantId'] == s['playerId'], c['id'] + ': candidate belongs to authenticated applicant')
            require(source['kind'] == 'DISCARD' and integer(candidate['candidateDraftVersion']), c['id'] + ': candidate source/version')
            require(candidate['source'] == p['phase']['source'], c['id'] + ': candidate source binding')
            check_draft(candidate['sentence'], c['id'] + '.candidate.sentence', sentence=True)
            borrowed = source['borrowedTileId']
            require(borrowed not in own_ids, c['id'] + ': borrowed not owned')
            rack_ids = candidate['sentence']['orderedTileIds']
            rack_commas = candidate['sentence']['commaAfterTileIds']
            require(len(rack_ids) == 14 and unique(rack_ids) and set(rack_ids) == set(own_ids + [borrowed]), c['id'] + ': candidate 13+1 reference')
            require(any(d['discardId'] == source['discardId'] and d['tile']['tileId'] == borrowed and d['status'] == 'RESERVED' for d in p['discards']), c['id'] + ': borrowed remains reserved discard')
            require(want['borrowedReferenceCount'] == 1 and want['publicDiscardOwnershipUnchanged'] is True, c['id'] + ': reference expectations')
        derived = {'ownedHandCount': len(own_ids), 'rackTileCount': len(rack_ids), 'wallCount': p['wallRemaining'],
            'opponentBackCounts': [pl['handCount'] for pl in p['players'] if pl['playerId'] != s['playerId']],
            'commaUsed': len(rack_commas), 'commaAvailable': 3 - len(rack_commas),
            'nextSeat': (s['seat'] + 1) % p['capacity'] if s['seat'] is not None else None,
            'previousSeat': (s['seat'] - 1 + p['capacity']) % p['capacity'] if s['seat'] is not None else None, 'phase': p['phase']['kind'],
            'suspension': p['suspension']['kind'], 'winnerId': p['phase'].get('winnerId')}
        for key, value in derived.items():
            if key in want:
                require(want[key] == value, c['id'] + ': projection model ' + key)
        if s['seat'] is None:
            require(want.get('seatSelectionVisible') is True, c['id'] + ': released seat overlay')
        if p['suspension']['kind'] != 'RUNNING':
            require(p['phase']['kind'] in {'TURN_ACTION', 'DISCARD_RESPONSE', 'HU_COMPOSE', 'HU_VOTE'},
                    c['id'] + ': pause preserves an active business phase')

    for c in DATA['renderModeCases']:
        require(c['event'] in ['CONTEXT_LOST', 'MANUAL_RETRY_3D'], c['id'] + ': render event schema')
        require(c['expectedMode'] == ('DOM_FALLBACK' if c['event'] == 'CONTEXT_LOST' else 'THREE_D'), c['id'] + ': render policy model')
        require(c['expectedServerCommandCount'] == 0, c['id'] + ': no game command policy')
        require(c['expectedRackInteractive'] == (c['suspension'] == 'RUNNING'), c['id'] + ': pause gating policy')
        require(c['expectedMayRetry3D'] is True, c['id'] + ': manual retry policy')

    for c in DATA['tilePoolBudgets']:
        record(c, 'playerCount deckTileCount maxPhysicalTileViews dragGhostAllowance borrowedReferenceOverlayAllowance minimumTotalCapacity overflowPolicy',
               'tile pool budget')
        require(all(integer(c[k]) for k in ['playerCount', 'deckTileCount', 'maxPhysicalTileViews',
                'dragGhostAllowance', 'borrowedReferenceOverlayAllowance', 'minimumTotalCapacity']),
                'tile pool counts must be nonnegative integers')
        n = c['playerCount']
        require(n in range(2, 7), 'tile pool player count')
        require(c['deckTileCount'] == 72 + 24 * n, 'deck budget by N')
        require(c['maxPhysicalTileViews'] >= c['deckTileCount'], 'all physical tiles budgeted')
        require(c['dragGhostAllowance'] >= 1 and c['borrowedReferenceOverlayAllowance'] >= 1,
                'at least one ghost and one borrowed reference are reserved')
        require(c['minimumTotalCapacity'] >= c['maxPhysicalTileViews'] + c['dragGhostAllowance'] + c['borrowedReferenceOverlayAllowance'], 'ghost/reference capacity reserve')
        require(c['overflowPolicy'] == 'GROW_OR_FAIL_VISIBLE_NEVER_SLICE', 'overflow policy')
    require(len(DATA['tilePoolBudgets']) == 5 and {c['playerCount'] for c in DATA['tilePoolBudgets']} == set(range(2, 7)),
            'all capacities budgeted once')

    contract = (ROOT / 'contracts/table-view.ts').read_text()
    require("from './types'" in contract, 'reuse original game types')
    require(not re.search(r"(?:from\s*|require\s*\()\s*['\"]three", contract), 'display contract has no Three dependency')
    doc = (ROOT / 'docs/12-UI-ACCEPTANCE.md').read_text()
    acceptance_ids = re.findall(r'^\| (UI\d\d) P[01] ', doc, re.M)
    require(acceptance_ids == [f'UI{i:02d}' for i in range(1, 33)], '32 unique UI acceptance entries')
    required_not_run = {'REAL_3D_SCREENSHOTS', 'BROWSER_INTERACTION', 'FRAME_RATE', 'GPU_RESOURCE_CLEANUP', 'MULTIPLAYER_GAME', 'MAC_CLOUD_DEPLOYMENT'}
    require(set(DATA['notRun']) == required_not_run, 'explicit unexecuted scopes')
    return CHECKS


if __name__ == '__main__':
    count = validate(json.loads((ROOT / 'fixtures/table-view-cases.json').read_text()))
    print(f'PASS_FIXTURE_SCHEMA_AND_DISPLAY_MODELS: {count} assertions; fixture schema / seat / comma / mobile geometry / ranges / stamps / projection examples / pool budgets only')
    print('NOT_RUN: actual TableViewAdapter or React/Three implementation; real screenshots; browser input; frame rate; GPU cleanup; multiplayer game; Mac/cloud deployment')
