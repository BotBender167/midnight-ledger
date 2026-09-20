import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    target: "es2022",
    cssMinify: "lightningcss",
    rollupOptions: {
      output: {
        // React is stable across deploys; splitting it keeps the app chunk
        // small and independently cacheable.
        manualChunks: { react: ["react", "react-dom"] },
      },
    },
  },
});
