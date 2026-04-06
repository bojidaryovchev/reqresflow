# Sidebar

The sidebar is the panel on the left side of the app. It has three sections you can switch between: Collections, Flows, and History.

## Switch Sidebar Sections

1. At the top of the sidebar, you'll see three tabs: **Collections**, **Flows**, **History**.
2. Click on one to switch the sidebar view.
3. When you switch to "Flows":
   - The tab bar at the top of the main area shows your flow tabs.
   - The **+** button creates a new flow instead of a new request tab.
4. When you switch to "Collections" or "History":
   - The tab bar shows your request tabs.
   - The **+** button creates a new request tab.

## Resize the Sidebar

1. Hover your mouse over the border between the sidebar and the main area.
2. Your cursor changes to a resize arrow.
3. Click and drag left or right to make the sidebar wider or narrower.
4. The sidebar width stays between a minimum and maximum size.

## Collections Section

- Shows all your saved collections as an expandable list.
- Click a collection name to expand/collapse it and see its requests.
- Each collection has buttons to: add a request (**+**), rename (**✎**), delete (**×**).
- Each request shows: the HTTP method in color, the request name, and buttons to rename, delete, and run (**▶**).
- Requests with multiple payload variants show an expandable sub-list.
- The request you're currently working on is highlighted.
- If you have no collections: *"No collections yet. Click + to create one."*

## History Section

- Shows your recent requests from newest to oldest.
- Each entry shows: method, status code, response time, URL, and timestamp.
- Entries from flows show a badge with the flow name.
- Click an entry to reopen it in a tab.
- Clear all history with the **×** button.
- If history is empty: *"No request history yet. Send a request to see it here."*

## Flows Section

- Shows all your saved flows.
- Each flow shows its name and number of steps.
- Click a flow name to open the editor.
- Each flow has buttons to: rename (**✎**), run (**▶**), delete (**×**).
- Double-click a flow name to rename it inline.
- The flow you're currently editing is highlighted.
- If you have no flows: *"No flows yet. Click + to create one."*

## Quick-Run a Request from the Sidebar

1. In the Collections section, click the **▶** (play) button on any request.
2. The request opens in a tab and is immediately sent.
3. If the request has multiple payload variants:
   - Expand the request to see variants listed below it.
   - Click **▶** on a specific variant to send the request with that variant's body.
