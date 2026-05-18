## 2024-05-15 - XSS in react-simple-code-editor via highlight prop
**Vulnerability:** The `react-simple-code-editor` component in `App.tsx` used `highlight={code => code}` which renders raw user input directly to the DOM, creating a severe Cross-Site Scripting (XSS) vulnerability.
**Learning:** `react-simple-code-editor` injects the output of the `highlight` function directly into an HTML element. Standard DOMPurify cannot be used here because it strips HTML tags completely, making code invisible to the user.
**Prevention:** Always sanitize input for code editors using an HTML escape function to replace reserved characters (e.g., '<', '>', '&', '"', '\'') with their entity equivalents instead of full HTML sanitizers.
