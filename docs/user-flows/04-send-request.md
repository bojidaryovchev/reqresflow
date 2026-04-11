# Sending a Request

## Send a Request

1. Make sure you have a URL entered.
2. Click the **Send** button (or press Enter while the URL field is focused).
3. The button changes to "Sending..." while the request is in progress.
4. The app does the following behind the scenes:
   - Replaces any `{{variables}}` in the URL, headers, body, and auth fields with their actual values from the active environment
   - Adds your query parameters to the URL
   - Adds the appropriate headers (including auth if configured)
   - Prepares the body content based on your chosen body type
   - Sends the request to the server
5. When the response comes back:
   - The response appears in the lower panel
   - Any capture rules you set up are applied (values are saved to your environment)
   - The request is recorded in your History
6. If something goes wrong (bad URL, server unreachable, etc.):
   - An error message appears in the response panel in red

## View the Response

1. After sending a request, the response panel shows two tabs: **body** and **headers**.
2. At the top of the response panel you'll see:
   - The **status code** (e.g., 200 OK) — color-coded:
     - Green for success (200–299)
     - Yellow for redirects (300–399)
     - Red for errors (400+)
   - **Response time** (e.g., "150ms")
   - **Response size** (e.g., "2.3 KB")

3. **Response Body tab:**
   - Shows the response content with syntax highlighting
   - JSON responses are automatically formatted for readability
   - The app auto-detects the format (JSON, XML, HTML, etc.)
   - Click **Copy** to copy the entire response body
   - Toggle word wrap on/off

4. **Response Headers tab:**
   - Shows all the headers the server sent back as a table
   - Click **Copy** to copy all headers

## Resize the Request/Response Panels

1. Hover your mouse over the border between the request section and the response section (the divider above "Response Body" / "Response Headers").
2. Your cursor changes to a vertical resize arrow.
3. Click and drag up or down to give more space to the request or response panel.
4. Both panels keep a minimum height so neither can be completely collapsed.

## How Captures Work After Sending

1. If you set up captures (in the "captures" tab) and have an environment selected:
2. After a successful response, each enabled capture extracts a value:
   - **Body** captures: pull a value from the response body (e.g., if you set path to `data.token`, it grabs the token from the JSON response)
   - **Header** captures: pull the value of a specific response header
   - **Status** captures: grab the status code (like "200")
3. The extracted values are saved into your active environment as variables.
4. Those variables are then available for use in other requests via `{{variableName}}`.
