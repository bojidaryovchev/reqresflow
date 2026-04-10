# History

Every request you send is automatically recorded in your History.

## Automatic Recording

1. Every time you send a request (successfully or not), it gets added to your History.
2. Each history entry records:
   - The HTTP method (GET, POST, etc.)
   - The URL you called
   - The response status (200, 404, etc.) and time — or "ERR" for failed requests
   - A full snapshot of how the request was configured at that moment
   - The resolved request that was actually sent (after generators / environment substitution)
   - The full response (status, headers, body)
   - Any values captured by response captures
   - If it was part of a flow, the flow's name
3. History keeps the last 100 entries. Older entries are removed automatically.

## View Your History

1. In the left sidebar, click the **History** tab.
2. Your recent requests are listed from newest to oldest.
3. Each entry shows:
   - The HTTP method in color (e.g., green GET, yellow POST)
   - The response status code (green for success, red for errors, "ERR" for failures)
   - How long the response took (e.g., "150ms") — or "—" for failed requests
   - The URL
   - When it was sent (time if today, or date + time if older)
   - A badge with the flow name if it came from a flow

## View History Entry Details

1. Click on any history entry in the sidebar.
2. The selected entry is highlighted and a detail panel appears in the main area.
3. The detail panel header shows:
   - The HTTP method and URL
   - The response status code and response time
   - The timestamp of when the request was sent
4. The detail panel has three tabs:
   - **Response** — Shows the full response body (with syntax highlighting for JSON/XML/HTML) and response headers.
   - **Request** — Shows the resolved URL, method, headers, and body that were actually sent (after generator / environment variable substitution).
   - **Captures** — Shows any values that were extracted from the response by your capture rules.
5. If the entry was recorded before this feature existed, the panel shows a message that execution details are not available.
6. Click the **×** button in the detail panel header to close it.

## Replay a History Entry

From the detail panel, two replay buttons are available:

1. **▶ Replay Exact** — Loads the original request configuration into a new tab and immediately sends the request. This replays the exact same payload that was originally sent.
2. **↗ Open as New Request** — Loads the original request configuration into a new tab without sending. Generators and environment variables will be re-evaluated when you send, so the actual payload may differ.

## Clear All History

1. In the History section, click the **×** button next to the "History" header.
2. All history entries are permanently deleted.
