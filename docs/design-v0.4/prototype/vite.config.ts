import { adaptPresentation } from "./presentation-adapters";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";
const project = path.resolve(import.meta.dirname, "../../..");
export default defineConfig({
  root: import.meta.dirname,
  publicDir: path.join(project, "public"),
  resolve: {
    alias: [
      {
        find: "@/features/builds/api.ts",
        replacement: path.join(import.meta.dirname, "local-usage.ts"),
      },
      { find: "@", replacement: path.join(project, "src") },
    ],
  },
  plugins: [
    {
      name: "study-presentations",
      enforce: "pre",
      transform: adaptPresentation,
      resolveId(source, importer) {
        if (
          importer?.replaceAll("\\", "/").endsWith("/src/ui/index.ts") &&
          source === "./Modal"
        )
          return path.join(import.meta.dirname, "SurfaceModal.tsx");
      },
    },
    react(),
    {
      name: "forge-design-assets",
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          const url = decodeURIComponent((req.url || "").split("?")[0]);
          let base: string | undefined, relative: string | undefined;
          if (url.startsWith("/char/")) {
            base = path.join(project, "char-assets");
            relative = url.slice(6);
          } else if (url.startsWith("/design-assets/")) {
            base = path.join(project, "docs/design-v0.4/assets");
            relative = url.slice(15);
          }
          if (!base || !relative) return next();
          const file = path.resolve(base, relative);
          if (!file.startsWith(base + path.sep) || !fs.existsSync(file))
            return next();
          res.setHeader(
            "Content-Type",
            file.endsWith(".json")
              ? "application/json"
              : file.endsWith(".webp")
                ? "image/webp"
                : file.endsWith(".png")
                  ? "image/png"
                  : file.endsWith(".svg")
                    ? "image/svg+xml"
                    : "application/octet-stream",
          );
          fs.createReadStream(file).pipe(res);
        });
      },
    },
  ],
  server: {
    host: "127.0.0.1",
    port: 4404,
    proxy: { "/img": { target: "https://dofusforge.com", changeOrigin: true } },
    fs: { allow: [project] },
  },
  define: {
    __DOFUS_VERSION__: JSON.stringify(
      JSON.parse(
        fs.readFileSync(path.join(project, "public/data/version.json"), "utf8"),
      ).gameVersion,
    ),
    __APP_VERSION__: JSON.stringify("0.4.0-design"),
    "import.meta.env.VITE_ASSETS_URL": JSON.stringify(""),
  },
  build: {
    outDir: "../evidence/prototype-build",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        workshop: path.join(import.meta.dirname, "index.html"),
        surfaces: path.join(import.meta.dirname, "surfaces.html"),
      },
    },
  },
});
