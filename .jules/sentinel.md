## 2024-05-26 - XSS vulnerability in react-simple-code-editor highlight prop
**Vulnerability:** XSS vulnerability in react-simple-code-editor because the `highlight` prop returned unescaped input (`code => code`).
**Learning:** Returning unescaped code string in Editor's highlight prop allows executing arbitrary javascript in the browser. Using DOMPurify is not recommended because it strips HTML tags, breaking user code visibility.
**Prevention:** Always escape HTML entities like '<', '>', '&', '"', '\'' using a manual escape function when rendering text in `react-simple-code-editor` highlight prop.
