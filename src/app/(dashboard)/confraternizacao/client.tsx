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
import {
  Plus,
  CalendarDays,
  CheckCircle2,
  Clock,
  XCircle,
  Pencil,
  Users,
  UserCheck,
  Search,
} from 'lucide-react'
import type { Profile } from '@/types'
import type { EventWithCounts } from '@/lib/repositories/events'
import { isAfter, isBefore, parseISO, startOfDay, startOfWeek, startOfMonth, startOfYear } from 'date-fns'

// ─── Helpers de status ──────────────────────────────────────────────────────

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

type Period = '' | 'semana' | 'mes' | 'ano'

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: 'semana', label: 'Semana' },
  { value: 'mes', label: 'Mês' },
  { value: 'ano', label: 'Ano' },
]

// ─── Props ──────────────────────────────────────────────────────────────────

interface Props {
  events: EventWithCounts[]
  congregationId: string
  currentProfile: Profile
}

// ─── Componente ─────────────────────────────────────────────────────────────

export function ConfraternizacaoClient({ events, congregationId, currentProfile }: Props) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [editEvent, setEditEvent] = useState<EventWithCounts | null>(null)
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [period, setPeriod] = useState<Period>('')

  const canManage = ['ADMIN_DISCIPULADO', 'ADMIN_PLATAFORMA'].includes(currentProfile.role)

  // ── Filtrar por busca (título) e/ou período / esconder realizados por padrão ──
  // Evento "Realizado" some da tela assim que concluído — continua acessível
  // buscando pelo título ou limitando por semana/mês/ano.

  const today = startOfDay(new Date())
  const periodStart =
    period === 'semana' ? startOfWeek(today, { weekStartsOn: 1 }) :
    period === 'mes'    ? startOfMonth(today) :
    period === 'ano'    ? startOfYear(today) :
    null

  const isFiltering = search.trim().length > 0 || period !== ''
  const visibleEvents = isFiltering
    ? events.filter(ev => {
        const matchesSearch = !search.trim() || ev.title.toLowerCase().includes(search.trim().toLowerCase())
        const evDate = parseISO(ev.date)
        const matchesPeriod = !periodStart || (!isBefore(evDate, periodStart) && !isAfter(evDate, today))
        return matchesSearch && matchesPeriod
      })
    : events.filter(ev => ev.status !== 'REALIZADO')

  // ── Separar eventos futuros/passados ──

  const upcoming = visibleEvents.filter(ev =>
    ev.status !== 'CANCELADO' && isAfter(parseISO(ev.date), today) || ev.date === today.toISOString().slice(0, 10)
  )
  const past = visibleEvents.filter(ev =>
    !upcoming.includes(ev)
  )

  // ── Handlers ──

  function openCreate() {
    setEditEvent(null)
    setTitle('')
    setDate('')
    setNotes('')
    setError('')
    setShowForm(true)
  }

  function openEdit(ev: EventWithCounts, e: React.MouseEvent) {
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

  // ── Render ──

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Confraternização</h1>
        {canManage && (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Novo evento
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
            placeholder="Buscar evento por título..."
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

      {events.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 py-12 text-center text-gray-500">
          Nenhum evento cadastrado
        </div>
      )}

      {events.length > 0 && visibleEvents.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 py-12 text-center text-gray-500">
          {isFiltering ? 'Nenhum evento encontrado' : 'Nenhum evento em andamento. Busque pelo título ou filtre por período pra ver os já realizados.'}
        </div>
      )}

      {/* ── Próximos eventos ── */}
      {upcoming.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Próximos
          </h2>
          <div className="flex flex-col gap-3">
            {upcoming.map(ev => (
              <EventCard
                key={ev.id}
                ev={ev}
                canManage={canManage}
                onEdit={openEdit}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── Eventos anteriores ── */}
      {past.length > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Anteriores
          </h2>
          <div className="flex flex-col gap-3">
            {past.map(ev => (
              <EventCard
                key={ev.id}
                ev={ev}
                canManage={canManage}
                onEdit={openEdit}
                muted
              />
            ))}
          </div>
        </section>
      )}

      {/* ── Dialog criar/editar ── */}
      <Dialog
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editEvent ? 'Editar Evento' : 'Novo Evento de Confraternização'}
      >
        <div className="flex flex-col gap-4">
          {error && <Alert type="error">{error}</Alert>}
          <Input
            label="Título *"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Nome do evento"
          />
          <Input
            label="Data *"
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
          />
          <Textarea
            label="Observações"
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
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

// ─── Card de evento ──────────────────────────────────────────────────────────

interface EventCardProps {
  ev: EventWithCounts
  canManage: boolean
  onEdit: (ev: EventWithCounts, e: React.MouseEvent) => void
  muted?: boolean
}

function EventCard({ ev, canManage, onEdit, muted }: EventCardProps) {
  const Icon = STATUS_ICON[ev.status] ?? Clock

  return (
    <div className={cn('relative group', muted && 'opacity-70')}>
      <Link
        href={`/confraternizacao/${ev.id}`}
        className="flex items-center gap-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm hover:shadow-md transition-shadow"
      >
        {/* Ícone */}
        <div className={cn(
          'rounded-lg p-3 shrink-0',
          muted ? 'bg-gray-50' : 'bg-indigo-50'
        )}>
          <CalendarDays className={cn('h-6 w-6', muted ? 'text-gray-400' : 'text-indigo-600')} />
        </div>

        {/* Título + data */}
        <div className="flex-1 min-w-0 pr-2">
          <p className="font-semibold text-gray-900 truncate">{ev.title}</p>
          <p className="text-sm text-gray-500">{formatDate(ev.date)}</p>
        </div>

        {/* Contadores */}
        <div className="flex items-center gap-3 shrink-0 text-xs text-gray-500">
          {ev.confirmed_count > 0 && (
            <span className="flex items-center gap-1" title="Confirmados">
              <Users className="h-3.5 w-3.5" />
              {ev.confirmed_count}
            </span>
          )}
          {ev.attended_count > 0 && (
            <span className="flex items-center gap-1 text-emerald-600 font-medium" title="Presentes">
              <UserCheck className="h-3.5 w-3.5" />
              {ev.attended_count}
            </span>
          )}
        </div>

        {/* Badge de status */}
        <span className={cn(
          'rounded-full px-2.5 py-0.5 text-xs font-medium flex items-center gap-1 shrink-0',
          STATUS_COLOR[ev.status]
        )}>
          <Icon className="h-3.5 w-3.5" />
          {STATUS_LABEL[ev.status] ?? ev.status}
        </span>
      </Link>

      {/* Botão editar (hover) */}
      {canManage && (
        <button
          onClick={(e) => onEdit(ev, e)}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-gray-400 opacity-0 group-hover:opacity-100 hover:bg-gray-100 hover:text-gray-700 transition-all"
          title="Editar evento"
        >
          <Pencil className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
