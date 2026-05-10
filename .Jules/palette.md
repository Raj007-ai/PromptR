## 2026-05-10 - Focus Visibility for Hover Buttons
**Learning:** Icon-only action buttons that rely on `opacity-0 group-hover:opacity-100` for visibility become completely inaccessible to keyboard users because they remain invisible when focused.
**Action:** Always combine `group-hover:opacity-100` with `focus-within:opacity-100` on the container or `focus-visible:opacity-100` on the button itself, alongside standard focus rings (`outline-none focus-visible:ring-2`).
