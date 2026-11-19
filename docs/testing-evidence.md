# Testing evidence

## Reproduce

Run with Node.js 22.13+ in the 22.x line or 24.x. The recorded environment used Node 22.23.2 and PostgreSQL 17.11.

```sh
npm ci
npm test
npm run test:browser
OLLAMA_MODEL=llama3.2 npm run compare:prompts
OLLAMA_MODEL=llama3.2 npm run test:ollama
OLLAMA_MODEL=llama3.2 STUDYSYNC_SMOKE_COUNT=3 npm run test:ollama
npm audit --audit-level=high
```

For PostgreSQL, supply `STUDYSYNC_TEST_POSTGRES_URL` from the environment for a disposable database and run `npm test` again. The recorded run used a temporary local PostgreSQL cluster with a private Unix socket. For Chrome, set `CHROME_BIN` if its executable is in a different location. The two Ollama commands need an already running local server with `llama3.2` installed. All inputs were fictional.

## Week 9 · One input, event, rule, result

One selected quiz answer triggers a submit event. The app compares the selected index to the correct index and awards one point for a match, zero otherwise. A missing selection shows an error and leaves the question active.

| Input and event | Expected | Observed | Status |
| --- | --- | --- | --- |
| No option selected, submit | No grading or advance. Show a message. | Browser showed “Select an answer before submitting.” Rule returned no result. | Pass |
| Correct option, submit | Award one point and show an explanation. | Browser showed “Correct.” The answer and explanation matched the expected source. | Pass |
| Wrong option, submit | Award zero points and show the correct answer and explanation. | Browser showed “Incorrect.” The expected correct answer was shown. | Pass |
| Submit choices 0, 0, 2 for the predefined three-item quiz | 2 out of 3, rounded to 67%, with the second question listed as missed. | Browser summary showed 2 of 3 (67%); the rule returned the nucleus question with its correct answer. | Pass |
| Retry after completing | Return to question 1 with no previous answers recorded for the new attempt. | Browser showed question 1 of 3. Existing saved attempts remained available until reset. | Pass |

## Automation and integration

| Test | Expected | Observed | Status |
| --- | --- | --- | --- |
| Study-set CRUD and literal title search | Create, read, edit, reopen, delete; treat % and _ literally. | HTTP 201 on create, matching literal title returned, edited title after reopening, HTTP 204 on delete and 404 afterward. | Pass |
| Blank and oversized content | Reject blank title/notes, whitespace-only notes and titles or notes past the limit. | HTTP 400 with a validation message; very large JSON body returned 413. | Pass |
| PDF import | Return selectable text; reject no-text, invalid, corrupt, wrong media type, and oversized uploads. | Valid PDF returned a source sentence. No-text/corrupt requests returned 422, invalid or wrong media returned 415, and oversized PDF returned 413. | Pass |
| Ollama request and saved source | Use a separated, numbered notes payload and saved set text; reject invalid mode/count. | Mock saw the expected saved source and no instruction marker in the numbered payload, plus schema, timeout and redirect policy. API rejected invalid mode/count. | Pass |
| Generated shape and source | Reject malformed JSON, missing/extra fields, duplicate or invalid references, unsupported phrases, and a distractor that appears in source. | Matching mocked output passed. Invalid variants returned 502. Empty items returned 422. | Pass |
| Repeated answer in one excerpt | Blank every whole-word occurrence and preserve the original answer and excerpt. | The two instances of “cell” became separate blanks, both with the answer “cell.” | Pass |
| Provider failure and demo | Disabled/unreachable provider returns an availability error and timeout returns a timeout error. Demo stays separate. | API/mocks reported unavailable, 503, and 504 as applicable. Predefined demo returned independently and did not attach to unrelated notes. | Pass |
| Flashcard marks | Require complete marks and tally Known and Study Again. | Incomplete marks produced no result; mixed marks produced 2 of 3 and one item to revisit. | Pass |
| Save progress | Regrade on server, persist attempts, reject incomplete results and deduplicate retries. | Two 2-of-3 attempts survived close/reopen. Incomplete answers returned 400 and the replay left the original score unchanged. | Pass |
| Reset progress with an overlapping save | Clear history and invalidate the old session. | Reset returned 204, history stayed empty, and the old token returned 409 on reuse. | Pass |
| Cross-site write | Block browser cross-site mutations and serve CSP. | Write returned 403, no set was added, and the homepage had the expected CSP. | Pass |
| Actual server restart | Start a production process, save a record, terminate, relaunch with the same SQLite file, reread. | A new production process returned the same saved notes with HTTP 200. | Pass |
| PostgreSQL lifecycle | Keep data through reconnection and repeated initialization; delete dependent attempts with the set. | Disposable PostgreSQL preserved the edited notes and progress on reopen. Deletion removed the attempt through the foreign key. | Pass |
| npm advisories | After upgrading PDF.js, check for known npm advisories. | Initial version had one high-severity advisory. The final audit reported zero vulnerabilities. | Pass |

## Browser smoke

| Scenario | Expected | Observed | Status |
| --- | --- | --- | --- |
| AI disabled, mobile layout | Explain unavailability, disable generation and fit the viewport. | AI status and buttons reflected the disabled configuration; no horizontal overflow. | Pass |
| Notes preview and HTML-like text | Show literal text and count. On missing input, focus the first invalid field. | Correct focus and count; no markup nodes or script side effect. | Pass |
| Saved-set workflow | Sample loads, can save, open, edit, search and delete. | Chrome completed the workflow with editor and list updates. | Pass |
| Flashcard workflow | Flip, navigate with keyboard, mark, finish, record, restart. | ArrowRight advanced a card, summary showed 2 of 3, an attempt saved, and restart cleared marks. | Pass |
| Quiz workflow | Show missing-input error, immediate feedback, missed question and correct score; retry works. | 2 out of 3 (67%) displayed and attempt saved. Retry started at question 1. | Pass |
| Guide and history | Show a labeled demo guide and two saved attempts; confirmation protects reset. | Three concepts displayed, both attempts appeared, cancel preserved attempts and confirmation cleared them. | Pass |
| Desktop workspace | Give the editor and saved sets two columns without horizontal scrolling. | At 1280 CSS pixels, Chrome reported two grid columns and no overflow. | Pass |

## Live model evidence

Local Ollama with `llama3.2` reported available. Requests for two and three items returned HTTP 200 for cards, quiz, and study guide. Each result had the requested number of items with excerpts found in the saved fictional notes. The [prompt comparison](prompt-comparison.md) records both tested strategies, prior failures, and the observed retests.

The final November 19, 2026 run passed 17 of 17 automated tests with the disposable PostgreSQL database configured and seven of seven Chrome smoke checks.

No hosted Render, partner, or screen-reader test result was recorded.
