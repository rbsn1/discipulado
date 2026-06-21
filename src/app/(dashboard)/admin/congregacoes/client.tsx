'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Dialog } from '@/components/ui/dialog'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Plus, Building2 } from 'lucide-react'
import type { Congregation } from '@/types'

const TIMEZONE_OPTIONS = [
  { value: 'America/Sao_Paulo', label: 'Brasília (GMT-3)' },
  { value: 'America/Manaus', label: 'Manaus (GMT-4)' },
  { value: 'America/Belem', label: 'Belém (GMT-3)' },
  { value: 'America/Fortaleza', label: 'Fortaleza (GMT-3)' },
  { value: 'America/Cuiaba', label: 'Cuiabá (GMT-4)' },
  { value: 'America/Porto_Velho', label: 'Porto Velho (GMT-4)' },
  { value: 'America/Rio_Branco', label: 'Rio Branco (GMT-5)' },
  { value: 'America/Noronha', label: 'Fernando de Noronha (GMT-2)' },
]

interface Props {
  congregations: Congregation[]
}

export function CongregacoesClient({ congregations }: Props) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [timezone, setTimezone] = useState('America/Sao_Paulo')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleCreate() {
    if (!name.trim()) { setError('Nome obrigatório'); return }
    setLoading(true)
    setError('')
    const res = await fetch('/api/admin/congregations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), timezone }),
    })
    if (!res.ok) setError((await res.json()).error)
    else {
      setShowForm(false)
      setName('')
      router.refresh()
    }
    setLoading(false)
  }

  async function handleToggle(id: string, isActive: boolean) {
    const res = await fetch(`/api/admin/congregations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !isActive }),
    })
    if (res.ok) router.refresh()
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Congregações</h1>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4" />
          Nova congregação
        </Button>
      </div>

      {error && <Alert type="error" className="mb-4">{error}</Alert>}

      <div className="flex flex-col gap-3">
        {congregations.map(c => (
          <div key={c.id} className="flex items-center gap-4 rounded-lg border border-gray-200 bg-white p-4">
            <div className="rounded-lg bg-blue-50 p-2">
              <Building2 className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 truncate">{c.name}</p>
              <p className="text-xs text-gray-500">{c.timezone}</p>
            </div>
            <Badge variant={c.is_active ? 'success' : 'muted'}>
              {c.is_active ? 'Ativa' : 'Inativa'}
            </Badge>
            <Button size="sm" variant="outline" onClick={() => handleToggle(c.id, c.is_active)}>
              {c.is_active ? 'Desativar' : 'Ativar'}
            </Button>
          </div>
        ))}
      </div>

      <Dialog open={showForm} onClose={() => setShowForm(false)} title="Nova Congregação">
        <div className="flex flex-col gap-4">
          {error && <Alert type="error">{error}</Alert>}
          <Input label="Nome *" value={name} onChange={e => setName(e.target.value)} placeholder="Nome da congregação" />
          <Select
            label="Fuso horário"
            value={timezone}
            onChange={e => setTimezone(e.target.value)}
            options={TIMEZONE_OPTIONS}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button onClick={handleCreate} loading={loading}>Criar</Button>
          </div>
        </div>
      </Dialog>
    </>
  )
}
