## 2024-06-03 - XSS in react-simple-code-editor
**Vulnerability:** XSS vulnerability through `dangerouslySetInnerHTML` caused by standard usage of `highlight={code => code}` in `react-simple-code-editor`.
**Learning:** We must not use DOMPurify to strip tags here because it destroys the functionality of the code editor by making code with angle brackets invisible to the user.
**Prevention:** Use character entity replacement (escaping `<, >, &, ", '`) instead of tag stripping for safe and functional code editors.
