# Release note

## Week 10 · Release and recovery

- Tested commit: `<record the Git commit after the final verification run>`
- Deployment route: local Node and SQLite, or Render Free Web Service and PostgreSQL using the settings in [README](../README.md).
- Deployment status: local verification only. Hosted URL: _record after an authorized deploy_.
- Partner test: _record actual reviewer, date, device, task, expected behavior, observation, and follow-up_. No partner result has been recorded.

## Restart and recovery

Committed study sets and attempts survive a local server restart if the same SQLite file or PostgreSQL database is used. Current generated material and session tokens are in memory. Start a new session after a restart. If an attempt fails to save and the session is still active, try **Save Attempt**. Check the configured database path or environment before diagnosing missing records.

If AI is unavailable, verify the local endpoint and installed model and use **Check AI Status**. Demo remains available. On Render, verify PostgreSQL connectivity and the database expiration date. Record a backed-up data location before replacing a database. If a release regresses, revert to the previous known-good commit and rerun the smoke workflow before redeploying.

## Smoke and evidence

1. Save the fictional sample and verify search.
2. Finish a demo quiz and verify score and history.
3. Restart with the same database and open the set again.
4. Confirm all three demos work without an AI model.
5. Record observed outcomes, any recovery, and the release commit. See [testing evidence](testing-evidence.md).
