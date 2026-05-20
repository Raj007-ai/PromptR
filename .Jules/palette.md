## 2024-05-24 - Hover-Revealed Buttons Accessibility
**Learning:** Icon-only action buttons (like clear/copy) that rely solely on `opacity-0 group-hover:opacity-100` are completely inaccessible to keyboard users, as they cannot be seen when focused.
**Action:** Always combine `group-hover:opacity-100` with `focus-within:opacity-100` on the container or `focus-visible:opacity-100` directly on the button. Ensure standard `focus-visible:ring-2` focus rings and descriptive `aria-label`s are applied for screen reader support.
