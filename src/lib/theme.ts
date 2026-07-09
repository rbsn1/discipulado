/**
 * Derivação de paleta de tema a partir de accentColor + sidebarColor.
 *
 * Todas as cores são geradas via manipulação de hex → rgb,
 * sem dependências externas. Funciona em Server e Client Components.
 */

export interface ThemeInput {
  accentColor?:  string | null
  sidebarColor?: string | null
}

export interface ThemePalette {
  /** Cor de destaque principal (ex: botões, indicadores ativos) */
  accent: string
  /** Fundo base da sidebar */
  sidebarBg: string
  /** Versão escura do fundo (gradiente, overlay) */
  sidebarDark: string
  /** Versão mais clara da cor de destaque para ícones/texto suave */
  accentLight: string
  /** Versão muito suave do accent para fundos (10-15% opacidade) */
  accentSubtle: string
  /** Anel/borda com 30% de opacidade do accent */
  accentRing: string
  /** Separador (white/10 sobre o sidebar escuro) */
  divider: string
  /** Texto suave sobre fundo escuro */
  mutedText: string
  /** Gradiente de fundo do painel esquerdo da login (3 stops) */
  loginGradient: string
  /** Cor do brilho principal */
  glowColor: string
  /** Cor do brilho secundário */
  glowSecondary: string
}

// ─── Helpers de cor ─────────────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '').padEnd(6, '0')
  const r = parseInt(clean.slice(0, 2), 16)
  const g = parseInt(clean.slice(2, 4), 16)
  const b = parseInt(clean.slice(4, 6), 16)
  return [isNaN(r) ? 0 : r, isNaN(g) ? 0 : g, isNaN(b) ? 0 : b]
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b]
    .map(v => Math.min(255, Math.max(0, Math.round(v))).toString(16).padStart(2, '0'))
    .join('')
}

/** Clareia (amount > 0) ou escurece (amount < 0) uma cor hex */
function adjustBrightness(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex)
  return rgbToHex(r + amount, g + amount, b + amount)
}

/** Mistura hex com preto — darkens mais agressivo */
function darken(hex: string, factor: number): string {
  const [r, g, b] = hexToRgb(hex)
  return rgbToHex(r * (1 - factor), g * (1 - factor), b * (1 - factor))
}

/** Retorna rgba string */
function rgba(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex)
  return `rgba(${r},${g},${b},${alpha})`
}

// ─── Derivação principal ─────────────────────────────────────────────────────

const ACCENT_DEFAULT  = '#4F46E5'
const SIDEBAR_DEFAULT = '#0F172A'

export function deriveTheme(input?: ThemeInput | null): ThemePalette {
  const accent    = input?.accentColor  || ACCENT_DEFAULT
  const sidebarBg = input?.sidebarColor || SIDEBAR_DEFAULT

  // Fundo ainda mais escuro para gradiente
  const sidebarDark = darken(sidebarBg, 0.35)

  // Versão clara do accent (para ícones em estado inativo, texto suave)
  const accentLight = adjustBrightness(accent, 60)

  // Versão muito sutil do accent (fundos de badge, hover)
  const accentSubtle = rgba(accent, 0.12)

  // Anel/borda
  const accentRing = rgba(accent, 0.30)

  // Separador sobre fundo escuro
  const divider = 'rgba(255,255,255,0.07)'

  // Texto muted sobre fundo escuro
  const mutedText = rgba(accent, 0.45)

  // Gradiente de login: do sidebar escuro para uma variação roxa/profunda
  const loginGradient = `linear-gradient(135deg, ${sidebarDark} 0%, ${sidebarBg} 50%, ${darken(accent, 0.55)} 100%)`

  // Brilhos
  const glowColor     = rgba(accent, 0.22)
  const glowSecondary = rgba(adjustBrightness(accent, -30), 0.18)

  return {
    accent,
    sidebarBg,
    sidebarDark,
    accentLight,
    accentSubtle,
    accentRing,
    divider,
    mutedText,
    loginGradient,
    glowColor,
    glowSecondary,
  }
}

// ─── Presets prontos ─────────────────────────────────────────────────────────

export interface ThemePreset {
  label:       string
  accent:      string
  sidebar:     string
  description: string
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    label:       'Índigo',
    accent:      '#4F46E5',
    sidebar:     '#0F172A',
    description: 'Clássico e moderno',
  },
  {
    label:       'Azul Cobalto',
    accent:      '#1D4ED8',
    sidebar:     '#0A1628',
    description: 'Profissional e confiável',
  },
  {
    label:       'Verde Fé',
    accent:      '#16A34A',
    sidebar:     '#071A10',
    description: 'Esperança e renovação',
  },
  {
    label:       'Bordô',
    accent:      '#BE123C',
    sidebar:     '#1A0A0D',
    description: 'Força e determinação',
  },
  {
    label:       'Roxo Profético',
    accent:      '#7C3AED',
    sidebar:     '#130A20',
    description: 'Unção e propósito',
  },
  {
    label:       'Âmbar',
    accent:      '#D97706',
    sidebar:     '#1A1205',
    description: 'Calor e acolhimento',
  },
  {
    label:       'Ciano',
    accent:      '#0891B2',
    sidebar:     '#041420',
    description: 'Clareza e foco',
  },
  {
    label:       'Rosa',
    accent:      '#DB2777',
    sidebar:     '#1A0812',
    description: 'Amor e compaixão',
  },
]
