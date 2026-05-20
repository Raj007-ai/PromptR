## 2024-05-18 - Prevent XSS in react-simple-code-editor
**Vulnerability:** XSS vulnerability through `react-simple-code-editor` component via user input rendering in the `highlight` prop.
**Learning:** `react-simple-code-editor` inherently renders output via its `highlight` prop, bypassing typical React protections against XSS. Using standard escaping is essential. However, using DOMPurify strips HTML tags making code invisible to the user.
**Prevention:** Sanitize input using an HTML escape function to replace reserved characters (`<`, `>`, `&`, `"`, `'`) with their entity equivalents instead of stripping tags.
