# Design packet

## Week 8 · One-screen scope

A student with class notes should be able to paste or import them, confirm what was extracted, and move into a short practice session without leaving the homepage. The main workflow is **add → preview → save → study → review results**.

On desktop, the editor and saved-set list sit side by side below the project header. On mobile, the editor appears first and the list follows. Four study option cards sit below the workspace. Starting a mode opens one in-page study panel and moves focus to its heading. Results and set progress appear beneath the study options. One-screen scope means one page and one practice item at a time. Longer notes and small displays can require scrolling.

## Responsibilities

| Layer | Responsibility |
| --- | --- |
| HTML | Headings, sections, form labels, native buttons, status regions and reading order. |
| CSS | Responsive workspace and study cards, clear focus indication, wrapped text and consistent spacing. |
| Browser JavaScript | Listen for events, update the DOM, call the same-origin API, and run the shared study rules. |
| Express | Validate input, manage persistence, coordinate PDF extraction and Ollama, and recompute scores before saving. |

## Interface states

| State | Visible behavior |
| --- | --- |
| Empty | The library reports no matching sets, progress explains that no attempts exist, and AI controls require an available model and saved set. |
| Invalid | Missing fields show a nearby message and receive focus. Missing quiz selection leaves the student on the question. |
| Loading | Save, extraction, generation, and progress show status. Busy controls prevent duplicate work where relevant. |
| Success | Preview, saved title, mode heading, immediate quiz feedback, and attempt status confirm changes. |
| Error | The app reports actionable file, provider, or request errors and retains editable notes. Demo remains separate. |

## Critique

Native controls keep the interaction explainable and keyboard-friendly. Keeping the editor and study panel on one page reduces navigation but makes the page longer once a mode is open. Focusing the mode heading helps users find the result. Visual layout, screen-reader comprehension, and the clarity of the distinction between Demo and AI should all be part of a partner test.
