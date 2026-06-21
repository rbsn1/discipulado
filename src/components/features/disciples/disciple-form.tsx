'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import type { Disciple, CreateDiscipleInput } from '@/types'

interface DiscipleFormProps {
  defaultValues?: Partial<Disciple>
  onSubmit: (data: CreateDiscipleInput) => Promise<{ error?: string } | void>
  onCancel: () => void
}

export function DiscipleForm({ defaultValues, onSubmit, onCancel }: DiscipleFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const fd = new FormData(e.currentTarget)
    const data: CreateDiscipleInput = {
      full_name: fd.get('full_name') as string,
      phone: (fd.get('phone') as string) || undefined,
      email: (fd.get('email') as string) || undefined,
      birth_date: (fd.get('birth_date') as string) || undefined,
      address: (fd.get('address') as string) || undefined,
      conversion_date: (fd.get('conversion_date') as string) || undefined,
      origin: (fd.get('origin') as string) || undefined,
      notes: (fd.get('notes') as string) || undefined,
    }
    const result = await onSubmit(data)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && <Alert type="error">{error}</Alert>}

      <Input
        name="full_name"
        label="Nome completo *"
        defaultValue={defaultValues?.full_name}
        required
        placeholder="Nome do discipulando"
      />

      <div className="grid grid-cols-2 gap-3">
        <Input
          name="phone"
          label="Telefone"
          defaultValue={defaultValues?.phone ?? ''}
          placeholder="(11) 99999-9999"
          type="tel"
        />
        <Input
          name="email"
          label="E-mail"
          defaultValue={defaultValues?.email ?? ''}
          placeholder="email@exemplo.com"
          type="email"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input
          name="birth_date"
          label="Data de nascimento"
          defaultValue={defaultValues?.birth_date ?? ''}
          type="date"
        />
        <Input
          name="conversion_date"
          label="Data de conversão"
          defaultValue={defaultValues?.conversion_date ?? ''}
          type="date"
        />
      </div>

      <Input
        name="origin"
        label="Origem"
        defaultValue={defaultValues?.origin ?? ''}
        placeholder="Como chegou à igreja"
      />

      <Input
        name="address"
        label="Endereço"
        defaultValue={defaultValues?.address ?? ''}
        placeholder="Rua, número, bairro"
      />

      <Textarea
        name="notes"
        label="Observações"
        defaultValue={defaultValues?.notes ?? ''}
        placeholder="Informações adicionais..."
      />

      <div className="flex gap-2 justify-end pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" loading={loading}>
          {defaultValues?.id ? 'Salvar alterações' : 'Cadastrar discipulando'}
        </Button>
      </div>
    </form>
  )
}
