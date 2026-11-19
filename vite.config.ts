import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const proxy = { "/functions/v1/app": "http://127.0.0.1:8000" };

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
  server: {
    host: "0.0.0.0",
    proxy,
    // 素材/ 只是待处理的原始文件（不会被打包），里有 mp4 被播放器占用时
    // chokidar 会 EBUSY 直接把 dev server 弄崩，所以别让监听器碰它。
    watch: { ignored: ["**/素材/**", "**/.git/**"] },
  },
  preview: { host: "0.0.0.0", proxy },
  build: { outDir: "dist" },
});
