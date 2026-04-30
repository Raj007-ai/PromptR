## 2023-10-27 - [Sentinel] Fix XSS vulnerability in code highlighting
**Vulnerability:** XSS via `dangerouslySetInnerHTML` in the `CodeHighlighter` component when displaying code snippets using `highlight.js`.
**Learning:** `highlight.js`'s `.value` does *not* sanitize HTML string inputs when no match is found or from the default input, leaving `<script>` tags untouched. By displaying it with `dangerouslySetInnerHTML`, the application becomes vulnerable to XSS.
**Prevention:** Always use an HTML sanitizer such as `DOMPurify` before injecting arbitrary strings containing user-derived data using `dangerouslySetInnerHTML`.
