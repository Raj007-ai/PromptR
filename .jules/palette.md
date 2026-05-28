## 2024-05-28 - Keyboard Accessible Hidden Actions
**Learning:** Icon-only action buttons that rely on `opacity-0 group-hover:opacity-100` are inaccessible to keyboard users because they remain visually hidden when focused via Tab.
**Action:** Always combine `group-hover:opacity-100` with `focus-within:opacity-100` on the container or `focus-visible:opacity-100` on the button itself, alongside standard focus rings (`focus-visible:ring-2 focus-visible:outline-none`) and `aria-label`s.
