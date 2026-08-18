import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ARCH_ROUTES = new Set(['/architecture.html', '/ZK-HubX架构图.html']);
const SOURCE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../ZK-HubX架构图.html');

function isArchRequest(url) {
  if (!url) return false;
  let pathname = url.split('?')[0];
  try {
    pathname = decodeURIComponent(pathname);
  } catch {
    /* keep raw */
  }
  return ARCH_ROUTES.has(pathname);
}

function sendArch(response) {
  const html = fs.readFileSync(SOURCE, 'utf8');
  response.setHeader('Content-Type', 'text/html; charset=utf-8');
  response.end(html);
}

/** 以仓库根目录 ZK-HubX架构图.html 为唯一事实源，dev 与 build 都从这里读。 */
export function architectureDiagramPlugin() {
  return {
    name: 'architecture-diagram',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        if (isArchRequest(request.url)) {
          try {
            sendArch(response);
          } catch (error) {
            response.statusCode = 500;
            response.end(String(error?.message || error));
          }
          return;
        }
        next();
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((request, response, next) => {
        if (isArchRequest(request.url)) {
          try {
            sendArch(response);
          } catch (error) {
            response.statusCode = 500;
            response.end(String(error?.message || error));
          }
          return;
        }
        next();
      });
    },
    writeBundle(options) {
      const dir = options.dir;
      if (!dir) return;
      fs.copyFileSync(SOURCE, path.join(dir, 'architecture.html'));
      fs.copyFileSync(SOURCE, path.join(dir, 'ZK-HubX架构图.html'));
    },
  };
}
