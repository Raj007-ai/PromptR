## 2024-05-06 - XSS Vulnerability in react-simple-code-editor
**Vulnerability:** The `react-simple-code-editor` components were using `highlight={code => code}`, which rendered user input directly without sanitization, leading to an XSS vulnerability.
**Learning:** Using `DOMPurify` to sanitize HTML strips HTML tags and breaks functionality by making code invisible to users in the editor.
**Prevention:** Instead of stripping tags, sanitize input by using an HTML escape function to replace reserved characters (`<`, `>`, `&`, `"`, `'`) with their entity equivalents.
