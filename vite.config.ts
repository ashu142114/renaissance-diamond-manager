import { reactRouter } from "@react-router/dev/vite";
import { defineConfig, type UserConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

const host = new URL(process.env.SHOPIFY_APP_URL || "http://localhost:3000").hostname;

export default defineConfig({
  server: {
    allowedHosts: [host],
    port: Number(process.env.PORT || 3000),
    cors: { preflightContinue: true },
  },
  plugins: [reactRouter(), tsconfigPaths()],
  build: { assetsInlineLimit: 0 },
  optimizeDeps: { include: ["@shopify/app-bridge-react"] },
}) satisfies UserConfig;
