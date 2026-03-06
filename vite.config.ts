import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/",
  server: {
    proxy: {
      "/api": {
        target: "https://watchly-onboarding.pages.dev",
        changeOrigin: true,
        secure: true,
      },
    },
  },
});
