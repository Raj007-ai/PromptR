## 2024-05-13 - Hidden action buttons keyboard accessibility
**Learning:** Icon-only action buttons that rely on `opacity-0 group-hover:opacity-100` are inaccessible to keyboard users because standard tabbing won't reveal them on focus, creating a confusing and hidden interaction.
**Action:** Always combine `group-hover:opacity-100` with `focus-within:opacity-100` on the container or `focus-visible:opacity-100` on the button itself. Additionally, apply standard focus rings (`focus-visible:ring-2`) and ensure clear `aria-label`s are provided.
