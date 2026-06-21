'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Dialog } from '@/components/ui/dialog'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { SHIFT_LABEL } from '@/lib/utils'
import { Plus, BookOpen } from 'lucide-react'
import type { Class, ClassShift, UserRole } from '@/types'

interface Props {
  classes: Class[]
  congregationId: string
  currentRole: UserRole
}

const SHIFT_OPTIONS = [
  { value: 'MANHA', label: 'Manhã' },
  { value: 'TARDE', label: 'Tarde' },
  { value: 'NOITE', label: 'Noite' },
  { value: 'NAO_INFORMADO', label: 'Não informado' },
]

export function TurmasClient({ classes, congregationId, currentRole }: Props) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [shift, setShift] = useState<ClassShift>('NAO_INFORMADO')

  const canManage = ['ADMIN_DISCIPULADO', 'DISCIPULADOR', 'ADMIN_PLATAFORMA'].includes(currentRole)

  async function handleCreate() {
    if (!name.trim()) { setError('Nome obrigatório'); return }
    setLoading(true)
    setError('')
    const res = await fetch('/api/classes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), shift }),
    })
    if (!res.ok) {
      const d = await res.json()
      setError(d.error)
    } else {
      setShowForm(false)
      setName('')
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Turmas</h1>
        {canManage && (
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4" />
            Nova turma
          </Button>
        )}
      </div>

      {error && <Alert type="error" className="mb-4">{error}</Alert>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {classes.length === 0 && (
          <div className="col-span-full rounded-lg border border-dashed border-gray-300 py-12 text-center text-gray-500">
            Nenhuma turma cadastrada
          </div>
        )}
        {classes.map(c => (
          <Link
            key={c.id}
            href={`/turmas/${c.id}`}
            className="block rounded-lg border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-blue-50 p-2">
                <BookOpen className="h-5 w-5 text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 truncate">{c.name}</p>
                <p className="text-sm text-gray-500 mt-0.5">{SHIFT_LABEL[c.shift]}</p>
                {!c.is_active && (
                  <Badge variant="muted" className="mt-1">Inativa</Badge>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>

      <Dialog open={showForm} onClose={() => setShowForm(false)} title="Nova Turma">
        <div className="flex flex-col gap-4">
          {error && <Alert type="error">{error}</Alert>}
          <Input
            label="Nome da turma *"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Ex: Turma Manhã - Jan/2026"
          />
          <Select
            label="Turno"
            value={shift}
            onChange={e => setShift(e.target.value as ClassShift)}
            options={SHIFT_OPTIONS}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button onClick={handleCreate} loading={loading}>Criar turma</Button>
          </div>
        </div>
      </Dialog>
    </>
  )
}
