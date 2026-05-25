## 2025-02-27 - [XSS vulnerability in react-simple-code-editor]
**Vulnerability:** The `react-simple-code-editor` component in `App.tsx` did not escape HTML in the `highlight` prop, allowing arbitrary JavaScript execution via Cross-Site Scripting (XSS).
**Learning:** Preventing XSS in code editors like `react-simple-code-editor` requires caution. Using standard DOM sanitizers like DOMPurify will strip HTML tags (like `<script>`, `<div>`), which causes functional regressions by making legitimate code snippets invisible to the user.
**Prevention:** Instead of stripping tags with DOMPurify, sanitize input by using an HTML escape function to replace reserved characters (e.g., `<`, `>`, `&`, `"`, `'`) with their entity equivalents.
