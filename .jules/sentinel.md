## 2025-05-09 - XSS in react-simple-code-editor
**Vulnerability:** The `react-simple-code-editor` uses a `highlight` prop to convert raw text into HTML. Using `highlight={code => code}` renders user input directly into the DOM unescaped, leading to Cross-Site Scripting (XSS).
**Learning:** `react-simple-code-editor` expects the string returned by `highlight` to be raw HTML that will be rendered using `dangerouslySetInnerHTML` internally.
**Prevention:** Always escape HTML entities (`<`, `>`, `&`, `"`, `'`) when rendering raw user input inside `react-simple-code-editor`. Do not use DOMPurify as it strips HTML tags completely, making the user's code invisible.
