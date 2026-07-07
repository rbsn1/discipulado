'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Dialog } from '@/components/ui/dialog'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Plus, Building2, Pencil } from 'lucide-react'
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

const THEME_PRESETS = [
  { label: 'Índigo',          accent: '#4F46E5', sidebar: '#0F172A' },
  { label: 'Azul Cobalto',   accent: '#1D4ED8', sidebar: '#0A1628' },
  { label: 'Verde Fé',       accent: '#16A34A', sidebar: '#0A1C14' },
  { label: 'Bordô',          accent: '#BE123C', sidebar: '#1A0D0D' },
  { label: 'Roxo Profético', accent: '#7C3AED', sidebar: '#130A20' },
]

interface EditState {
  id: string
  name: string
  timezone: string
  logoUrl: string
  accentColor: string
  sidebarColor: string
}

function SidebarPreview({ accent, sidebar }: { accent: string; sidebar: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg px-3 py-2.5 w-full" style={{ background: sidebar }}>
      <div
        className="h-6 w-6 rounded-md flex items-center justify-center shrink-0"
        style={{ background: accent }}
      >
        <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <div className="h-2 w-16 rounded-full bg-white/80 mb-1" />
        <div className="h-1.5 w-10 rounded-full bg-white/30" />
      </div>
      <div className="h-2 w-2 rounded-full" style={{ background: accent }} />
    </div>
  )
}

interface Props {
  congregations: Congregation[]
}

export function CongregacoesClient({ congregations }: Props) {
  const router = useRouter()

  // Create
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newTimezone, setNewTimezone] = useState('America/Sao_Paulo')
  const [createLoading, setCreateLoading] = useState(false)
  const [createError, setCreateError] = useState('')

  // Edit
  const [editTarget, setEditTarget] = useState<EditState | null>(null)
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState('')

  function openEdit(c: Congregation) {
    setEditError('')
    setEditTarget({
      id:           c.id,
      name:         c.name,
      timezone:     c.timezone,
      logoUrl:      c.logo_url ?? '',
      accentColor:  c.accent_color ?? '#4F46E5',
      sidebarColor: c.sidebar_color ?? '#0F172A',
    })
  }

  async function handleCreate() {
    if (!newName.trim()) { setCreateError('Nome obrigatório'); return }
    setCreateLoading(true)
    setCreateError('')
    const res = await fetch('/api/admin/congregations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim(), timezone: newTimezone }),
    })
    if (!res.ok) setCreateError((await res.json()).error)
    else {
      setShowCreate(false)
      setNewName('')
      router.refresh()
    }
    setCreateLoading(false)
  }

  async function handleEdit() {
    if (!editTarget) return
    if (!editTarget.name.trim()) { setEditError('Nome obrigatório'); return }
    setEditLoading(true)
    setEditError('')
    const res = await fetch(`/api/admin/congregations/${editTarget.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name:          editTarget.name.trim(),
        timezone:      editTarget.timezone,
        logo_url:      editTarget.logoUrl || null,
        accent_color:  editTarget.accentColor,
        sidebar_color: editTarget.sidebarColor,
      }),
    })
    if (!res.ok) setEditError((await res.json()).error)
    else {
      setEditTarget(null)
      router.refresh()
    }
    setEditLoading(false)
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
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4" />
          Nova congregação
        </Button>
      </div>

      <div className="flex flex-col gap-3">
        {congregations.map(c => (
          <div key={c.id} className="flex items-center gap-4 rounded-lg border border-gray-200 bg-white p-4">
            <div className="rounded-lg p-2 shrink-0" style={{ background: c.sidebar_color ?? '#0F172A' }}>
              {c.logo_url
                ? <img src={c.logo_url} alt="Logo" className="h-5 w-5 rounded object-cover" />
                : <Building2 className="h-5 w-5" style={{ color: c.accent_color ?? '#4F46E5' }} />
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 truncate">{c.name}</p>
              <p className="text-xs text-gray-500">{c.timezone}</p>
            </div>
            <Badge variant={c.is_active ? 'success' : 'muted'}>
              {c.is_active ? 'Ativa' : 'Inativa'}
            </Badge>
            <Button size="sm" variant="outline" onClick={() => openEdit(c)}>
              <Pencil className="h-3.5 w-3.5" />
              Editar
            </Button>
            <Button size="sm" variant="outline" onClick={() => handleToggle(c.id, c.is_active)}>
              {c.is_active ? 'Desativar' : 'Ativar'}
            </Button>
          </div>
        ))}
      </div>

      {/* Dialog: criar */}
      <Dialog open={showCreate} onClose={() => setShowCreate(false)} title="Nova Congregação">
        <div className="flex flex-col gap-4">
          {createError && <Alert type="error">{createError}</Alert>}
          <Input label="Nome *" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nome da congregação" />
          <Select
            label="Fuso horário"
            value={newTimezone}
            onChange={e => setNewTimezone(e.target.value)}
            options={TIMEZONE_OPTIONS}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
            <Button onClick={handleCreate} loading={createLoading}>Criar</Button>
          </div>
        </div>
      </Dialog>

      {/* Dialog: editar */}
      <Dialog open={!!editTarget} onClose={() => setEditTarget(null)} title="Editar Congregação">
        {editTarget && (
          <div className="flex flex-col gap-4">
            {editError && <Alert type="error">{editError}</Alert>}

            <Input
              label="Nome *"
              value={editTarget.name}
              onChange={e => setEditTarget({ ...editTarget, name: e.target.value })}
            />
            <Select
              label="Fuso horário"
              value={editTarget.timezone}
              onChange={e => setEditTarget({ ...editTarget, timezone: e.target.value })}
              options={TIMEZONE_OPTIONS}
            />

            <div className="h-px bg-gray-100" />
            <p className="text-sm font-semibold text-gray-700">Identidade Visual</p>

            <SidebarPreview accent={editTarget.accentColor} sidebar={editTarget.sidebarColor} />

            <div>
              <p className="mb-2 text-xs font-medium text-gray-500">Temas prontos</p>
              <div className="flex flex-wrap gap-2">
                {THEME_PRESETS.map(p => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => setEditTarget({ ...editTarget, accentColor: p.accent, sidebarColor: p.sidebar })}
                    className="flex items-center gap-1.5 rounded-md border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:border-gray-400 transition-colors"
                  >
                    <span className="h-3 w-3 rounded-sm shrink-0" style={{ background: p.accent }} />
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-6">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600">Cor de destaque</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={editTarget.accentColor}
                    onChange={e => setEditTarget({ ...editTarget, accentColor: e.target.value })}
                    className="h-9 w-9 cursor-pointer rounded-md border border-gray-200 p-0.5"
                  />
                  <span className="font-mono text-xs text-gray-500">{editTarget.accentColor}</span>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600">Fundo da sidebar</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={editTarget.sidebarColor}
                    onChange={e => setEditTarget({ ...editTarget, sidebarColor: e.target.value })}
                    className="h-9 w-9 cursor-pointer rounded-md border border-gray-200 p-0.5"
                  />
                  <span className="font-mono text-xs text-gray-500">{editTarget.sidebarColor}</span>
                </div>
              </div>
            </div>

            <Input
              label="URL da logo"
              value={editTarget.logoUrl}
              onChange={e => setEditTarget({ ...editTarget, logoUrl: e.target.value })}
              placeholder="https://storage.supabase.co/.../logo.png"
            />

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditTarget(null)}>Cancelar</Button>
              <Button onClick={handleEdit} loading={editLoading}>Salvar</Button>
            </div>
          </div>
        )}
      </Dialog>
    </>
  )
}
