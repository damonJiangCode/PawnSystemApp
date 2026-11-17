import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const frontendRoot = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(frontendRoot, "..");

export default defineConfig({
  root: frontendRoot,
  // The private .env lives at the repository root.
  envDir: projectRoot,
  plugins: [react()],
  server: {
    host: "localhost",
    port: 5173,
    strictPort: true,
    // The shared types and the hoisted node_modules live at the repository root.
    fs: {
      allow: [projectRoot],
    },
  },
  // Default outDir: frontend/dist, owned by this package.
  build: {
    emptyOutDir: true,
  },
});
