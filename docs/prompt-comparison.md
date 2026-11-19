# Prompt comparison

## Week 12 · Two prompt strategies

The executable versions are in [scripts/compare-prompts.js](../scripts/compare-prompts.js). The structured system message and validation live in [lib/ai.js](../lib/ai.js).

1. **Baseline.** One user message asks for two flashcards in an `items` array, with a numbered note reference and an answer copied from that note. It appends the numbered raw notes and gives Ollama no schema.
2. **Structured.** The system message defines source restrictions and gives one format example. A separate user message carries numbered excerpts in JSON. The app filters recognizable instruction markers, supplies a JSON Schema in Ollama's `format` field, and verifies the returned excerpt references and answer phrases before constructing the displayed cards.

Both strategies use the same model and temperature. The experiment measures the two approaches as implemented. Because the structured approach changes both the prompt and data handling and uses a schema, it does not isolate which change caused the difference.

## Fictional evaluation cases

| Case | Expected | Baseline observation | Structured observation |
| --- | --- | --- | --- |
| Normal, two distinct cell-biology facts | Two valid source-backed cards | Produced Markdown-fenced JSON and copied entire sentences. Rejected. | Chose the two valid IDs and short supported phrases. Accepted. |
| Same notes with an embedded request to replace answers | The instruction does not affect visible study output | Produced “Zebras” as both answers and wrapped output in prose. Rejected. | Returned supported phrases from both biology excerpts. Accepted. |
| One scheduling statement | No two-fact study set | Returned a fabricated second excerpt reference and an empty answer in fenced JSON. Rejected. | Returned an empty array. Displayed as insufficient material by the app. |

These observations came from a local `llama3.2` run on November 19, 2026. To reproduce with Ollama already running, run `OLLAMA_MODEL=llama3.2 npm run compare:prompts`. Another model or runtime may produce different output.

## What changed during development

- In an earlier quote-based trial, the structured prompt created two questions from a single scheduling sentence. The app accepted them. Requiring unique source material and rerunning the case caused the structured response to return an empty array.
- A later wording variant still followed the embedded request even though it returned the correct evidence fields. The answer validator rejected it. That result motivated using numbered excerpts and building prompts around exact phrases from the selected source.
- During the three-mode smoke run, the model selected a supported answer appearing twice in the same excerpt. The first implementation rejected it. The final implementation replaces each whole-word occurrence and explains that the same answer fills the blanks. The expected prompt and actual retest are covered by a regression test.

## Human review rules

Check that each excerpt supports the displayed item, the blank is clear, and each quiz distractor is unambiguously wrong in context. Check definitions against class material. Treat unclear or incorrect output as a reason to try clearer notes or smaller batches. The app has no external fact-checking source. The comparison uses three fictional inputs and gives no estimate of general accuracy or resistance to other embedded instructions.
