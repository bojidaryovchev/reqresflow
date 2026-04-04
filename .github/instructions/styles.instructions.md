---
description: "Use when working on styles, theming, colors, layout, CSS, or visual appearance of the app."
applyTo: "src/index.css"
---

# Styling Patterns

## Single CSS File

All styles live in `src/index.css`. No CSS modules, no styled-components, no Tailwind.

## Color Scheme (VS Code Dark Theme)

- Backgrounds: `#1e1e1e` (primary), `#252526` (secondary), `#2d2d2d` (tertiary)
- Borders: `#3e3e3e` (light), `#1a1a1a` (dark)
- Text: `#cccccc` (primary), `#999999` (secondary), `#ffffff` (bright)
- Accent: `#0078d4` (VS Code blue)
- Hover: `#2a2d2e`, Focus: `#094771`

## Method Color Classes

- `.method-get` → `#61affe` (blue)
- `.method-post` → `#49cc90` (green)
- `.method-put` → `#fca130` (orange)
- `.method-patch` → `#9b59b6` (purple)
- `.method-delete` → `#f93e3e` (red)

## Status Color Classes

- `.status-success` (2xx) → green
- `.status-redirect` (3xx) → orange
- `.status-client-error` (4xx) → red
- `.status-server-error` (5xx) → red

## Naming Convention

Use descriptive class names matching the component structure: `.request-tab-item`, `.sidebar-collections`, `.env-manager-modal`, etc.
