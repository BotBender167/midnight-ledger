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
        // React is stable across deploys, so splitting it keeps the app chunk
        // small and lets the vendor chunk stay cached across releases.
        // `react-dom/client` must be listed explicitly: it is the entry the app
        // actually imports, and without it the bulk of react-dom lands in the
        // application chunk and is re-downloaded on every deploy.
        manualChunks: {
          react: ["react", "react-dom", "react-dom/client", "react/jsx-runtime"],
        },
      },
    },
  },
});
