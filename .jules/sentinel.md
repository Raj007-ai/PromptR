## 2025-02-27 - XSS in react-simple-code-editor via highlight prop
**Vulnerability:** XSS vulnerability through unsanitized user input in `react-simple-code-editor` component via the `highlight={code => code}` prop.
**Learning:** Preventing XSS in code editors using the `highlight` prop is tricky. Using standard sanitization tools like DOMPurify directly within the highlight function strips HTML tags entirely. While this is secure, it causes significant functional regressions by making user-inputted code invisible.
**Prevention:** Instead of using DOMPurify for code editors, sanitize input by using an HTML escape function to replace reserved characters (e.g., `<`, `>`, `&`, `"`, `'`) with their entity equivalents.
