## 2024-05-15 - React Simple Code Editor XSS Vulnerability
**Vulnerability:** Cross-Site Scripting (XSS) via `react-simple-code-editor` component in `App.tsx` when using `highlight={code => code}` which renders raw user input without escaping HTML entities.
**Learning:** `DOMPurify` is too aggressive for code editors and strips HTML tags completely, making the code invisible to the user. This causes functional regressions.
**Prevention:** Sanitize input for code editors by using a manual HTML escape function to replace reserved characters (`<`, `>`, `&`, `"`, `'`) with their corresponding HTML entity equivalents (`&lt;`, `&gt;`, `&amp;`, `&quot;`, `&#039;`).
