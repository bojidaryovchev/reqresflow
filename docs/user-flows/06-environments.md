# Environments

Environments let you store reusable values (like API URLs, tokens, and credentials) that you can plug into any request using `{{variableName}}` syntax.

## Select an Environment

1. Look at the top bar, just above the URL field.
2. Click the environment dropdown.
3. Choose an environment from the list.
   - Or choose "No Environment" to deactivate variable substitution.
4. The selected environment's variables are now available in all your requests.

## Open the Environment Manager

1. Click the **Manage** button next to the environment dropdown.
2. A popup window appears where you can create, edit, and delete environments.

## Create an Environment

1. Open the Environment Manager (click "Manage").
2. Click **Add Environment**.
3. A new environment appears called "New Environment" with one empty variable.
4. It's automatically selected for editing.

## Delete an Environment

1. Open the Environment Manager.
2. Click the delete button on the environment you want to remove.
3. The environment is deleted.
4. If it was your active environment, the app switches to the first remaining one (or "No Environment" if none are left).

## Rename an Environment

1. Open the Environment Manager.
2. Click on the environment's name.
3. Type the new name.
4. Changes are saved automatically.

## Add a Variable

1. Open the Environment Manager.
2. Select the environment you want to edit.
3. Click **Add Variable**.
4. A new empty row appears with Key and Value fields.
5. Type the variable name in "Key" (e.g., `baseUrl`).
6. Type the value in "Value" (e.g., `https://api.example.com`).

## Edit a Variable

1. Open the Environment Manager.
2. Select the environment.
3. Change the Key or Value in any row.
4. Changes are saved automatically.

## Remove a Variable

1. Open the Environment Manager.
2. Click the remove button on the variable row you want to delete.

## Close the Environment Manager

1. Click the **×** button in the top-right of the popup.
2. Or click anywhere outside the popup.
3. All your changes have already been saved.

## Using Variables in Requests

1. In any input field (URL, params, headers, auth, body), type `{{variableName}}`.
2. When you send the request, the app replaces `{{variableName}}` with the actual value from your active environment.
3. For example:
   - If your environment has: `baseUrl` = `https://api.example.com`
   - And you type: `{{baseUrl}}/users`
   - The request is sent to: `https://api.example.com/users`
4. If no matching variable is found, the `{{name}}` text is sent as-is.

## Variable Auto-Suggest

1. When typing in any input field, type `{{` (two opening braces).
2. A dropdown appears showing all variables from your active environment.
3. As you keep typing, the list filters to match what you've typed.
4. Click on a variable to insert it.
5. Each suggestion shows both the variable name and its current value.
6. If no environment is active, no suggestions appear.
