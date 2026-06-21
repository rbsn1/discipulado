'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog } from '@/components/ui/dialog'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Plus, GripVertical, Edit2, Trash2 } from 'lucide-react'
import type { ModuleTemplate, Profile } from '@/types'

interface Props {
  modules: ModuleTemplate[]
  currentProfile: Profile
}

export function ModulosClient({ modules, currentProfile }: Props) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [editModule, setEditModule] = useState<ModuleTemplate | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function openCreate() {
    setEditModule(null)
    setTitle('')
    setDescription('')
    setShowForm(true)
  }

  function openEdit(m: ModuleTemplate) {
    setEditModule(m)
    setTitle(m.title)
    setDescription(m.description ?? '')
    setShowForm(true)
  }

  async function handleSave() {
    if (!title.trim()) { setError('Título obrigatório'); return }
    setLoading(true)
    setError('')

    const url = editModule ? `/api/modules/${editModule.id}` : '/api/modules'
    const method = editModule ? 'PATCH' : 'POST'
    const body = {
      title: title.trim(),
      description: description || null,
      sort_order: editModule?.sort_order ?? (modules.length + 1),
    }

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

  async function handleToggleActive(m: ModuleTemplate) {
    const res = await fetch(`/api/modules/${m.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !m.is_active }),
    })
    if (res.ok) router.refresh()
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Módulos</h1>
          <p className="text-sm text-gray-500 mt-1">Catálogo de módulos de discipulado</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Novo módulo
        </Button>
      </div>

      {error && <Alert type="error" className="mb-4">{error}</Alert>}

      {modules.length === 0 && (
        <Alert type="warning">
          Nenhum módulo cadastrado. Cadastre os módulos antes de iniciar acolhimentos.
        </Alert>
      )}

      <div className="flex flex-col gap-3">
        {modules.map((m, i) => (
          <div
            key={m.id}
            className={`flex items-center gap-3 rounded-lg border bg-white p-4 ${!m.is_active ? 'opacity-60 border-gray-200' : 'border-gray-200'}`}
          >
            <GripVertical className="h-5 w-5 text-gray-300 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-gray-400">{m.sort_order}.</span>
                <p className="font-medium text-gray-900 truncate">{m.title}</p>
                {!m.is_active && <Badge variant="muted">Inativo</Badge>}
              </div>
              {m.description && (
                <p className="text-sm text-gray-500 mt-0.5 truncate">{m.description}</p>
              )}
            </div>
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" onClick={() => openEdit(m)}>
                <Edit2 className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => handleToggleActive(m)}>
                {m.is_active ? <Trash2 className="h-4 w-4 text-red-500" /> : <span className="text-xs">Ativar</span>}
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={showForm} onClose={() => setShowForm(false)} title={editModule ? 'Editar Módulo' : 'Novo Módulo'}>
        <div className="flex flex-col gap-4">
          {error && <Alert type="error">{error}</Alert>}
          <Input
            label="Título *"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Ex: Fundamentos da Fé"
          />
          <Textarea
            label="Descrição"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Descrição do módulo..."
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
