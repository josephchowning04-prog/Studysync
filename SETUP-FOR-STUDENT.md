# StudySync student handoff

## 1. Open and run the project

1. Install Node.js from the official download page. Use Node **22.23.2** to match the tested environment, or a maintained **22.x** release at or above **22.13**. Node **24.x** is also in the project's supported range. Choose the Windows `.msi` for your processor or the macOS `.pkg`. npm comes with Node. [Node.js installers](https://nodejs.org/download/release/v22.23.2/).
2. Extract `StudySync-Transfer.zip` to a folder you can write to. On Windows, right-click the archive and choose **Extract All**. On macOS, double-click it in Finder. In VS Code, choose **File → Open Folder** and select the extracted `StudySync` folder containing `package.json`.
3. In VS Code, open **Terminal → New Terminal**. If Node was just installed, restart VS Code to refresh its terminal environment. Run:

```text
node --version
npm --version
npm ci
npm start
```

4. Open [http://localhost:3000](http://localhost:3000). Choose **Load Sample Notes**, **Preview Notes**, and **Save Study Set**. Try the demo flashcards, quiz, and guide. When you start a demo with the original sample set open, completed flashcard and quiz attempts are saved. Use **Ctrl+C** in the server terminal to stop StudySync.
5. Run `npm test` in a terminal opened in the same folder. The PostgreSQL test skips automatically unless `STUDYSYNC_TEST_POSTGRES_URL` points to a disposable test database. For a local restart check, complete a fictional quiz, stop and start the server again, and reopen the set and its progress. Keep the automatically created `studysync.sqlite` in the project folder for local use only.

Use Command Prompt from the VS Code terminal menu if Windows PowerShell blocks the npm script, or run `npm.cmd ci`, `npm.cmd start`, and `npm.cmd test` in PowerShell. The optional Chrome smoke test uses a standard macOS Chrome path by default. On Windows or when Chrome is elsewhere, set `CHROME_BIN` to your installed Chrome executable before running `npm run test:browser`.

The transfer was tested from an extracted copy on macOS with Node 22.23.2. Windows setup was reviewed against the scripts and dependencies. Complete the install, tests, and local demo on your Windows machine and record your own results.

## 2. Optional local AI with Ollama

The three predefined demos work without Ollama. For AI generation, install and open the Ollama application for your system. If you use the CLI and Ollama is not running, start `ollama serve` in a separate terminal. Avoid starting a second Ollama server when the installed app is already running. [Ollama for macOS](https://docs.ollama.com/macos), [Ollama for Windows](https://docs.ollama.com/windows).

Run `ollama pull llama3.2` to download the local model. Stop StudySync if it is already running, then use the command for your shell from the project folder.

macOS Terminal:

```sh
OLLAMA_MODEL=llama3.2 OLLAMA_URL=http://127.0.0.1:11434 npm start
```

Windows PowerShell:

```powershell
$env:OLLAMA_MODEL = 'llama3.2'
$env:OLLAMA_URL = 'http://127.0.0.1:11434'
npm.cmd start
```

Windows Command Prompt:

```bat
set "OLLAMA_MODEL=llama3.2"
set "OLLAMA_URL=http://127.0.0.1:11434"
npm start
```

Open the homepage, select **Check AI Status**, save or open the fictional set, and try an AI generation button. Review the result against the notes. To return to demo-only operation, use a new terminal without those variables.

## 3. Review the code and publish your own GitHub repository

Open `server.js` for the Express routes, `public/` for the browser code, `lib/` for database and AI logic, and `test/` for the automated checks. Review and explain the code before submission. This handoff contains an existing StudySync project, including development requested by the original student and implementation, tests, documentation, and source research assisted by Codex. Preserve the original project and AI-assistance disclosures in [docs/prompt-log.md](docs/prompt-log.md). State which parts you received, which parts you reviewed or changed, and which tests you personally ran. Check with your instructor that using and publishing the transferred work is permitted, and use the contributor credits agreed with the original student.

Install Git and create a new empty repository under your GitHub account. Leave GitHub's README, license, and gitignore initialization options unchecked. In the extracted folder, review the proposed first commit:

```text
git init -b main
git add .gitignore package.json package-lock.json server.js README.md SETUP-FOR-STUDENT.md public lib scripts test docs
git diff --cached --name-only
git diff --cached
```

Confirm that there are no secrets, database files, generated folders, or private notes in the staged changes. Run the local tests against the release files, then commit and push. Replace the example owner and repository name with your own. Authenticate through GitHub's supported sign-in flow and keep tokens out of commands, URLs, screenshots, and source files.

```text
git commit -m "Prepare reviewed StudySync release"
git rev-parse HEAD
git remote add origin https://github.com/YOUR-ACCOUNT/YOUR-REPOSITORY.git
git push -u origin main
```

Record the SHA that you actually tested. If you change the source, rerun the checks against the version you release. [GitHub guide to publishing existing code](https://docs.github.com/en/migrations/importing-source-code/using-the-command-line-to-import-source-code/adding-locally-hosted-code-to-github).

## 4. Deploy the released commit to Render Free

1. Create a **Free PostgreSQL** instance using PostgreSQL **17**, in the same Render workspace and region as the web service. Create a **Free Web Service** with the **Node** runtime from your own GitHub repository and release branch. Leave the root directory blank. Confirm the plan is **Free** for both resources.
2. Set **Build Command** to `npm ci`, **Start Command** to `npm start`, and **Health Check Path** to `/`. Set **Auto-Deploy** to **Off** for a controlled release. Set `NODE_VERSION` to `22.23.2` to match the tested version. Paste the database's **Internal Database URL** only into the web service's `DATABASE_URL` environment setting. Let Render provide `PORT`. Leave `SQLITE_PATH`, `OLLAMA_MODEL`, and `OLLAMA_URL` unset.
3. Verify the deployed SHA and open the public URL. Run all three fictional demos. Save the sample and complete a quiz. Restart or redeploy the web service against the same database, then confirm the set and score are still there. Record the SHA, public URL, expected and actual results, and any recovery steps in [docs/release-note.md](docs/release-note.md).

A Free web service can sleep and local files are ephemeral. Free PostgreSQL expires after 30 days. Check usage and avoid paid plans and billable add-ons. Render documents Free-plan suspensions or build limits in place of applicable overage billing when no payment method is on file. Schedule the demo and grading window before the database expires. [Render Free limits](https://render.com/docs/free), [Render PostgreSQL setup](https://render.com/docs/postgresql-creating-connecting).

With AI variables unset, the public demo uses the predefined content and makes no call to Ollama. Render cannot reach the Ollama instance running on your computer through its own loopback. Anyone with the public URL can read, edit, or delete shared study sets and progress. Use fictional data only. In-progress study sessions are cleared by a restart. Saved sets and completed attempts persist while the same PostgreSQL database remains available.
