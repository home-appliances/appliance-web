# 部署指南

## 架构

```
用户浏览器
    ↓
前端 FC (Web 函数)
    ├── 静态文件：dist/h5/ 构建产物
    └── /api/* → 反向代理到后端 FC
                ↓
            后端 FC (Hono API)
                ↓
            RDS PostgreSQL
```

## 项目结构

```
web/
├── src/                    # 源代码
├── config/                 # Taro 配置
├── fc-entry/               # FC 入口函数
│   ├── index.js            # 静态服务 + API 代理
│   └── package.json
├── dist/                   # 构建产物（不提交）
│   ├── h5/                 # H5 构建产物
│   └── weapp/              # 小程序构建产物
├── package.json
└── ...
```

## 部署流程

### 自动部署

1. 推送代码到 `main` 分支的 `web/` 目录
2. GitHub Actions 自动触发：
    - `npm install --legacy-peer-deps`
    - `npm run build:h5`
    - 打包 `dist/h5/` + `fc-entry/` → zip
    - 上传到前端 FC 函数

### 手动触发

在 GitHub Actions 页面点击 "Run workflow"。

## GitHub Secrets 配置

仓库 → Settings → Secrets and variables → Actions：

| Secret                     | 说明         | 示例                 |
|----------------------------|------------|--------------------|
| `ALIYUN_ACCESS_KEY_ID`     | 阿里云 AK     | `LTAI5t...`        |
| `ALIYUN_ACCESS_KEY_SECRET` | 阿里云 SK     | `xxx...`           |
| `ALIYUN_REGION`            | FC 所在区域    | `cn-shenzhen`      |
| `FC_FUNCTION_NAME`         | 前端 FC 函数名称 | `jd-appliance-web` |

## 前端 FC 函数配置

在阿里云 FC 控制台：

- **运行时**：Node.js 16 或 18
- **入口**：`index.handler`
- **环境变量**（可选，代码已有默认值）：
    - `API_BACKEND`: `https://applican-applian-service-uzjmdtpnxs.cn-shenzhen-vpc.fcapp.run`
- **网络配置**：
    - VPC：需要配置 VPC（访问后端 FC 内网地址）
