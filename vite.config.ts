// 画面 (React Router) とサーバーの入口 (src/server/worker.ts) を Cloudflare Workers 向けに組み立てる。
// 画面に埋め込む公開の値 (VITE_PUBLIC_*) は、本番は .env.production、手元は .env から Vite が読む
import { reactRouter } from "@react-router/dev/vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  plugins: [
    cloudflare({
      viteEnvironment: { name: "ssr" },
      inspectorPort: false,
    }),
    reactRouter(),
    tailwindcss(),
  ],
  resolve: {
    tsconfigPaths: true,
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes("node_modules/lucide-react")) {
            return "lucide-icons";
          }
        },
      },
    },
  },
  server: {
    hmr: {
      overlay: false,
    },
  },
  ssr: {
    resolve: {
      conditions: ["workerd", "worker", "browser"],
    },
    noExternal: true,
    optimizeDeps: {
      noDiscovery: true,
      include: [],
    },
  },
});
