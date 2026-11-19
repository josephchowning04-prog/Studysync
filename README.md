# StudySync

StudySync is a CS-215 AI Literacy final project. Use one page to save notes, review them, and study with flashcards, multiple-choice quizzes, and short study guides. One Express server serves the HTML, CSS, JavaScript, and relative `/api/…` routes.

## Start locally

Use Node.js 22.13 or newer in the 22.x line, or Node.js 24.x, with npm.

```sh
npm ci
npm start
```

Open [StudySync](http://localhost:3000). Stop with **Ctrl+C**. Run `npm run dev` in place of `npm start` for server watch mode. In a macOS or Linux shell, `PORT=4000 npm start` changes the port. Express binds to `0.0.0.0`.

StudySync creates `studysync.sqlite` in the project folder by default. The server initializes tables without dropping existing rows.

## Study workflow

1. Paste notes or choose **Load Sample Notes**. For a text-based PDF, choose the file and select **Extract PDF Text**. Review the extracted text in the editor and preview before saving.
2. Select **Preview Notes** to see the title, literal notes, and a character count including spaces and line breaks. **Save Study Set** stores the title and notes. Search by title and choose **Open** to view or edit. **Delete** asks for confirmation and removes that set's progress.
3. Select a saved set and choose 2–6 items to generate with Ollama. Save edits before generating. The app uses the saved material. AI flashcards and quizzes use fill-in-the-blank prompts with answers taken from a source excerpt. Each AI mode shows a review notice and source excerpts.
4. Try any **Demo** for three predefined fictional biology items without Ollama. To save demo progress, load and save the original sample notes, then start the demo with that set open.
5. For flashcards, flip and mark each card **Known** or **Study Again**. Use **Tab** and **Enter** or **Space** on buttons, and **Left/Right Arrow** inside the card session to switch cards. Quiz answers earn one point when correct and zero otherwise. Completed attempts save automatically; use **Save Attempt** if a save fails. **View Set Progress** shows recent scores and missed items. **Reset Progress** asks for confirmation.

Titles allow 120 UTF-16 code units and notes 12,000. The visible preview counts Unicode code points. PDF extraction supports up to 2 MB and 30 pages and uses existing selectable text. Use OCR separately for scans. Complex PDF layouts can extract out of order. Progress shows the 50 most recent attempts per set. Completed sessions persist, while active sessions and generated items are temporary.

## Enable local AI

Install [Ollama](https://ollama.com/download). If Ollama is already running locally, skip the first command. Otherwise run it in its own terminal.

```sh
OLLAMA_NO_CLOUD=1 ollama serve
```

In a second terminal:

```sh
ollama pull llama3.2
OLLAMA_MODEL=llama3.2 OLLAMA_URL=http://127.0.0.1:11434 npm start
```

Choose **Check AI Status** after starting Ollama or installing the model. AI generation can time out or reject unsupported, repeated, or malformed material. Try clearer notes or fewer items. Check generated questions and answers against the original notes.

| Server variable | Purpose |
| --- | --- |
| `PORT` | HTTP port, defaults to `3000`. |
| `SQLITE_PATH` | Local SQLite filename or path. |
| `DATABASE_URL` | PostgreSQL connection configuration. When set, the app uses PostgreSQL. |
| `OLLAMA_MODEL` | Installed model label. Leaving it unset disables AI generation. |
| `OLLAMA_URL` | Trusted Ollama base URL, defaults to `http://127.0.0.1:11434`. |

Set variables in the shell or the host's environment settings. An ignored local `.env` can be loaded explicitly with `node --env-file=.env server.js`. Keep credentials out of browser code, Git, demo recordings, and issue reports.

## Test and verify

```sh
npm test
npm run test:browser
OLLAMA_MODEL=llama3.2 npm run compare:prompts
OLLAMA_MODEL=llama3.2 npm run test:ollama
```

`npm test` uses Node's built-in runner. It needs loopback access for Express integration tests. Set `STUDYSYNC_TEST_POSTGRES_URL` in your shell for the optional PostgreSQL test and point it at a disposable database. The browser check needs Chrome. On a different install, set `CHROME_BIN` to its executable. The last two commands require a running Ollama instance and use fictional notes only. See [testing evidence](docs/testing-evidence.md) for the recorded outcomes.

## Render Free setup

Use a GitHub repository you control. Keep database credentials in Render's environment settings. Deployment and GitHub setup are manual.

1. Create **New → Postgres**. Choose **Free**, PostgreSQL **17**, database name `studysync`, and the same region and workspace as the web service. Keep the generated database user. Restrict external access if all clients are in Render. From the database page, copy the **Internal Database URL** directly into the web service's environment settings.
2. Create **New → Web Service**, connect the repository, select the release branch (for example, `main`), choose **Node** and **Free**, and leave **Root Directory** blank for this repository layout. Set **Build Command** to `npm ci`, **Start Command** to `npm start`, **Health Check Path** to `/`, and **Auto-Deploy** to **Off** for a controlled class release.
3. Set `NODE_VERSION` to `22.23.2` and `DATABASE_URL` to the internal URL. Let Render supply `PORT`. Leave `OLLAMA_MODEL` and `OLLAMA_URL` unset for the public demo. After an approved deploy, open the URL and verify the sample, saved sets, all three demos, and persistence after a redeploy.
4. Laptop Ollama is unreachable from the Render service's loopback. Public AI generation requires a separately reachable trusted Ollama-compatible endpoint that supports structured responses. The predefined demo works independently.

Free web services can sleep and lose local files. Use PostgreSQL for hosted storage. Render currently lists a 30-day lifetime for Free PostgreSQL databases. [Free plan limitations](https://render.com/docs/free), [web service settings](https://render.com/docs/web-services), [PostgreSQL setup](https://render.com/docs/postgresql-creating-connecting), [Node version settings](https://render.com/docs/node-version).

## Privacy and project scope

StudySync is a shared classroom demonstration with no login, private accounts, or authorization. Anyone who can reach an instance can access or change its study sets and progress. Use fictional content only. Configuring a remote model sends saved notes to that provider. Source checks establish that excerpts occur in the notes and that answers match those excerpts. They cannot establish that notes are accurate or that every question is unambiguous. Review model output before relying on it.

[Design packet](docs/design-packet.md) · [Prompt log](docs/prompt-log.md) · [Prompt comparison](docs/prompt-comparison.md) · [Research sources](docs/research-sources.md) · [Security review](docs/security-review.md) · [Release note](docs/release-note.md) · [Showcase](docs/showcase.md)
