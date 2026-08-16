'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Dialog } from '@/components/ui/dialog'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { ROLE_LABEL, formatDateTime } from '@/lib/utils'
import { Plus, Pencil, KeyRound, Copy, Check } from 'lucide-react'
import type { ProfileWithCongregation, UserRole, Profile, PasswordResetRequest } from '@/types'

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'ADMIN_DISCIPULADO', label: 'Admin Discipulado' },
  { value: 'DISCIPULADOR', label: 'Acolhedor' },
  { value: 'SECRETARIA_DISCIPULADO', label: 'Secretaria' },
  { value: 'SM_DISCIPULADO', label: 'SM Discipulado' },
]

interface Props {
  profiles: ProfileWithCongregation[]
  congregations: { id: string; name: string }[]
  currentProfile: Profile
  passwordResetRequests: PasswordResetRequest[]
}

type Mode = 'create' | 'edit'

export function UsuariosClient({ profiles, congregations, currentProfile, passwordResetRequests }: Props) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [mode, setMode] = useState<Mode>('create')
  const [editProfileId, setEditProfileId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<UserRole>('DISCIPULADOR')
  const [congregationId, setCongregationId] = useState(currentProfile.congregation_id ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [resetTarget, setResetTarget] = useState<{ id: string; name: string } | null>(null)
  const [resetLoading, setResetLoading] = useState(false)
  const [resetError, setResetError] = useState('')

  const [revealPassword, setRevealPassword] = useState<{ name: string; password: string } | null>(null)
  const [copied, setCopied] = useState(false)

  const isPlatformAdmin = currentProfile.role === 'ADMIN_PLATAFORMA'
  const roleOptions = isPlatformAdmin
    ? [{ value: 'ADMIN_PLATAFORMA' as UserRole, label: 'Admin Plataforma' }, ...ROLE_OPTIONS]
    : ROLE_OPTIONS

  function openCreate() {
    setMode('create')
    setEditProfileId(null)
    setName('')
    setEmail('')
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
    setRole(p.role)
    setCongregationId((p as any).congregation_id ?? '')
    setError('')
    setShowForm(true)
  }

  async function handleCreate() {
    if (!name.trim() || !email.trim()) {
      setError('Nome e e-mail são obrigatórios')
      return
    }
    setLoading(true)
    setError('')
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, role, congregation_id: congregationId || null }),
    })
    if (!res.ok) {
      setError((await res.json()).error)
    } else {
      const data = await res.json()
      setShowForm(false)
      setRevealPassword({ name, password: data.password })
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

  function openResetPassword(id: string, name: string) {
    setResetTarget({ id, name })
    setResetError('')
  }

  async function handleResetPassword() {
    if (!resetTarget) return
    setResetLoading(true)
    setResetError('')
    const res = await fetch(`/api/admin/users/${resetTarget.id}/password`, {
      method: 'PATCH',
    })
    if (!res.ok) {
      setResetError((await res.json()).error)
    } else {
      const data = await res.json()
      setRevealPassword({ name: resetTarget.name, password: data.password })
      setResetTarget(null)
      router.refresh()
    }
    setResetLoading(false)
  }

  async function handleCopyPassword() {
    if (!revealPassword) return
    await navigator.clipboard.writeText(revealPassword.password)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
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

      {passwordResetRequests.length > 0 && (
        <div className="mb-6 rounded-xl border border-amber-100 bg-amber-50 p-4">
          <p className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-amber-900">
            <KeyRound className="h-4 w-4" />
            Pedidos de redefinição de senha
          </p>
          <ul className="flex flex-col gap-2">
            {passwordResetRequests.map(r => (
              <li key={r.id} className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">{r.profiles?.name ?? '—'}</p>
                  <p className="text-xs text-gray-500">{r.profiles?.email} · pedido em {formatDateTime(r.requested_at)}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0"
                  onClick={() => r.profiles && openResetPassword(r.profiles.id, r.profiles.name)}
                >
                  <KeyRound className="h-3.5 w-3.5" />
                  Redefinir senha
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

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
                          variant="ghost"
                          onClick={() => openResetPassword(p.id, p.name)}
                          title="Redefinir senha"
                        >
                          <KeyRound className="h-3.5 w-3.5" />
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
          <p className="rounded-lg bg-indigo-50 px-3 py-2 text-xs text-indigo-700">
            A senha inicial é gerada automaticamente — você vai poder ver e copiar assim que criar, pra repassar à pessoa por fora (WhatsApp/telefone). No primeiro login, ela será obrigada a trocar.
          </p>
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

      {/* Dialog redefinir senha */}
      <Dialog open={!!resetTarget} onClose={() => setResetTarget(null)} title="Redefinir Senha">
        <div className="flex flex-col gap-4">
          {resetError && <Alert type="error">{resetError}</Alert>}
          <p className="text-sm text-gray-600">
            Gerar uma senha nova pra <strong>{resetTarget?.name}</strong>? Uma senha temporária é criada automaticamente — você vai poder copiá-la na próxima tela pra repassar por fora (WhatsApp/telefone). No próximo login, ela será obrigada a trocar.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setResetTarget(null)}>Cancelar</Button>
            <Button onClick={handleResetPassword} loading={resetLoading}>Gerar nova senha</Button>
          </div>
        </div>
      </Dialog>

      {/* Dialog revelar senha gerada */}
      <Dialog open={!!revealPassword} onClose={() => setRevealPassword(null)} title="Senha gerada">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-gray-600">
            Senha temporária para <strong>{revealPassword?.name}</strong>. Anote ou copie agora — ela só aparece essa vez.
          </p>
          <div className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
            <code className="text-base font-semibold tracking-wide text-gray-900">{revealPassword?.password}</code>
            <Button size="sm" variant="outline" onClick={handleCopyPassword}>
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copiado' : 'Copiar'}
            </Button>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setRevealPassword(null)}>Fechar</Button>
          </div>
        </div>
      </Dialog>
    </>
  )
}
