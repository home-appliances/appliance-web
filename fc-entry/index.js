import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 加载 .env 文件（本地开发时使用）
config({ path: path.join(__dirname, '..', '.env') });

const STATIC_DIR = path.join(__dirname, 'public');
const API_BACKEND = process.env.API_BACKEND || 'https://appliance-api.cheapgo.top';

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
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || 'application/octet-stream';
}

/**
 * FC 3.0 HTTP 触发器 handler
 */
export async function handler(event, context) {
  try {
    // FC 3.0 event 可能是 Buffer 或字符串
    let httpTrigger;
    if (Buffer.isBuffer(event)) {
      httpTrigger = JSON.parse(event.toString('utf-8'));
    } else if (typeof event === 'string') {
      httpTrigger = JSON.parse(event);
    } else {
      httpTrigger = event;
    }

    const method = httpTrigger.httpMethod || 'GET';
    const rawPath = httpTrigger.rawPath || httpTrigger.path || '/';
    const query = httpTrigger.queryParameters || {};
    const headers = httpTrigger.headers || {};
    const body = httpTrigger.body || null;

    // API 请求代理到后端
    if (rawPath.startsWith('/api')) {
      try {
        const queryString = Object.keys(query).length > 0
          ? '?' + new URLSearchParams(query).toString()
          : '';
        const url = `${API_BACKEND}${rawPath}${queryString}`;

        const fetchOptions = { method, headers };
        if (method !== 'GET' && method !== 'HEAD' && body) {
          fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
        }

        const response = await fetch(url, fetchOptions);
        const data = await response.text();

        const responseHeaders = {};
        response.headers.forEach((value, key) => {
          responseHeaders[key] = value;
        });
        responseHeaders['content-disposition'] = 'inline';

        return {
          statusCode: response.status,
          headers: responseHeaders,
          body: data,
        };
      } catch (err) {
        console.error('Proxy error:', err);
        return {
          statusCode: 502,
          headers: { 'content-type': 'application/json; charset=utf-8' },
          body: JSON.stringify({
            code: 502,
            message: 'Backend unavailable',
            error: err.message,
          }),
        };
      }
    }

    // 静态文件请求
    let filePath = rawPath;
    if (filePath === '/') filePath = '/index.html';
    filePath = filePath.split('?')[0];

    let fullPath = path.join(STATIC_DIR, filePath);
    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
      fullPath = path.join(fullPath, 'index.html');
    }
    if (!fs.existsSync(fullPath)) {
      fullPath = path.join(STATIC_DIR, 'index.html');
    }

    const content = fs.readFileSync(fullPath);
    const contentType = getContentType(fullPath);

    return {
      statusCode: 200,
      headers: {
        'content-type': contentType,
        'content-disposition': 'inline',
      },
      body: content.toString('base64'),
      isBase64Encoded: true,
    };

  } catch (err) {
    console.error('Handler error:', err);
    return {
      statusCode: 500,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
      body: 'Internal Server Error',
    };
  }
}
