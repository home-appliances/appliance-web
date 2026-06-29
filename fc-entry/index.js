// FC 3.0 HTTP 触发器入口
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 静态文件目录
const STATIC_DIR = path.join(__dirname, 'public');

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

export async function handler(event, context) {
  console.log('Request:', event.requestURI);

  let reqPath = event.requestURI || '/';

  // 默认文件
  if (reqPath === '/') {
    reqPath = '/index.html';
  }

  // 去掉查询参数
  reqPath = reqPath.split('?')[0];

  let filePath = path.join(STATIC_DIR, reqPath);

  // 如果是目录，找 index.html
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  // 文件不存在返回 index.html (SPA 路由)
  if (!fs.existsSync(filePath)) {
    filePath = path.join(STATIC_DIR, 'index.html');
  }

  try {
    const content = fs.readFileSync(filePath);
    const contentType = getContentType(filePath);

    // 用 context 设置响应头
    if (context && context.setHeader) {
      context.setHeader('Content-Type', contentType);
    }

    return content;
  } catch (err) {
    console.error('Error:', err);
    return 'Not Found';
  }
}
