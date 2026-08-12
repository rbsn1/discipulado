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
import { Plus, BookOpen, Pencil, Search, Trash2 } from 'lucide-react'
import type { Class, ClassShiftCatalog, UserRole } from '@/types'
import { isAfter, isBefore, parseISO, startOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns'
import { cn } from '@/lib/utils'

interface Props {
  classes: Class[]
  shifts: ClassShiftCatalog[]
  congregationId: string
  currentRole: UserRole
}

type Period = '' | 'semana' | 'mes' | 'ano'

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: 'semana', label: 'Semana' },
  { value: 'mes', label: 'Mês' },
  { value: 'ano', label: 'Ano' },
]

export function TurmasClient({ classes, shifts, currentRole }: Props) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [editClass, setEditClass] = useState<Class | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [shiftId, setShiftId] = useState('')
  const [search, setSearch] = useState('')
  const [period, setPeriod] = useState<Period>('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const canManage = ['ADMIN_DISCIPULADO', 'DISCIPULADOR', 'ADMIN_PLATAFORMA'].includes(currentRole)

  // ── Turma inativa some da tela por padrão — busca por nome ou filtro de
  // período (baseado em quando a turma foi criada/alterada) trazem de volta,
  // mesmo padrão já usado em Boas-vindas, Aulas e Pós-discipulado.
  const today = startOfDay(new Date())
  const periodStart =
    period === 'semana' ? startOfWeek(today, { weekStartsOn: 1 }) :
    period === 'mes'    ? startOfMonth(today) :
    period === 'ano'    ? startOfYear(today) :
    null
  const periodEnd =
    period === 'semana' ? endOfWeek(today, { weekStartsOn: 1 }) :
    period === 'mes'    ? endOfMonth(today) :
    period === 'ano'    ? endOfYear(today) :
    null

  const isFiltering = search.trim().length > 0 || period !== ''
  const visibleClasses = isFiltering
    ? classes.filter(c => {
        const matchesSearch = !search.trim() || c.name.toLowerCase().includes(search.trim().toLowerCase())
        const updatedAt = parseISO(c.updated_at)
        const matchesPeriod = !periodStart || !periodEnd || (!isBefore(updatedAt, periodStart) && !isAfter(updatedAt, periodEnd))
        return matchesSearch && matchesPeriod
      })
    : classes.filter(c => c.is_active)

  const shiftOptions = [
    { value: '', label: 'Não informado' },
    ...shifts.map(s => ({ value: s.id, label: s.name })),
  ]

  function openCreate() {
    setEditClass(null)
    setName('')
    setShiftId('')
    setError('')
    setShowForm(true)
  }

  function openEdit(c: Class, e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setEditClass(c)
    setName(c.name)
    setShiftId(c.shift_id ?? '')
    setError('')
    setShowForm(true)
  }

  async function handleDelete(c: Class, e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm(`Apagar a turma "${c.name}"? Essa ação não pode ser desfeita.`)) return
    setDeletingId(c.id)
    setError('')
    const res = await fetch(`/api/classes/${c.id}`, { method: 'DELETE' })
    if (!res.ok) {
      const d = await res.json()
      setError(d.error)
    } else {
      router.refresh()
    }
    setDeletingId(null)
  }

  async function handleSave() {
    if (!name.trim()) { setError('Nome obrigatório'); return }
    setLoading(true)
    setError('')

    const url = editClass ? `/api/classes/${editClass.id}` : '/api/classes'
    const method = editClass ? 'PATCH' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), shift_id: shiftId || null }),
    })
    if (!res.ok) {
      const d = await res.json()
      setError(d.error)
    } else {
      setShowForm(false)
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Turmas</h1>
        {canManage && (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Nova turma
          </Button>
        )}
      </div>

      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative max-w-xs w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar turma por nome..."
            className="h-9 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-base sm:text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
        <div className="flex items-center gap-1.5">
          {PERIOD_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setPeriod(p => p === opt.value ? '' : opt.value)}
              className={cn(
                'h-9 rounded-lg border px-3 text-sm font-medium transition-colors',
                period === opt.value
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {error && <Alert type="error" className="mb-4">{error}</Alert>}

      {classes.length === 0 && (
        <div className="rounded-lg border border-dashed border-gray-300 py-12 text-center text-gray-500">
          Nenhuma turma cadastrada
        </div>
      )}

      {classes.length > 0 && visibleClasses.length === 0 && (
        <div className="rounded-lg border border-dashed border-gray-300 py-12 text-center text-gray-500">
          {isFiltering ? 'Nenhuma turma encontrada' : 'Nenhuma turma ativa. Busque pelo nome ou filtre por período pra ver as inativas.'}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visibleClasses.map(c => (
          <div key={c.id} className="relative group">
            <Link
              href={`/turmas/${c.id}`}
              className="block rounded-xl border border-gray-100 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-indigo-50 p-2">
                  <BookOpen className="h-5 w-5 text-indigo-600" />
                </div>
                <div className="min-w-0 flex-1 pr-8">
                  <p className="font-semibold text-gray-900 truncate">{c.name}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{c.class_shifts?.name ?? 'Não informado'}</p>
                  {!c.is_active && (
                    <Badge variant="muted" className="mt-1">Inativa</Badge>
                  )}
                </div>
              </div>
            </Link>
            {canManage && (
              <div className="absolute right-3 top-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                <button
                  onClick={(e) => openEdit(c, e)}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                  title="Editar turma"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={(e) => handleDelete(c, e)}
                  disabled={deletingId === c.id}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                  title="Apagar turma"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <Dialog
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editClass ? 'Editar Turma' : 'Nova Turma'}
      >
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
            value={shiftId}
            onChange={e => setShiftId(e.target.value)}
            options={shiftOptions}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button onClick={handleSave} loading={loading}>
              {editClass ? 'Salvar alterações' : 'Criar turma'}
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  )
}
