## 2026-05-11 - XSS in react-simple-code-editor
**Vulnerability:** XSS vulnerability in `react-simple-code-editor` due to returning raw, unsanitized user input in the `highlight` prop.
**Learning:** `react-simple-code-editor` does not automatically escape HTML. Using `highlight={code => code}` allows raw HTML/scripts to be injected into the DOM, executing XSS. DOMPurify breaks functionality by stripping tags (making code invisible).
**Prevention:** Sanitize the input in the `highlight` prop by mapping reserved characters (`<`, `>`, `&`, `"`, `'`) to their HTML entities.
