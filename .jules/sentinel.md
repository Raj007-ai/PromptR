## 2024-05-24 - Preexisting Duplicate Imports

**Learning:**
Code review bots might flag the removal of a mid-file import (e.g. `import { generateSpeechTTS } from './geminiService.ts';`) as a potentially dangerous removal.

**Action:**
Ensure we understand the memory directive regarding duplicate imports: "Preexisting duplicate imports in `App.tsx` (e.g., `generateSpeechTTS`) can cause `pnpm lint` (`tsc --noEmit`) to fail. Remove the redundant mid-file import (e.g., the one directly above the `TTSReader` component) and preserve the top-level import to adhere to ESM standards." Explain this clearly when doing final code check or pre-commit message if necessary.
