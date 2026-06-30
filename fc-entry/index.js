import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const STATIC_DIR = path.join(__dirname, 'public');
const API_BACKEND = process.env.API_BACKEND || 'http://fc.cheapgo.top';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || 'application/octet-stream';
}

// ✅ FC 3.0 HTTP 函数格式
export async function handler(req, resp, context) {
  console.log('Request URL:', req.url);
  console.log('Request path:', req.path);

  const reqPath = req.url || req.path || '/';

  // API 代理
  if (reqPath.startsWith('/api')) {
    try {
      const url = `${API_BACKEND}${reqPath}`;
      console.log('Proxying to:', url);

      const response = await fetch(url, {
        method: req.method,
        headers: req.headers,
        body: req.body,
      });

      const data = await response.text();

      resp.setStatusCode(response.status);
      resp.setHeader('content-type', response.headers.get('content-type') || 'application/json; charset=utf-8');
      resp.setHeader('content-disposition', 'inline');
      resp.send(data);

    } catch (err) {
      console.error('Proxy error:', err);
      resp.setStatusCode(502);
      resp.setHeader('content-type', 'application/json; charset=utf-8');
      resp.send(JSON.stringify({ code: 502, message: 'Backend unavailable' }));
    }
    return;
  }

  // 静态文件服务
  let filePath = reqPath;

  if (filePath === '/') {
    filePath = '/index.html';
  }

  filePath = filePath.split('?')[0];

  let fullPath = path.join(STATIC_DIR, filePath);

  if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
    fullPath = path.join(fullPath, 'index.html');
  }

  if (!fs.existsSync(fullPath)) {
    fullPath = path.join(STATIC_DIR, 'index.html');
  }

  try {
    const content = fs.readFileSync(fullPath);
    const contentType = getContentType(fullPath);

    const isBinary = ['.png', '.jpg', '.jpeg', '.gif', '.ico'].some(ext =>
      fullPath.toLowerCase().endsWith(ext)
    );

    resp.setStatusCode(200);
    resp.setHeader('content-type', contentType);
    resp.setHeader('content-disposition', 'inline');

    if (isBinary) {
      resp.send(content.toString('base64'));
    } else {
      resp.send(content.toString('utf-8'));
    }

  } catch (err) {
    console.error('File read error:', err);
    resp.setStatusCode(404);
    resp.setHeader('content-type', 'text/plain; charset=utf-8');
    resp.send('Not Found');
  }
}
