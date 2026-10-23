#!/usr/bin/env python3
"""Validate handoff fixture consistency only. Does not execute a game implementation."""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(relative: str):
    return json.loads((ROOT / relative).read_text(encoding="utf-8"))


def require(condition, message: str):
    if not condition:
        raise AssertionError(message)


def check_ids(cases, label: str):
    ids = [c["id"] for c in cases]
    require(len(ids) == len(set(ids)), f"{label}: duplicate case id")


def sentence_error(case):
    sentence = case["sentence"]
    order = sentence["orderedTileIds"]
    if (case.get("extraPayload") or len(order) != 14 or len(set(order)) != 14
            or set(order) != set(case["allowedTileIds"])):
        return "INVALID_SENTENCE"
    anchors = sentence["commaAfterTileIds"]
    if len(anchors) > 3 or len(set(anchors)) != len(anchors):
        return "INVALID_COMMAS"
    if any(anchor not in order[:-1] for anchor in anchors):
        return "INVALID_COMMAS"
    return None


def objection_error(case):
    if case["proposalId"] != case["activeProposalId"]:
        return "STALE_PHASE"
    ballot = case["ballot"]
    if ballot["choice"] == "APPROVE":
        return "INVALID_OBJECTIONS" if "objectionRanges" in ballot else None
    require(ballot["choice"] == "REJECT", "unknown ballot choice")
    ranges = ballot.get("objectionRanges")
    if not isinstance(ranges, list) or len(ranges) > 3:
        return "INVALID_OBJECTIONS"
    end = -1
    for item in sorted(ranges, key=lambda r: r["start"]):
        start, stop = item["start"], item["endExclusive"]
        if type(start) is not int or type(stop) is not int or not 0 <= start < stop <= 14:
            return "INVALID_OBJECTIONS"
        if start < end:
            return "INVALID_OBJECTIONS"
        end = stop
    return None


def union_ranges(ballots):
    selected = {i for ranges in ballots for r in ranges
                for i in range(r["start"], r["endExclusive"])}
    merged = []
    for index in sorted(selected):
        if merged and merged[-1]["endExclusive"] == index:
            merged[-1]["endExclusive"] = index + 1
        else:
            merged.append({"start": index, "endExclusive": index + 1})
    return merged


def main():
    defaults = read("contracts/rules.defaults.json")
    rules_text = (ROOT / "docs/01-RULES.md").read_text(encoding="utf-8")
    deck = read("fixtures/deck.daily-v1.json")
    votes = read("fixtures/vote-cases.json")
    sentences = read("fixtures/sentence-cases.json")
    scenarios = read("fixtures/scenario-cases.json")
    for obj in (deck, votes, sentences, scenarios):
        require(obj["rulesVersion"] == defaults["rulesVersion"], "rules version mismatch")
        require(obj["schemaVersion"] == 1, "unsupported fixture schema")
    require(defaults["playerCounts"] == [2, 3, 4, 5, 6], "unsupported player count")
    require(defaults["postHuDiscardMs"] == 30000, "post-HU discard default mismatch")
    require(deck["deckVersion"] == defaults["deckVersion"], "deck version mismatch")
    require(deck["status"] == "EXPERIMENTAL_UNPLAYTESTED", "missing balance caveat")
    entries = deck["entries"]
    chars = [entry["char"] for entry in entries]
    require(60 <= len(chars) <= 90, "expected about 60–90 curated characters")
    require(len(set(chars)) == len(chars), "duplicate character entry")
    # Unicode shape only; simplified/common status is a curated content review, not inferred by Unicode.
    require(all(len(c) == 1 and "\u4e00" <= c <= "\u9fff" for c in chars),
            "every entry must be a single CJK character; no punctuation/wildcards")
    require(all(type(e["connectionWeight"]) is int and e["connectionWeight"] > 0
                for e in entries), "invalid connection weight")
    totals = []
    for players in defaults["playerCounts"]:
        key = str(players)
        counts = [entry["copiesByPlayers"][key] for entry in entries]
        require(all(type(c) is int and c >= 1 for c in counts), "invalid physical count")
        expected = defaults["deckSizeByPlayers"][key]
        require(expected == 72 + 24 * players, "deck formula mismatch")
        require(sum(counts) == expected == deck["deckSizeByPlayers"][key], "deck count mismatch")
        tile_ids = [f"daily-v1:N{players}:{i:03d}:{copy:02d}"
                    for i, e in enumerate(entries) for copy in range(e["copiesByPlayers"][key])]
        require(len(tile_ids) == len(set(tile_ids)) == expected, "tile ID collision")
        high = [e["copiesByPlayers"][key] for e in entries if e["connectionWeight"] > 1]
        low = [e["copiesByPlayers"][key] for e in entries if e["connectionWeight"] == 1]
        require(sum(high) / len(high) > sum(low) / len(low), "multifunction words not favored")
        require(expected - (13 * players + 1) > 0, "insufficient initial wall")
        totals.append(str(expected))
    print(f"PASS deck: {len(chars)} single characters; totals {'/'.join(totals)}; IDs unique; experimental only")

    check_ids(votes["cases"], "votes")
    for case in votes["cases"]:
        frozen = case["frozenReviewerIds"]
        require(len(set(frozen)) == len(frozen), "duplicate reviewer")
        require(set(frozen) == set(case["onlineHumanIds"]) - {case["applicantId"]},
                "reviewer freeze mismatch")
        require(not (set(frozen) & set(case.get("botIds", []))), "BOT in reviewer set")
        m = len(frozen)
        approve, reject, abstain = (case[k] for k in ("approveCount", "rejectCount", "abstainCount"))
        require(all(type(x) is int and x >= 0 for x in (approve, reject, abstain)), "invalid vote count")
        require(approve + reject + abstain == m, "vote count mismatch")
        threshold = m // 2 + 1 if m else None
        result = {"reviewerCount": m, "threshold": threshold,
                  "canStart": m > 0, "passed": bool(m and approve >= threshold)}
        require(result == case["expected"], f"vote expectation wrong: {case['id']}")
    print(f"PASS votes: {len(votes['cases'])} frozen-electorate/strict-majority examples")

    check_ids(sentences["cases"], "sentences")
    registry = sentences["registry"]
    registry_ids = [t["tileId"] for t in registry]
    require(len(registry_ids) == len(set(registry_ids)) == 14, "invalid sentence registry")
    for case in sentences["cases"]:
        require(set(case["allowedTileIds"]) == set(registry_ids), "unknown sentence fixture tile")
        error = sentence_error(case)
        require(case["expected"] == {"valid": error is None, "code": error},
                f"sentence expectation wrong: {case['id']}")
    for case in sentences["objectionCases"]:
        error = objection_error(case)
        require(case["expected"] == {"valid": error is None, "code": error},
                f"objection expectation wrong: {case['id']}")
    for case in sentences["draftCases"]:
        before = case["before"]["commaAfterTileIds"]
        valid = set(case["afterOrderedTileIds"][:-1])
        require([a for a in before if a in valid] == case["expectedCommaAfterTileIds"],
                "comma reconciliation mismatch")
    for case in sentences["mergeCases"]:
        require(union_ranges(case["rangesFromBallots"]) == case["expectedMerged"],
                "anonymous union mismatch")
    print(f"PASS sentences: {len(sentences['cases'])} sentence + {len(sentences['objectionCases'])} objection + "
          f"{len(sentences['draftCases'])} draft + {len(sentences['mergeCases'])} union examples")

    all_cases = scenarios["cases"]
    check_ids(all_cases, "scenarios")
    require(len(all_cases) >= 35, "too few high risk scenarios")
    acceptance = (ROOT / "docs/04-ACCEPTANCE.md").read_text(encoding="utf-8")
    allowed_refs = set(re.findall(r"(?:R-\d{3}|I-\d{2}|U[1-6])", rules_text))
    for case in all_cases:
        require(set(case) == {"id", "ruleRefs", "tags", "given", "when", "then", "expected"},
                "scenario schema mismatch")
        require(case["given"] and case["when"] and case["then"] and case["expected"],
                "empty scenario condition")
        require(set(case["ruleRefs"]) <= allowed_refs, f"unknown rule ref: {case['id']}")
        require(f"### {case['id']}\n" in acceptance, "acceptance doc missing case")
    for n in range(2, 7):
        case = next(c for c in all_cases if c["id"] == f"S{n:02d}-seat-cycle")
        require(case["given"]["discarderSeats"] == list(range(n)), "missing seat case")
        require(case["expected"]["nextSeatByDiscarder"] == [(i + 1) % n for i in range(n)], "next mismatch")
        require(case["expected"]["previousSeatBySeat"] == [(i - 1 + n) % n for i in range(n)], "previous mismatch")
    covered = {r for c in all_cases for r in c["ruleRefs"]}
    require({f"U{i}" for i in range(1, 7)} <= covered, "six user requirements not covered")
    tags = {t for c in all_cases for t in c["tags"]}
    require({"restart", "refresh", "multiroom", "concurrency", "hidden-information", "recovery",
             "bot", "objection", "keyboard", "touch"} <= tags, "missing high risk category")
    require(scenarios["executionStatus"] == "HANDOFF_SPEC_NOT_GAME_TEST_RESULTS", "invalid test claim")
    for cid in ("S41-self-hu-rejected", "S73-own-withdraw-discard"):
        case = next(c for c in all_cases if c["id"] == cid)
        require(case["expected"]["postHuDiscardMs"] == defaults["postHuDiscardMs"],
                "post-HU scenario/default mismatch")
    print(f"PASS scenarios: {len(all_cases)} GIVEN/WHEN/THEN specifications; U1–U6 and all 2–6 seat cycles indexed")
    print("HANDOFF FIXTURES CONSISTENT — no game server, UI, network, persistence, or play-balance tests were run.")


if __name__ == "__main__":
    main()
