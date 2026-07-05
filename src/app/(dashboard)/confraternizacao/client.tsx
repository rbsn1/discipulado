'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog } from '@/components/ui/dialog'
import { Alert } from '@/components/ui/alert'
import { formatDate, cn } from '@/lib/utils'
import { Plus, CalendarDays, CheckCircle2, Clock, XCircle, Pencil } from 'lucide-react'
import type { Event, Profile } from '@/types'

const STATUS_COLOR: Record<string, string> = {
  PLANEJADO: 'bg-indigo-100 text-indigo-800',
  REALIZADO: 'bg-emerald-100 text-emerald-800',
  CANCELADO: 'bg-rose-100 text-rose-800',
}

const STATUS_ICON: Record<string, React.ElementType> = {
  PLANEJADO: Clock,
  REALIZADO: CheckCircle2,
  CANCELADO: XCircle,
}

const STATUS_LABEL: Record<string, string> = {
  PLANEJADO: 'Planejado',
  REALIZADO: 'Realizado',
  CANCELADO: 'Cancelado',
}

interface Props {
  events: Event[]
  congregationId: string
  currentProfile: Profile
}

export function ConfraternizacaoClient({ events, currentProfile }: Props) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [editEvent, setEditEvent] = useState<Event | null>(null)
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const canManage = ['ADMIN_DISCIPULADO', 'ADMIN_PLATAFORMA'].includes(currentProfile.role)

  function openCreate() {
    setEditEvent(null)
    setTitle('')
    setDate('')
    setNotes('')
    setError('')
    setShowForm(true)
  }

  function openEdit(ev: Event, e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setEditEvent(ev)
    setTitle(ev.title)
    setDate(ev.date)
    setNotes(ev.notes ?? '')
    setError('')
    setShowForm(true)
  }

  async function handleSave() {
    if (!title.trim() || !date) { setError('Título e data são obrigatórios'); return }
    setLoading(true)
    setError('')

    const url = editEvent ? `/api/events/${editEvent.id}` : '/api/events'
    const method = editEvent ? 'PATCH' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: title.trim(), date, notes: notes || null }),
    })
    if (!res.ok) setError((await res.json()).error)
    else {
      setShowForm(false)
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Confraternização</h1>
        {canManage && (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Novo evento
          </Button>
        )}
      </div>

      {error && <Alert type="error" className="mb-4">{error}</Alert>}

      <div className="flex flex-col gap-3">
        {events.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-300 py-12 text-center text-gray-500">
            Nenhum evento cadastrado
          </div>
        )}
        {events.map(ev => {
          const Icon = STATUS_ICON[ev.status] ?? Clock
          return (
            <div key={ev.id} className="relative group">
              <Link
                href={`/confraternizacao/${ev.id}`}
                className="flex items-center gap-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="rounded-lg bg-indigo-50 p-3">
                  <CalendarDays className="h-6 w-6 text-indigo-600" />
                </div>
                <div className="flex-1 min-w-0 pr-10">
                  <p className="font-semibold text-gray-900 truncate">{ev.title}</p>
                  <p className="text-sm text-gray-500">{formatDate(ev.date)}</p>
                </div>
                <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium flex items-center gap-1 shrink-0', STATUS_COLOR[ev.status])}>
                  <Icon className="h-3.5 w-3.5" />
                  {STATUS_LABEL[ev.status] ?? ev.status}
                </span>
              </Link>
              {canManage && (
                <button
                  onClick={(e) => openEdit(ev, e)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-gray-400 opacity-0 group-hover:opacity-100 hover:bg-gray-100 hover:text-gray-700 transition-all"
                  title="Editar evento"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              )}
            </div>
          )
        })}
      </div>

      <Dialog
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editEvent ? 'Editar Evento' : 'Novo Evento de Confraternização'}
      >
        <div className="flex flex-col gap-4">
          {error && <Alert type="error">{error}</Alert>}
          <Input label="Título *" value={title} onChange={e => setTitle(e.target.value)} placeholder="Nome do evento" />
          <Input label="Data *" type="date" value={date} onChange={e => setDate(e.target.value)} />
          <Textarea label="Observações" value={notes} onChange={e => setNotes(e.target.value)} />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button onClick={handleSave} loading={loading}>
              {editEvent ? 'Salvar alterações' : 'Criar evento'}
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  )
}
