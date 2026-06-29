// FC 3.0 HTTP 触发器入口
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 静态文件目录
const STATIC_DIR = path.join(__dirname, 'public');

// 后端 FC 地址
const API_BACKEND = process.env.API_BACKEND || 'http://fc.cheapgo.top';

// MIME 类型映射
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

// 代理请求到后端 FC
async function proxyRequest(event) {
  const reqPath = event.requestURI || '/';
  const url = `${API_BACKEND}${reqPath}`;

  console.log('Proxying to:', url);

  try {
    const response = await fetch(url, {
      method: event.httpMethod || 'GET',
      headers: event.headers || {},
      body: event.body || undefined,
    });

    const data = await response.text();
    return data;
  } catch (err) {
    console.error('Proxy error:', err);
    return JSON.stringify({ code: 502, message: 'Backend unavailable' });
  }
}

export async function handler(event, context) {
  console.log('Request:', event.requestURI);

  const reqPath = event.requestURI || '/';

  // API 请求代理到后端 FC
  if (reqPath.startsWith('/api')) {
    return await proxyRequest(event);
  }

  // 静态文件请求
  let filePath = reqPath;

  // 默认文件
  if (filePath === '/') {
    filePath = '/index.html';
  }

  // 去掉查询参数
  filePath = filePath.split('?')[0];

  let fullPath = path.join(STATIC_DIR, filePath);

  // 如果是目录，找 index.html
  if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
    fullPath = path.join(fullPath, 'index.html');
  }

  // 文件不存在返回 index.html (SPA 路由)
  if (!fs.existsSync(fullPath)) {
    fullPath = path.join(STATIC_DIR, 'index.html');
  }

  try {
    const content = fs.readFileSync(fullPath);
    const contentType = getContentType(fullPath);

    // 使用 context 设置响应头
    context.setHeader('content-type', contentType);
    context.setHeader('cache-control', 'public, max-age=31536000');

    return content;
  } catch (err) {
    console.error('Error:', err);
    context.setHeader('content-type', 'text/plain');
    return 'Not Found';
  }
}
