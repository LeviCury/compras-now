/**
 * Compras Now Executivo - servidor Express para hospedagem interna na VM Minerva.
 *
 * Serve:
 *  - APIs /api/* (mesma logica das Vercel Functions, lendo do GitHub privado)
 *  - SPA estatica (dist/) gerada por `vite build`
 *
 * O bloqueio "so quem esta na rede Minerva acessa" e' feito naturalmente pela
 * topologia: a VM tem IP interno; quem nao esta na LAN/VPN simplesmente nao
 * roteia ate' aqui.
 */

import path from 'node:path';
import express, { type Request, type Response, type NextFunction } from 'express';
import dotenv from 'dotenv';

import healthRouter from './routes/health';
import snapshotRouter from './routes/snapshot';
import snapshotsRouter from './routes/snapshots';
import intradayRouter from './routes/intraday';
import screenshotRouter from './routes/screenshot';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT ?? 8080);

// Em producao o server compilado fica em dist-server/ e a SPA em dist/
// (ambos na raiz do projeto). __dirname = dist-server/, DIST = dist/.
// Output de tsc esta em CommonJS, entao __dirname e nativo.
const DIST = path.resolve(__dirname, '..', 'dist');

// Log basico de cada request
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// 1. APIs (mesma logica das Vercel Functions, agora como rotas Express)
app.use('/api/health', healthRouter);
app.use('/api/snapshot', snapshotRouter);
app.use('/api/snapshots', snapshotsRouter);
app.use('/api/intraday', intradayRouter);
app.use('/api/screenshot', screenshotRouter);

// 2. SPA estatica (gerada por `vite build`)
app.use(
  express.static(DIST, {
    maxAge: '1h',
    setHeaders: (res, filePath) => {
      // index.html nao deve ser cacheado pra atualizacoes do app chegarem rapido
      if (filePath.endsWith('index.html')) {
        res.setHeader('Cache-Control', 'no-cache');
      }
    },
  }),
);

// 3. Fallback de SPA: qualquer rota nao-API e nao-arquivo cai no index.html
app.get('*', (_req: Request, res: Response) => {
  res.sendFile(path.join(DIST, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Compras Now Executivo rodando em http://localhost:${PORT}`);
  console.log(`SPA: ${DIST}`);
  console.log(`Repo: ${process.env.GITHUB_REPO ?? '(nao configurado)'}`);
});
