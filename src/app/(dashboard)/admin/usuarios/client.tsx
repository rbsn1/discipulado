'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Dialog } from '@/components/ui/dialog'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { ROLE_LABEL } from '@/lib/utils'
import { Plus, Pencil } from 'lucide-react'
import type { ProfileWithCongregation, UserRole, Profile } from '@/types'

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'ADMIN_DISCIPULADO', label: 'Admin Discipulado' },
  { value: 'DISCIPULADOR', label: 'Discipulador' },
  { value: 'SECRETARIA_DISCIPULADO', label: 'Secretaria' },
  { value: 'SM_DISCIPULADO', label: 'SM Discipulado' },
]

interface Props {
  profiles: ProfileWithCongregation[]
  congregations: { id: string; name: string }[]
  currentProfile: Profile
}

type Mode = 'create' | 'edit'

export function UsuariosClient({ profiles, congregations, currentProfile }: Props) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [mode, setMode] = useState<Mode>('create')
  const [editProfileId, setEditProfileId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<UserRole>('DISCIPULADOR')
  const [congregationId, setCongregationId] = useState(currentProfile.congregation_id ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const isPlatformAdmin = currentProfile.role === 'ADMIN_PLATAFORMA'
  const roleOptions = isPlatformAdmin
    ? [{ value: 'ADMIN_PLATAFORMA' as UserRole, label: 'Admin Plataforma' }, ...ROLE_OPTIONS]
    : ROLE_OPTIONS

  function openCreate() {
    setMode('create')
    setEditProfileId(null)
    setName('')
    setEmail('')
    setPassword('')
    setRole('DISCIPULADOR')
    setCongregationId(currentProfile.congregation_id ?? '')
    setError('')
    setShowForm(true)
  }

  function openEdit(p: ProfileWithCongregation) {
    setMode('edit')
    setEditProfileId(p.id)
    setName(p.name)
    setEmail(p.email ?? '')
    setPassword('')
    setRole(p.role)
    setCongregationId((p as any).congregation_id ?? '')
    setError('')
    setShowForm(true)
  }

  async function handleCreate() {
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('Nome, e-mail e senha são obrigatórios')
      return
    }
    setLoading(true)
    setError('')
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, role, congregation_id: congregationId || null }),
    })
    if (!res.ok) setError((await res.json()).error)
    else {
      setShowForm(false)
      router.refresh()
    }
    setLoading(false)
  }

  async function handleEdit() {
    if (!name.trim()) { setError('Nome obrigatório'); return }
    setLoading(true)
    setError('')
    const body: Record<string, unknown> = { name, role }
    if (isPlatformAdmin) body.congregation_id = congregationId || null
    const res = await fetch(`/api/admin/users/${editProfileId}`, {
      method: 'PATCH',
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

  async function handleToggleActive(profileId: string, isActive: boolean) {
    const res = await fetch(`/api/admin/users/${profileId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !isActive }),
    })
    if (res.ok) router.refresh()
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Usuários</h1>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Novo usuário
        </Button>
      </div>

      {error && <Alert type="error" className="mb-4">{error}</Alert>}

      <div className="rounded-xl border border-gray-100 bg-white overflow-x-auto shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="px-4 py-3 text-left font-medium text-gray-500">Nome</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">E-mail</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Perfil</th>
              {isPlatformAdmin && <th className="px-4 py-3 text-left font-medium text-gray-500">Congregação</th>}
              <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {profiles.map(p => (
              <tr key={p.id} className="hover:bg-gray-50/50">
                <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                <td className="px-4 py-3 text-gray-500">{p.email}</td>
                <td className="px-4 py-3 text-gray-500">{ROLE_LABEL[p.role]}</td>
                {isPlatformAdmin && (
                  <td className="px-4 py-3 text-gray-500">
                    {(p as any).congregations?.name ?? '—'}
                  </td>
                )}
                <td className="px-4 py-3">
                  <Badge variant={p.is_active ? 'success' : 'muted'}>
                    {p.is_active ? 'Ativo' : 'Inativo'}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    {p.id !== currentProfile.id && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEdit(p)}
                          title="Editar usuário"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleToggleActive(p.id, p.is_active)}
                        >
                          {p.is_active ? 'Desativar' : 'Ativar'}
                        </Button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Dialog criar */}
      <Dialog open={showForm && mode === 'create'} onClose={() => setShowForm(false)} title="Novo Usuário">
        <div className="flex flex-col gap-4">
          {error && <Alert type="error">{error}</Alert>}
          <Input label="Nome *" value={name} onChange={e => setName(e.target.value)} />
          <Input label="E-mail *" type="email" value={email} onChange={e => setEmail(e.target.value)} />
          <Input label="Senha inicial *" type="password" value={password} onChange={e => setPassword(e.target.value)} />
          <Select
            label="Perfil"
            value={role}
            onChange={e => setRole(e.target.value as UserRole)}
            options={roleOptions}
          />
          {isPlatformAdmin && (
            <Select
              label="Congregação"
              value={congregationId}
              onChange={e => setCongregationId(e.target.value)}
              placeholder="Nenhuma (Admin Plataforma)"
              options={congregations.map(c => ({ value: c.id, label: c.name }))}
            />
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button onClick={handleCreate} loading={loading}>Criar usuário</Button>
          </div>
        </div>
      </Dialog>

      {/* Dialog editar */}
      <Dialog open={showForm && mode === 'edit'} onClose={() => setShowForm(false)} title="Editar Usuário">
        <div className="flex flex-col gap-4">
          {error && <Alert type="error">{error}</Alert>}
          <Input label="Nome *" value={name} onChange={e => setName(e.target.value)} />
          <p className="text-xs text-gray-500">E-mail: <span className="font-medium text-gray-700">{email}</span></p>
          <Select
            label="Perfil"
            value={role}
            onChange={e => setRole(e.target.value as UserRole)}
            options={roleOptions}
          />
          {isPlatformAdmin && (
            <Select
              label="Congregação"
              value={congregationId}
              onChange={e => setCongregationId(e.target.value)}
              placeholder="Nenhuma (Admin Plataforma)"
              options={congregations.map(c => ({ value: c.id, label: c.name }))}
            />
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button onClick={handleEdit} loading={loading}>Salvar alterações</Button>
          </div>
        </div>
      </Dialog>
    </>
  )
}
