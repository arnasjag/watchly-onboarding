import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
  plugins: [react(), cloudflare()],
  base: "/",
  server: {
    proxy: {
      "/api": {
        target: "https://poc-watchfaces.pages.dev",
        changeOrigin: true,
        secure: true,
      },
    },
  },
});