## 2024-05-18 - Keyboard Accessibility for Hover-Revealed Buttons
**Learning:** Icon-only action buttons that rely exclusively on `opacity-0 group-hover:opacity-100` are completely inaccessible to keyboard users, as hovering is not possible via keyboard navigation.
**Action:** Always combine `group-hover:opacity-100` with `focus-within:opacity-100` on the container or `focus-visible:opacity-100` on the button itself, and ensure proper `focus-visible:ring` and `aria-label` attributes are present.
