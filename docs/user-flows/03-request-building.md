# Building a Request

## Choose the HTTP Method

1. In the URL bar, click the method dropdown on the left (it says "GET" by default).
2. Pick the method you want:
   - **GET** — retrieve data (shown in green)
   - **POST** — send/create data (shown in yellow)
   - **PUT** — replace data (shown in blue)
   - **PATCH** — partially update data (shown in orange)
   - **DELETE** — remove data (shown in red)

## Enter the URL

1. Click the URL input field (it says "Enter request URL...").
2. Type or paste the URL you want to call (e.g., `https://api.example.com/users`).
3. You can use environment variables in the URL by typing `{{variableName}}`.
   - As you type `{{` a dropdown will suggest matching variables.
4. If your URL has query parameters (the part after `?`), they are automatically extracted and shown in the Params tab below.

## Edit Query Parameters

1. Click the **params** tab below the URL bar.
2. You'll see rows where you can add key-value pairs.
3. For each parameter:
   - Check/uncheck the checkbox to enable or disable it
   - Type the parameter name in the "Key" field
   - Type the value in the "Value" field
   - Click **×** to remove a row
4. As you add or change parameters, the URL automatically updates to include them.
5. Disabled parameters are excluded from the URL but kept for later use.
6. You can use `{{variables}}` in both keys and values.

## Edit Request Headers

1. Click the **headers** tab.
2. Add header rows just like parameters: checkbox, key, value, remove button.
3. When typing a header name, the app suggests common headers (like Content-Type, Authorization, etc.).
4. You can use `{{variables}}` in both header names and values.
5. Below your headers, you'll see "Auto-generated headers" that the app adds by default:
   - `User-Agent: ReqResFlow/1.0`
   - `Accept: */*`
   - `Accept-Encoding: gzip, deflate, br`
   - `Connection: keep-alive`
   - `Content-Type` (shown when you have a body)
6. If you add a header with the same name as an auto-generated one, yours takes priority.

## Set the Request Body

1. Click the **body** tab.
2. Choose a body type by clicking one of the radio buttons:

   - **none** — no body will be sent (default for GET requests)

   - **raw** — type the body content directly
     - Pick a language from the dropdown: JSON, Text, XML, HTML, or JavaScript
     - Type or paste your content in the editor
     - For JSON, there's a "Format" button to auto-indent your JSON
     - You can use `{{variables}}` in the body

   - **form-data** — like filling out a web form with multiple fields
     - Add rows with key and value
     - Each row can be "Text" or "File" type
     - Click **+ Add** to add more fields
     - You can use `{{variables}}` in keys and values

   - **x-www-form-urlencoded** — similar to form-data but in URL-encoded format
     - Add key-value rows just like form-data

   - **binary** — send a file as the body
     - Type the full file path (e.g., `C:\files\image.png`)

   - **graphql** — for GraphQL APIs
     - Type your GraphQL query in the top editor
     - Type variables as JSON in the bottom editor
     - You can use `{{variables}}` in both sections

## Use Payload Variants

1. In the body tab, you'll see a payload bar with tabs (starting with "Default").
2. Click **+** to add another payload variant (e.g., for testing different inputs).
3. Each variant stores its own body content independently.
4. Click between payload tabs to switch which body content you're editing.
5. You can rename a variant by editing the name field on the right.
6. Click **×** on a variant tab to remove it (you can't remove the last one).

## Set Up Authentication

1. Click the **auth** tab.
2. Choose an auth type from the dropdown:

   - **No Auth** — no authentication (default)

   - **Bearer Token** — for APIs that use token-based auth
     - Paste your token, or type `{{variableName}}` to use a variable
     - The app will send it as: `Authorization: Bearer <your-token>`

   - **Basic Auth** — for APIs that use username/password
     - Enter your username and password (or use `{{variables}}`)
     - The app will send it as: `Authorization: Basic <encoded-credentials>`

## Set Up Response Captures

1. Click the **captures** tab.
2. If you don't have an environment selected, you'll see a warning — select one first.
3. Click **+ Add Capture** to create a new capture rule.
4. For each capture, configure:
   - Check/uncheck to enable or disable it
   - **Variable name** — the name of the environment variable to store the value in
   - **Source** — where to extract the value from:
     - **Body (JSON path)** — extract a value from the response body (e.g., type `data.token` to get the token field inside data)
     - **Header** — extract a response header value (e.g., type `x-request-id` to get that header)
     - **Status code** — capture the HTTP status code (like 200, 404, etc.)
5. Click **×** to remove a capture.
6. Captures run automatically every time you send the request.
