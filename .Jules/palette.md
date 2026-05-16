## 2025-05-16 - Make icon-only buttons accessible

**Learning:** Icon-only action buttons that rely on `opacity-0 group-hover:opacity-100` are inaccessible to keyboard users because they cannot be seen when focused via the keyboard.

**Action:** Always combine `group-hover:opacity-100` with `focus-within:opacity-100` on the container or `focus-visible:opacity-100` on the button itself, alongside standard focus rings.
