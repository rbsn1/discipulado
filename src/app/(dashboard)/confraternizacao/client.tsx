'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog } from '@/components/ui/dialog'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { formatDate, cn } from '@/lib/utils'
import { Plus, CalendarDays, CheckCircle2, Clock, XCircle } from 'lucide-react'
import type { Event, Profile } from '@/types'

const STATUS_COLOR: Record<string, string> = {
  PLANEJADO: 'bg-blue-100 text-blue-800',
  REALIZADO: 'bg-green-100 text-green-800',
  CANCELADO: 'bg-red-100 text-red-800',
}

const STATUS_ICON: Record<string, React.ElementType> = {
  PLANEJADO: Clock,
  REALIZADO: CheckCircle2,
  CANCELADO: XCircle,
}

interface Props {
  events: Event[]
  congregationId: string
  currentProfile: Profile
}

export function ConfraternizacaoClient({ events, congregationId, currentProfile }: Props) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const canManage = ['ADMIN_DISCIPULADO', 'ADMIN_PLATAFORMA'].includes(currentProfile.role)

  async function handleCreate() {
    if (!title.trim() || !date) { setError('Título e data são obrigatórios'); return }
    setLoading(true)
    setError('')
    const res = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: title.trim(), date, notes: notes || null }),
    })
    if (!res.ok) setError((await res.json()).error)
    else {
      setShowForm(false)
      setTitle(''); setDate(''); setNotes('')
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Confraternização</h1>
        {canManage && (
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4" />
            Novo evento
          </Button>
        )}
      </div>

      {error && <Alert type="error" className="mb-4">{error}</Alert>}

      <div className="flex flex-col gap-4">
        {events.length === 0 && (
          <div className="rounded-lg border border-dashed border-gray-300 py-12 text-center text-gray-500">
            Nenhum evento cadastrado
          </div>
        )}
        {events.map(ev => {
          const Icon = STATUS_ICON[ev.status] ?? Clock
          return (
            <Link
              key={ev.id}
              href={`/confraternizacao/${ev.id}`}
              className="flex items-center gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="rounded-lg bg-blue-50 p-3">
                <CalendarDays className="h-6 w-6 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate">{ev.title}</p>
                <p className="text-sm text-gray-500">{formatDate(ev.date)}</p>
              </div>
              <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium flex items-center gap-1', STATUS_COLOR[ev.status])}>
                <Icon className="h-3.5 w-3.5" />
                {ev.status === 'PLANEJADO' ? 'Planejado' : ev.status === 'REALIZADO' ? 'Realizado' : 'Cancelado'}
              </span>
            </Link>
          )
        })}
      </div>

      <Dialog open={showForm} onClose={() => setShowForm(false)} title="Novo Evento de Confraternização">
        <div className="flex flex-col gap-4">
          {error && <Alert type="error">{error}</Alert>}
          <Input label="Título *" value={title} onChange={e => setTitle(e.target.value)} placeholder="Nome do evento" />
          <Input label="Data *" type="date" value={date} onChange={e => setDate(e.target.value)} />
          <Textarea label="Observações" value={notes} onChange={e => setNotes(e.target.value)} />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button onClick={handleCreate} loading={loading}>Criar evento</Button>
          </div>
        </div>
      </Dialog>
    </>
  )
}
