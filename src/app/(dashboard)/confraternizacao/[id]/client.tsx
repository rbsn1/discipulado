'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { Select } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Dialog } from '@/components/ui/dialog'
import { formatDate, downloadCSV, toCSV, SHIFT_LABEL, cn } from '@/lib/utils'
import {
  ChevronRight,
  CheckCircle,
  X,
  Download,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  UserPlus,
} from 'lucide-react'
import type { Profile, DiscipleshipCaseWithRelations, ClassShift, EventStatus } from '@/types'

// ─── Tipos locais ────────────────────────────────────────────────────────────

interface Confirmation {
  id: string
  event_id: string
  case_id: string
  confirmed: boolean
  attended: boolean
  class_shift: ClassShift | null
}

interface EventDetail {
  id: string
  title: string
  date: string
  status: EventStatus
  notes?: string
  event_confirmations: Array<Confirmation & {
    discipleship_cases: {
      id: string
      disciples: { id: string; full_name: string; phone?: string }
      profiles: { id: string; name: string } | null
    }
  }>
}

interface Props {
  event: EventDetail
  activeCases: DiscipleshipCaseWithRelations[]
  currentProfile: Profile
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const SHIFT_OPTIONS = [
  { value: '',      label: 'Não informado' },
  { value: 'MANHA', label: 'Manhã'         },
  { value: 'TARDE', label: 'Tarde'         },
  { value: 'NOITE', label: 'Noite'         },
]

const STATUS_CONFIG: Record<EventStatus, { label: string; icon: React.ElementType; badge: string }> = {
  PLANEJADO: { label: 'Planejado', icon: Clock,        badge: 'bg-indigo-100 text-indigo-800' },
  REALIZADO: { label: 'Realizado', icon: CheckCircle2, badge: 'bg-emerald-100 text-emerald-800' },
  CANCELADO: { label: 'Cancelado', icon: XCircle,      badge: 'bg-rose-100 text-rose-800'    },
}

// ─── Componente principal ────────────────────────────────────────────────────

export function EventDetailClient({ event, activeCases, currentProfile }: Props) {
  const router = useRouter()

  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError]     = useState('')

  // Modal presença + turno
  const [attendModal, setAttendModal]     = useState<string | null>(null) // case_id
  const [attendShift, setAttendShift]     = useState<string>('')

  // Modal alteração de status do evento
  const [statusModal, setStatusModal]     = useState(false)
  const [newStatus, setNewStatus]         = useState<EventStatus>(event.status)

  // Busca na seção "Adicionar participante"
  const [addSearch, setAddSearch]         = useState('')

  const canManage = ['ADMIN_DISCIPULADO', 'DISCIPULADOR', 'SECRETARIA_DISCIPULADO', 'SM_DISCIPULADO', 'ADMIN_PLATAFORMA'].includes(currentProfile.role)
  const canExport = ['ADMIN_DISCIPULADO', 'SECRETARIA_DISCIPULADO', 'SM_DISCIPULADO', 'ADMIN_PLATAFORMA'].includes(currentProfile.role)
  const canChangeStatus = ['ADMIN_DISCIPULADO', 'ADMIN_PLATAFORMA'].includes(currentProfile.role)

  const confirmedCaseIds = new Set(event.event_confirmations.map(c => c.case_id))

  // ── Estatísticas de turno ──

  const shiftStats = useMemo(() => {
    const attended = event.event_confirmations.filter(c => c.attended)
    const shifts: Record<string, number> = { MANHA: 0, TARDE: 0, NOITE: 0, NAO_INFORMADO: 0 }
    for (const c of attended) {
      const key = c.class_shift ?? 'NAO_INFORMADO'
      shifts[key] = (shifts[key] ?? 0) + 1
    }
    return shifts
  }, [event.event_confirmations])

  const totalConfirmed = event.event_confirmations.filter(c => c.confirmed).length
  const totalAttended  = event.event_confirmations.filter(c => c.attended).length

  // ── Participantes não adicionados (com busca) ──

  const unconfirmedCases = useMemo(() => {
    const base = activeCases.filter(c => !confirmedCaseIds.has(c.id))
    if (!addSearch.trim()) return base
    const s = addSearch.toLowerCase()
    return base.filter(c =>
      c.disciples?.full_name?.toLowerCase().includes(s) ||
      (c.disciples as any)?.phone?.includes(s)
    )
  }, [activeCases, confirmedCaseIds, addSearch])

  // ── Ações ──

  async function toggle(
    caseId: string,
    field: 'confirmed' | 'attended',
    currentValue: boolean,
    shift?: ClassShift | null
  ) {
    setLoading(caseId + field)
    const existing = event.event_confirmations.find(c => c.case_id === caseId)
    const body = {
      case_id: caseId,
      confirmed: field === 'confirmed' ? !currentValue : (existing?.confirmed ?? false),
      attended:  field === 'attended'  ? !currentValue : (existing?.attended  ?? false),
      class_shift: shift !== undefined ? shift : existing?.class_shift ?? null,
    }
    const res = await fetch(`/api/events/${event.id}/confirmations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) setError((await res.json()).error)
    else router.refresh()
    setLoading(null)
  }

  async function handleAttendConfirm() {
    if (!attendModal) return
    await toggle(attendModal, 'attended', false, (attendShift as ClassShift) || null)
    setAttendModal(null)
  }

  async function handleStatusChange() {
    setLoading('status')
    const res = await fetch(`/api/events/${event.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    if (!res.ok) setError((await res.json()).error)
    else { setStatusModal(false); router.refresh() }
    setLoading(null)
  }

  function exportCSV() {
    const rows = event.event_confirmations
      .filter(c => c.confirmed || c.attended)
      .map(c => ({
        'Nome':       c.discipleship_cases?.disciples?.full_name ?? '',
        'Telefone':   (c.discipleship_cases?.disciples as any)?.phone ?? '',
        'Turno':      c.class_shift ? SHIFT_LABEL[c.class_shift] : '',
        'Confirmado': c.confirmed ? 'Sim' : 'Não',
        'Presente':   c.attended  ? 'Sim' : 'Não',
      }))
    downloadCSV(
      toCSV(rows, ['Nome', 'Telefone', 'Turno', 'Confirmado', 'Presente']),
      `confraternizacao-${event.date}.csv`
    )
  }

  const statusCfg = STATUS_CONFIG[event.status]
  const StatusIcon = statusCfg.icon

  // ── Render ──

  return (
    <>
      {/* Breadcrumb */}
      <div className="mb-2 flex items-center gap-2 text-sm text-gray-500">
        <Link href="/confraternizacao" className="hover:underline">Confraternização</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="truncate">{event.title}</span>
      </div>

      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{event.title}</h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-gray-500">
            {formatDate(event.date)}
            <span className={cn(
              'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
              statusCfg.badge
            )}>
              <StatusIcon className="h-3.5 w-3.5" />
              {statusCfg.label}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canExport && (
            <Button variant="outline" size="sm" onClick={exportCSV}>
              <Download className="h-4 w-4" />
              Exportar CSV
            </Button>
          )}
          {canChangeStatus && event.status !== 'REALIZADO' && event.status !== 'CANCELADO' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => { setNewStatus(event.status); setStatusModal(true) }}
            >
              Alterar status
            </Button>
          )}
          {canChangeStatus && event.status === 'REALIZADO' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => { setNewStatus('PLANEJADO'); setStatusModal(true) }}
            >
              Reabrir
            </Button>
          )}
        </div>
      </div>

      {error && <Alert type="error" className="mb-4">{error}</Alert>}

      {/* ── Resumo de turnos ── */}
      {totalAttended > 0 && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(['MANHA', 'TARDE', 'NOITE', 'NAO_INFORMADO'] as const).map(shift => {
            const count = shiftStats[shift] ?? 0
            if (count === 0) return null
            return (
              <div key={shift} className="rounded-xl border border-gray-100 bg-white p-4 text-center shadow-sm">
                <p className="text-2xl font-bold text-gray-900">{count}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {shift === 'MANHA' ? 'Manhã' : shift === 'TARDE' ? 'Tarde' : shift === 'NOITE' ? 'Noite' : 'Não informado'}
                </p>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Totais ── */}
      <div className="mb-4 flex items-center gap-4 text-sm text-gray-600">
        <span><strong className="text-gray-900">{event.event_confirmations.length}</strong> na lista</span>
        <span><strong className="text-gray-900">{totalConfirmed}</strong> confirmados</span>
        <span><strong className="text-emerald-700">{totalAttended}</strong> presentes</span>
      </div>

      {/* ── Tabela de confirmados ── */}
      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden mb-6">
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <p className="font-semibold text-gray-900">Lista de participantes</p>
        </div>
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left">
              <th className="px-4 py-3 font-medium text-gray-600">Discipulando</th>
              <th className="px-4 py-3 font-medium text-gray-600">Turno</th>
              <th className="px-4 py-3 text-center font-medium text-gray-600">Confirmado</th>
              <th className="px-4 py-3 text-center font-medium text-gray-600">Presente</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {event.event_confirmations.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-gray-500">
                  Nenhum participante adicionado ainda
                </td>
              </tr>
            )}
            {event.event_confirmations.map(c => {
              // Determina o status visual do participante
              const rowStatus: 'presente' | 'confirmado' | 'nao_confirmado' =
                c.attended  ? 'presente'      :
                c.confirmed ? 'confirmado'    :
                              'nao_confirmado'

              return (
                <tr key={c.id} className={cn(
                  'hover:bg-gray-50',
                  rowStatus === 'presente'   && 'bg-emerald-50/40',
                )}>
                  <td className="px-4 py-2.5">
                    <div>
                      <Link
                        href={`/discipulandos/${c.discipleship_cases?.disciples?.id}`}
                        className="text-blue-600 hover:underline font-medium"
                      >
                        {c.discipleship_cases?.disciples?.full_name}
                      </Link>
                      {c.discipleship_cases?.profiles?.name && (
                        <p className="text-xs text-gray-400">{c.discipleship_cases.profiles.name}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-gray-600">
                    {c.class_shift ? SHIFT_LABEL[c.class_shift] : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    {canManage ? (
                      <button
                        onClick={() => toggle(c.case_id, 'confirmed', c.confirmed)}
                        disabled={loading === c.case_id + 'confirmed'}
                        aria-label={c.confirmed ? 'Desmarcar confirmação' : 'Confirmar presença'}
                      >
                        {c.confirmed
                          ? <CheckCircle className="h-5 w-5 text-green-600 mx-auto" />
                          : <X className="h-5 w-5 text-gray-300 mx-auto hover:text-gray-500" />}
                      </button>
                    ) : (
                      c.confirmed
                        ? <CheckCircle className="h-5 w-5 text-green-600 mx-auto" />
                        : <X className="h-5 w-5 text-gray-300 mx-auto" />
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    {canManage ? (
                      <button
                        onClick={() =>
                          c.attended
                            ? toggle(c.case_id, 'attended', true)
                            : (() => { setAttendShift(c.class_shift ?? ''); setAttendModal(c.case_id) })()
                        }
                        disabled={loading === c.case_id + 'attended'}
                        title={c.attended ? 'Desmarcar presença' : 'Registrar presença e turno'}
                        aria-label={c.attended ? 'Desmarcar presença' : 'Registrar presença'}
                      >
                        {c.attended
                          ? <CheckCircle className="h-5 w-5 text-blue-600 mx-auto" />
                          : <X className="h-5 w-5 text-gray-300 mx-auto hover:text-gray-500" />}
                      </button>
                    ) : (
                      c.attended
                        ? <CheckCircle className="h-5 w-5 text-blue-600 mx-auto" />
                        : <X className="h-5 w-5 text-gray-300 mx-auto" />
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        </div>
      </div>

      {/* ── Adicionar participantes ── */}
      {canManage && activeCases.filter(c => !confirmedCaseIds.has(c.id)).length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between gap-3 flex-wrap">
            <p className="font-semibold text-gray-900 flex items-center gap-1.5">
              <UserPlus className="h-4 w-4 text-gray-500" />
              Adicionar participante
            </p>
            <div className="relative max-w-xs w-full">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={addSearch}
                onChange={e => setAddSearch(e.target.value)}
                placeholder="Buscar por nome ou telefone..."
                className="h-8 w-full rounded-lg border border-gray-200 bg-white pl-8 pr-3 text-base sm:text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          {unconfirmedCases.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-gray-500">
              {addSearch ? 'Nenhum discipulando encontrado' : 'Todos os discipulandos ativos já foram adicionados'}
            </p>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-50">
                {unconfirmedCases.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-gray-900">{c.disciples?.full_name}</p>
                      {(c.disciples as any)?.phone && (
                        <p className="text-xs text-gray-400">{(c.disciples as any).phone}</p>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-500">
                      {(c as any).profiles?.name ?? '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        loading={loading === c.id + 'confirmed'}
                        onClick={() => toggle(c.id, 'confirmed', false)}
                      >
                        + Confirmar
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </div>
      )}

      {/* ── Modal: registrar presença + turno ── */}
      <Dialog open={!!attendModal} onClose={() => setAttendModal(null)} title="Registrar Presença">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-gray-600">
            Selecione o turno de preferência para o discipulado:
          </p>
          <Select
            label="Turno preferido"
            value={attendShift}
            onChange={e => setAttendShift(e.target.value)}
            options={SHIFT_OPTIONS}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setAttendModal(null)}>Cancelar</Button>
            <Button onClick={handleAttendConfirm} loading={!!loading}>Confirmar presença</Button>
          </div>
        </div>
      </Dialog>

      {/* ── Modal: alterar status do evento ── */}
      <Dialog open={statusModal} onClose={() => setStatusModal(false)} title="Alterar Status do Evento">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-gray-600">
            Selecione o novo status para <strong>{event.title}</strong>:
          </p>
          <div className="flex flex-col gap-2">
            {(['PLANEJADO', 'REALIZADO', 'CANCELADO'] as EventStatus[]).map(s => {
              const cfg = STATUS_CONFIG[s]
              const Icon = cfg.icon
              return (
                <button
                  key={s}
                  onClick={() => setNewStatus(s)}
                  className={cn(
                    'flex items-center gap-3 rounded-lg border p-3 text-left text-sm transition-colors',
                    newStatus === s
                      ? 'border-indigo-500 bg-indigo-50 font-medium text-indigo-900'
                      : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {cfg.label}
                </button>
              )
            })}
          </div>
          {newStatus === 'CANCELADO' && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">
              Atenção: cancelar o evento remove a elegibilidade de matrícula dos discipulandos que só participaram deste evento.
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStatusModal(false)}>Voltar</Button>
            <Button
              onClick={handleStatusChange}
              loading={loading === 'status'}
              disabled={newStatus === event.status}
              variant={newStatus === 'CANCELADO' ? 'danger' : 'primary'}
            >
              Confirmar
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  )
}
