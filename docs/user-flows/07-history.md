# History

Every request you send is automatically recorded in your History.

## Automatic Recording

1. Every time you successfully send a request, it gets added to your History.
2. Each history entry records:
   - The HTTP method (GET, POST, etc.)
   - The URL you called
   - The response status (200, 404, etc.) and time
   - A full snapshot of how the request was configured at that moment
   - If it was part of a flow, the flow's name
3. History keeps the last 100 entries. Older entries are removed automatically.

## View Your History

1. In the left sidebar, click the **History** tab.
2. Your recent requests are listed from newest to oldest.
3. Each entry shows:
   - The HTTP method in color (e.g., green GET, yellow POST)
   - The response status code (green for success, red for errors)
   - How long the response took (e.g., "150ms")
   - The URL
   - When it was sent (time if today, or date + time if older)
   - A badge with the flow name if it came from a flow

## Reopen a History Entry

1. Click on any history entry in the sidebar.
2. If you already have that entry open in a tab, the app just switches to it.
3. Otherwise, a new tab opens with the request pre-filled exactly as it was when you originally sent it.
4. You can modify and re-send it from there.
5. Note: The original response is NOT shown — you need to send again to get a new response.

## Clear All History

1. In the History section, click the **×** button next to the "History" header.
2. All history entries are permanently deleted.
