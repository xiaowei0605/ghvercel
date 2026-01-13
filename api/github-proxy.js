import https from 'https';
import { parse } from 'url';

export default async function handler(req, res) {
  const { query, pathname } = parse(req.url, true);

  // 添加请求日志
  console.log('收到请求:', {
    pathname,
    method: req.method,
    query: Object.keys(query)
  });

  // 设置 CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // 统一代理逻辑
    let targetUrl;
    if (pathname === '/proxy' && query.url) {
      // 方式1: /proxy?url=encoded_github_url
      let decodedUrl = decodeURIComponent(query.url);
      // 检查是否已经有 https://
      if (!decodedUrl.startsWith('http://') && !decodedUrl.startsWith('https://')) {
        // 如果没有协议头，补充 https://
        if (decodedUrl.startsWith('github.com/') || decodedUrl.startsWith('raw.githubusercontent.com/')) {
          decodedUrl = 'https://' + decodedUrl;
        } else {
          // 默认当作 GitHub 路径
          decodedUrl = 'https://github.com/' + decodedUrl;
        }
      }
      targetUrl = decodedUrl;
    } else if (pathname.startsWith('/github/') && pathname.length > '/github/'.length) {
      // 方式2: /github/{完整的github路径}
      const githubPath = pathname.replace('/github/', '');
      const searchParams = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
      if (!githubPath.startsWith('http://') && !githubPath.startsWith('https://')) {
        // 如果没有协议头，补充 https://
        targetUrl = 'https://' + githubPath + searchParams;
      } else {
        // 如果有协议头，直接使用
        targetUrl = githubPath + searchParams;
      }
    } else {
      // 默认代理到 GitHub
      const fullPath = pathname === '/' ? '' : pathname;

      console.log('原始路径:', fullPath);

      let processedPath = fullPath;

      // 统一处理各种格式的GitHub URL
      if (processedPath.startsWith('/https:/github.com/')) {
        // 处理 /https:/github.com/xxx 格式（单斜杠）
        processedPath = 'https://' + processedPath.substring('/https:/'.length);
        // 保留查询参数
        const searchParams = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
        targetUrl = processedPath + searchParams;
        console.log('处理为完整URL（单斜杠）:', targetUrl);
      } else if (processedPath.startsWith('/https://github.com/')) {
        // 处理 /https://github.com/xxx 格式（双斜杠）
        processedPath = processedPath.substring('/https:'.length);
        // 保留查询参数
        const searchParams = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
        targetUrl = processedPath + searchParams;
        console.log('处理为完整URL（双斜杠）:', targetUrl);
      } else if (processedPath.startsWith('/http:/github.com/')) {
        // 处理 /http:/github.com/xxx 格式（单斜杠）
        processedPath = 'http://' + processedPath.substring('/http:/'.length);
        // 保留查询参数
        const searchParams = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
        targetUrl = processedPath + searchParams;
        console.log('处理为完整URL（HTTP单斜杠）:', targetUrl);
      } else if (processedPath.startsWith('/http://github.com/')) {
        // 处理 /http://github.com/xxx 格式（双斜杠）
        processedPath = processedPath.substring('/http:'.length);
        // 保留查询参数
        const searchParams = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
        targetUrl = processedPath + searchParams;
        console.log('处理为完整URL（HTTP双斜杠）:', targetUrl);
      } else if (processedPath.startsWith('/github.com/')) {
        // 处理 /github.com/xxx 格式
        processedPath = processedPath.substring('/github.com'.length);
      }
      if (targetUrl) {
        console.log('通过协议前缀处理的URL:', targetUrl);
      } else if (processedPath.startsWith('http://') || processedPath.startsWith('https://')) {
        // 已经是完整URL，直接使用
        targetUrl = processedPath + (req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '');
      } else {
        console.log('进入GitHub拼接逻辑');
        // 确保 Git 仓库路径以 .git 结尾
        let finalPath = processedPath;
        if (req.method === 'GET' &&
          !processedPath.includes('/info/refs') &&
          !processedPath.includes('git-') &&
          !processedPath.endsWith('.git') &&
          (processedPath.endsWith('/') || processedPath.split('/').length === 2)) {
          // 如果是仓库根路径，加上 .git
          finalPath = processedPath + (processedPath.endsWith('/') ? '' : '/') + '.git';
        }

        const searchParams = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
        console.log('查询参数:', searchParams);
        targetUrl = `https://github.com${finalPath}${searchParams}`;
        console.log('GitHub拼接URL:', targetUrl);
      }
    }

    console.log('最终目标URL:', targetUrl);

    if (!targetUrl) {
      console.error('无法确定目标URL，pathname:', pathname);
      res.status(400).json({ error: 'Invalid request path', pathname });
      return;
    }

    // 执行代理
    await proxyRequest(req, res, targetUrl, 0);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function proxyRequest(req, res, targetUrl, redirectCount = 0) {

  // 添加重定向计数，防止无限重定向
  const MAX_REDIRECTS = 5;
  if (redirectCount >= MAX_REDIRECTS) {
    res.status(508).json({ error: 'Too many redirects' });
    return;
  }

  const parsedUrl = new URL(targetUrl);
  const { hostname, pathname, search } = parsedUrl;
  // 添加调试日志
  console.log('代理请求:', {
    targetUrl,
    hostname,
    pathname,
    search,
    method: req.method
  });

  // 检查是否允许的 GitHub 域名
  const allowedDomains = [
    'github.com',
    'raw.githubusercontent.com',
    'github-releases.githubusercontent.com',
    'release-assets.githubusercontent.com',
    'github-production-release-asset',
    'github-production-asset',
    'github-production-user-asset',
    'avatars.githubusercontent.com',
    'user-images.githubusercontent.com',
    'codeload.github.com',
    'objects.githubusercontent.com',
    'github.githubassets.com',
    'media.githubusercontent.com',
    'cloud.githubusercontent.com'
  ];

  const isAllowed = allowedDomains.some(domain => {
    // 精确匹配或子域名匹配
    return hostname === domain ||
      hostname.endsWith('.' + domain) ||
      // 对于包含破折号的域名，使用 includes 检查
      domain.includes('-') && hostname.includes(domain);
  });

  if (!isAllowed) {
    console.log('域名不被允许:', hostname, '路径:', pathname);
    res.status(403).json({ error: 'Domain not allowed' });
    return;
  }

  const options = {
    hostname,
    path: pathname + search,
    method: req.method,
    headers: {
      ...req.headers,
      'host': hostname,
      'User-Agent': 'git/2.30.0',
      'Accept': '*/*',
      'Pragma': 'no-cache'
    }
  };

  delete options.headers['x-forwarded-host'];
  delete options.headers['x-forwarded-proto'];
  delete options.headers['x-forwarded-for'];

  // 检测并处理 Git 智能协议
  const isGitRequest = pathname.endsWith('.git') ||
    pathname.includes('/info/refs') ||
    pathname.includes('git-upload-pack') ||
    pathname.includes('git-receive-pack');

  if (isGitRequest) {
    // Git 智能协议需要特定的头部
    if (pathname.includes('/info/refs')) {
      const params = new URLSearchParams(search);
      const service = params.get('service') || 'git-upload-pack';
      const serviceType = service === 'git-upload-pack' ? 'upload' : 'receive';
      options.headers['Accept'] = `application/x-git-${serviceType}-pack-advertisement`;
      options.headers['Git-Protocol'] = 'version=2';
      options.headers['User-Agent'] = 'git/2.30.0';
    } else if (pathname.includes('git-upload-pack') || pathname.includes('git-receive-pack')) {
      const service = pathname.includes('upload-pack') ? 'upload' : 'receive';
      options.headers['Accept'] = `application/x-git-${service}-pack-result`;
      if (req.method === 'POST') {
        options.headers['Content-Type'] = `application/x-git-${service}-pack-request`;
        if (req.headers['content-length']) {
          options.headers['Content-Length'] = req.headers['content-length'];
        }
      }
    }
  }


  // 添加 GitHub Token（可选）
  if (process.env.GITHUB_TOKEN) {
    options.headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
  }

  const proxyReq = https.request(options, (proxyRes) => {
    // 设置响应头
    const headers = { ...proxyRes.headers };

    // 检查是否是重定向
    if ([301, 302, 303, 307, 308].includes(proxyRes.statusCode) && proxyRes.headers.location) {
      const location = proxyRes.headers.location;
      console.log(`检测到重定向 ${redirectCount + 1}:`, location);

      // 处理相对路径
      let newTargetUrl;
      if (location.startsWith('/')) {
        // 相对路径
        newTargetUrl = `https://${hostname}${location}`;
      } else if (location.includes('://')) {
        // 绝对路径
        newTargetUrl = location;
      } else {
        // 其他格式
        newTargetUrl = `https://${hostname}/${location}`;
      }

      console.log('自动跟随重定向到:', newTargetUrl);

      // 递归调用 proxyRequest 处理重定向
      if (['GET', 'HEAD'].includes(req.method)) {
        // 简单请求，直接递归
        proxyRequest(req, res, newTargetUrl, redirectCount + 1);
      } else {
        // 复杂请求，需要重新构建
        console.warn('重定向的POST/PUT/PATCH请求可能丢失请求体');
        // 这里可以缓存请求体，但简化起见，我们只支持GET重定向
        proxyRequest(req, res, newTargetUrl, redirectCount + 1);
      }
      return;
    }

    // 如果是 Git 请求，设置正确的协议头
    if (isGitRequest) {
      if (pathname.includes('/info/refs')) {
        const params = new URLSearchParams(search);
        const service = params.get('service') || 'git-upload-pack';
        const serviceType = service === 'git-upload-pack' ? 'upload' : 'receive';
        headers['content-type'] = `application/x-git-${serviceType}-pack-advertisement`;
        headers['cache-control'] = 'no-cache';
        headers['expires'] = 'Fri, 01 Jan 1980 00:00:00 GMT';
        headers['pragma'] = 'no-cache';
        if (proxyRes.headers['git-protocol']) {
          headers['git-protocol'] = proxyRes.headers['git-protocol'];
        }
      } else if (pathname.includes('git-upload-pack') || pathname.includes('git-receive-pack')) {
        const service = pathname.includes('upload-pack') ? 'upload' : 'receive';
        headers['content-type'] = `application/x-git-${service}-pack-result`;
        headers['cache-control'] = 'no-cache';
      }
    } else {
      // 非 Git 请求才添加缓存
      headers['Cache-Control'] = 'public, max-age=3600';
    }

    headers['X-Proxy'] = 'github-proxy';

    // 移除 location 头，客户端不会看到重定向
    delete headers.location;
    console.log('返回最终响应，状态码:', proxyRes.statusCode);
    res.writeHead(proxyRes.statusCode, headers);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (error) => {
    console.error('Proxy request error:', error.message, '目标URL:', targetUrl);
    if (!res.headersSent) {
      res.status(502).json({
        error: 'Proxy error',
        message: error.message,
        target: targetUrl
      });
    }
  });

  proxyReq.setTimeout(30000, () => {
    console.error('Proxy request timeout:', targetUrl);
    proxyReq.destroy();
    if (!res.headersSent) {
      res.status(504).json({ error: 'Proxy timeout' });
    }
  });

  // Git 请求需要流式传输请求体
  if (isGitRequest && req.method === 'POST') {
    // Git 智能协议 POST 请求需要传输整个请求体
    req.pipe(proxyReq);
  } else if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    req.pipe(proxyReq);
  } else {
    proxyReq.end();
  }
}