// @ts-nocheck
import express from "express";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import router from "./src/routes/index.js";
import { env } from './src/config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = env.PORT;

  app.use(cors());
  app.use(express.json());

  // Use the modular router
  app.use("/api", router);

  // Vite middleware for development
  if (env.NODE_ENV !== "production") {
    const webRoot = path.resolve(__dirname, "../web");
    const vite = await createViteServer({
      root: webRoot,
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Note: Assuming dist is built
    const distPath = path.resolve(__dirname, '../web/dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

