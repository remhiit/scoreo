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


def get(url):
    try:
        with urllib.request.urlopen(url, timeout=30) as r:
            return json.load(r)
    except Exception as e:
        print("api error:", e, flush=True)
        return None


while time.time() < DEADLINE:
    runs = get(f"{API}/commits/{SHA}/check-runs")
    st = get(f"{API}/commits/{SHA}/status")
    if runs and st:
        # "sync" mirrors GitHub Project state, not code health — irrelevant here.
        cr = [c for c in runs["check_runs"] if c["name"] != "sync"]
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
