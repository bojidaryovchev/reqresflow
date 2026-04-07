# Response Captures — A Complete Walkthrough

Captures let you grab values from a response and save them as variables. This is how you chain requests together — for example, log in first, capture the token, then use that token in the next request.

## Example: Login and Then Fetch User Data

### Step 1: Set Up Your Environment

1. Click **Manage** next to the environment dropdown.
2. Create an environment called "Dev".
3. Add a variable: Key = `baseUrl`, Value = `https://api.example.com`.
4. Close the manager.
5. Select "Dev" from the environment dropdown.

### Step 2: Create the Login Request

1. Click **+** to open a new tab.
2. Set method to **POST**.
3. Type `{{baseUrl}}/auth/login` in the URL field.
4. Go to the **body** tab.
5. Select "raw" and pick "JSON" from the language dropdown.
6. Type:
   ```json
   { "username": "admin", "password": "secret" }
   ```
7. Go to the **captures** tab.
8. Click **+ Add Capture**.
9. Set: Variable name = `token`, Source = "Body (JSON path)", Path = `data.token`.
10. Click **+ Add Capture** again.
11. Set: Variable name = `userId`, Source = "Body (JSON path)", Path = `data.user.id`.

### Step 3: Send the Login Request

1. Click **Send**.
2. The response comes back, for example:
   ```json
   { "data": { "token": "abc123", "user": { "id": "42" } } }
   ```
3. The captures automatically extract the values:
   - `token` is set to `abc123` in your Dev environment
   - `userId` is set to `42` in your Dev environment
4. These variables are now available for any other request.

### Step 4: Create a Request That Uses the Captured Values

1. Open a new tab.
2. Set method to **GET**.
3. Type `{{baseUrl}}/users/{{userId}}` in the URL field.
4. Go to the **auth** tab.
5. Select "Bearer Token" and type `{{token}}` in the token field.
6. Click **Send**.
7. The app replaces the variables:
   - URL becomes: `https://api.example.com/users/42`
   - Auth header becomes: `Authorization: Bearer abc123`
8. The response comes back with the user data.

## Capture Source Types

### Body (JSON path)

- Grabs a value from the response body.
- Use dot notation to navigate into the JSON, e.g.:
  - `data.token` → gets the "token" inside "data"
  - `items.0.id` → gets the "id" of the first item in the "items" array
- If the path doesn't match anything, an empty value is saved.
- If the response isn't valid JSON, an empty value is saved.

### Header

- Grabs the value of a specific response header.
- Type the header name (e.g., `x-request-id`).
- The match is case-insensitive (`X-Request-ID` and `x-request-id` both work).

### Status code

- Grabs the HTTP status code as text (e.g., "200", "404").
- No path is needed.

## Captures in Flows

1. When running a flow (multi-step sequence), each step can have its own captures.
2. Values captured in one step are immediately available to the next step.
3. For example: Step 1 captures a token, Step 2 uses `{{token}}` in its auth header.
4. After the flow finishes, all captured values are saved to your environment permanently.
