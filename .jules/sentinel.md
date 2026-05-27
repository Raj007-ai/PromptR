## 2024-05-27 - Remove unused duplicate imports and unused React variables

**Learning:** Unused React state variables should be removed to improve maintainability. Similarly, removing unused components/variables might flag existing, previously undetected issues like duplicate imports, which also need to be resolved to pass linting.
**Action:** Removed unused `auraRefineInstruction` and `auraImageRefineInstruction` in `App.tsx`, and resolved an exposed duplicate import issue with `generateSpeechTTS`.
