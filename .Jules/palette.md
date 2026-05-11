## 2024-05-11 - Icon-only Buttons Keyboard Accessibility
**Learning:** Icon-only action buttons that rely on `opacity-0 group-hover:opacity-100` are inaccessible to keyboard users because they remain hidden when focused.
**Action:** Always combine `group-hover:opacity-100` with `focus-within:opacity-100` on the parent container (or `focus-visible:opacity-100` on the button itself), and add `focus-visible:ring-2` to provide clear keyboard focus indicators.
