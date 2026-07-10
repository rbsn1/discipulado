'use client'

import { useActionState } from 'react'
import { login } from '@/lib/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

async function loginAction(_: string | null, formData: FormData) {
  const result = await login(
    formData.get('email') as string,
    formData.get('password') as string,
  )
  return result?.error ?? null
}

// ── Feature list shown on the left panel ────────────────────────────────────
const features = [
  {
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    label: 'Gestão completa de discipulandos',
  },
  {
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
    label: 'Controle de frequência e módulos',
  },
  {
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    label: 'Relatórios e indicadores em tempo real',
  },
  {
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
    label: 'Multi-congregação com isolamento total',
  },
]

// ── Metric highlights ────────────────────────────────────────────────────────
const metrics = [
  { value: '100%', label: 'Multi-tenant' },
  { value: 'RLS',  label: 'Segurança' },
  { value: '∞',    label: 'Congregações' },
]

export default function LoginPage() {
  const [error, formAction, isPending] = useActionState(loginAction, null)

  return (
    <div className="flex min-h-screen bg-white">

      {/* ── Painel esquerdo ─────────────────────────────────────────────── */}
      <div className="relative hidden lg:flex lg:w-[52%] flex-col overflow-hidden">

        {/* Fundo gradiente em camadas */}
        <div className="absolute inset-0 bg-[#0a0f1e]" />
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-[#0a0f1e] to-violet-950" />

        {/* Malha de pontos sutil */}
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: 'radial-gradient(circle, #a5b4fc 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />

        {/* Círculos de brilho no fundo */}
        <div className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-indigo-600/20 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-[400px] w-[400px] rounded-full bg-violet-700/20 blur-3xl" />
        <div className="absolute top-1/2 left-1/3 h-[300px] w-[300px] rounded-full bg-indigo-500/10 blur-3xl" />

        {/* Conteúdo */}
        <div className="relative flex flex-1 flex-col justify-between p-12 xl:p-16">

          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-400 to-indigo-600 shadow-lg shadow-indigo-900/60 ring-1 ring-white/10">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <span className="text-lg font-bold tracking-wide text-white">Discipulado</span>
              <span className="ml-2 rounded-full bg-indigo-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-indigo-300 ring-1 ring-indigo-500/30">
                Pro
              </span>
            </div>
          </div>

          {/* Headline central */}
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
              <span className="text-xs font-medium text-indigo-300 tracking-wide">
                Plataforma de gestão ministerial
              </span>
            </div>

            <h1 className="text-4xl xl:text-5xl font-bold leading-tight tracking-tight text-white">
              Discipule com{' '}
              <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
                propósito
              </span>
              <br />e precisão.
            </h1>

            <p className="mt-4 max-w-sm text-base text-slate-400 leading-relaxed">
              Acompanhe cada pessoa da recepção à integração. Tudo em um só lugar, seguro e organizado.
            </p>

            {/* Features */}
            <ul className="mt-8 flex flex-col gap-3">
              {features.map(f => (
                <li key={f.label} className="flex items-center gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-400 ring-1 ring-indigo-500/20">
                    {f.icon}
                  </div>
                  <span className="text-sm text-slate-300">{f.label}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Footer: versículo + métricas */}
          <div>
            {/* Separador */}
            <div className="mb-6 h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent" />

            {/* Versículo */}
            <blockquote className="mb-6">
              <p className="text-sm italic leading-relaxed text-slate-400">
                "Ide, portanto, e fazei discípulos de todas as nações,
                batizando-os em nome do Pai, e do Filho, e do Espírito Santo."
              </p>
              <cite className="mt-2 block text-xs text-slate-600 not-italic">— Mateus 28:19</cite>
            </blockquote>

            {/* Métricas */}
            <div className="flex items-center gap-6">
              {metrics.map(m => (
                <div key={m.label}>
                  <p className="text-xl font-bold text-white">{m.value}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{m.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Borda direita luminosa */}
        <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-indigo-500/40 to-transparent" />
      </div>

      {/* ── Painel direito — formulário ─────────────────────────────────── */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 bg-white">
        <div className="w-full max-w-sm">

          {/* Logo mobile */}
          <div className="mb-10 flex flex-col items-center lg:hidden">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 shadow-xl shadow-indigo-200">
              <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900">Discipulado</h1>
            <p className="text-sm text-gray-500">Plataforma de gestão ministerial</p>
          </div>

          {/* Cabeçalho do formulário */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
              Bem-vindo de volta
            </h2>
            <p className="mt-1.5 text-sm text-gray-500">
              Acesse sua conta para continuar
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
              />
              <Input
                name="password"
                type="password"
                label="Senha"
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
            </div>

            <Button
              type="submit"
              loading={isPending}
              size="lg"
              className="mt-1 w-full bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-200 transition-all"
            >
              {isPending ? 'Entrando…' : 'Entrar na plataforma'}
            </Button>
          </form>

          {/* Rodapé */}
          <p className="mt-8 text-center text-xs text-gray-400">
            Acesso exclusivo para membros autorizados.{' '}
            <br />
            Em caso de dúvidas, contate o administrador da sua congregação.
          </p>

          {/* Separador + selo de segurança */}
          <div className="mt-8 flex items-center gap-3">
            <div className="h-px flex-1 bg-gray-100" />
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <svg className="h-3.5 w-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Conexão segura e criptografada
            </div>
            <div className="h-px flex-1 bg-gray-100" />
          </div>
        </div>
      </div>
    </div>
  )
}
