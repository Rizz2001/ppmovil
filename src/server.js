import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { handleApiRoutes } from './routes/api.routes.js';
import { cargarConfiguracion } from './services/mercantil.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.resolve(__dirname, '../public');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8'
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;

  // 1. Enrutar peticiones API
  if (pathname.startsWith('/api/')) {
    return handleApiRoutes(req, res, url);
  }

  // 2. Servir archivos estáticos desde public/
  let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);

  // Evitar escape de directorio seguro (path traversal)
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Acceso denegado');
  }

  // Si no tiene extensión y no es un archivo, intentar buscar index.html
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    });
    return fs.createReadStream(filePath).pipe(res);
  }

  // 3. Fallback a 404
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Recurso no encontrado: ' + pathname);
});

const config = cargarConfiguracion();
const PUERTO = process.env.PORT || config.PUERTO || 3000;

server.listen(PUERTO, () => {
  console.log(`=======================================================`);
  console.log(`🏦 Verificador Mercantil P2C - Catador Empresas`);
  console.log(`📁 Arquitectura Modular: Node.js 100% Nativo`);
  console.log(`🚀 Servidor ejecutándose en: http://localhost:${PUERTO}`);
  console.log(`⚙️  Modo activo: ${(config.MODO || 'MOCK').toUpperCase()}`);
  console.log(`=======================================================`);
});
