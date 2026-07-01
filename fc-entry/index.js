import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const STATIC_DIR = path.join(__dirname, 'public');
const API_BACKEND = 'https://fc.cheapgo.top';

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

export async function handler(req, resp, context) {
  console.log('Request URL:', req.url);
  console.log('Request path:', req.path);

  const reqPath = req.url || req.path || '/';

  // API 请求代理到后端
  if (reqPath.startsWith('/api')) {
    try {
      const url = `${API_BACKEND}${reqPath}`;
      console.log('Proxying to:', url);

      const fetchOptions = {
        method: req.method,
        headers: req.headers,
      };

      // 只有非 GET/HEAD 请求才添加 body
      if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
        fetchOptions.body = req.body;
      }

      const response = await fetch(url, fetchOptions);

      const data = await response.text();

      resp.setStatusCode(response.status);
      resp.setHeader('content-type', response.headers.get('content-type') || 'application/json; charset=utf-8');
      resp.setHeader('content-disposition', 'inline');
      resp.send(data);

    } catch (err) {
      console.error('Proxy error:', err);
      console.error('Error details:', JSON.stringify(err, Object.getOwnPropertyNames(err)));
      resp.setStatusCode(502);
      resp.setHeader('content-type', 'application/json; charset=utf-8');
      resp.send(JSON.stringify({
        code: 502,
        message: 'Backend unavailable',
        error: err.message,
        url: `${API_BACKEND}${reqPath}`
      }));
    }
    return null;  // ✅ 返回 null
  }

  // 静态文件请求
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

  return null;  // ✅ 返回 null
}
