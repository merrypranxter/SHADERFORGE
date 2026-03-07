import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Wolfram Alpha Proxy
  app.get("/api/wolfram", async (req, res) => {
    const query = req.query.input;
    const appId = process.env.WOLFRAM_APP_ID;

    if (!appId) {
      return res.status(500).json({ error: "Wolfram AppID not configured" });
    }

    if (!query || typeof query !== 'string' || query.trim() === '') {
      return res.status(400).json({ error: "Query parameter is required" });
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s timeout on server
      const response = await fetch(
        `https://api.wolframalpha.com/v1/result?appid=${appId}&i=${encodeURIComponent(query as string)}`,
        { signal: controller.signal as any }
      );
      clearTimeout(timeoutId);
      const data = await response.text();
      res.send(data);
    } catch (error) {
      if ((error as any).name === 'AbortError') {
        res.status(504).json({ error: "Wolfram Alpha timed out" });
      } else {
        res.status(500).json({ error: "Failed to fetch from Wolfram Alpha" });
      }
    }
  });

  // GitHub Proxy (Optional, for searching or fetching files if needed)
  app.get("/api/github/repo", async (req, res) => {
    const { owner, repo, path: filePath } = req.query;
    try {
      const response = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${filePath || ""}`
      );
      const data = await response.json();
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch from GitHub" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
