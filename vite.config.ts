import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import path from "node:path";

const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "@sdk": path.resolve(__dirname, "src/sdk"),
      "@host": path.resolve(__dirname, "src/host"),
      "@games": path.resolve(__dirname, "src/games"),
    },
  },
  assetsInclude: ["**/*.wasm"],
  build: {
    // Monolith ships all game modules + Element Plus (~3MB); silence false alarm.
    chunkSizeWarningLimit: 3500,
  },

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
});
