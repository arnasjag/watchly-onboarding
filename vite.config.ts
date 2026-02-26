import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/watchly-onboarding/",
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
