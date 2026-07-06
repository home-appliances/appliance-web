# Appliance Web

家电搜索系统前端，基于 Taro + React 构建，支持 H5 和微信小程序双端。

## 线上地址

| 环境 | 地址 |
|------|------|
| H5 | https://appliance-web.cheapgo.top |
| 后端 API | https://appliance-api.cheapgo.top |

## 技术栈

- **框架**: [Taro 4.2](https://taro.jd.com/) + React 18
- **样式**: SCSS
- **构建**: Webpack 5
- **部署**: 阿里云函数计算 (FC 3.0)
- **CI/CD**: GitHub Actions + Serverless Devs
- **SSL**: Let's Encrypt 自动续签

## 项目结构

```
appliance-web/
├── src/
│   ├── app.ts                # 入口
│   ├── app.scss              # 全局样式
│   ├── pages/
│   │   ├── index/            # 首页
│   │   ├── list/             # 搜索结果页
│   │   └── detail/           # 产品详情页
│   └── utils/
│       └── request.ts        # 请求封装
├── fc-entry/                 # FC 部署入口
│   ├── index.js              # 静态服务 + API 代理
│   └── package.json
├── config/                   # Taro 配置
├── s.yaml                    # Serverless Devs 配置
├── .env                      # 环境变量
└── .github/workflows/
    ├── deploy.yml            # 代码部署
    └── renew-ssl.yml         # SSL 证书续签
```

## 本地开发

```bash
# 安装依赖
npm install --legacy-peer-deps

# H5 开发模式
npm run dev:h5

# 微信小程序开发模式
npm run dev:weapp
```

访问 http://localhost:10086

## 构建

```bash
# H5 构建
npm run build:h5
# 产物: dist/h5/

# 微信小程序构建
npm run build:weapp
# 产物: dist/weapp/
```

## 部署

代码推送到 `main` 分支会自动触发 GitHub Actions 部署：

```bash
git add .
git commit -m "feat: 新功能"
git push origin main
# 自动部署到 FC
```

### 部署流程

1. 安装依赖
2. 构建 H5 (`npm run build:h5`)
3. 打包部署文件 (`fc-entry` + `dist/h5/`)
4. 通过 Serverless Devs 部署到 FC

## 架构

```
用户浏览器
    ↓
FC 函数 (appliance-web)
    ├── /         → 静态页面 (SSR)
    ├── /api/*    → 代理到后端 API
    └── 静态资源   → JS/CSS/图片
    ↓
后端 API (appliance-api)
    ↓
RDS PostgreSQL
```

### API 代理

前端所有 `/api/*` 请求通过 FC 函数代理到后端：

```javascript
// fc-entry/index.js
const API_BACKEND = process.env.API_BACKEND || 'https://api-ojlfojnolj.cn-shenzhen-vpc.fcapp.run'
```

## 环境变量

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `API_BACKEND` | 后端 API 地址 | `https://appliance-api.cheapgo.top` |

## SSL 证书

使用 Let's Encrypt 免费证书，通过 GitHub Actions 每 60 天自动续签。

手动触发续签：GitHub → Actions → Renew SSL Certificate → Run workflow

## 相关仓库

| 仓库 | 说明 |
|------|------|
| [home-appliances/appliance-api](https://github.com/home-appliances/appliance-api) | 后端 API |
