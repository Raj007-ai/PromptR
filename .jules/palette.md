## 2024-05-29 - Accessible Interactive Elements Hidden by Hover

**Learning:** Interactive UI components (like action buttons) that are visually hidden behind `opacity-0 group-hover:opacity-100` classes become inaccessible to users navigating entirely by keyboard, as they can tab to the element but cannot see what has focus.
**Action:** When using group hover visibility patterns, always pair `group-hover:opacity-100` with `focus-within:opacity-100` on the container, and `focus-visible:opacity-100` on the interactive element itself, alongside a clear focus ring (e.g., `focus-visible:ring-2 focus-visible:outline-none`).
