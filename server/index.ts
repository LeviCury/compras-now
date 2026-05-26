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

import authRouter, { meHandler } from './auth/routes';
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

// Quando rodando atras de proxy reverso (na VM com IIS/Nginx corporativo
// fazendo TLS termination), Express precisa confiar nos headers
// X-Forwarded-Proto e X-Forwarded-For para que cookies "secure" e
// req.protocol funcionem corretamente. Em dev local (localhost) nao tem
// efeito porque nao ha proxy entre o browser e o Express.
app.set('trust proxy', 1);

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

// COOKIE_SECURE=0 desliga o flag `secure` do cookie de sessao mesmo em
// producao + HTTPS. Use isso quando estiver atras de um proxy reverso
// que NAO repassa X-Forwarded-Proto (ex: nginx mal configurado), porque
// nesse cenario o Express enxerga req.secure=false e nunca seta o cookie.
// O ideal e' configurar o proxy corretamente; isso aqui e' workaround.
const cookieSecure =
  process.env.COOKIE_SECURE === '0' ? false : isProd && isHttps;

app.use(
  session({
    name: 'compras-now-sid',
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    // proxy: true faz com que express-session use req.secure derivado de
    // X-Forwarded-Proto (que o nginx setar) para decidir enviar o cookie
    // marcado como secure. Sem isso, em prod atras de proxy reverso, o
    // cookie nunca seria setado (Express enxerga HTTP no upstream).
    proxy: true,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: cookieSecure,
      maxAge: 8 * 60 * 60 * 1000, // 8 horas
    },
  }),
);

console.log(`[auth] cookie.secure=${cookieSecure} (COOKIE_SECURE env=${process.env.COOKIE_SECURE ?? 'unset'})`);

// Log de diagnostico de cada request com info de proxy/cookie - util pra
// debugar problemas de sessao em producao atras de nginx/iis. Vai pra
// stdout.log via NSSM.
app.use((req: Request, _res: Response, next: NextFunction) => {
  if (req.path.startsWith('/auth/') || req.path === '/api/me') {
    console.log(
      `[diag] ${req.method} ${req.path} sid=${req.sessionID} ` +
        `proto=${req.protocol} secure=${req.secure} ` +
        `x-fwd-proto=${req.headers['x-forwarded-proto'] ?? 'unset'} ` +
        `x-fwd-for=${req.headers['x-forwarded-for'] ?? 'unset'} ` +
        `cookie=${req.headers.cookie ? 'present' : 'MISSING'} ` +
        `session.user=${req.session.user?.mail ?? 'unset'} ` +
        `session.authState=${req.session.authState ? 'set' : 'unset'}`,
    );
  }
  next();
});

// ---------------------------------------------------------------------------
// Rotas de auth (publicas - precisam responder antes do requireAuth)
// ---------------------------------------------------------------------------
//
// Importante: GET /api/me precisa ser montado em PATH EXATO (sem prefixo de
// router) porque o frontend faz `fetch('/api/me')`. Se montassemos como
// `app.use('/api/me', authRouter)`, o express ia procurar uma sub-rota do
// router que case com "" (vazio), nao encontraria, e o request cairia no
// fallback do SPA -> retornaria HTML em vez de JSON, quebrando o front.
app.use('/auth', authRouter);
app.get('/api/me', meHandler);

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
