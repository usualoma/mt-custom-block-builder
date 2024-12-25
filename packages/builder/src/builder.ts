#!/usr/bin/env node

import { Command } from "commander";
import { dirname } from "path";
import * as fs from "fs";
import * as path from "path";
import * as esbuild from "esbuild";
import type { PluginConfig } from "./index";
import { createServer } from "vite";
import { watch } from "chokidar";
import * as mime from "mime-types";
import { IncomingMessage } from "http";
import { createServer as createNetServer } from "net";

function stripJsonComments(json: string): string {
  // シングルラインコメントを削除
  json = json.replace(/\/\/.*$/gm, "");
  // マルチラインコメントを削除
  json = json.replace(/\/\*[\s\S]*?\*\//g, "");
  return json;
}

async function loadConfig(): Promise<PluginConfig> {
  const configPath = path.resolve(process.cwd(), "mt-custom-block.config.ts");

  if (!fs.existsSync(configPath)) {
    throw new Error("Configuration file mt-plugin.config.ts not found.");
  }

  try {
    // esbuildでトランスパイル
    const result = await esbuild.build({
      entryPoints: [configPath],
      write: false,
      format: "cjs",
      platform: "node",
      bundle: true,
      target: "node18",
    });

    const { text } = result.outputFiles[0];

    // 評価して設定を取得
    const mod = require("module");
    const configModule = new mod.Module(configPath);
    configModule.paths = mod.Module._nodeModulePaths(path.dirname(configPath));
    configModule._compile(text, configPath);

    if (!configModule.exports.default) {
      throw new Error("No default export found in configuration file.");
    }

    return configModule.exports.default as PluginConfig;
  } catch (error) {
    throw new Error(`Failed to load configuration file: ${error}`);
  }
}

function findAvailablePort(startPort: number): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createNetServer();

    server.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "EADDRINUSE") {
        server.close(() => resolve(findAvailablePort(startPort + 1)));
      } else {
        reject(err);
      }
    });

    server.listen(startPort, () => {
      server.close(() => resolve(startPort));
    });
  });
}

const program = new Command();
const packageJson = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, "../package.json"), "utf8")
);

const setHtml = (data: any, html: string | undefined): void => {
  if (!html || !fs.existsSync(html)) {
    return;
  }
  const htmlContent = fs.readFileSync(html, "utf8");
  data.html = htmlContent;
};
const setIcon = (data: any, icon: string | undefined): void => {
  if (!icon || !fs.existsSync(icon)) {
    return;
  }
  const iconContent = fs.readFileSync(icon);
  const mimeType = mime.lookup(icon) || "image/svg+xml";
  const base64Data = iconContent.toString("base64");
  data.icon = `data:${mimeType};base64,${base64Data}`;
};
const setScript = async (
  data: any,
  script: string | undefined
): Promise<void> => {
  if (!script || !fs.existsSync(script)) {
    return;
  }
  let scriptContent = fs.readFileSync(script, "utf8");
  if (script.endsWith(".ts")) {
    try {
      const tsconfigPath = path.resolve(process.cwd(), "tsconfig.json");
      const tsconfig = fs.existsSync(tsconfigPath)
        ? JSON.parse(stripJsonComments(fs.readFileSync(tsconfigPath, "utf8")))
        : undefined;

      const result = await esbuild.transform(scriptContent, {
        loader: "ts",
        target: tsconfig?.compilerOptions?.target || "es2020",
        tsconfigRaw: tsconfig,
      });

      scriptContent = result.code;
    } catch (error) {
      console.error(error);
      return;
    }
  }
  data.preview_header = `<script type="module">${scriptContent}</script>`;
};

const writeBlock = (blockData: any) => {
  const outputDir = dirname(blockData.output);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  fs.writeFileSync(blockData.output, JSON.stringify(blockData.data));
  console.log(`[update] ${blockData.originalOutput}`);
};

function getRequestBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", (error) => {
      reject(error);
    });
  });
}

program
  .name("mt-custom-block-builder")
  .description("Build Custom Block for Movable Type Block Editor via CLI")
  .version(packageJson.version);

program
  .command("build")
  .description("Build custom blocks")
  .option("-w, --watch", "Watch mode - rebuilds on file changes")
  .action(async (options) => {
    try {
      const config = await loadConfig();

      const blockData = await Promise.all(
        config.blocks.map(async (block) => {
          const data = JSON.parse(fs.readFileSync(block.input, "utf8"));
          const blockData = {
            input: path.resolve(process.cwd(), block.input),
            output: path.resolve(process.cwd(), block.output),
            html: path.resolve(process.cwd(), block.html),
            originalOutput: block.output,
            script: path.resolve(process.cwd(), block.script),
            icon: block.icon
              ? path.resolve(process.cwd(), block.icon)
              : undefined,
            data,
          };
          setIcon(blockData.data, block.icon);
          await setScript(blockData.data, block.script);
          setHtml(blockData.data, block.html);
          writeBlock(blockData);
          return blockData;
        })
      );

      if (options.watch) {
        const server = await createServer({
          root: process.cwd(),
          server: {
            port: await findAvailablePort(config.devServer?.port || 5173),
            host: config.devServer?.host || "localhost",
          },
          appType: "custom",
        });

        await server.pluginContainer.buildStart({});

        server.middlewares.use("/blocks", async (req, res, next) => {
          const match = (req.url || "").match(/^\/([a-zA-Z0-9_-]+)$/);
          if (match) {
            if (req.method === "GET") {
              const filePath = path.resolve(
                __dirname,
                "../public/edit-html.html"
              );
              res.setHeader("Content-Type", "text/html");
              res.end(fs.readFileSync(filePath, "utf8"));
            } else if (req.method === "POST") {
              try {
                const body = await getRequestBody(req);
                const currentBlock = blockData.find(
                  (block) => (block as any).data.identifier === match[1]
                );
                fs.writeFileSync((currentBlock as any).html, body.html);
                res.end("ok");
              } catch (error) {
                res.statusCode = 400;
                res.end("Invalid request body");
              }
            }
          } else {
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(blockData.map((block) => block.data)));
          }
        });

        server.middlewares.use("/", (req, res, next) => {
          const baseDir = path.resolve(__dirname, "../public");
          let url = (req.url || "/").replace(/\?.*$/, "");
          if (url?.endsWith("/")) {
            url += "index.html";
          }

          const normalizedUrl = path
            .normalize(decodeURIComponent(url))
            .replace(/^(\.\.[\/\\])+/, "");
          const filePath = path.join(baseDir, normalizedUrl);

          if (!filePath.startsWith(baseDir)) {
            return next();
          }

          if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, "utf-8");

            const ext = path.extname(filePath).toLowerCase();
            const contentType =
              {
                ".html": "text/html",
                ".js": "application/javascript",
                ".css": "text/css",
                ".json": "application/json",
              }[ext] || "text/plain";

            res.setHeader("Content-Type", contentType);

            if (ext === ".html") {
              server
                .transformIndexHtml(url, content)
                .then((html) => res.end(html))
                .catch(next);
            } else {
              res.end(content);
            }
            return;
          }
          next();
        });

        await server.listen();
        server.printUrls();

        const watcher = watch(
          blockData
            .map(
              (block) =>
                [block.input, block.script, block.html, block.icon].filter(
                  Boolean
                ) as string[]
            )
            .flat(),
          {
            ignoreInitial: true,
          }
        );

        watcher.on("all", async (event, path) => {
          // console.log(`[${event}] ${path}`);

          const block = blockData.find((block) =>
            [block.input, block.script, block.html, block.icon].includes(path)
          );

          if (block) {
            let updated = false;
            if (block.input === path) {
              block.data = JSON.parse(fs.readFileSync(block.input, "utf8"));
              setIcon(block.data, block.icon);
              await setScript(block.data, block.script);
              setHtml(block.data, block.html);
              updated = true;
            }
            if (block.icon === path) {
              setIcon(block.data, block.icon);
              updated = true;
            } else if (block.script === path) {
              await setScript(block.data, block.script);
              updated = true;
            }
            if (block.html === path) {
              setHtml(block.data, block.html);
              updated = true;
            }

            if (updated) {
              writeBlock(block);
            }
          }

          server.moduleGraph.invalidateAll();
          server.ws.send({
            type: "full-reload",
            path: "*",
          });
        });

        process.on("SIGINT", async () => {
          await watcher.close();
          await server.close();
          process.exit();
        });
      }
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  });

program.parse();
