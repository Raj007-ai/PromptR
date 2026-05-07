## 2024-05-15 - [XSS in Code Editors using highlight prop]
**Vulnerability:** XSS vulnerability in `react-simple-code-editor` component caused by passing unescaped user input `code` directly to the `highlight` prop.
**Learning:** Using `DOMPurify` to sanitize the `highlight` prop strips HTML tags entirely, causing functional regressions by making code invisible to the user.
**Prevention:** Sanitize input in code editors by using an HTML escape function to replace reserved characters (`<`, `>`, `&`, `"`, `'`) with their entity equivalents instead of using full DOM sanitizers like DOMPurify.
