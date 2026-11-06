import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// The app always calls the API at /api on its own address, so the sign-in cookie stays first-party.
// Here Vite passes /api on to the backend. On Vercel, a rewrite in vercel.json does the same.
const apiTarget = process.env.API_TARGET ?? "http://localhost:5001";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  server: {
    port: 5173,
    strictPort: true,
    proxy: { "/api": { target: apiTarget } },
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["src/test-setup.ts"],
  },
});
