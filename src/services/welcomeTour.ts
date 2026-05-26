import { driver, type DriveStep } from 'driver.js';

/**
 * Tour guiado de boas-vindas usando driver.js.
 *
 * Persistencia em localStorage: assim que o usuario completa OU pula o tour,
 * marcamos 'done' pra nao reaparecer toda vez que ele abre o dashboard.
 * Usa versao na chave (`tour-v1`) pra que, se a gente refizer o tour no
 * futuro, possa forcar reexibicao trocando pra `tour-v2`.
 */

const STORAGE_KEY = 'compras-now:tour-v1';

const STEPS: DriveStep[] = [
  {
    element: '[data-tour="navbar-brand"]',
    popover: {
      title: 'Bem-vindo ao Compras Now Executivo',
      description:
        'Painel oficial de compras Minerva Foods, com dados direto do DUX. Vou te mostrar onde fica o essencial.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '[data-tour="period-tabs"]',
    popover: {
      title: 'Troque o periodo a qualquer momento',
      description:
        'Hoje (intraday), Ontem (fechado), Ultimos 7 e Ultimos 30 dias. O dado abaixo se ajusta automaticamente.',
      side: 'bottom',
      align: 'center',
    },
  },
  {
    element: '[data-tour="filters-btn"]',
    popover: {
      title: 'Filtre por origem e tipo',
      description:
        'Origens (AR, BR, CO, PY, UY) e tipo (Boi/Vaca). O filtro se aplica ao periodo selecionado.',
      side: 'bottom',
      align: 'end',
    },
  },
  {
    element: '[data-tour="present-btn"]',
    popover: {
      title: 'Modo apresentacao para TV',
      description:
        'Ative o modo cheio com os 4 periodos lado a lado. Ideal para a sala de reuniao ou TV corporativa.',
      side: 'bottom',
      align: 'end',
    },
  },
  {
    element: '[data-tour="export-btn"]',
    popover: {
      title: 'Compartilhe o resumo executivo',
      description:
        'Gere o PDF de uma pagina pronto para diretoria, ou envie o resumo via WhatsApp.',
      side: 'bottom',
      align: 'end',
    },
  },
];

export function hasSeenTour(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'done';
  } catch {
    return true; // se nao consegue acessar storage, finge que ja' viu
  }
}

export function markTourDone(): void {
  try {
    localStorage.setItem(STORAGE_KEY, 'done');
  } catch {
    // ignora storage indisponivel
  }
}

export function resetTour(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignora
  }
}

/**
 * Inicia o welcome tour. Faz um pequeno warm-up esperando os elementos
 * existirem (ate' 1.5s) - importante porque chamamos logo apos o mount
 * do Dashboard, quando as animacoes de stagger ainda estao montando.
 */
export async function runWelcomeTour(): Promise<void> {
  const ready = await waitForElement('[data-tour="navbar-brand"]', 1500);
  if (!ready) return;

  const drv = driver({
    showProgress: true,
    progressText: 'Passo {{current}} de {{total}}',
    nextBtnText: 'Proximo',
    prevBtnText: 'Voltar',
    doneBtnText: 'Pronto',
    popoverClass: 'minerva-tour',
    allowClose: true,
    onDestroyStarted: () => {
      markTourDone();
      drv.destroy();
    },
    onDestroyed: () => {
      markTourDone();
    },
    steps: STEPS,
  });

  drv.drive();
}

function waitForElement(selector: string, timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    if (document.querySelector(selector)) {
      resolve(true);
      return;
    }
    const start = Date.now();
    const interval = window.setInterval(() => {
      if (document.querySelector(selector)) {
        window.clearInterval(interval);
        resolve(true);
        return;
      }
      if (Date.now() - start > timeoutMs) {
        window.clearInterval(interval);
        resolve(false);
      }
    }, 80);
  });
}
