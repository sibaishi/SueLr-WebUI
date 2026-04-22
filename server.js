// AI 助手本地服务器 - 运行: node server.js
// 提供前端静态文件服务 + 数据持久化 API
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3001;
const DATA_DIR = path.join(__dirname, 'data');
const STATIC_DIR = path.join(__dirname, 'dist');

function ensureDir(dir) { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); }
ensureDir(DATA_DIR);
ensureDir(path.join(DATA_DIR, 'files', 'images'));

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function jsonRes(res, data, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

function loadData(type) {
  const fp = path.join(DATA_DIR, `${type}.json`);
  if (!fs.existsSync(fp)) return [];
  try { return JSON.parse(fs.readFileSync(fp, 'utf8')); } catch { return []; }
}

function saveData(type, data) {
  fs.writeFileSync(path.join(DATA_DIR, `${type}.json`), JSON.stringify(data, null, 2));
}

const MIME_MAP = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.webp': 'image/webp', '.mp4': 'video/mp4',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.woff': 'font/woff', '.woff2': 'font/woff2',
};

async function handleAPI(req, res, pathname) {
  const m = req.method;

  if (pathname === '/api/status' && m === 'GET')
    return jsonRes(res, { ok: true, version: '1.0.0' });

  // --- Conversations ---
  if (pathname === '/api/conversations') {
    if (m === 'GET') return jsonRes(res, loadData('conversations'));
    if (m === 'POST') {
      const body = JSON.parse((await readBody(req)).toString());
      saveData('conversations', Array.isArray(body) ? body : (body.convs || []));
      return jsonRes(res, { ok: true });
    }
  }
  if (/^\/api\/conversations\/[^/]+$/.test(pathname) && m === 'DELETE') {
    const id = decodeURIComponent(pathname.split('/').pop());
    saveData('conversations', loadData('conversations').filter(c => c.id !== id));
    return jsonRes(res, { ok: true });
  }

  // --- Images (Gallery) ---
  if (pathname === '/api/images') {
    if (m === 'GET') return jsonRes(res, loadData('gallery'));
    if (m === 'POST') {
      const body = JSON.parse((await readBody(req)).toString());
      const gallery = loadData('gallery');
      // base64 → file on disk
      if (body.data && body.data.startsWith('data:')) {
        const mat = body.data.match(/^data:(image\/[\w+]+);base64,(.+)$/);
        if (mat) {
          const extMap = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif', 'image/webp': 'webp' };
          const ext = extMap[mat[1]] || 'png';
          const filename = `${body.id}.${ext}`;
          fs.writeFileSync(path.join(DATA_DIR, 'files', 'images', filename), Buffer.from(mat[2], 'base64'));
          body.localUrl = `/api/files/images/${filename}`;
        }
        delete body.data;
      } else {
        body.localUrl = body.url || body.localUrl || null;
      }
      body.storedAt = Date.now();
      gallery.push(body);
      saveData('gallery', gallery);
      return jsonRes(res, { ok: true, localUrl: body.localUrl });
    }
    if (m === 'DELETE') {
      saveData('gallery', []);
      return jsonRes(res, { ok: true });
    }
  }
  if (/^\/api\/images\/[^/]+$/.test(pathname) && m === 'DELETE') {
    const id = decodeURIComponent(pathname.split('/').pop());
    let gallery = loadData('gallery');
    const item = gallery.find(g => g.id === id);
    if (item?.localUrl) {
      const fp = path.join(DATA_DIR, 'files', path.basename(item.localUrl));
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
    }
    saveData('gallery', gallery.filter(g => g.id !== id));
    return jsonRes(res, { ok: true });
  }

  // --- Videos ---
  if (pathname === '/api/videos') {
    if (m === 'GET') return jsonRes(res, loadData('videos'));
    if (m === 'POST') {
      const body = JSON.parse((await readBody(req)).toString());
      const videos = loadData('videos');
      body.storedAt = Date.now();
      videos.push(body);
      saveData('videos', videos);
      return jsonRes(res, { ok: true });
    }
    if (m === 'DELETE') {
      saveData('videos', []);
      return jsonRes(res, { ok: true });
    }
  }
  if (/^\/api\/videos\/[^/]+$/.test(pathname) && m === 'DELETE') {
    const id = decodeURIComponent(pathname.split('/').pop());
    saveData('videos', loadData('videos').filter(v => v.id !== id));
    return jsonRes(res, { ok: true });
  }

  // --- Settings ---
  if (pathname === '/api/settings') {
    const fp = path.join(DATA_DIR, 'settings.json');
    if (m === 'GET') {
      if (fs.existsSync(fp)) {
        try { return jsonRes(res, JSON.parse(fs.readFileSync(fp, 'utf8'))); } catch { return jsonRes(res, {}); }
      }
      return jsonRes(res, {});
    }
    if (m === 'POST') {
      const body = JSON.parse((await readBody(req)).toString());
      fs.writeFileSync(fp, JSON.stringify(body, null, 2));
      return jsonRes(res, { ok: true });
    }
  }

  // --- File serving ---
  if (pathname.startsWith('/api/files/')) {
    const rel = pathname.replace('/api/files/', '');
    const fp = path.join(DATA_DIR, 'files', rel);
    if (!fp.startsWith(path.join(DATA_DIR, 'files'))) return jsonRes(res, { error: 'Forbidden' }, 403);
    if (fs.existsSync(fp) && fs.statSync(fp).isFile()) {
      res.writeHead(200, { 'Content-Type': MIME_MAP[path.extname(fp).toLowerCase()] || 'application/octet-stream' });
      fs.createReadStream(fp).pipe(res);
      return;
    }
    return jsonRes(res, { error: 'Not found' }, 404);
  }

  return jsonRes(res, { error: 'Not found' }, 404);
}

function serveStatic(req, res, pathname) {
  let fp = path.join(STATIC_DIR, pathname === '/' ? 'index.html' : pathname);
  if (fp.endsWith('/')) fp += 'index.html';
  if (!fs.existsSync(fp) || fs.statSync(fp).isDirectory()) fp = path.join(STATIC_DIR, 'index.html');
  if (fs.existsSync(fp)) {
    res.writeHead(200, { 'Content-Type': MIME_MAP[path.extname(fp).toLowerCase()] || 'application/octet-stream' });
    fs.createReadStream(fp).pipe(res);
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
}

const server = http.createServer(async (req, res) => {
  const pathname = (req.url || '/').split('?')[0];
  try {
    if (pathname.startsWith('/api/')) await handleAPI(req, res, pathname);
    else serveStatic(req, res, pathname);
  } catch (err) {
    console.error('Error:', err.message);
    if (!res.headersSent) jsonRes(res, { error: err.message }, 500);
  }
});

server.listen(PORT, () => {
  console.log('');
  console.log('  🤖 AI 多模态助手');
  console.log(`  🌐 http://localhost:${PORT}`);
  console.log(`  💾 ${DATA_DIR}`);
  console.log('');
});
