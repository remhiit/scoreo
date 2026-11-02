#!/usr/bin/env python3
"""Poll a commit's check-runs and the `claude/review` status until both settle.

Usage: python3 wait_pr.py <sha> [interval_seconds]

Exit codes:
  0 - all check-runs green (success/skipped/neutral) and claude/review=success
  1 - at least one check-run genuinely failed (not just pending)
  2 - checks green but claude/review is not success (rare — review not posted yet)
  3 - timed out (45 min) without reaching a final state

Run this in the background (it polls for up to 45 minutes) and read its
output once the background task notification arrives — don't poll it
yourself in a tight loop.
"""
import json
import os
import sys
import time
import urllib.request

if len(sys.argv) < 2:
    print("usage: wait_pr.py <sha> [interval_seconds]", flush=True)
    sys.exit(64)

SHA = sys.argv[1]
INTERVAL = int(sys.argv[2]) if len(sys.argv) > 2 else 90
DEADLINE = time.time() + 45 * 60
API = "https://api.github.com/repos/remhiit/scoreo"

# Anonymous requests are capped at 60/hour — easy to blow through when this
# skill chains several PRs, each polling two endpoints every INTERVAL
# seconds. A token (already present in the routines' execution environment)
# raises that to 5000/hour, which is what makes the batch use case safe.
TOKEN = os.environ.get("GITHUB_TOKEN") or os.environ.get("GH_TOKEN")


def get(url):
    req = urllib.request.Request(url)
    if TOKEN:
        req.add_header("Authorization", f"Bearer {TOKEN}")
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.load(r)
    except Exception as e:
        print("api error:", e, flush=True)
        return None


def get_check_runs():
    """Every check-run of the commit, across pages.

    The endpoint returns 30 runs per page by default. A commit here easily
    carries 40+ (one per workflow job, plus re-runs), so reading only the first
    page once let a red `visual` slip through as "CI OK". Returns None when any
    page fails, so a partial list is never mistaken for the full one.
    """
    runs, page = [], 1
    while True:
        data = get(f"{API}/commits/{SHA}/check-runs?per_page=100&page={page}")
        if data is None:
            return None
        runs.extend(data["check_runs"])
        if len(runs) >= data["total_count"] or not data["check_runs"]:
            return runs
        page += 1


while time.time() < DEADLINE:
    runs = get_check_runs()
    # The combined status also pages its `statuses` (30 by default).
    st = get(f"{API}/commits/{SHA}/status?per_page=100")
    if runs is not None and st:
        # "sync" mirrors GitHub Project state, not code health — irrelevant here.
        cr = [c for c in runs if c["name"] != "sync"]
        pending = [c["name"] for c in cr if c["status"] != "completed"]
        bad = [
            f'{c["name"]}={c["conclusion"]}'
            for c in cr
            if c["status"] == "completed" and c["conclusion"] not in ("success", "skipped", "neutral")
        ]
        review = [s for s in st["statuses"] if s["context"] == "claude/review"]
        if bad:
            print("CI FAILED:", ", ".join(bad), flush=True)
            sys.exit(1)
        if not pending and review:
            print(f'CI OK ({len(cr)} checks) | claude/review={review[0]["state"]}', flush=True)
            sys.exit(0 if review[0]["state"] == "success" else 2)
    time.sleep(INTERVAL)

print("TIMEOUT waiting for", SHA, flush=True)
sys.exit(3)
