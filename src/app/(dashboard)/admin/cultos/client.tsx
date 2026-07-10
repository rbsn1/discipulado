'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog } from '@/components/ui/dialog'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Plus, Edit2, Trash2 } from 'lucide-react'
import type { WorshipService } from '@/types'

interface Props {
  services: WorshipService[]
}

export function CultosClient({ services }: Props) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [editService, setEditService] = useState<WorshipService | null>(null)
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function openCreate() {
    setEditService(null)
    setName('')
    setShowForm(true)
  }

  function openEdit(s: WorshipService) {
    setEditService(s)
    setName(s.name)
    setShowForm(true)
  }

  async function handleSave() {
    if (!name.trim()) { setError('Nome obrigatório'); return }
    setLoading(true)
    setError('')

    const url = editService ? `/api/worship-services/${editService.id}` : '/api/worship-services'
    const method = editService ? 'PATCH' : 'POST'
    const body = { name: name.trim() }

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) setError((await res.json()).error)
    else {
      setShowForm(false)
      router.refresh()
    }
    setLoading(false)
  }

  async function handleToggleActive(s: WorshipService) {
    const res = await fetch(`/api/worship-services/${s.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !s.is_active }),
    })
    if (res.ok) router.refresh()
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cultos</h1>
          <p className="text-sm text-gray-500 mt-1">Catálogo de cultos usado como origem do cadastro</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Novo culto
        </Button>
      </div>

      {error && <Alert type="error" className="mb-4">{error}</Alert>}

      {services.length === 0 && (
        <Alert type="warning">
          Nenhum culto cadastrado. Cadastre os cultos da congregação para usá-los na origem do discipulando.
        </Alert>
      )}

      <div className="flex flex-col gap-3">
        {services.map(s => (
          <div
            key={s.id}
            className={`flex items-center gap-3 rounded-lg border bg-white p-4 ${!s.is_active ? 'opacity-60 border-gray-200' : 'border-gray-200'}`}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium text-gray-900 truncate">{s.name}</p>
                {!s.is_active && <Badge variant="muted">Inativo</Badge>}
              </div>
            </div>
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" onClick={() => openEdit(s)}>
                <Edit2 className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => handleToggleActive(s)}>
                {s.is_active ? <Trash2 className="h-4 w-4 text-red-500" /> : <span className="text-xs">Ativar</span>}
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={showForm} onClose={() => setShowForm(false)} title={editService ? 'Editar Culto' : 'Novo Culto'}>
        <div className="flex flex-col gap-4">
          {error && <Alert type="error">{error}</Alert>}
          <Input
            label="Nome *"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Ex: Culto de Domingo Manhã"
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button onClick={handleSave} loading={loading}>Salvar</Button>
          </div>
        </div>
      </Dialog>
    </>
  )
}
