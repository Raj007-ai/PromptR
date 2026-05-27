## 2024-05-24 - Interactive Elements Hidden by Opacity Need Focus Visible Fallbacks
**Learning:** Icon-only action buttons hidden behind `opacity-0 group-hover:opacity-100` are invisible to keyboard users when navigating.
**Action:** When using `group-hover:opacity-100` to show actions on hover, ensure keyboard accessibility by applying `focus-within:opacity-100` to the container and `focus-visible:ring-2 outline-none` to the button itself, or `focus-visible:opacity-100` directly on the button. Additionally, always provide an `aria-label` for screen reader context on icon-only buttons.
