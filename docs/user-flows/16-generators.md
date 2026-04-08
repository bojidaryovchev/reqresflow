# Generators (Dynamic Value Generation)

Generators let you produce fresh, dynamic values — like random emails, UUIDs, or test credit card numbers — every time you send a request. They run inside a Docker container that you point the app at, and you use them in your requests with `{{$generatorName}}` syntax.

## Prerequisites

- **Docker** must be installed and running on your machine.
- You need a generator project folder (a directory with a `Dockerfile` and generator scripts). ReqResFlow ships with an example project in the `examples/generators/` folder that you can use as a starting point.

## Open the Generators Panel

1. In the left sidebar, click the **Generators** tab.
2. If no project is connected yet, you see a short explanation and a button to get started.

## Connect a Generator Project

1. Click **Select Generator Project**.
2. A folder picker opens — navigate to your generator project folder and select it.
3. The folder path appears under "Project" in the sidebar.

## Build and Start the Container

1. After selecting a project, click **Build & Start**.
2. The button changes to "Building..." while Docker builds the image.
3. You can watch the build progress in the **Container Logs** panel (it opens automatically).
4. Once the image is built, the container starts automatically.
5. The status dot turns **green** and shows "running" when everything is ready.
6. The **Available Generators** list appears, showing all the generators found in your project.

## Check the Container Status

The status indicator next to "Status" tells you what's going on:

- **Green dot + "running"**: The container is up and healthy. Generators are ready to use.
- **Yellow dot + "starting"**: The container is being started. Wait a moment.
- **Red dot + "error"**: Something went wrong. Check the error message shown below the status.
- **Gray dot + "stopped"**: The container isn't running. Click "Build & Start" to start it.

The app checks the container health every 5 seconds, so if it crashes, the status updates automatically.

## View Available Generators

1. When the container is running, scroll down in the Generators panel.
2. Under **Available Generators**, you see a list of all generators with their names and descriptions.
3. Each name is shown with a `$` prefix (e.g., `$randomEmail`, `$visa`).
4. If no generators appear, make sure your project has `.js` files in its `generators/` subfolder.

## Use a Generator in a Request

1. In any input field — URL, params, headers, body, or auth — type `{{$generatorName}}`.
   - For example: `{{$randomEmail}}` or `{{$visa}}`
2. The `$` prefix is what tells the app this is a generator, not an environment variable.
3. When you send the request, each generator placeholder is replaced with a freshly generated value.
4. Every send produces a **new value** — so `{{$randomEmail}}` gives a different email each time.

### Auto-Suggest

1. When you type `{{` in any input field, a dropdown appears.
2. Generators show up alongside your environment variables, prefixed with `$`.
3. Click on a generator name to insert it.

### Generators in Flows

1. Generators also work in flow steps.
2. Each step resolves its generators independently, so every step gets fresh values.

## Stop the Container

1. Click **Stop** in the Generators panel.
2. The container is removed and the status dot turns gray.

## Rebuild the Container

Use this when you've changed your generator code or added new generators.

1. Click **Rebuild** (only visible when the container is running).
2. The app stops the existing container, rebuilds the Docker image from scratch, and starts a new container.
3. The button shows "Rebuilding..." during this process.
4. Build and start output appears in the Container Logs panel.
5. Once done, the new generators are available immediately.

## Refresh Generators

1. Click **Refresh** to re-fetch the list of generators from the running container.
2. This is a lighter alternative to Rebuild — it just re-reads what's available without restarting anything.

## View Container Logs

1. Click **Container Logs** at the bottom of the Generators panel to expand it.
2. The logs show:
   - Docker build output (image layers, caching info)
   - Container start output
   - Server startup messages (which generators were loaded)
   - Request logs (every time a generator is invoked, it's logged with a timestamp)
3. Click **Refresh Logs** to fetch the latest log output.
4. Click the header again to collapse the logs panel.

## Remove the Generator Project

1. Click **Remove** (the red button at the bottom).
2. This stops the container (if running), deletes the configuration, and resets the Generators panel to its initial state.
3. Your project files on disk are **not** deleted — only the connection to the app is removed.

## Create Your Own Generators

A generator is a small JavaScript file that exports three things:

- **`name`**: The name you'll use in `{{$name}}` (e.g., `"randomEmail"`).
- **`generate`**: A function that returns a value each time it's called.
- **`description`** (optional): A short description shown in the UI.

### Example

```javascript
module.exports = {
  name: "randomEmail",
  description: "Generates a random email address",
  generate() {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let user = "";
    for (let i = 0; i < 8; i++) {
      user += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const domains = ["example.com", "test.org", "demo.net"];
    const domain = domains[Math.floor(Math.random() * domains.length)];
    return `${user}@${domain}`;
  },
};
```

### Project Structure

Your project folder should look like this:

```
my-generators/
├── Dockerfile
├── package.json
├── server.js
└── generators/
    ├── randomEmail.js
    ├── uuid.js
    └── ... (one file per generator)
```

The `server.js` file runs inside the Docker container and serves the generators over HTTP. The included example project (`examples/generators/`) has everything set up — you can copy it and modify the files in the `generators/` folder.

### Adding a New Generator

1. Create a new `.js` file in the `generators/` subfolder of your project.
2. Export `name`, `generate`, and optionally `description`.
3. In the app, click **Rebuild** to pick up the new generator.
4. It appears in the Available Generators list, ready to use as `{{$name}}`.

## Built-In Example Generators

The `examples/generators/` project includes these generators out of the box:

| Generator | Syntax | What It Produces |
|---|---|---|
| randomEmail | `{{$randomEmail}}` | Random email like `a8kx92m1@example.com` |
| uuidv4 | `{{$uuidv4}}` | 16-character alphanumeric string |
| randomString | `{{$randomString}}` | 10-character alphabetic string |
| randomNumber | `{{$randomNumber}}` | 10-digit numeric string |
| timestamp | `{{$timestamp}}` | Current Unix timestamp in seconds |
| cardExpiry | `{{$cardExpiry}}` | Random future date in MM/YYYY format |
| dob | `{{$dob}}` | Random date of birth (age 18–67) in DD/MM/YYYY |
| visa | `{{$visa}}` | Luhn-valid 16-digit Visa card number |
| mastercard | `{{$mastercard}}` | Luhn-valid 16-digit Mastercard number |
| amex | `{{$amex}}` | Luhn-valid 15-digit Amex card number |

## Troubleshooting

### "Build & Start" fails immediately
- Make sure Docker is installed and the Docker daemon is running.
- Check that your project folder has a valid `Dockerfile`.

### Status shows "error" after starting
- The container started but isn't responding. Check the Container Logs for error messages.
- The server inside the container may have crashed — look for stack traces in the logs.

### Generator placeholder appears literally in the sent request
- The generator invocation failed silently. Make sure the container is running (green status).
- Check that the generator name matches exactly — it's case-sensitive.

### No generators appear in the list
- Make sure your generator `.js` files are in the `generators/` subfolder of your project.
- Each file must export `name` and `generate` as described above.
- Try clicking **Refresh** to re-fetch the list.
