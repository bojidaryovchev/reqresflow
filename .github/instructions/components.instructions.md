---
description: "Use when creating or modifying React components in the components folder, including Sidebar, EnvManager, KeyValueEditor, or AutoSuggestInput."
applyTo: "src/components/**"
---

# Component Patterns

## Rule: No Local State Management

Components receive ALL data as props from App.tsx and call callbacks to modify state.
Never use `useState` for app-level data in components — only for local UI state (e.g., dropdown open/closed).

## Existing Components

### Sidebar.tsx (~400 lines)

- Two tabs: Collections and History
- Collections: nested list with expand/collapse, CRUD actions
- History: flat list of past requests with status badges
- Props: collections, history, callbacks for load/save/delete

### EnvManager.tsx (~200 lines)

- Modal with environment list (left) + variable editor (right)
- Props: environments, activeEnvId, callbacks for CRUD

### KeyValueEditor.tsx (~300 lines)

- Reusable for params, headers, form-data
- Has `headerMode` prop for header-specific autosuggest
- Each row: enabled checkbox, key input, value input, remove button

### AutoSuggestInput.tsx (~300 lines)

- Input with `{{variable}}` detection and dropdown
- Also supports plain suggestions (header names/values)
- Portal-based dropdown, keyboard navigation
- Green highlighting overlay for `{{variables}}`

## Creating a New Component

1. Create `src/components/MyComponent.tsx`
2. Define a Props interface with all needed data + callbacks
3. Import in App.tsx, pass state/callbacks as props
4. Keep component focused on rendering — business logic stays in App.tsx
