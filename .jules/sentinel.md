## 2024-05-15 - React Simple Code Editor XSS Vulnerability

**Vulnerability:** XSS (Cross-Site Scripting) via the `highlight` prop in `react-simple-code-editor`. The application was rendering unescaped user input when syntax highlighting was enabled (`highlight={code => code}`). This allowed malicious HTML/script tags entered into the code editor to be executed or rendered as DOM nodes.

**Learning:** `react-simple-code-editor` does not automatically sanitize the output returned by the `highlight` function. The vulnerability occurred because the raw input was being passed through without encoding. Standard HTML sanitizers like DOMPurify should be avoided in code editors because they strip out HTML tags completely (e.g., `<script>`), which breaks the core functionality of a code editor where users expect to see the code they wrote.

**Prevention:** Always use an HTML escape function to replace reserved HTML characters (`<`, `>`, `&`, `"`, `'`) with their entity equivalents before rendering user input in `react-simple-code-editor`'s `highlight` prop. This prevents XSS while maintaining the visibility of the code.
