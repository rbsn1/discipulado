'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import type { Disciple, CreateDiscipleInput, WorshipService, Profile } from '@/types'

interface DiscipleFormProps {
  defaultValues?: Partial<Disciple>
  worshipServices: WorshipService[]
  acolhedores?: Profile[]
  onSubmit: (data: CreateDiscipleInput) => Promise<{ error?: string } | void>
  onCancel: () => void
}

export function DiscipleForm({ defaultValues, worshipServices, acolhedores, onSubmit, onCancel }: DiscipleFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const isCreate = !defaultValues?.id

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const fd = new FormData(e.currentTarget)
    const data: CreateDiscipleInput = {
      full_name: fd.get('full_name') as string,
      phone: (fd.get('phone') as string) || undefined,
      birth_date: (fd.get('birth_date') as string) || undefined,
      conversion_date: (fd.get('conversion_date') as string) || undefined,
      worship_service_id: (fd.get('worship_service_id') as string) || undefined,
      notes: (fd.get('notes') as string) || undefined,
      ...(isCreate ? { assigned_to: (fd.get('assigned_to') as string) || undefined } : {}),
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
        placeholder="Nome da vida acolhida"
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Input
          name="phone"
          label="Telefone"
          defaultValue={defaultValues?.phone ?? ''}
          placeholder="(11) 99999-9999"
          type="tel"
        />
        <Input
          name="birth_date"
          label="Data de nascimento"
          defaultValue={defaultValues?.birth_date ?? ''}
          type="date"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Input
          name="conversion_date"
          label="Data de conversão"
          defaultValue={defaultValues?.conversion_date ?? ''}
          type="date"
        />
        <Select
          name="worship_service_id"
          label="Culto de origem"
          defaultValue={defaultValues?.worship_service_id ?? ''}
          placeholder="Nenhum"
          options={worshipServices.map(s => ({ value: s.id, label: s.name }))}
        />
      </div>

      {isCreate && (
        <Select
          name="assigned_to"
          label="Acolhedor *"
          required
          placeholder="Selecionar acolhedor"
          options={(acolhedores ?? []).map(a => ({ value: a.id, label: a.name }))}
        />
      )}

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
          {defaultValues?.id ? 'Salvar alterações' : 'Cadastrar vida acolhida'}
        </Button>
      </div>
    </form>
  )
}
