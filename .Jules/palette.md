## 2024-05-26 - Accessible Hover Interactions
**Learning:** Icon-only action buttons that rely on Tailwind's `opacity-0 group-hover:opacity-100` pattern are completely inaccessible to keyboard users because they remain visually hidden even when focused.
**Action:** Always pair `group-hover:opacity-100` with `focus-within:opacity-100` on the container or `focus-visible:opacity-100` on the element itself, and include `focus-visible:ring-2` with `outline-none` alongside `aria-label` attributes to ensure semantic and visual accessibility.
