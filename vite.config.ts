import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// GitHub Pages serves this project from /midnight-ledger/, not from the domain
// root. Vercel and Netlify serve from the root, and so does `vite dev`, so the
// base is switched by an env var the Pages workflow sets rather than hardcoded.
const base = process.env.GITHUB_PAGES === "true" ? "/midnight-ledger/" : "/";

export default defineConfig({
  base,
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
