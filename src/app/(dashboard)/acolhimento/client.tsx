'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Dialog } from '@/components/ui/dialog'
import { Alert } from '@/components/ui/alert'
import { Textarea } from '@/components/ui/textarea'
import {
  CASE_STATUS_LABEL,
  CASE_STATUS_COLOR,
  formatDate,
  getAttendanceCriticality,
  cn,
} from '@/lib/utils'
import {
  UserCheck,
  PauseCircle,
  PlayCircle,
  AlertTriangle,
  PhoneCall,
  Clock,
  Plus,
  Filter,
  X,
} from 'lucide-react'
import type {
  DiscipleshipCaseWithRelations,
  CaseStatus,
  Profile,
  UserRole,
  Disciple,
  ContactOutcome,
} from '@/types'
import { differenceInDays, parseISO } from 'date-fns'

// ─── Constantes ────────────────────────────────────────────────────────────────

const COLUMNS: { status: CaseStatus; label: string; color: string }[] = [
  { status: 'PENDENTE_MATRICULA', label: 'Pendente de Matrícula', color: 'border-yellow-400' },
  { status: 'EM_DISCIPULADO',    label: 'Em Discipulado',         color: 'border-blue-500'  },
  { status: 'PAUSADO',           label: 'Pausado',                color: 'border-gray-400'  },
  { status: 'CONCLUIDO',         label: 'Concluído',              color: 'border-green-500' },
]

const CONTACT_OUTCOMES: { value: ContactOutcome; label: string }[] = [
  { value: 'ATENDEU',          label: 'Atendeu'           },
  { value: 'NAO_ATENDEU',      label: 'Não atendeu'       },
  { value: 'MENSAGEM_ENVIADA', label: 'Mensagem enviada'  },
  { value: 'VISITA_REALIZADA', label: 'Visita realizada'  },
]

// Limite de cards por coluna antes de paginar
const PAGE_SIZE = 20

// ─── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  cases: DiscipleshipCaseWithRelations[]
  discipuladores: Profile[]
  disciplesSemCase: Disciple[]
  congregationId: string
  currentUserId: string
  currentRole: UserRole
  initialStatus?: string
  initialFilter?: string
  initialSearch?: string
  initialDiscipulador?: string
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function daysSinceContact(lastContactAt: string | null): number | null {
  if (!lastContactAt) return null
  return differenceInDays(new Date(), parseISO(lastContactAt))
}

function daysSince(date: string | null): number | null {
  if (!date) return null
  return differenceInDays(new Date(), parseISO(date))
}

/** Retorna prioridade numérica: menor = mais urgente */
function casePriority(c: DiscipleshipCaseWithRelations): number {
  let score = 0
  const crit = getAttendanceCriticality(c.attendance_rate)
  if (crit === 'critical') score -= 30
  else if (crit === 'warning') score -= 15
  if (!c.assigned_to) score -= 20
  const days = daysSinceContact(c.last_contact_at)
  if (days === null || days > 30) score -= 10
  return score
}

// ─── Componente ────────────────────────────────────────────────────────────────

export function AcolhimentoClient({
  cases,
  discipuladores,
  disciplesSemCase,
  congregationId,
  currentUserId,
  currentRole,
  initialStatus,
  initialFilter,
  initialSearch,
  initialDiscipulador,
}: Props) {
  const router = useRouter()

  // Filtros
  const [search, setSearch]             = useState(initialSearch ?? '')
  const [filterDiscipulador, setFilterDiscipulador] = useState(initialDiscipulador ?? '')

  // Paginação por coluna
  const [pageLimits, setPageLimits]     = useState<Record<CaseStatus, number>>({
    PENDENTE_MATRICULA: PAGE_SIZE,
    EM_DISCIPULADO:     PAGE_SIZE,
    PAUSADO:            PAGE_SIZE,
    CONCLUIDO:          PAGE_SIZE,
  })

  // Ações
  const [loading, setLoading]           = useState<string | null>(null)
  const [error, setError]               = useState('')

  // Modal: atribuir responsável
  const [assignCaseId, setAssignCaseId] = useState<string | null>(null)
  const [assignedTo, setAssignedTo]     = useState('')

  // Modal: registrar contato inline
  const [contactCaseId, setContactCaseId] = useState<string | null>(null)
  const [contactOutcome, setContactOutcome] = useState<ContactOutcome>('ATENDEU')
  const [contactNote, setContactNote]   = useState('')

  // Modal: iniciar acolhimento (novo case)
  const [startModal, setStartModal]     = useState(false)
  const [startDiscipleId, setStartDiscipleId] = useState('')
  const [startAssignedTo, setStartAssignedTo] = useState('')
  const [startWelcomedOn, setStartWelcomedOn] = useState('')
  const [startNotes, setStartNotes]     = useState('')

  const canManage = ['ADMIN_PLATAFORMA', 'ADMIN_DISCIPULADO', 'SM_DISCIPULADO', 'DISCIPULADOR'].includes(currentRole)

  // ── Filtragem ──

  const filtered = useMemo(() => {
    let result = cases

    if (search) {
      const s = search.toLowerCase()
      result = result.filter(c =>
        c.disciples?.full_name?.toLowerCase().includes(s) ||
        (c.disciples as any)?.phone?.includes(s)
      )
    }

    if (filterDiscipulador) {
      if (filterDiscipulador === '__none__') {
        result = result.filter(c => !c.assigned_to)
      } else {
        result = result.filter(c => c.assigned_to === filterDiscipulador)
      }
    }

    if (initialFilter === 'sem_responsavel')  result = result.filter(c => !c.assigned_to)
    if (initialFilter === 'baixa_frequencia') result = result.filter(c => c.attendance_rate < 75 && c.status === 'EM_DISCIPULADO')
    if (initialFilter === 'sem_contato') {
      result = result.filter(c => {
        const days = daysSinceContact(c.last_contact_at)
        return days === null || days > 30
      })
    }

    return result
  }, [cases, search, filterDiscipulador, initialFilter])

  const byStatus = (status: CaseStatus) =>
    filtered
      .filter(c => c.status === status)
      .sort((a, b) => casePriority(a) - casePriority(b))

  // ── Ações API ──

  async function doAction(caseId: string, endpoint: string, method = 'POST', body?: Record<string, unknown>) {
    setLoading(caseId)
    setError('')
    const res = await fetch(`/api/cases/${caseId}/${endpoint}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    })
    if (!res.ok) {
      const d = await res.json()
      setError(d.error ?? 'Erro')
    }
    setLoading(null)
    router.refresh()
  }

  async function handleAssign() {
    if (!assignCaseId) return
    await doAction(assignCaseId, 'assign', 'PATCH', { assigned_to: assignedTo || null })
    setAssignCaseId(null)
  }

  async function handleContact() {
    if (!contactCaseId) return
    await doAction(contactCaseId, 'contacts', 'POST', {
      outcome: contactOutcome,
      note: contactNote || null,
    })
    setContactCaseId(null)
    setContactNote('')
  }

  async function handleStartCase() {
    if (!startDiscipleId) return
    setLoading('start')
    setError('')
    const res = await fetch('/api/cases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        disciple_id: startDiscipleId,
        assigned_to: startAssignedTo || null,
        welcomed_on: startWelcomedOn || null,
        notes: startNotes || null,
      }),
    })
    const data = await res.json()
    setLoading(null)
    if (!res.ok) { setError(data.error ?? 'Erro ao iniciar acolhimento'); return }
    setStartModal(false)
    setStartDiscipleId('')
    setStartAssignedTo('')
    setStartWelcomedOn('')
    setStartNotes('')
    router.refresh()
  }

  // ── Filtros ativos ──

  const hasActiveFilters = !!search || !!filterDiscipulador || !!initialFilter
  function clearFilters() {
    setSearch('')
    setFilterDiscipulador('')
    router.push('/acolhimento')
  }

  return (
    <>
      {/* ── Cabeçalho ─────────────────────────────────────────────────────────── */}
      <div className="mb-4 md:mb-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">Fila de Acolhimento</h1>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          {/* Busca */}
          <Input
            placeholder="Buscar discipulando..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full sm:max-w-xs h-9"
          />

          {/* Filtro por discipulador */}
          <select
            value={filterDiscipulador}
            onChange={e => setFilterDiscipulador(e.target.value)}
            className="h-9 w-full sm:w-auto rounded-lg border border-gray-200 bg-white px-3 text-base sm:text-sm text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            aria-label="Filtrar por discipulador"
          >
            <option value="">Todos os discipuladores</option>
            <option value="__none__">Sem responsável</option>
            {discipuladores.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 h-9 text-sm text-gray-600 hover:bg-gray-50"
            >
              <X className="h-3.5 w-3.5" /> Limpar filtros
            </button>
          )}

          {/* Botão iniciar acolhimento */}
          {canManage && disciplesSemCase.length > 0 && (
            <Button size="sm" onClick={() => setStartModal(true)}>
              <Plus className="h-4 w-4" />
              Iniciar acolhimento
            </Button>
          )}
        </div>
      </div>

      {error && <Alert type="error" className="mb-4">{error}</Alert>}

      {/* ── Kanban ────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {COLUMNS.map(({ status, label, color }) => {
          const colCases   = byStatus(status)
          const limit      = pageLimits[status]
          const visible    = colCases.slice(0, limit)
          const hasMore    = colCases.length > limit

          return (
            <div key={status} className="flex flex-col gap-3">
              {/* Header da coluna */}
              <div className={`flex items-center justify-between rounded-t-lg border-t-4 bg-white px-3 py-2 shadow-sm ${color}`}>
                <span className="font-semibold text-gray-800 text-sm">{label}</span>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-bold text-gray-700">
                  {colCases.length}
                </span>
              </div>

              {/* Cards */}
              <div className="flex flex-col gap-2 min-h-24">
                {visible.length === 0 && (
                  <div className="rounded-lg border border-dashed border-gray-200 py-6 text-center text-sm text-gray-400">
                    Nenhum
                  </div>
                )}

                {visible.map(c => (
                  <CaseCard
                    key={c.id}
                    c={c}
                    status={status}
                    loading={loading}
                    canManage={canManage}
                    onAssign={() => { setAssignCaseId(c.id); setAssignedTo(c.assigned_to ?? '') }}
                    onContact={() => { setContactCaseId(c.id); setContactOutcome('ATENDEU'); setContactNote('') }}
                    onPause={() => doAction(c.id, 'pause')}
                    onResume={() => doAction(c.id, 'resume')}
                  />
                ))}

                {hasMore && (
                  <button
                    onClick={() => setPageLimits(prev => ({ ...prev, [status]: prev[status] + PAGE_SIZE }))}
                    className="mt-1 rounded-lg border border-dashed border-gray-300 py-2 text-xs text-gray-500 hover:bg-gray-50"
                  >
                    + {colCases.length - limit} mais
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Dialog: atribuir responsável ──────────────────────────────────────── */}
      <Dialog open={!!assignCaseId} onClose={() => setAssignCaseId(null)} title="Atribuir Responsável">
        <div className="flex flex-col gap-4">
          <Select
            label="Discipulador"
            value={assignedTo}
            onChange={e => setAssignedTo(e.target.value)}
            placeholder="Nenhum (remover atribuição)"
            options={discipuladores.map(d => ({ value: d.id, label: d.name }))}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setAssignCaseId(null)}>Cancelar</Button>
            <Button onClick={handleAssign} loading={!!loading}>Confirmar</Button>
          </div>
        </div>
      </Dialog>

      {/* ── Dialog: registrar contato inline ─────────────────────────────────── */}
      <Dialog open={!!contactCaseId} onClose={() => setContactCaseId(null)} title="Registrar Contato">
        <div className="flex flex-col gap-4">
          <Select
            label="Resultado"
            value={contactOutcome}
            onChange={e => setContactOutcome(e.target.value as ContactOutcome)}
            options={CONTACT_OUTCOMES}
          />
          <Textarea
            label="Observação"
            value={contactNote}
            onChange={e => setContactNote(e.target.value)}
            placeholder="Detalhe o contato (opcional)..."
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setContactCaseId(null)}>Cancelar</Button>
            <Button onClick={handleContact} loading={loading === contactCaseId}>Registrar</Button>
          </div>
        </div>
      </Dialog>

      {/* ── Dialog: iniciar acolhimento ───────────────────────────────────────── */}
      <Dialog open={startModal} onClose={() => setStartModal(false)} title="Iniciar Acolhimento">
        <div className="flex flex-col gap-4">
          <Select
            label="Discipulando *"
            value={startDiscipleId}
            onChange={e => setStartDiscipleId(e.target.value)}
            placeholder="Selecionar discipulando"
            options={disciplesSemCase.map(d => ({ value: d.id, label: d.full_name + (d.phone ? ` — ${d.phone}` : '') }))}
          />
          <Input
            label="Data do acolhimento"
            type="date"
            value={startWelcomedOn}
            onChange={e => setStartWelcomedOn(e.target.value)}
          />
          <Select
            label="Responsável"
            value={startAssignedTo}
            onChange={e => setStartAssignedTo(e.target.value)}
            placeholder="Nenhum (atribuir depois)"
            options={discipuladores.map(d => ({ value: d.id, label: d.name }))}
          />
          <Textarea
            label="Observações"
            value={startNotes}
            onChange={e => setStartNotes(e.target.value)}
            placeholder="Informações iniciais..."
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStartModal(false)}>Cancelar</Button>
            <Button onClick={handleStartCase} loading={loading === 'start'} disabled={!startDiscipleId}>
              Iniciar
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  )
}

// ─── Card de case ──────────────────────────────────────────────────────────────

interface CaseCardProps {
  c: DiscipleshipCaseWithRelations
  status: CaseStatus
  loading: string | null
  canManage: boolean
  onAssign: () => void
  onContact: () => void
  onPause: () => void
  onResume: () => void
}

function CaseCard({ c, status, loading, canManage, onAssign, onContact, onPause, onResume }: CaseCardProps) {
  const crit = getAttendanceCriticality(c.attendance_rate)
  const days = daysSinceContact(c.last_contact_at)
  const waitDays = status === 'PENDENTE_MATRICULA' ? daysSince(c.welcomed_on ?? c.created_at) : null
  const contactWarning = days === null || days > 30

  return (
    <div className={cn(
      'rounded-lg border bg-white p-3 shadow-sm transition-shadow hover:shadow-md',
      crit === 'critical' && status === 'EM_DISCIPULADO' ? 'border-red-200' : 'border-gray-200'
    )}>
      {/* Nome + alerta de frequência */}
      <div className="mb-1.5 flex items-start justify-between gap-2">
        <Link
          href={`/discipulandos/${c.disciple_id}`}
          className="font-medium text-blue-600 hover:underline text-sm leading-tight"
        >
          {c.disciples?.full_name}
        </Link>
        <div className="flex shrink-0 items-center gap-1">
          {crit === 'critical' && status === 'EM_DISCIPULADO' && (
            <span title="Frequência crítica (<50%)">
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </span>
          )}
          {contactWarning && status !== 'CONCLUIDO' && (
            <span title={days === null ? 'Nunca houve contato' : `Último contato há ${days} dias`}>
              <PhoneCall className="h-4 w-4 text-amber-500" />
            </span>
          )}
        </div>
      </div>

      {/* Responsável */}
      {(c as any).profiles ? (
        <p className="text-xs text-gray-500 mb-1 flex items-center gap-0.5">
          <UserCheck className="h-3 w-3" />
          {(c as any).profiles.name}
        </p>
      ) : (
        <p className="text-xs text-amber-600 mb-1 font-medium">Sem responsável</p>
      )}

      {/* Frequência (Em Discipulado) */}
      {status === 'EM_DISCIPULADO' && (
        <p className={cn(
          'text-xs font-medium mb-1',
          crit === 'ok' ? 'text-green-700' : crit === 'warning' ? 'text-yellow-700' : 'text-red-700'
        )}>
          Freq: {c.attendance_rate.toFixed(0)}%
        </p>
      )}

      {/* Tempo em espera (Pendente de Matrícula) */}
      {status === 'PENDENTE_MATRICULA' && waitDays !== null && (
        <p className={cn(
          'text-xs mb-1 flex items-center gap-0.5',
          waitDays > 14 ? 'text-amber-600 font-medium' : 'text-gray-400'
        )}>
          <Clock className="h-3 w-3" />
          {waitDays === 0 ? 'Acolhido hoje' : `${waitDays}d aguardando matrícula`}
        </p>
      )}

      {/* Último contato */}
      {status !== 'CONCLUIDO' && (
        <p className="text-xs text-gray-400 mb-1.5">
          {days === null
            ? 'Sem contato registrado'
            : days === 0
              ? 'Contato hoje'
              : `Contato há ${days}d`}
        </p>
      )}

      {/* Ações */}
      {canManage && status !== 'CONCLUIDO' && (
        <div className="mt-2 flex flex-wrap gap-1">
          {['PENDENTE_MATRICULA', 'EM_DISCIPULADO', 'PAUSADO'].includes(status) && (
            <button
              onClick={onAssign}
              className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700 hover:bg-gray-200"
            >
              Atribuir
            </button>
          )}
          <button
            onClick={onContact}
            disabled={loading === c.id}
            className="rounded bg-teal-50 px-2 py-0.5 text-xs text-teal-700 hover:bg-teal-100"
          >
            <PhoneCall className="inline h-3 w-3 mr-0.5" />
            Contato
          </button>
          {status === 'EM_DISCIPULADO' && (
            <button
              onClick={onPause}
              disabled={loading === c.id}
              className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700 hover:bg-gray-200"
            >
              <PauseCircle className="inline h-3 w-3 mr-0.5" />
              Pausar
            </button>
          )}
          {status === 'PAUSADO' && (
            <button
              onClick={onResume}
              disabled={loading === c.id}
              className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-700 hover:bg-blue-200"
            >
              <PlayCircle className="inline h-3 w-3 mr-0.5" />
              Retomar
            </button>
          )}
        </div>
      )}
    </div>
  )
}
