const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = (req, res) => {
  // 配置代理目标
  const target = 'https://raw.githubusercontent.com';

  // 可选：限制特定仓库或路径
  const allowedPaths = [];

  // 创建代理中间件
  const proxy = createProxyMiddleware({
    target,
    changeOrigin: true,
    pathRewrite: {
      '^/api': '', // 移除 /api 前缀
    },
    onProxyReq: (proxyReq, req, res) => {
      // 可以在这里添加自定义逻辑
      console.log(`Proxying: ${req.url} -> ${target}`);
    },
    onError: (err, req, res) => {
      res.status(500).json({ error: 'Proxy error' });
    }
  });

  return proxy(req, res);
};