## 2025-05-22 - Prevent XSS in react-simple-code-editor
**Vulnerability:** XSS vulnerability in `react-simple-code-editor`'s `highlight` prop, allowing arbitrary code execution through the `code => code` callback returning unsanitized HTML/JS.
**Learning:** `react-simple-code-editor` passes user input directly to the DOM if the `highlight` function doesn't sanitize or escape the content. Because the app uses `code => code`, malicious input like `<img src=x onerror=alert(1)>` gets rendered. `DOMPurify` breaks the editor's functionality by stripping tags needed for display.
**Prevention:** Use a basic HTML escaping function inside the `highlight` prop to convert special characters (`<`, `>`, `&`, `"`, `'`) to their HTML entity equivalents before returning the string.
