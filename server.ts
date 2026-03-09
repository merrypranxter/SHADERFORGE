import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

// Wolfram Alpha Proxy
  const wolframCache = new Map<string, { data: string, ts: number }>();
  const CACHE_TTL = 1000 * 60 * 60; // 1 hour

  app.get("/api/wolfram", async (req, res) => {
    const query = req.query.input as string;
    const appId = process.env.WOLFRAM_APP_ID;

    if (!appId) {
      return res.status(500).json({ error: "Wolfram AppID not configured" });
    }

    if (!query || query.trim() === '') {
      return res.status(400).json({ error: "Query parameter is required" });
    }

    // Check cache
    const cached = wolframCache.get(query);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      console.log(`Wolfram Cache Hit: ${query}`);
      return res.send(cached.data);
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // Increased to 30s
      const response = await fetch(
        `https://api.wolframalpha.com/v1/result?appid=${appId}&i=${encodeURIComponent(query)}`,
        { signal: controller.signal as any }
      );
      clearTimeout(timeoutId);
      const data = await response.text();
      
      // Store in cache
      wolframCache.set(query, { data, ts: Date.now() });
      
      res.send(data);
    } catch (error) {
      if ((error as any).name === 'AbortError') {
        res.status(504).json({ error: "Wolfram Alpha timed out" });
      } else {
        console.error("Wolfram Proxy Error:", error);
        res.status(500).json({ error: "Failed to fetch from Wolfram Alpha" });
      }
    }
  });

  // GitHub Proxy
  app.get("/api/github/repo", async (req, res) => {
    const { owner, repo, path: filePath } = req.query;
    if (!owner || !repo) {
      return res.status(400).json({ error: "Owner and repo are required" });
    }
    try {
      const response = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${filePath || ""}`
      );
      if (!response.ok) {
        return res.status(response.status).json({ error: `GitHub API error: ${response.statusText}` });
      }
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("GitHub Proxy Error:", error);
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
