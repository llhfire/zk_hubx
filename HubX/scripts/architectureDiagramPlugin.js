import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const HUBX = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** 静态架构 HTML：dev 按请求读盘，build 复制进 Pages dist。 */
const DOCS = [
  {
    routes: ['/architecture.html', '/ZK-HubX架构图.html'],
    source: path.join(ROOT, 'ZK-HubX架构图.html'),
    copyAs: ['architecture.html', 'ZK-HubX架构图.html'],
  },
  {
    routes: ['/tech-architecture.html', '/ZK-HubX技术架构.html'],
    source: path.join(HUBX, 'docs/ZK-HubX技术架构.html'),
    copyAs: ['tech-architecture.html', 'ZK-HubX技术架构.html'],
  },
];

function pathnameOf(url) {
  if (!url) return '';
  let pathname = url.split('?')[0];
  try {
    pathname = decodeURIComponent(pathname);
  } catch {
    /* keep raw */
  }
  return pathname;
}

function findDoc(url) {
  const pathname = pathnameOf(url);
  return DOCS.find((doc) => doc.routes.includes(pathname));
}

function sendHtml(response, filePath) {
  const html = fs.readFileSync(filePath, 'utf8');
  response.setHeader('Content-Type', 'text/html; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store');
  response.end(html);
}

/** 功能架构图（仓库根）+ β 技术架构（HubX/docs），dev 与 build 都从源文件读。 */
export function architectureDiagramPlugin() {
  return {
    name: 'architecture-diagram',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const doc = findDoc(request.url);
        if (!doc) {
          next();
          return;
        }
        try {
          sendHtml(response, doc.source);
        } catch (error) {
          response.statusCode = 500;
          response.end(String(error?.message || error));
        }
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((request, response, next) => {
        const doc = findDoc(request.url);
        if (!doc) {
          next();
          return;
        }
        try {
          sendHtml(response, doc.source);
        } catch (error) {
          response.statusCode = 500;
          response.end(String(error?.message || error));
        }
      });
    },
    writeBundle(options) {
      const dir = options.dir;
      if (!dir) return;
      for (const doc of DOCS) {
        for (const name of doc.copyAs) {
          fs.copyFileSync(doc.source, path.join(dir, name));
        }
      }
    },
  };
}
