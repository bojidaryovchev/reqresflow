# Payload Variants

Payload variants let you save multiple versions of a request body for the same request. For example, you might have one variant with valid data and another with invalid data to test error handling.

## Create a Payload Variant

1. Open the **body** tab for your request.
2. You'll see a bar with your current payload ("Default").
3. Click the **+** button on that bar.
4. A new variant is created (named "Payload 2", "Payload 3", etc.).
5. It starts empty — you can type different body content in it.

## Switch Between Variants

1. In the body tab, click on the variant tab you want to edit.
2. The body editor updates to show that variant's content.
3. Each variant keeps its own body content independently.

## Rename a Variant

1. Select the variant by clicking its tab.
2. On the right side of the payload bar, you'll see a name field.
3. Type the new name (e.g., "Valid User", "Missing Email", etc.).
4. If this request is saved to a collection, the name is updated there too.

**You can also rename from the sidebar:**

1. Find the request in a collection and expand it to see its variants.
2. Double-click a variant name, or click the pencil icon (**✎**).
3. Type the new name and press Enter.

## Remove a Variant

1. Click the **×** button on the variant tab you want to remove.
2. You can't remove the last variant — every request must have at least one.
3. If you remove the variant you were currently editing, the first remaining variant becomes active.

## Run a Specific Variant from the Sidebar

1. In the Collections section, find a request that has multiple variants.
2. The variants are listed below the request name when expanded.
3. Click on a variant name to open the request with that variant selected (and switch to the body tab).
4. Click the **▶** (play) button on a variant to open the request with that variant AND immediately send it.

## Use a Variant in a Flow Step

1. Add a request with multiple variants as a step in a flow.
2. Click the step to expand its details.
3. A **Payload Variant** dropdown appears listing all available variants.
4. By default it uses the request's active payload. Select a specific variant to override.
5. This lets you run the same request with different bodies at different points in a flow.
