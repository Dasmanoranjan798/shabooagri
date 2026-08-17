import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      "/auth": "http://localhost:4010",
      "/payments": "http://localhost:4010",
      "/provisioning": "http://localhost:4010",
      "/health": "http://localhost:4010",
    },
  },
});
