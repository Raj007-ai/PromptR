## 2026-05-25 - Accessible Hover Actions
**Learning:** Icon-only action buttons that rely on `opacity-0 group-hover:opacity-100` are inaccessible to keyboard users because they remain invisible on focus.
**Action:** Always combine `group-hover:opacity-100` with `focus-within:opacity-100` on the container or `focus-visible:opacity-100` on the button itself, and ensure they have standard focus rings (`outline-none focus-visible:ring-2`) and `aria-label` attributes.
