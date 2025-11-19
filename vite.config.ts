// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig(({ mode }) => {
  return {
    plugins: [
      // React SWC plugin (fast)
      react(),
    ],
    resolve: {
      alias: {
        // allows imports like "@/components/Header"
        "@": path.resolve(__dirname, "src"),
      },
    },
    server: {
      // adjust host/port if needed
      port: 8080,
    },
    // you can add build/custom config here
  };
});
