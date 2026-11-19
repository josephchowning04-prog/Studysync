# Security review

## Week 13 · Threat map and retest

| Entry point | Threat | Minimum sufficient fix for the demo | Observed retest |
| --- | --- | --- | --- |
| Notes, titles, AI output | Browser interprets text as markup | DOM textContent, same-origin CSP, no user-controlled markup | Browser test exercises literal title and notes rendering. See testing evidence for results. |
| Review or save | Missing fields, long request, unexpected values | Client form constraints, server validation, bounded JSON body | Blank/whitespace/oversized data rejected in integration suite. |
| PDF parser | Wrong file, malformed input, resource exhaustion or vulnerable parser | MIME and signature checks, limits, one worker at a time, timeout, patched PDF.js, no eval | Text PDF extracted. Corrupt, unsupported, no-text and oversized samples returned errors. npm initially reported a high-severity PDF.js advisory and reported zero advisories after upgrade. |
| SQL and persistence | Data interpreted as executable SQL or search wildcards | Bound parameters, literal wildcard escaping, idempotent schemas, foreign keys | Search with literal wildcards passed on SQLite and PostgreSQL. Data survived reopen/restart. |
| AI request and response | Embedded instructions, malformed JSON, false or repeated evidence | Notes in separate JSON data message, no tools, bounded requests, strict validation, instruction markers and distinct quotes | Mocked cases returned expected validation errors. The [live comparison](prompt-comparison.md) records the sparse-note finding and retest. |
| API and provider settings | Cross-site writes, generic URL fetch, credential exposure | Reject cross-site browser writes, server-only configuration, fixed provider routes, blocked redirects, generic internal errors | Cross-site write was rejected. Provider tests verified redirect policy and that inputs stay in the data message. |
| Attempt history | Incomplete or duplicate-attempt writes | Check session token, regrade submitted choices and marks, idempotent attempt identifier | Incomplete answer rejected; replay did not add or overwrite an attempt. Reset removed history and invalidated tokens. |

## Boundaries and residual risks

- StudySync has no authentication or private accounts. Direct HTTP clients can access and modify shared data. The cross-site browser check does not provide authorization. Use synthetic notes for all demonstrations.
- Set database configuration in environment variables or host settings. No client should receive the connection URL. A trusted remote provider receives the notes if the operator configures one.
- Workers and bounds are resource controls, not a comprehensive PDF sandbox. Keep parser dependencies updated. There is no production-grade rate limiting, abuse monitoring, or quota system.
- A model can be misled into writing a misleading question or can quote a false claim already in the notes. Structural checks and a short instruction-pattern list cannot detect all prompt injections or guarantee question entailment. The provider has no application tools, secret-bearing context, or ability to change study sets.
- See [testing evidence](testing-evidence.md) for reproducibility and [the prompt comparison](prompt-comparison.md) for live outcomes.
