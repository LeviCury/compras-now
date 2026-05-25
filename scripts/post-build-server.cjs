/**
 * post-build-server.cjs
 *
 * O package.json raiz declara `"type": "module"`, entao por padrao Node.js
 * tenta interpretar todos os `.js` como ESM. Mas o tsconfig.server.json
 * compila o server pra CommonJS (mais compativel com NSSM no Windows).
 *
 * Esse script roda APOS o `tsc -p tsconfig.server.json` e escreve um
 * `dist-server/package.json` minimo declarando `"type": "commonjs"`, o que
 * faz Node tratar todos os `.js` dentro de `dist-server/` como CJS,
 * resolvendo a contradicao.
 */

const fs = require('node:fs');
const path = require('node:path');

const target = path.resolve(__dirname, '..', 'dist-server', 'package.json');
const dir = path.dirname(target);

if (!fs.existsSync(dir)) {
  console.error(`[post-build-server] diretorio ${dir} nao existe - tsc rodou?`);
  process.exit(1);
}

fs.writeFileSync(
  target,
  JSON.stringify(
    {
      type: 'commonjs',
      private: true,
      description: 'Marcador para Node tratar arquivos em dist-server/ como CommonJS.',
    },
    null,
    2,
  ) + '\n',
  'utf8',
);

console.log(`[post-build-server] OK -> ${target}`);
