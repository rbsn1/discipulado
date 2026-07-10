'use client'

import { useActionState } from 'react'
import { Fraunces, Inter } from 'next/font/google'
import { login } from '@/lib/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-display',
})

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
})

async function loginAction(_: string | null, formData: FormData) {
  const result = await login(
    formData.get('email') as string,
    formData.get('password') as string,
  )
  return result?.error ?? null
}

// ── Selo (marca) reutilizado no painel esquerdo e no cabeçalho mobile ───────
function Seal({ size = 36 }: { size?: number }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full bg-[#8B6229] ring-1 ring-[#C9A05C]/40"
      style={{ height: size, width: size }}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="#F7F2E7"
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

export default function LoginPage() {
  const [error, formAction, isPending] = useActionState(loginAction, null)

  return (
    <div
      className={`${fraunces.variable} ${inter.variable} flex min-h-screen bg-[#F7F2E7]`}
      style={{ fontFamily: 'var(--font-body)' }}
    >
      {/* ── Painel esquerdo — a "capa do livro de registro" ────────────── */}
      <div className="relative hidden lg:flex lg:w-[48%] flex-col overflow-hidden bg-[#16241D]">

        {/* Textura de tecido — trama fina, sem brilhos nem blur */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'repeating-linear-gradient(45deg, rgba(201,160,92,0.035) 0px, rgba(201,160,92,0.035) 1px, transparent 1px, transparent 6px)',
          }}
        />

        {/* Lombada dourada à direita */}
        <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-[#C9A05C]/50 to-transparent" />

        <div className="relative flex flex-1 flex-col justify-between p-12 xl:p-16">

          {/* Selo + nome */}
          <div className="flex items-center gap-3">
            <Seal size={36} />
            <span
              className="text-lg tracking-wide text-[#F7F2E7]"
              style={{ fontFamily: 'var(--font-display)', fontWeight: 500 }}
            >
              Discipulado
            </span>
          </div>

          {/* Versículo — a tese da página */}
          <div>
            <p
              className="text-3xl xl:text-[2.5rem] italic leading-[1.35] text-[#F7F2E7]"
              style={{ fontFamily: 'var(--font-display)', fontWeight: 400 }}
            >
              "Ide, portanto, e fazei discípulos de todas as nações,
              batizando-os em nome do Pai, e do Filho, e do Espírito Santo."
            </p>
            <cite className="mt-4 block text-sm not-italic tracking-wide text-[#C9A05C]">
              — Mateus 28:19
            </cite>

            {/* Régua */}
            <div className="my-8 h-px w-16 bg-[#C9A05C]/60" />

            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#C9A05C]/80">
              O caminho do discipulado
            </p>

            {/* Etapas reais do ciclo (ACOLHIMENTO → DISCIPULADO → PÓS-DISCIPULADO) */}
            <ol className="relative mt-6 flex flex-col gap-6">
              <div className="absolute left-[6px] top-2 bottom-2 w-px bg-[#C9A05C]/25" />
              {stages.map((s) => (
                <li key={s.name} className="relative flex gap-4 pl-8">
                  <span className="absolute left-0 top-1 h-3.5 w-3.5 rounded-full border-2 border-[#C9A05C] bg-[#16241D]" />
                  <div>
                    <p className="text-sm font-semibold tracking-wide text-[#F7F2E7]">{s.name}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-[#8FA08D]">{s.desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* Rodapé */}
          <p className="max-w-sm text-sm italic leading-relaxed text-[#8FA08D]" style={{ fontFamily: 'var(--font-display)' }}>
            Do primeiro contato ao envio — cada pessoa, acompanhada até o fim.
          </p>
        </div>
      </div>

      {/* ── Painel direito — formulário ──────────────────────────────────── */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 bg-[#F7F2E7]">
        <div className="w-full max-w-sm">

          {/* Cabeçalho mobile */}
          <div className="mb-10 flex flex-col items-center gap-3 lg:hidden">
            <Seal size={44} />
            <div className="text-center">
              <h1 className="text-xl text-[#241C12]" style={{ fontFamily: 'var(--font-display)', fontWeight: 500 }}>
                Discipulado
              </h1>
              <p className="text-sm text-[#241C12]/60">Gestão do ciclo de discipulado</p>
            </div>
          </div>

          {/* Cabeçalho do formulário */}
          <div className="mb-8">
            <h2
              className="text-2xl text-[#241C12] tracking-tight"
              style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}
            >
              Entrar
            </h2>
            <p className="mt-1.5 text-sm text-[#241C12]/60">
              Acesse o registro da sua congregação
            </p>
          </div>

          {/* Formulário */}
          <form action={formAction} className="flex flex-col gap-5">

            {/* Erro */}
            {error && (
              <div className="flex items-start gap-3 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3">
                <svg className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-sm text-rose-700">{error}</p>
              </div>
            )}

            <div className="flex flex-col gap-4">
              <Input
                name="email"
                type="email"
                label="E-mail"
                placeholder="voce@congregacao.com"
                autoComplete="email"
                required
                className="focus:border-[#8B6229] focus:ring-[#8B6229]/20"
              />
              <Input
                name="password"
                type="password"
                label="Senha"
                placeholder="••••••••"
                autoComplete="current-password"
                required
                className="focus:border-[#8B6229] focus:ring-[#8B6229]/20"
              />
            </div>

            <Button
              type="submit"
              loading={isPending}
              size="lg"
              className="mt-1 w-full bg-[#8B6229] hover:bg-[#6E4E1F] disabled:bg-[#8B6229]/40 focus-visible:ring-[#8B6229] shadow-md shadow-[#8B6229]/10 transition-colors"
            >
              {isPending ? 'Entrando…' : 'Entrar'}
            </Button>
          </form>

          {/* Rodapé */}
          <p className="mt-8 text-center text-xs text-[#241C12]/45">
            Acesso restrito aos líderes desta congregação.
            <br />
            Em caso de dúvida, fale com o administrador local.
          </p>
        </div>
      </div>
    </div>
  )
}
