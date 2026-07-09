/**
 * Derivação de paleta de tema a partir de accentColor + sidebarColor.
 *
 * Todas as cores são geradas via manipulação de hex → rgb,
 * sem dependências externas. Funciona em Server e Client Components.
 *
 * Princípio de acessibilidade:
 *   - Texto e ícones sobre fundos escuros SEMPRE derivam de branco com opacidade,
 *     nunca do accent — garante contraste em qualquer tema.
 *   - O accent é usado apenas para elementos interativos (indicadores, fundos
 *     de item ativo, brilhos) onde o contraste é garantido estruturalmente.
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
  /** Versão clara do accent — usada apenas em ícones/texto do item ATIVO */
  accentLight: string
  /** Fundo sutil do item ativo (accent com ~12% opacidade) */
  accentSubtle: string
  /** Anel/borda com 30% de opacidade do accent */
  accentRing: string
  /** Separador: branco/7 — contraste garantido em qualquer fundo escuro */
  divider: string
  /**
   * Texto muted sobre fundo escuro.
   * Sempre branco/45 — legível em qualquer tema, sem depender do accent.
   */
  mutedText: string
  /**
   * Texto/ícone inativo sobre fundo escuro.
   * Sempre branco/50 — contraste mínimo garantido (WCAG AA para ícones decorativos).
   */
  navInactive: string
  /**
   * Texto/ícone inativo em hover.
   * Sempre branco/85.
   */
  navHover: string
  /** Gradiente de fundo do painel esquerdo da login */
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

function adjustBrightness(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex)
  return rgbToHex(r + amount, g + amount, b + amount)
}

function darken(hex: string, factor: number): string {
  const [r, g, b] = hexToRgb(hex)
  return rgbToHex(r * (1 - factor), g * (1 - factor), b * (1 - factor))
}

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

  // Gradiente: fundo mais escuro no topo
  const sidebarDark = darken(sidebarBg, 0.35)

  // Versão clara do accent para o ícone/texto do ITEM ATIVO
  const accentLight = adjustBrightness(accent, 60)

  // Fundo do item ativo
  const accentSubtle = rgba(accent, 0.14)

  // Anel/borda
  const accentRing = rgba(accent, 0.30)

  // ── Cores de texto/ícone sempre baseadas em BRANCO ──────────────────────
  // Garante legibilidade em qualquer fundo escuro, independente do accent.

  const divider    = 'rgba(255,255,255,0.07)'  // separadores
  const mutedText  = 'rgba(255,255,255,0.40)'  // nome da congregação, role, etc.
  const navInactive = 'rgba(255,255,255,0.50)' // texto/ícone de item inativo
  const navHover    = 'rgba(255,255,255,0.85)' // texto/ícone ao passar o mouse

  // Gradiente de login
  const loginGradient = `linear-gradient(135deg, ${sidebarDark} 0%, ${sidebarBg} 50%, ${darken(accent, 0.55)} 100%)`

  // Brilhos — decorativos, accent com baixa opacidade
  const glowColor     = rgba(accent, 0.20)
  const glowSecondary = rgba(adjustBrightness(accent, -30), 0.15)

  return {
    accent,
    sidebarBg,
    sidebarDark,
    accentLight,
    accentSubtle,
    accentRing,
    divider,
    mutedText,
    navInactive,
    navHover,
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
