## 2024-05-30 - [CRITICAL] Prevent API Key Exposure in Frontend Bundle
**Vulnerability:** The `vite.config.ts` file was using the `define` option to inject `process.env.GEMINI_API_KEY` directly into the client bundle. This exposes the secret API key to anyone who views the source code of the web application.
**Learning:** Hardcoding or injecting backend secrets directly into frontend applications built with Vite exposes them.
**Prevention:** Remove the injection from `vite.config.ts`. Instead, configure a Vite proxy server (`server.proxy`) in development that catches API requests, attaches the secret key as an `x-goog-api-key` header server-side, and forwards it to the upstream API. In production, an actual backend server or serverless function is required to perform this proxying.
