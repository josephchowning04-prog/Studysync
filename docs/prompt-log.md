# Prompt log and AI disclosure

## Actual prompts and work

- The student requested an Express starter for StudySync, then asked for a plain-text note preview. The current assignment brief asked for saved sets, PDF extraction, local AI, study modes, tests, deployment instructions, and evidence.
- Codex assisted with implementation, tests, documentation, and source lookup. The student should review and be able to explain the submitted implementation.
- Runtime AI generation is a separate use of AI. Ollama receives saved study material as a JSON data field and produces draft study items for human review. The fictional demo is predefined application content.

## Runtime prompt contract

Input is saved notes, a study mode, and a count between two and six. The server prepares numbered excerpts and filters overt instruction markers. The system instruction treats the excerpts as untrusted. The response contract defines a JSON object of mode-specific items referencing excerpt numbers. The server checks fields, bounded values, unique source references, and alignment between the selected answer and excerpt before composing the displayed item. The application reports an error when output fails checks.

The production prompt and both real comparison strategies are in [the prompt comparison](prompt-comparison.md).

## Add entries during the project

| Date | Tool/model | Exact prompt or file reference | Observed output | Human review and next edit |
| --- | --- | --- | --- | --- |
| _Add an actual entry_ | | | | |
