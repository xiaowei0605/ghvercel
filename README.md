# GitHub Proxy 代理服务

一个基于 Vercel Serverless Functions 构建的 GitHub 资源代理服务，用于解决 GitHub 访问速度慢的问题，提供加速下载功能。

## 🚀 功能特性

- **快速下载**：直接输入 GitHub 文件链接，通过代理加速下载
- **多种使用方式**：支持 Git Clone、wget、curl 等多种命令行工具
- **多域名支持**：支持 GitHub、Raw GitHub、Codeload 等多个 GitHub 相关域名
- **跨域支持**：配置了完整的 CORS 头部，支持前端跨域请求
- **缓存优化**：添加了缓存控制头部，提升访问效率

## 📋 支持的域名

- `github.com`
- `raw.githubusercontent.com`
- `github-releases.githubusercontent.com`
- `avatars.githubusercontent.com`
- `user-images.githubusercontent.com`
- `codeload.github.com`
- `objects.githubusercontent.com`

## 🛠️ 部署方式

### 1. Vercel 部署（推荐）

#### 方法一：一键部署

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-username/ghvercel&project-name=github-proxy&repository-name=github-proxy)

点击上方按钮，使用 GitHub/GitLab/Bitbucket 账户登录并授权，然后按照提示完成部署。

#### 方法二：CLI 部署

1. **安装 Vercel CLI**

   ```bash
   npm install -g vercel
   ```

2. **克隆项目**

   ```bash
   git clone https://github.com/ExceptionsOccur/ghvercel.git
   cd ghvercel
   ```

3. **登录 Vercel（可选，如需连接账户）**

   ```bash
   vercel login
   ```

4. **部署项目**

   ```bash
   # 开发环境部署
   vercel

   # 生产环境部署
   vercel --prod
   ```

5. **配置自定义域名（可选）**
   在 Vercel 控制台中，进入项目设置，找到 "Domains" 部分，添加自定义域名。

#### 方法三：手动部署到 Vercel

1. 访问 [Vercel 官网](https://vercel.com/)
2. 使用 GitHub/GitLab/Bitbucket 账户登录
3. 点击 "New Project"
4. 选择要导入的仓库（fork 此仓库或创建自己的仓库）
5. 点击 "Import"
6. 在配置页面中，保持默认设置或根据需要修改
7. 点击 "Deploy"

### 2. 环境变量配置

如果需要使用 GitHub Token 来提高 API 请求限额，可以在以下位置配置：

#### Vercel 项目设置中：

1. 进入 Vercel 项目仪表板
2. 点击 "Settings" -> "Environment Variables"
3. 添加以下环境变量：
   ```
   GITHUB_TOKEN=your_github_token
   ```

#### 或在部署时通过 CLI 配置：

```bash
vercel env add GITHUB_TOKEN
```

## 📖 使用方法

### Web 界面使用

访问部署后的网站，在输入框中输入 GitHub 链接，点击"直接下载"按钮即可。

### 命令行使用

#### Git Clone

```bash
git clone https://your-domain.vercel.app/https://github.com/username/repo.git
```

#### wget 下载

```bash
wget https://your-domain.vercel.app/https://codeload.github.com/username/repo/zip/refs/heads/main
```

#### curl 下载

```bash
curl -LO https://your-domain.vercel.app/https://codeload.github.com/username/repo/zip/refs/heads/main
```

## 🔧 代理规则

根据 `vercel.json` 中的重写规则：

- `/` → `index.html` (主页)
- `/(.*)` → `/api/github-proxy` (通用代理)

## 📁 项目结构

```
├── index.html          # 前端界面
├── api/
│   └── github-proxy.js # 代理服务主逻辑
├── vercel.json         # Vercel 配置文件
└── package.json        # 项目依赖配置
```

## ⚠️ 注意事项

- 本服务基于 Vercel 免费套餐，有每月使用限制(100GB)
- 仅用于个人开发或测试用途
- 不得用于商业用途或违反 GitHub 使用条款的行为

## 📄 许可证

此项目仅供学习和开发测试使用。
