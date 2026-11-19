# Showcase

## Week 14 · Demonstration

1. State the goal in one sentence. Turn saved class notes into short practice activities with source excerpts.
2. Load the fictional notes and preview them. Show the blank-input message and then save a set.
3. Open a demo flashcard and use the keyboard to flip or navigate. Mark a card **Study Again**.
4. Attempt the demo quiz with no selection first. Answer one question incorrectly and complete the quiz. Explain one point per correct answer and show the missed item in progress.
5. Show the guide's key concepts, definitions, and summaries. If Ollama is available, compare a separately labeled generated result with its source. If it is unavailable, show the status and continue in Demo.
6. Open the testing evidence and illustrate one failure, the change made, and the actual retest.

## Difficult questions

- **Why use AI?** It drafts different study activities from saved notes. Users review them against cited excerpts.
- **Why can a valid JSON answer still be wrong?** Schema checks describe structure. Excerpt checks do not prove that the source is true or that the question has a single interpretation.
- **Why trust the score?** An exact choice-index match earns one point. The server recomputes the attempt from the submitted answers and saved session items.
- **What survives a restart?** Saved notes and completed attempts in the database. Start a new session to replace expired in-memory generation and session state.
- **Can I put real notes on a public deployment?** Anyone who can access the demo can reach its shared data. Use fictional notes.

## Peer feedback and reflection

- Ask a peer to find the sample, complete a question with the keyboard, and explain whether a visible result came from AI or Demo.
- Record the actual feedback and the screen or state that caused confusion.
- Which design decision made scoring easier to explain? Which limitation would you address before using the app with real students?
- Identify what evidence supports your answer and what remains unknown.
