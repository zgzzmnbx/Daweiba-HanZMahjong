#!/usr/bin/env python3
"""Regression checks for the handoff fixture validator, not a game implementation."""
import copy
import importlib.util
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location('table_ui_validator', ROOT / 'checks/validate-table-ui.py')
validator = importlib.util.module_from_spec(spec)
spec.loader.exec_module(validator)
BASE = json.loads((ROOT / 'fixtures/table-view-cases.json').read_text())


def case(data, case_id):
    return next(c for c in data['projectionCases'] if c['id'] == case_id)


def candidate(data):
    return case(data, 'private-borrowed-reference-not-owned')


def own(data):
    return case(data, 'own14-six-player-last-seat')


def reject(label, mutate, expected_reason, base=BASE):
    data = copy.deepcopy(base)
    mutate(data)
    try:
        validator.validate(data)
    except AssertionError as exc:
        if expected_reason not in str(exc):
            raise AssertionError(f'{label}: failed for an unrelated reason: {exc}') from exc
        return
    raise AssertionError(f'{label}: invalid mutation falsely passed')


baseline_assertions = validator.validate(BASE)

# Positive controls ensure allowlists still accept legitimately revealed public tiles.
vote_data = copy.deepcopy(BASE)
vote_case = own(vote_data)
public_sentence = {'sentence': copy.deepcopy(vote_case['self']['draft']),
                   'tiles': copy.deepcopy(vote_case['self']['hand'])}
proposal = {'proposalId': 'proposal-ui', 'applicantId': 'p5',
            'source': {'kind': 'SELF', 'playerId': 'p5'}, 'snapshot': public_sentence,
            'reviewerCount': 5, 'threshold': 3, 'submittedBallotCount': 2}
vote_case['public']['phase'] = {'kind': 'HU_VOTE', 'phaseId': 'vote-ui',
    'deadline': {'endsAt': 45000, 'remainingMsWhenPaused': None}, 'proposal': proposal}
validator.validate(vote_data)

history_data = copy.deepcopy(BASE)
history_case = own(history_data)
history_case['public']['phase']['mustDiscard'] = True
history_case['public']['history'] = [{
    'proposalId': 'proposal-ui', 'applicantId': 'p5', 'source': {'kind': 'SELF', 'playerId': 'p5'},
    'snapshot': copy.deepcopy(public_sentence), 'outcome': 'REJECTED',
    'result': {'reviewerCount': 5, 'threshold': 3, 'approveCount': 2, 'rejectCount': 3,
               'abstainCount': 0, 'passed': False, 'mergedObjectionRanges': [{'start': 3, 'endExclusive': 5}]}}]
validator.validate(history_data)


def active_unseated(data):
    c = case(data, 'released-idle-seat-is-unseated')
    # Actor p0 is occupied, so this specifically exercises the null-seat phase gate.
    c['public']['phase'] = {'kind': 'TURN_ACTION', 'phaseId': 'bad-active-release',
        'deadline': {'endsAt': 60000, 'remainingMsWhenPaused': None},
        'actorId': 'p0', 'mustDiscard': False, 'isEatTurn': False}


reject('seat release during active round', active_unseated, 'released seat only outside an active round')
reject('candidate comma references absent ID',
       lambda d: candidate(d)['self']['candidateDraft']['sentence'].__setitem__('commaAfterTileIds', ['not-owned-at-all']),
       'comma anchors')
reject('candidate count uses ordinary draft',
       lambda d: candidate(d)['expected'].__setitem__('commaUsed', 0), 'projection model commaUsed')
reject('candidate belongs to another applicant',
       lambda d: candidate(d)['public']['phase'].__setitem__('applicantId', 'p0'),
       'candidate belongs to authenticated applicant')
reject('opponent leaks hidden IDs under another field name',
       lambda d: own(d)['public']['players'][0].__setitem__('concealedTileIds', ['secret-0']),
       'exact nested fields')
reject('publicly revealed tile has a hidden-data attachment',
       lambda d: own(d)['public']['phase']['proposal']['snapshot']['tiles'][0].__setitem__('concealedTileIds', ['secret-0']),
       'exact nested fields', base=vote_data)
reject('negative allowances hide insufficient capacity',
       lambda d: d['tilePoolBudgets'][-1].update({'dragGhostAllowance': -1,
           'borrowedReferenceOverlayAllowance': -1, 'minimumTotalCapacity': 214}),
       'nonnegative integers')
reject('fractional instance budgets',
       lambda d: d['tilePoolBudgets'][-1].update({'dragGhostAllowance': 1.5, 'minimumTotalCapacity': 218.5}),
       'nonnegative integers')
reject('no visual reference headroom',
       lambda d: d['tilePoolBudgets'][-1].update({'dragGhostAllowance': 0,
           'borrowedReferenceOverlayAllowance': 0, 'minimumTotalCapacity': 216}),
       'at least one ghost and one borrowed reference')

print(f'PASS_TABLE_UI_VALIDATOR_REGRESSIONS: baseline {baseline_assertions} assertions; 2 valid public-reveal controls; 9 invalid mutations rejected for the intended reason.')
print('Scope: fixture validator only; no TableViewAdapter, renderer, browser or multiplayer execution.')
