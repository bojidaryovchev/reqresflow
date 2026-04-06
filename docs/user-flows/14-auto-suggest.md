# Auto-Suggest Dropdowns

The app provides helpful dropdown suggestions as you type in input fields.

## Variable Suggestions

1. While typing in any input field (URL, parameters, headers, auth, form fields), type two opening braces: `{{`
2. A dropdown appears below the field showing your available variables.
3. Keep typing after `{{` to filter the list to matching variable names.
4. Click on a suggestion to insert it (the full `{{variableName}}` is inserted).
5. Each suggestion shows the variable name and its current value, so you can pick the right one.
6. If you don't have an environment selected, no suggestions will appear.

## Header Name Suggestions

1. In the **headers** tab, when you type in the "Key" field (the header name):
2. A dropdown appears suggesting common HTTP header names (like Content-Type, Authorization, Cache-Control, etc.).
3. The list filters as you type.
4. Click on a suggestion to insert it.

## How Dropdowns Behave

- The dropdown appears below the input field.
- Click on any suggestion to select it.
- Click anywhere else, or keep typing, to dismiss it.
- The environment name is shown in the dropdown so you know which environment the variables are coming from.
