# Flows (Multi-Step Request Sequences)

Flows let you chain multiple requests together and run them in order. This is useful for testing workflows like "log in, then fetch user data, then update a setting" where each step may depend on values from the previous step.

## Create a New Flow

1. In the left sidebar, click the **Flows** tab.
2. Click the **+** button next to the "Flows" header.
3. A new flow called "New Flow" is created with no steps.
4. The flow editor opens automatically.

## Edit a Flow

1. Click a flow name in the sidebar to open its editor.
2. In the editor, you can:
   - Change the flow name using the name field at the top.
   - See all the steps listed in order.

## Add Steps to a Flow

1. In the flow editor, click **Add Step**.
2. A picker shows all your collections and their saved requests.
3. Click on a request to add it as a step.
4. The step appears in the list showing: step number, method, request name, collection name.
5. You can add as many steps as you need.

## Reorder Steps

1. Use the up/down arrow buttons on each step to move it in the sequence.

## Remove a Step

1. Click the remove button on the step you want to delete.

## Configure Step Options

1. Click on a step to expand its details.
2. **"Continue on Error" toggle:**
   - **OFF** (default): If this step fails, the flow stops and skips all remaining steps.
   - **ON**: If this step fails, the flow continues to the next step anyway.
3. **Step Captures:** You can add extra capture rules to a step.
   - These work on top of any captures already defined in the saved request.
   - Captured values are available to all subsequent steps in the flow.

## Save a Flow

1. Click **Save** in the flow editor.
2. The flow is saved, and the unsaved indicator (**●**) on the tab disappears.

## Rename a Flow

- **In the editor:** change the name in the name field.
- **In the sidebar:** click the pencil icon (**✎**), or double-click the flow name. Type the new name and press Enter.

## Delete a Flow

1. In the sidebar, click the **×** icon on the flow.
2. The flow is deleted. If its tab was open, the tab closes automatically.

## Duplicate a Flow

1. Right-click on a flow tab at the top of the screen.
2. Click **Duplicate Flow**.
3. A copy of the flow is created with "(copy)" added to the name.
4. The copy opens in a new tab.

## Run a Flow

1. Click the **Run** button in the flow editor, or the **▶** button on the flow in the sidebar.
2. The view switches to the flow runner, which shows progress in real time.
3. The app runs each step in order:
   - It builds and sends the request using current environment variables.
   - If a step has captures, the captured values are saved to your environment and become available to the next steps.
   - Each step's result (success, error, or skipped) is shown as it completes.
4. If a step fails and "Continue on Error" is off, the remaining steps are skipped.
5. After all steps finish, the environment is updated with any captured values.
6. Each successful step is also added to your History.

## Abort a Running Flow

1. While a flow is running, click the **Abort** button.
2. The current step finishes (it can't be cancelled mid-request).
3. All remaining steps are marked as "skipped".
4. The flow shows as "aborted".

## View Flow Results

1. After a flow finishes, the runner shows:
   - Overall status: completed or aborted
   - Total time for the entire flow
   - A list of all steps with their results
2. Each step shows:
   - The request name and method
   - A status icon: **✓** (success), **✗** (error), or **○** (skipped)
   - How long that step took
3. Click on a step to expand its details:
   - **Response** tab: the response body, status, headers
   - **Request** tab: the actual URL, headers, and body that were sent
   - **Captures** tab: what values were captured and saved

## Close the Flow Runner

1. Click **Close** in the runner.
2. The tab goes back to the flow editor.
3. The last run results are remembered for reference.
