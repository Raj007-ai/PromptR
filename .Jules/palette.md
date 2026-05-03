## 2024-05-03 - Icon-only buttons lacking ARIA labels
**Learning:** In this application, several icon-only buttons (like `ThemeToggle` and `ShareModal` actions) frequently rely on visual context or HTML `title` attributes rather than semantic `aria-label`s and `focus-visible` keyboard styles. This creates a barrier for screen reader users and keyboard navigators.
**Action:** Always verify that icon-only interactive elements contain explicit `aria-label` attributes and visible focus rings (`focus-visible:ring-2`) during component creation.
