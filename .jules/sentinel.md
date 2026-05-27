
## 2024-05-27 - [Fix Exposed Secrets in Vite configuration]
**Vulnerability:**
The `vite.config.ts` exposed the server-side environment variables via a `define` block which compiles them statically into the frontend bundle. This allowed malicious actors to steal API Keys by simply downloading and inspecting the frontend code.

**Learning:**
Never inject secure tokens or secrets into client-side code via configuration directives like `define`. If client-side requests must authenticate with a third party service, use a backend proxy.

**Prevention:**
Always utilize backend proxy middleware (like Vite's `server.proxy` or a standalone backend) to append sensitive headers server-side.
