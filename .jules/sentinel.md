## 2024-05-04 - [react-simple-code-editor XSS Vulnerability]
**Vulnerability:** XSS vulnerability in `react-simple-code-editor` component via implicit `dangerouslySetInnerHTML`.
**Learning:** When using `react-simple-code-editor`, the `highlight` prop allows executing user code if the returned highlighted text is rendered directly or wrapped through `dangerouslySetInnerHTML`. Using a library like DOMPurify removes actual tags the user inputs, breaking the editor.
**Prevention:** Sanitize the text input being highlighted using an HTML escape function before returning it.
