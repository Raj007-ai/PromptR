## 2024-05-23 - Focus Accessibility for Hover-Visible Elements
**Learning:** Icon-only buttons that are conditionally revealed using `opacity-0 group-hover:opacity-100` are completely inaccessible to keyboard users because they remain invisible on tab focus.
**Action:** Always combine `group-hover:opacity-100` with `focus-within:opacity-100` on the container or `focus-visible:opacity-100` directly on the button, alongside proper `focus-visible:ring-2` styles and `aria-label` attributes to ensure keyboard accessibility.
