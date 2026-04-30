## 2026-04-30 - Add ARIA labels to icon-only buttons
**Learning:** Icon-only interactive elements in custom React components often miss ARIA labels, making them inaccessible to screen readers. Relying solely on SVG icons visually is not sufficient.
**Action:** Always ensure `aria-label` (and consider `title` for sighted users on hover) is added to buttons or interactive elements that lack text content.
