import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import fs from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";

function testPdfMiddlewarePlugin(): Plugin {
  const handleRequest = (
    req: IncomingMessage,
    res: ServerResponse,
    next: (err?: unknown) => void,
  ) => {
    if (!req.url?.startsWith("/api/test-pdf")) {
      return next();
    }

    try {
      const url = new URL(req.url, "http://localhost:3000");
      const fileName = url.searchParams.get("file");
      if (!fileName) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        return res.end(JSON.stringify({ error: "Missing 'file' parameter" }));
      }

      // Security: Prevent directory traversal (no slashes, no ..)
      const baseName = path.basename(fileName);
      if (
        baseName !== fileName ||
        fileName.includes("..") ||
        fileName.includes("/") ||
        fileName.includes("\\")
      ) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        return res.end(JSON.stringify({ error: "Invalid file name" }));
      }

      // Validate against manifest.json
      const fixturesDir = path.resolve(import.meta.dirname, "public/test-pdfs");
      const manifestPath = path.join(fixturesDir, "manifest.json");
      let allowedFiles: string[] = [];
      if (fs.existsSync(manifestPath)) {
        try {
          allowedFiles = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
        } catch {
          allowedFiles = [];
        }
      }

      if (!allowedFiles.includes(fileName)) {
        res.statusCode = 404;
        res.setHeader("Content-Type", "application/json");
        return res.end(JSON.stringify({ error: "File not listed in manifest" }));
      }

      const filePath = path.join(fixturesDir, fileName);
      if (!fs.existsSync(filePath)) {
        res.statusCode = 404;
        res.setHeader("Content-Type", "application/json");
        return res.end(JSON.stringify({ error: "File not found" }));
      }

      const fileBytes = fs.readFileSync(filePath);

      // Return complete binary PDF as octet-stream with anti-interception headers
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/octet-stream");
      res.setHeader("Content-Disposition", "inline");
      res.setHeader("Content-Length", fileBytes.length);
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.end(fileBytes);
    } catch {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Internal server error" }));
    }
  };

  return {
    name: "test-pdf-middleware",
    configureServer(server) {
      server.middlewares.use(handleRequest);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handleRequest);
    },
  };
}

export default defineConfig({
  plugins: [react(), testPdfMiddlewarePlugin()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./"),
    },
  },
  server: {
    host: "0.0.0.0",
    port: 3000,
    hmr: {
      overlay: false,
    },
  },
  preview: {
    host: "0.0.0.0",
    port: 3000,
  },
});
