// FC 3.0 HTTP 触发器入口
// 功能：serve 静态文件 + 反向代理 /api 请求到后端 FC

const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

// 配置：后端 FC 内网地址
const API_BACKEND = process.env.API_BACKEND || 'https://applican-applian-service-uzjmdtpnxs.cn-shenzhen-vpc.fcapp.run';

// 静态文件目录（H5 构建产物放在 public 子目录）
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
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

// 获取 Content-Type
function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || 'application/octet-stream';
}

// 代理请求到后端 FC
function proxyRequest(event) {
  return new Promise((resolve, reject) => {
    // 构建查询字符串
    let queryString = '';
    if (event.queries && Object.keys(event.queries).length > 0) {
      queryString = '?' + new URLSearchParams(event.queries).toString();
    }

    const targetUrl = new URL(event.path + queryString, API_BACKEND);

    const options = {
      hostname: targetUrl.hostname,
      port: targetUrl.port || 443,
      path: targetUrl.pathname + targetUrl.search,
      method: event.method || 'GET',
      headers: {
        ...event.headers,
        host: targetUrl.host,
      },
    };

    const client = targetUrl.protocol === 'https:' ? https : http;

    const proxyReq = client.request(options, (proxyRes) => {
      let body = '';
      proxyRes.on('data', (chunk) => { body += chunk; });
      proxyRes.on('end', () => {
        resolve({
          statusCode: proxyRes.statusCode,
          headers: proxyRes.headers,
          body: body,
        });
      });
    });

    proxyReq.on('error', (err) => {
      console.error('Proxy error:', err);
      resolve({
        statusCode: 502,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: 502, message: 'Backend unavailable' }),
      });
    });

    if (event.body) {
      proxyReq.write(event.body);
    }
    proxyReq.end();
  });
}

// Serve 静态文件
function serveStatic(event) {
  let reqPath = event.path || '/';

  // 默认文件
  if (reqPath === '/') {
    reqPath = '/index.html';
  }

  // 去掉查询参数
  reqPath = reqPath.split('?')[0];

  let filePath = path.join(STATIC_DIR, reqPath);

  // 安全检查
  if (!filePath.startsWith(STATIC_DIR)) {
    return {
      statusCode: 403,
      headers: { 'Content-Type': 'text/plain' },
      body: 'Forbidden',
    };
  }

  // 如果是目录，找 index.html
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  // SPA 路由：文件不存在返回 index.html
  if (!fs.existsSync(filePath)) {
    filePath = path.join(STATIC_DIR, 'index.html');
  }

  try {
    const content = fs.readFileSync(filePath);
    const contentType = getContentType(filePath);

    // 判断是否是二进制文件
    const binaryExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.ico', '.woff', '.woff2', '.ttf'];
    const isBinary = binaryExtensions.includes(path.extname(filePath).toLowerCase());

    return {
      statusCode: 200,
      headers: { 'Content-Type': contentType },
      body: isBinary ? content.toString('base64') : content.toString('utf-8'),
      isBase64Encoded: isBinary,
    };
  } catch (err) {
    console.error('Serve static error:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'text/plain' },
      body: 'Internal Server Error',
    };
  }
}

// FC 3.0 HTTP 触发器入口
exports.handler = async (event, context) => {
  console.log('=== Function handler called ===');
  console.log('Event:', JSON.stringify(event, null, 2));
  console.log('Request:', event.method, event.path);

  // API 请求代理到后端 FC
  if (event.path && event.path.startsWith('/api')) {
    console.log('Proxying to backend...');
    return await proxyRequest(event);
  }

  // 其他请求 serve 静态文件
  console.log('Serving static file...');
  const result = serveStatic(event);
  console.log('Result:', JSON.stringify(result, null, 2));
  return result;
};
