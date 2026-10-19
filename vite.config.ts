import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = __dirname;

export default defineConfig({
  root: path.resolve(projectRoot, "src/renderer"),
  envDir: projectRoot,
  plugins: [react()],
  server: {
    host: "localhost",
    port: 5173,
    strictPort: true,
    fs: {
      allow: [projectRoot],
    },
  },
  build: {
    outDir: path.resolve(projectRoot, "dist"),
    emptyOutDir: true,
  },
});
