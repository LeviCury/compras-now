/**
 * Compras Now Executivo - servidor Express para hospedagem interna na VM Minerva.
 *
 * Serve:
 *  - APIs /api/* (mesma logica das Vercel Functions, lendo do GitHub privado)
 *  - SPA estatica (dist/) gerada por `vite build`
 *  - Autenticacao via Microsoft Entra ID (OpenID Connect)
 *
 * O bloqueio "so quem esta na rede Minerva acessa" e' feito naturalmente pela
 * topologia: a VM tem IP interno; quem nao esta na LAN/VPN simplesmente nao
 * roteia ate' aqui. Em cima disso, exigimos login Microsoft em todas as
 * rotas de API (a menos que AUTH_DISABLED=1 no .env).
 */

import path from 'node:path';
import crypto from 'node:crypto';
import express, { type Request, type Response, type NextFunction } from 'express';
import session from 'express-session';
import dotenv from 'dotenv';

import authRouter from './auth/routes';
import { requireAuth, isAuthDisabled } from './middleware/requireAuth';
import healthRouter from './routes/health';
import snapshotRouter from './routes/snapshot';
import snapshotsRouter from './routes/snapshots';
import intradayRouter from './routes/intraday';
import screenshotRouter from './routes/screenshot';

// A tipagem custom da sessao (req.session.user etc.) vive em
// server/auth/session-types.d.ts e e' aplicada automaticamente pelo tsc
// quando o arquivo esta no escopo de include do tsconfig.server.json.
// Nao precisamos (nem podemos) importar .d.ts em runtime.

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT ?? 8080);

// Em producao o server compilado fica em dist-server/ e a SPA em dist/
// (ambos na raiz do projeto). __dirname = dist-server/, DIST = dist/.
// Output de tsc esta em CommonJS, entao __dirname e nativo.
const DIST = path.resolve(__dirname, '..', 'dist');

// ---------------------------------------------------------------------------
// Log basico
// ---------------------------------------------------------------------------
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// ---------------------------------------------------------------------------
// Sessao (cookie HttpOnly assinado)
// ---------------------------------------------------------------------------
//
// SESSION_SECRET deve ser uma string aleatoria longa. Se nao estiver
// configurada, geramos uma efemera (sessoes morrem se o processo reiniciar -
// aceitavel em dev, mas em producao essa variavel deve sempre estar setada).
const sessionSecret =
  process.env.SESSION_SECRET ?? crypto.randomBytes(48).toString('hex');
if (!process.env.SESSION_SECRET) {
  console.warn(
    '[auth] SESSION_SECRET nao configurada - gerada efemera. ' +
      'Em producao, defina SESSION_SECRET no .env para sobreviver a reinicios.',
  );
}

const isProd = process.env.NODE_ENV === 'production';
const isHttps = (process.env.AZURE_REDIRECT_URI ?? '').startsWith('https://');

app.use(
  session({
    name: 'compras-now-sid',
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      // secure=true so' funciona em HTTPS. Em dev/HTTP precisa false ou
      // o cookie nem chega no browser.
      secure: isProd && isHttps,
      maxAge: 8 * 60 * 60 * 1000, // 8 horas
    },
  }),
);

// ---------------------------------------------------------------------------
// Rotas de auth (publicas - precisam responder antes do requireAuth)
// ---------------------------------------------------------------------------
//
// Importante: o router de auth tambem expoe GET /me, que e' a forma do
// frontend perguntar "estou logado?". Montamos em /auth E em /api para que
// `GET /api/me` funcione (pre-empt do requireAuth global de /api).
app.use('/auth', authRouter);
app.use('/api/me', authRouter);

// ---------------------------------------------------------------------------
// /api/health - publico (monitoria pode bater sem login)
// ---------------------------------------------------------------------------
app.use('/api/health', healthRouter);

// ---------------------------------------------------------------------------
// Daqui pra baixo: tudo em /api/* exige autenticacao Microsoft
// (a menos que AUTH_DISABLED=1 no .env, ai libera tudo)
// ---------------------------------------------------------------------------
app.use('/api', requireAuth);
app.use('/api/snapshot', snapshotRouter);
app.use('/api/snapshots', snapshotsRouter);
app.use('/api/intraday', intradayRouter);
app.use('/api/screenshot', screenshotRouter);

// ---------------------------------------------------------------------------
// SPA estatica (gerada por `vite build`)
// ---------------------------------------------------------------------------
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

// Fallback de SPA: qualquer rota nao-API e nao-arquivo cai no index.html
app.get('*', (_req: Request, res: Response) => {
  res.sendFile(path.join(DIST, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Compras Now Executivo rodando em http://localhost:${PORT}`);
  console.log(`SPA: ${DIST}`);
  console.log(`Repo: ${process.env.GITHUB_REPO ?? '(nao configurado)'}`);
  console.log(
    `Autenticacao Microsoft Entra ID: ${
      isAuthDisabled() ? 'DESLIGADA (AUTH_DISABLED=1)' : 'ATIVA'
    }`,
  );
});
