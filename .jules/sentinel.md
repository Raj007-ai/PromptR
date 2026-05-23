## 2024-05-24 - XSS in react-simple-code-editor via highlight prop
**Vulnerability:** XSS vulnerability in `react-simple-code-editor` where user input is passed directly to the `highlight` prop (`highlight={code => code}`). Under the hood, this uses `dangerouslySetInnerHTML`, allowing script injection.
**Learning:** Preventing XSS in code editors like 'react-simple-code-editor' via the 'highlight' prop cannot be done using DOMPurify because it strips HTML tags, causing functional regressions by making code invisible to the user.
**Prevention:** Instead, sanitize input by using an HTML escape function to replace reserved characters (e.g., '<', '>', '&', '"', '\'') with their entity equivalents before returning it from the highlight function.
