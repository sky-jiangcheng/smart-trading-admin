# Investment Admin Console

投资 API 管理台 - 用于管理 RSS 数据源和投资信号规则的独立前端应用。

## 功能特性

- 📡 **RSS 数据源管理** - 添加/删除新闻 RSS 源
- 📊 **信号规则配置** - 创建/编辑/删除投资信号生成规则
- 🔄 **实时刷新** - 手动触发新闻和信号数据刷新
- 🔐 **安全认证** - Basic Auth 保护管理接口
- 🔗 **双向导航** - 与 Dashboard 页面互跳

## 技术栈

- **Framework**: Next.js 16
- **Language**: TypeScript
- **Styling**: Inline CSS (兼容 Dashboard 风格)
- **API**: RESTful 接口调用 investment-api

## 快速开始

### 环境要求

- Node.js 18+
- npm 或 yarn

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

应用将在 `http://localhost:3002` 启动

### 生产构建

```bash
npm run build
npm start
```

## 配置说明

### 环境变量

创建 `.env.local` 文件来配置以下环境变量：

```bash
# Dashboard URL
NEXT_PUBLIC_DASHBOARD_URL=https://smart-trading-dashboard-gules.vercel.app

# API 基础 URL
NEXT_PUBLIC_API_URL=http://localhost:3001

# 管理认证信息
NEXT_PUBLIC_ADMIN_USER=admin
NEXT_PUBLIC_ADMIN_PASS=password
```

如果不设置，将使用默认值。

### 默认配置

- **Dashboard URL**: `https://smart-trading-dashboard-gules.vercel.app`
- **API URL**: `http://localhost:3001`
- **Admin 用户**: `admin`
- **Admin 密码**: `password`

## API 接口

管理台调用以下 investment-api 接口：

- `GET /admin/sources` - 获取 RSS 源列表
- `POST /admin/sources` - 添加 RSS 源
- `DELETE /admin/sources` - 删除 RSS 源
- `GET /admin/rules` - 获取信号规则
- `POST /admin/rules` - 添加/更新规则
- `DELETE /admin/rules` - 删除规则
- `POST /admin/refresh` - 刷新数据

## 项目结构

```
investment-admin/
├── app/
│   ├── layout.tsx      # 根布局
│   ├── page.tsx        # 管理台主页面
│   └── globals.css     # 全局样式
├── package.json        # 项目配置
├── next.config.ts      # Next.js 配置
├── tsconfig.json       # TypeScript 配置
└── .gitignore          # Git 忽略文件
```

## 开发说明

### 代码规范

- 使用 TypeScript 严格模式
- ESLint 配置遵循 Next.js 最佳实践
- 提交前运行 `npm run lint` 检查

### 样式说明

采用内联样式保持与 Dashboard 一致的视觉风格。

## 部署

### Vercel 部署

1. 连接 GitHub 仓库
2. 设置环境变量（如果需要自定义认证信息）
3. 部署完成

### Docker 部署

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3002
CMD ["npm", "start"]
```

## 相关项目

- [investment-dashboard](https://github.com/sky-jiangcheng/smart-trading-dashboard) - 主 Dashboard 应用
- [investment-api](https://github.com/sky-jiangcheng/smart-trading-api) - 后端 API 服务

## 许可证

MIT License