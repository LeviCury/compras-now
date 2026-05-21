# Flow Power Automate Desktop - Compras Now (multi-periodo)

Roteiro completo do flow que captura o **Compras Now** (DUX) em dois modos:

- **Morning** (1x/dia, 08:00) -> 3 consultas historicas fechadas: `yesterday`, `last7`, `last30`.
- **Intraday** (a cada 30 min, 09:00-21:00) -> 1 consulta do dia em andamento: `today`.

O proprio flow detecta em qual modo deve operar lendo um arquivo de estado local. O codigo do pipeline Python e o `run_pipeline.bat` ja estao prontos para receber `--mode=morning` ou `--mode=intraday`.

> **Maquina-alvo**: precisa estar sempre ligada, com o DUX instalado, Python 3.11+ e Power Automate Desktop. Recomendo VM dedicada ou notebook que fica conectado a energia.

---

## 1. Variaveis do flow principal

Em **Power Automate Desktop > Variaveis**, defina logo no inicio:

| Nome             | Valor                                                  | Notas                                                        |
| ---------------- | ------------------------------------------------------ | ------------------------------------------------------------ |
| `DownloadDir`    | `C:\ComprasNowRPA\downloads`                           | Mesma pasta do `.env` (`LOCAL_DOWNLOAD_DIR`).                |
| `StateFile`      | `C:\ComprasNowRPA\state\last_morning_run.txt`          | Detector do "primeiro run do dia".                           |
| `PipelineScript` | `C:\ComprasNowRPA\rpa\run_pipeline.bat`                | Wrapper do pipeline.                                         |
| `DuxUrl`         | `https://dux.minerva.com.br/`                          | URL/atalho do DUX.                                           |
| `DuxUser`        | (variavel sensivel)                                    | Marque "Sensivel" no PAD.                                    |
| `DuxPassword`    | (variavel sensivel)                                    | Marque "Sensivel" no PAD.                                    |
| `Mode`           | calculado em runtime                                   | `morning` ou `intraday`.                                     |
| `CurrentDate`    | calculado em runtime                                   | Use `Get current date and time` -> formato `dd/MM/yyyy`.     |

---

## 2. Subfluxo `CapturarPeriodo` (parametrizado)

Crie um **subfluxo** chamado `CapturarPeriodo` que recebe 3 parametros de entrada:

| Parametro     | Tipo  | Exemplo            |
| ------------- | ----- | ------------------ |
| `PeriodKey`   | Texto | `today`            |
| `DateFromStr` | Texto | `21/05/2026`       |
| `DateToStr`   | Texto | `21/05/2026`       |

Acoes dentro do subfluxo:

1. **Clicar** em `Limpar Filtros` no Compras Now.
2. **Preencher** o campo "Periodo de Compra" inicial com `%DateFromStr%`.
3. **Preencher** o campo "Periodo de Compra" final com `%DateToStr%`.
4. **Clicar** em `Pesquisar`.
5. **Aguardar elemento** "Grand Total" aparecer no grid (ou delay 8-10s).
6. **Capturar tela** -> salvar em `%DownloadDir%\dux_%PeriodKey%.png`.
7. **Clicar** em `Exportar Excel` -> `Sintetico`.
8. **Salvar como** `%DownloadDir%\ExportSintetico_%PeriodKey%.xls` (forcar sobrescrever).
9. **Aguardar arquivo** ate 60s.
10. **Fechar** o dialogo de exportacao.

Esse subfluxo eh chamado **3 vezes no morning** (com `yesterday`/`last7`/`last30`) e **1 vez no intraday** (com `today`).

---

## 3. Flow principal

### 3.1 Preparar pasta

1. **Verificar se** `DownloadDir` existe -> criar se nao.
2. **Excluir** todos os arquivos em `DownloadDir` (limpa rodada anterior). Se a pasta nao existir, ignore.

### 3.2 Detectar modo

3. **Verificar se** `StateFile` existe.
4. Se nao existir:
   - Set `Mode = "morning"`.
   - Pula para o passo 6.
5. Se existir:
   - **Ler texto do arquivo** `StateFile` em `%StateContent%`.
   - **Get current date and time** -> `%TodayIso%` no formato `yyyy-MM-dd`.
   - Comparar:
     - Se `%StateContent%` contem `%TodayIso%` -> `Mode = "intraday"`.
     - Senao -> `Mode = "morning"`.

### 3.3 Login no DUX (1x)

6. **Iniciar aplicativo** `dux.exe` (ou abrir o site).
7. **Aguardar** tela de login.
8. **Preencher** usuario com `%DuxUser%`.
9. **Preencher** senha com `%DuxPassword%`.
10. **Clicar** em "Entrar".
11. **Aguardar** menu principal carregar (`Minerva Reports` visivel).

### 3.4 Navegar ate Compras Now

12. **Clicar** em `Minerva Reports`.
13. **Clicar** em `Relatorios de Controle`.
14. **Clicar** em `Compras Now`.
15. **Aguardar** o grid principal (campo "Periodo de Compra" visivel).
16. **Selecionar Perfil de Layout** = `KPI REPORT RPA` (se nao for o default).

### 3.5 Chamar o subfluxo - depende do modo

17. **If** `%Mode% = "intraday"`:
    - Calcular `Today = %CurrentDate%`.
    - **Run subflow** `CapturarPeriodo` com `today`, `%Today%`, `%Today%`.

    **Else** (`%Mode% = "morning"`):

    - Calcular as 3 janelas:
      - `Yesterday = today - 1 dia`
      - `Last7From = today - 7 dias`, `Last7To = today - 1 dia`
      - `Last30From = today - 30 dias`, `Last30To = today - 1 dia`
    - **Run subflow** `CapturarPeriodo` com `yesterday`, `%Yesterday%`, `%Yesterday%`.
    - **Run subflow** `CapturarPeriodo` com `last7`, `%Last7From%`, `%Last7To%`.
    - **Run subflow** `CapturarPeriodo` com `last30`, `%Last30From%`, `%Last30To%`.

### 3.6 Fechar DUX

18. **Fechar janela** (ou fechar navegador, conforme o caso).

### 3.7 Chamar o pipeline Python

19. **Executar processo do DOS**:
    - Caminho: `%PipelineScript%`
    - Argumentos: `--mode=%Mode%`
    - Diretorio de trabalho: `C:\ComprasNowRPA\rpa`
    - **Esperar terminar**: sim.
    - Capturar saida em `%PipelineStdout%`.
    - Capturar exit code em `%PipelineRc%`.

### 3.8 Tratamento de erro

20. **If** `%PipelineRc% <> 0`:
    - Enviar email/Teams para `[email protected]`:
      - Assunto: `[RPA] Compras Now FALHOU - %CurrentDate% (mode=%Mode%)`
      - Corpo: `%PipelineStdout%`
    - Tirar uma print da tela atual como anexo de falha.
21. **Senao**: log de sucesso (o pipeline ja loga em `rpa/logs/`).

---

## 4. Calculo das datas no Power Automate

Use a acao **Variavel -> Definir variavel** com a expressao:

```
%DateTime.Subtract(DateTime.LocalNow, 1, "Days").ToString("dd/MM/yyyy")%
```

Substitua `1` por `7` ou `30` para `Last7From`/`Last30From`. O DUX espera formato `dd/MM/yyyy` (validar com o time se for outro).

---

## 5. Agendamento (Task Scheduler do Windows)

Recomendo usar o **Agendador de Tarefas** do Windows ao inves do scheduler interno do Power Automate, por mais controle.

1. Abrir **Agendador de Tarefas > Criar Tarefa**.
2. Aba **Geral**:
   - Nome: `RPA Compras Now`.
   - Executar mesmo sem usuario logado: marcar.
3. Aba **Disparadores** - adicione 2 disparadores:
   - **Disparador 1 (morning)**: diariamente as `08:00`.
   - **Disparador 2 (intraday)**: diariamente as `09:00`, **repetir tarefa a cada 30 minutos** durante `12 horas` (cobre ate 21:00).
4. Aba **Acoes**:
   - Iniciar programa: `C:\Users\<usuario>\AppData\Local\Programs\Power Automate Desktop\PAD.Console.Host.exe`
   - Argumentos: `ms-powerautomate:/console/flow/run?workflowName=Compras Now`
5. Aba **Condicoes**:
   - Desmarcar "Iniciar a tarefa somente se o computador estiver alimentado por CA" (para notebook em bateria).
6. Salvar.

O proprio flow decide internamente o que fazer em cada disparo - voce nao precisa de 2 flows nem de passar argumentos para a tarefa.

---

## 6. Checklist de instalacao na maquina-alvo

- [ ] Power Automate Desktop instalado e logado com a conta corporativa.
- [ ] DUX instalado e funcionando (login manual ao menos uma vez).
- [ ] Python 3.11+ instalado e no `PATH`.
- [ ] Pastas criadas:
  - `C:\ComprasNowRPA\downloads`
  - `C:\ComprasNowRPA\Processados`
  - `C:\ComprasNowRPA\state`
- [ ] Repo clonado em `C:\ComprasNowRPA\rpa\`.
- [ ] `pip install -r requirements.txt` ou `.venv` criada e dependencias instaladas.
- [ ] `.env` criado a partir de `.env.example` com:
  - `GITHUB_PAT` (fine-grained, Contents: Read and write no repo).
  - `GITHUB_REPO`, `GITHUB_BRANCH`, `GITHUB_DATA_PATH`.
  - Pastas locais (`LOCAL_DOWNLOAD_DIR`, `LOCAL_PROCESSADOS_DIR`, `LOCAL_STATE_DIR`).
- [ ] Teste manual:
  - Coloque manualmente um `ExportSintetico_today.xls` e `dux_today.png` em `LOCAL_DOWNLOAD_DIR`.
  - Rode `python run_pipeline.py --mode=intraday --dry-run`. Deve gerar `workspace/snapshot_today.json` sem commitar.
- [ ] Teste de email/Teams de falha funcionando.
- [ ] Primeiro morning validado (verifique no GitHub que `data/snapshots/yesterday.json`, `last7.json` e `last30.json` existem).

---

## 7. Troubleshooting comum

| Sintoma                                                        | Diagnostico / Acao                                                                                |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Excel nao aparece em `DownloadDir`                             | Confirme o dialogo "Salvar como" no flow. Tem que apontar para o `DownloadDir` com o nome exato.  |
| Screenshot em branco                                           | Janela do DUX minimizada ou tela bloqueada. Use captura "Janela em foco".                          |
| `state/last_morning_run.txt` nao atualizou                     | O pipeline so escreve esse arquivo no fim do morning bem-sucedido. Cheque o log do dia.            |
| Intraday rodando em modo morning toda hora                     | O Python nao gravou o state file (provavelmente o morning falhou). Veja `rpa/logs/YYYY-MM.log`.    |
| Dashboard mostra "Aguardando primeira captura" o dia todo      | O intraday das 09:00 nao rodou ou nao commitou `today.json`. Cheque o Task Scheduler.              |
| `push_to_github` retorna 401                                   | PAT expirado ou sem permissao de Contents:Write.                                                  |
| `push_to_github` retorna 409 repetido                          | Outro processo gravando no mesmo path. Ja tem retry; investigar logs.                              |
| Arquivos em `Processados/` crescem                             | Adicione um job mensal `dir /b Processados\*.xls` + delete > 90 dias.                              |
| Datas erradas no DUX                                           | Confirme o formato esperado pelo input (dd/MM/yyyy). Ajuste a expressao no PAD.                    |
