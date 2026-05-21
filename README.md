# Compras Now - Painel Executivo do CEO

Painel executivo do **Compras Now** (modulo `DUX > Minerva Reports > Relatorios de Controle`) para o CEO Fernando Galletti consumir dados de compra de gado **sem depender de ligacoes** para o time de operacao.

- **Frontend**: Vite + React + TypeScript + Tailwind + Recharts, deploy no Vercel.
- **Backend de dados**: repo GitHub privado servido via endpoints serverless do Vercel.
- **RPA**: Power Automate Desktop + Python que, ao longo do dia, faz capturas do DUX em 4 periodos diferentes.

---

## Regra de negocio - por que 4 periodos?

Durante o dia, o Fernando recebe atualizacoes parciais das compras pelo WhatsApp. Essas atualizacoes param em algum horario (por ex. 20h). Apos esse corte, novas compras ainda podem entrar no DUX ate o fim do dia.

Para resolver isso, o RPA captura **4 visoes diferentes** dos mesmos dados:

| Periodo            | Janela no DUX                                     | Atualiza quando                          |
| ------------------ | ------------------------------------------------- | ---------------------------------------- |
| **Hoje**           | `hoje 00:00 -> agora`                             | A cada 30 min, das 09:00 as 21:00       |
| **Ontem (fechado)**| `hoje-1 00:00 -> hoje-1 23:59`                    | 1x/dia, no morning das 08:00             |
| **Ultimos 7 dias** | `hoje-7 00:00 -> hoje-1 23:59`                    | 1x/dia, no morning das 08:00             |
| **Ultimos 30 dias**| `hoje-30 00:00 -> hoje-1 23:59`                   | 1x/dia, no morning das 08:00             |

Cedo da manha (entre 00:00 e ~09:00) o snapshot "Hoje" ainda nao tem volume relevante - o dashboard exibe um EmptyState explicando isso ate o primeiro intraday rodar.

---

## Arquitetura

```
DUX (desktop) --> Power Automate (morning OU intraday) --> Python (parse + push) --> GitHub privado --> Vercel /api --> Dashboard React
```

- **Morning (1x/dia, 08:00)**: o flow detecta que `state/last_morning_run.txt` nao tem a data de hoje e roda 3 capturas (`yesterday`, `last7`, `last30`).
- **Intraday (a cada 30 min, 09:00-21:00)**: o mesmo flow detecta que ja existe state file de hoje, e roda apenas 1 captura (`today`).
- Apos sucesso, o pipeline Python:
  1. Parseia cada Excel para JSON normalizado.
  2. Commita no GitHub: `data/snapshots/<period>.json` + `data/screenshots/<period>.<ext>` (sobrescrevendo).
  3. Se period == `today`, tambem grava `data/history/today/<ISO>.json` (so JSON, sem print, retencao 7 dias).
  4. No morning, atualiza `state/last_morning_run.txt`.
- O dashboard polls `/api/snapshot?period=<p>` (a aba ativa) e `/api/snapshots` (para o comparativo). A linha intra-dia consome `/api/intraday`.

---

## Estrutura do repo

```
.
|-- api/                # Endpoints serverless (Vercel)
|   |-- _lib/github.ts
|   |-- _lib/periods.ts
|   |-- snapshot.ts     # GET /api/snapshot?period=...
|   |-- snapshots.ts    # GET /api/snapshots (todos os 4)
|   |-- intraday.ts     # GET /api/intraday   (history/today/*.json)
|   |-- screenshot.ts   # GET /api/screenshot?period=...
|   `-- health.ts
|-- rpa/                # RPA local
|   |-- parse_excel.py
|   |-- push_to_github.py
|   |-- run_pipeline.py
|   |-- run_pipeline.bat
|   |-- flow-compras-now.md
|   |-- requirements.txt
|   `-- .env.example
|-- public/             # Static assets (icones, PWA)
|-- src/
|   |-- App.tsx
|   |-- main.tsx
|   |-- components/
|   |   |-- Dashboard.tsx
|   |   |-- DashboardHeader.tsx
|   |   |-- PresetsBar.tsx               # 4 abas de periodo
|   |   |-- KPIGrid.tsx + KPICard.tsx
|   |   |-- PriceByOriginChart.tsx       # do periodo selecionado
|   |   |-- VolumeByOriginChart.tsx
|   |   |-- PeriodComparisonChart.tsx    # NOVO - 4 barras por origem
|   |   |-- IntradayTrendChart.tsx       # NOVO - linha intra-dia (so Hoje)
|   |   |-- BoiVacaSplitCard.tsx
|   |   |-- InsightsBlock.tsx
|   |   |-- ComprasTable.tsx
|   |   |-- ProofPanel.tsx               # print do periodo ativo
|   |   |-- TodayEmptyState.tsx          # NOVO - aba Hoje antes das 09:00
|   |   |-- ShareMenu.tsx
|   |   `-- ExecutiveSummaryPDF.tsx      # KPIs + comparativo + prova
|   |-- hooks/
|   |   |-- useComprasData.ts            # useSnapshot, useAllSnapshots, useIntraday
|   |   |-- useDashboardFilters.ts
|   |   |-- usePresentationMode.ts
|   |   `-- useToasts.ts
|   |-- contexts/
|   |   |-- theme-context.ts
|   |   |-- ThemeContext.tsx
|   |   `-- useTheme.ts
|   |-- services/
|   |   |-- dataLoader.ts
|   |   |-- mockData.ts                  # 4 periodos + intraday
|   |   |-- pdfExport.ts
|   |   `-- whatsappShare.ts
|   |-- types/                           # PeriodKey, schemas Zod
|   `-- utils/
|       |-- formatters.ts
|       `-- analytics.ts
|-- vercel.json
|-- vite.config.ts
|-- tailwind.config.js
`-- package.json
```

---

## Setup local

```bash
npm install
npm run dev   # http://localhost:5173
```

Em `localhost`, o dashboard roda em **modo mock** (gera os 4 snapshots fakeados a partir do mesmo sample da planilha real). Para apontar para dados reais do Vercel:

```
VITE_USE_MOCK=0
VITE_API_BASE=https://<seu-projeto>.vercel.app
```

Para simular a aba "Hoje" sem captura (antes das 09:00) no modo mock, abra o console e rode:

```js
localStorage.setItem('compras-now:mock-today', 'off');
location.reload();
```

Para reverter:

```js
localStorage.setItem('compras-now:mock-today', 'on');
location.reload();
```

---

## Comandos disponiveis

| Comando             | O que faz                                     |
| ------------------- | --------------------------------------------- |
| `npm run dev`       | Vite dev server                               |
| `npm run typecheck` | TypeScript sem emitir                         |
| `npm run lint`      | ESLint                                        |
| `npm run build`     | Build de producao (usado pelo Vercel)         |
| `npm run preview`   | Serve o build local                           |

---

## Deploy no Vercel

1. Crie um repo **privado** no GitHub (ex: `LeviCury/compras-now`).
2. `git push` deste codigo.
3. No painel do [Vercel](https://vercel.com), **Add New > Project**, importe o repo.
4. Configure as variaveis de ambiente:

   | Nome                 | Valor                                                                                   |
   | -------------------- | --------------------------------------------------------------------------------------- |
   | `GITHUB_TOKEN`       | Fine-grained PAT com **Contents: Read-only** no repo.                                   |
   | `GITHUB_REPO`        | `LeviCury/compras-now`                                                                  |
   | `GITHUB_BRANCH`      | `main`                                                                                  |
   | `GITHUB_DATA_PATH`   | `data` (opcional)                                                                       |

5. **Deploy**. Vercel detecta Vite automaticamente. O dashboard nao precisa rebuild a cada commit do RPA - ele le os arquivos via API.

---

## Deploy do RPA

Resumo (passo-a-passo completo em [`rpa/flow-compras-now.md`](rpa/flow-compras-now.md)).

1. Maquina-alvo com **Python 3.11+** e **Power Automate Desktop**.
2. Estrutura local:
   ```
   C:\ComprasNowRPA\
   |-- downloads\          (entrada do flow)
   |-- Processados\        (rotacao)
   |-- state\              (last_morning_run.txt)
   `-- rpa\                (este diretorio)
   ```
3. Em `C:\ComprasNowRPA\rpa\`:
   ```powershell
   python -m venv .venv
   .venv\Scripts\activate
   pip install -r requirements.txt
   copy .env.example .env
   notepad .env   # preencha as variaveis
   ```
4. Importe o flow no Power Automate Desktop seguindo [`rpa/flow-compras-now.md`](rpa/flow-compras-now.md). Crie o subfluxo `CapturarPeriodo` parametrizado.
5. Agende no **Task Scheduler do Windows**:
   - Diariamente 08:00 (morning).
   - Diariamente das 09:00 as 21:00, a cada 30 min (intraday).

### Testar o pipeline sem o Power Automate

Coloque manualmente um Excel e uma print em `LOCAL_DOWNLOAD_DIR` e:

```powershell
cd C:\ComprasNowRPA\rpa
python run_pipeline.py --mode=intraday --dry-run
```

Deve gerar `workspace/snapshot_today.json` localmente sem commitar nada.

### PATs separados

| PAT                                  | Permissao                                | Onde fica            |
| ------------------------------------ | ---------------------------------------- | -------------------- |
| **PAT do Vercel** (`GITHUB_TOKEN`)   | Contents: **Read-only**                  | Vercel env vars      |
| **PAT do RPA** (`GITHUB_PAT`)        | Contents: **Read and write**             | `rpa/.env` na maquina|

Rotacionar a cada 90 dias.

---

## Como o dashboard usa os dados

- **`GET /api/snapshot?period=today`** -> retorna `data/snapshots/today.json` parseado. Injeta `screenshotUrl` automaticamente para `/api/screenshot?period=today`.
- **`GET /api/snapshots`** -> retorna os 4 em paralelo. Usado pelo `PeriodComparisonChart` para evitar 4 fetches.
- **`GET /api/intraday`** -> lista `data/history/today/*.json`. Usado pelo `IntradayTrendChart` (ativo so na aba Hoje).
- **`GET /api/screenshot?period=today`** -> proxy do PNG do repo privado.

Filtros do painel:

- **Periodo**: 4 abas grandes que **mudam a fonte de dados**.
- **Origem**: chips PY/UY/AR/BR/CO (filtra o snapshot do periodo selecionado).
- **Tipo**: chips Boi / Vaca.

---

## Exportar Resumo Executivo

O botao **Exportar** abre um menu com 3 acoes:

1. **Baixar Resumo Executivo (PDF)**: A4 paisagem, contendo:
   - KPIs do periodo selecionado.
   - Tabela detalhada por origem.
   - **Comparativo entre os 4 periodos** (preco medio por origem).
   - **Print oficial do DUX** com o periodo aplicado.

2. **Compartilhar no WhatsApp**: abre `wa.me` com texto resumo que ja inclui as 4 linhas de comparacao.

3. **Copiar resumo**: o mesmo texto na area de transferencia.

---

## Operacao e monitoramento

- Header do dashboard mostra "Capturado ha X min" do periodo ativo.
- Aba **Hoje** mostra **banner amarelo** se `today.capturedAt` for de hoje mas tiver > 3h de idade.
- Aba **Hoje** mostra **EmptyState** se `today.capturedAt` for de outro dia (situacao entre 00:00 e ~09:00 ou se o intraday falhou o dia inteiro).
- Logs do RPA em `rpa/logs/YYYY-MM.log` na maquina-alvo.
- Endpoint `/api/health` retorna sha e tamanho do snapshot mais recente (use para monitoramento externo).

---

## Licenca

Projeto interno Minerva Foods. Uso restrito.
