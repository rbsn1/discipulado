import { Fraunces, Inter } from 'next/font/google'
import { getPlatformSettings } from '@/lib/repositories/platform-settings'
import { LoginForm } from './login-form'

const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-display',
})

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-body',
})

// ── Selo (marca) reutilizado no painel esquerdo e no cabeçalho mobile ───────
function Seal({ size = 36 }: { size?: number }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full bg-indigo-600 ring-1 ring-indigo-400/40"
      style={{ height: size, width: size }}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="#ffffff"
        strokeWidth={1.4}
        style={{ height: size * 0.5, width: size * 0.5 }}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.2c-1.6-1.3-3.7-1.9-6.3-1.9v13.4c2.6 0 4.7.6 6.3 1.9" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.2c1.6-1.3 3.7-1.9 6.3-1.9v13.4c-2.6 0-4.7.6-6.3 1.9" />
      </svg>
    </div>
  )
}

// ── As três etapas reais do ciclo de discipulado (CaseStage no banco) ───────
const stages = [
  {
    name: 'Acolhimento',
    desc: 'Recepção e primeiro contato com a pessoa.',
  },
  {
    name: 'Discipulado',
    desc: 'Aulas, módulos e acompanhamento de presença.',
  },
  {
    name: 'Pós-discipulado',
    desc: 'Envio e integração à vida da igreja.',
  },
]

const DEFAULT_VERSE_TEXT =
  'Ide, portanto, e fazei discípulos de todas as nações, batizando-os em nome do Pai, e do Filho, e do Espírito Santo.'
const DEFAULT_VERSE_REFERENCE = 'Mateus 28:19'

export default async function LoginPage() {
  // A tela de login precisa renderizar mesmo se o banco estiver indisponível
  let verseText = DEFAULT_VERSE_TEXT
  let verseReference = DEFAULT_VERSE_REFERENCE
  try {
    const settings = await getPlatformSettings()
    verseText = settings.login_verse_text
    verseReference = settings.login_verse_reference
  } catch {
    // mantém o texto padrão
  }

  return (
    <div
      className={`${fraunces.variable} ${inter.variable} flex min-h-screen bg-white`}
      style={{ fontFamily: 'var(--font-body)' }}
    >
      {/* ── Painel esquerdo ──────────────────────────────────────────────── */}
      <div className="relative hidden lg:flex lg:w-[48%] flex-col overflow-hidden bg-gradient-to-br from-indigo-950 via-[#0a0f1e] to-violet-950">

        {/* Linha de horizonte, à direita */}
        <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-indigo-400/50 to-transparent" />

        <div className="relative flex flex-1 flex-col justify-between p-12 xl:p-16">

          {/* Selo + nome */}
          <div className="flex items-center gap-3">
            <Seal size={36} />
            <span
              className="text-lg tracking-wide text-white"
              style={{ fontFamily: 'var(--font-display)', fontWeight: 500 }}
            >
              Discipulado
            </span>
          </div>

          {/* Frase de propósito — a tese da página */}
          <div>
            <p
              className="text-3xl xl:text-[2.5rem] leading-[1.2] tracking-tight text-white"
              style={{ fontFamily: 'var(--font-body)', fontWeight: 800 }}
            >
              Do primeiro contato ao envio, cada pessoa{' '}
              <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
                acompanhada
              </span>{' '}
              até o fim.
            </p>

            {/* Régua */}
            <div className="my-8 h-px w-16 bg-indigo-400/60" />

            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-300/80">
              O caminho do discipulado
            </p>

            {/* Etapas reais do ciclo (ACOLHIMENTO → DISCIPULADO → PÓS-DISCIPULADO) */}
            <ol className="relative mt-6 flex flex-col gap-6">
              <div className="absolute left-[6px] top-2 bottom-2 w-px bg-indigo-400/25" />
              {stages.map((s) => (
                <li key={s.name} className="relative flex gap-4 pl-8">
                  <span className="absolute left-0 top-1 h-3.5 w-3.5 rounded-full border-2 border-indigo-400 bg-[#0a0f1e]" />
                  <div>
                    <p className="text-sm font-semibold tracking-wide text-white">{s.name}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-slate-400">{s.desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* Rodapé — versículo */}
          <p className="max-w-sm text-sm italic leading-relaxed text-slate-400" style={{ fontFamily: 'var(--font-display)' }}>
            "{verseText}"
            <cite className="mt-2 block text-xs not-italic tracking-wide text-indigo-300/70">
              — {verseReference}
            </cite>
          </p>
        </div>
      </div>

      {/* ── Painel direito — formulário ──────────────────────────────────── */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 bg-white">
        <div className="w-full max-w-sm">

          {/* Cabeçalho mobile */}
          <div className="mb-10 flex flex-col items-center gap-3 lg:hidden">
            <Seal size={44} />
            <div className="text-center">
              <h1 className="text-xl text-gray-900" style={{ fontFamily: 'var(--font-display)', fontWeight: 500 }}>
                Discipulado
              </h1>
              <p className="text-sm text-gray-500">Gestão do ciclo de discipulado</p>
            </div>
          </div>

          {/* Cabeçalho do formulário */}
          <div className="mb-8">
            <h2
              className="text-2xl text-gray-900 tracking-tight"
              style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}
            >
              Entrar
            </h2>
            <p className="mt-1.5 text-sm text-gray-500">
              Acesse o registro da sua congregação
            </p>
          </div>

          <LoginForm />

          {/* Rodapé */}
          <p className="mt-8 text-center text-xs text-gray-400">
            Acesso restrito aos líderes desta congregação.
            <br />
            Em caso de dúvida, fale com o administrador local.
          </p>
        </div>
      </div>
    </div>
  )
}
