const express = require("express");
const path = require("path");
const fs = require("fs");

const app = express();
app.use(express.json());

// Log all requests (except /health to avoid noise from polling)
app.use((req, _res, next) => {
  if (req.path !== "/health") {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  }
  next();
});

// Load all generator modules from ./generators/
const generators = {};
const generatorsDir = path.join(__dirname, "generators");

function loadGenerators() {
  if (!fs.existsSync(generatorsDir)) return;
  for (const file of fs.readdirSync(generatorsDir)) {
    if (!file.endsWith(".js")) continue;
    try {
      // Clear require cache so hot-reload works on restart
      delete require.cache[require.resolve(path.join(generatorsDir, file))];
      const mod = require(path.join(generatorsDir, file));
      if (mod.name && typeof mod.generate === "function") {
        generators[mod.name] = mod;
      }
    } catch (err) {
      console.error(`Failed to load generator ${file}:`, err.message);
    }
  }
  console.log(
    `Loaded generators: ${Object.keys(generators).join(", ") || "(none)"}`,
  );
}

loadGenerators();

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// List available generators
app.get("/list", (_req, res) => {
  const list = Object.values(generators).map((g) => ({
    name: g.name,
    description: g.description || "",
  }));
  res.json(list);
});

// Invoke a generator by name
app.post("/invoke", async (req, res) => {
  const { name } = req.body;
  if (!name || !generators[name]) {
    console.log(`[invoke] "${name}" → 404 not found`);
    return res.status(404).json({ error: `Generator "${name}" not found` });
  }
  try {
    const value = await generators[name].generate();
    console.log(`[invoke] ${name} → ${value}`);
    res.json({ value });
  } catch (err) {
    console.error(`[invoke] ${name} → ERROR: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

const PORT = 7890;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Generator server listening on port ${PORT}`);
});
