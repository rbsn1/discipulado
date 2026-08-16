'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { changeOwnPassword } from '@/lib/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert } from '@/components/ui/alert'

export function ForcePasswordChange() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirmPassword) {
      setError('As senhas não coincidem')
      return
    }
    setLoading(true)
    setError('')
    const result = await changeOwnPassword(password)
    if (result.error) {
      setError(result.error)
      setLoading(false)
    } else {
      router.refresh()
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FAFAF8] p-6">
      <div className="w-full max-w-sm rounded-xl border border-[#E8E6E1] bg-white p-6 shadow-sm">
        <h1 className="text-xl font-bold text-[#1C1B1A]">Troque sua senha</h1>
        <p className="mt-2 text-sm text-[#6B6963]">
          Sua senha foi definida pelo administrador. Antes de continuar, defina uma senha nova só sua.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          {error && <Alert type="error">{error}</Alert>}
          <Input
            label="Senha nova *"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Mínimo 6 caracteres"
            autoComplete="new-password"
            required
          />
          <Input
            label="Confirmar senha *"
            type="password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            placeholder="Repita a senha nova"
            autoComplete="new-password"
            required
          />
          <Button type="submit" loading={loading} className="w-full">
            Salvar e continuar
          </Button>
        </form>
      </div>
    </div>
  )
}
