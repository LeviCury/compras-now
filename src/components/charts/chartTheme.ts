type ThemeMode = 'light' | 'dark';

interface ChartPalette {
  boi: string;
  vaca: string;
  geral: string;
  axis: string;
  axisDark: string;
  grid: string;
  gridDark: string;
}

export const CHART_COLORS: ChartPalette = {
  boi: '#27272a',
  vaca: '#E30613',
  geral: '#a1a1aa',
  axis: '#a1a1aa',
  axisDark: '#71717a',
  grid: 'rgba(161, 161, 170, 0.18)',
  gridDark: 'rgba(161, 161, 170, 0.10)',
};

export const ORIGEM_COLORS: Record<string, string> = {
  AR: '#a1a1aa',
  BR: '#52525b',
  CO: '#71717a',
  PY: '#E30613',
  UY: '#3f3f46',
};

export const ORIGEM_COLORS_DARK: Record<string, string> = {
  AR: '#a1a1aa',
  BR: '#d4d4d8',
  CO: '#c4c4c8',
  PY: '#FF3B49',
  UY: '#e4e4e7',
};

export function resolveOrigemColor(origem: string, theme: ThemeMode = 'light'): string {
  const palette = theme === 'dark' ? ORIGEM_COLORS_DARK : ORIGEM_COLORS;
  return palette[origem] ?? CHART_COLORS.geral;
}

export const SEXO_COLORS = {
  MACHO: CHART_COLORS.boi,
  FEMEA: CHART_COLORS.vaca,
};

export const SEXO_COLORS_DARK = {
  MACHO: '#e4e4e7',
  FEMEA: '#FF3B49',
};

export function resolveSexoColor(sexo: 'MACHO' | 'FEMEA', theme: ThemeMode = 'light'): string {
  const palette = theme === 'dark' ? SEXO_COLORS_DARK : SEXO_COLORS;
  return palette[sexo];
}

export function tooltipStyle(theme: ThemeMode) {
  return {
    backgroundColor: theme === 'dark' ? '#18181b' : '#ffffff',
    border: `1px solid ${theme === 'dark' ? '#27272a' : '#e4e4e7'}`,
    borderRadius: 8,
    color: theme === 'dark' ? '#fafafa' : '#09090b',
    fontSize: 12,
    boxShadow:
      theme === 'dark'
        ? '0 6px 24px -8px rgba(0, 0, 0, 0.6)'
        : '0 6px 24px -8px rgba(0, 0, 0, 0.12)',
    padding: '8px 10px',
  } as const;
}
