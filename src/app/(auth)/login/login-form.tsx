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

export function LoginForm() {
  const [error, formAction, isPending] = useActionState(loginAction, null)

  return (
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
        {isPending ? 'Entrando…' : 'Entrar'}
      </Button>
    </form>
  )
}
