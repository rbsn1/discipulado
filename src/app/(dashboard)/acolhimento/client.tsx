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
  X,
} from 'lucide-react'
import type {
  CaseListItem,
  CaseStatus,
  Profile,
  UserRole,
  Disciple,
  ContactOutcome,
} from '@/types'
import { differenceInDays, parseISO } from 'date-fns'

// ─── Constantes ────────────────────────────────────────────────────────────────

// Ordem do funil — usada nos chips de filtro por status (Jornada só trabalha
// status ativos; Concluído não aparece mais aqui, ver acolhimento/page.tsx).
const STATUS_ORDER: CaseStatus[] = ['PENDENTE_MATRICULA', 'EM_DISCIPULADO', 'PAUSADO']

const CONTACT_OUTCOMES: { value: ContactOutcome; label: string }[] = [
  { value: 'ACEITOU_FBV',     label: 'Aceitou participar da FBV'      },
  { value: 'NAO_ACEITOU_FBV', label: 'Não aceitou participar da FBV'  },
  { value: 'CONTATO_ERRADO',  label: 'Contato errado'                 },
  { value: 'NAO_ATENDE',      label: 'Não atende'                     },
  { value: 'NAO_RESPONDE',    label: 'Não responde'                   },
  { value: 'OUTROS',          label: 'Outros'                         },
]

// Limite de linhas visíveis antes de paginar
const PAGE_SIZE = 20

// ─── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  cases: CaseListItem[]
  discipuladores: Profile[]
  disciplesSemCase: Pick<Disciple, 'id' | 'full_name' | 'phone'>[]
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
function casePriority(c: CaseListItem): number {
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
  const [statusFilter, setStatusFilter] = useState<CaseStatus | ''>(
    STATUS_ORDER.includes(initialStatus as CaseStatus) ? (initialStatus as CaseStatus) : ''
  )

  // Paginação da lista (uma fila só, ordenada por prioridade — não mais por coluna)
  const [listLimit, setListLimit]       = useState(PAGE_SIZE)

  // Ações
  const [loading, setLoading]           = useState<string | null>(null)
  const [error, setError]               = useState('')

  // Modal: atribuir responsável
  const [assignCaseId, setAssignCaseId] = useState<string | null>(null)
  const [assignedTo, setAssignedTo]     = useState('')

  // Modal: registrar contato inline
  const [contactCaseId, setContactCaseId] = useState<string | null>(null)
  const [contactOutcome, setContactOutcome] = useState<ContactOutcome>('ACEITOU_FBV')
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

  // Contagem por status pros chips — sempre reflete os filtros de busca/
  // responsável/alerta, mas não o próprio chip de status selecionado (senão
  // clicar num chip zeraria a contagem dos outros).
  const statusCounts = useMemo(() => {
    const counts: Record<CaseStatus, number> = { PENDENTE_MATRICULA: 0, EM_DISCIPULADO: 0, PAUSADO: 0, CONCLUIDO: 0 }
    for (const c of filtered) counts[c.status] = (counts[c.status] ?? 0) + 1
    return counts
  }, [filtered])

  // Fila única, ordenada por urgência (não mais por coluna) — o status vira
  // uma etiqueta na linha, e um chip acima deixa focar num status só.
  const sorted = useMemo(() => {
    const base = statusFilter ? filtered.filter(c => c.status === statusFilter) : filtered
    return [...base].sort((a, b) => casePriority(a) - casePriority(b))
  }, [filtered, statusFilter])

  const visible = sorted.slice(0, listLimit)
  const hasMore = sorted.length > listLimit

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

  const hasActiveFilters = !!search || !!filterDiscipulador || !!initialFilter || !!statusFilter
  function clearFilters() {
    setSearch('')
    setFilterDiscipulador('')
    setStatusFilter('')
    router.push('/acolhimento')
  }

  return (
    <>
      {/* ── Cabeçalho ─────────────────────────────────────────────────────────── */}
      <div className="mb-4 md:mb-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Fila de Acolhimento</h1>
          {currentRole === 'DISCIPULADOR' && (
            <p className="text-xs text-gray-500 mt-0.5">Mostrando seus acolhidos e os que ainda não têm responsável.</p>
          )}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          {/* Busca */}
          <Input
            placeholder="Buscar vida acolhida..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full sm:max-w-xs h-9"
          />

          {/* Filtro por discipulador — some pro Acolhedor, já que a fila dele
              já está restrita a "meus + sem responsável"; filtrar por outro
              acolhedor nunca traria resultado. */}
          {currentRole !== 'DISCIPULADOR' && (
            <select
              value={filterDiscipulador}
              onChange={e => setFilterDiscipulador(e.target.value)}
              className="h-9 w-full sm:w-auto rounded-lg border border-gray-200 bg-white px-3 text-base sm:text-sm text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              aria-label="Filtrar por acolhedor"
            >
              <option value="">Todos os acolhedores</option>
              <option value="__none__">Sem responsável</option>
              {discipuladores.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          )}

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

      {/* ── Chips de status ──────────────────────────────────────────────────────
          Filtro leve, não coluna física — a lista continua uma fila só,
          ordenada por urgência. Clicar de novo no chip ativo desmarca. */}
      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        <button
          onClick={() => setStatusFilter('')}
          className={cn(
            'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
            !statusFilter ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
          )}
        >
          Todos <span className="ml-1 tabular-nums">{filtered.length}</span>
        </button>
        {STATUS_ORDER.map(status => (
          <button
            key={status}
            onClick={() => setStatusFilter(prev => prev === status ? '' : status)}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              statusFilter === status ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
            )}
          >
            {CASE_STATUS_LABEL[status]} <span className="ml-1 tabular-nums">{statusCounts[status]}</span>
          </button>
        ))}
      </div>

      {/* ── Fila ordenada por urgência ───────────────────────────────────────── */}
      <div className="flex flex-col gap-2">
        {visible.length === 0 && (
          <div className="rounded-lg border border-dashed border-gray-200 py-10 text-center text-sm text-gray-400">
            Nenhum caso encontrado
          </div>
        )}

        {visible.map(c => (
          <CaseRow
            key={c.id}
            c={c}
            loading={loading}
            canManage={canManage}
            onAssign={() => { setAssignCaseId(c.id); setAssignedTo(c.assigned_to ?? '') }}
            onContact={() => { setContactCaseId(c.id); setContactOutcome('ACEITOU_FBV'); setContactNote('') }}
            onPause={() => doAction(c.id, 'pause')}
            onResume={() => doAction(c.id, 'resume')}
          />
        ))}

        {hasMore && (
          <button
            onClick={() => setListLimit(prev => prev + PAGE_SIZE)}
            className="mt-1 rounded-lg border border-dashed border-gray-300 py-2 text-xs text-gray-500 hover:bg-gray-50"
          >
            + {sorted.length - listLimit} mais
          </button>
        )}
      </div>

      {/* ── Dialog: atribuir responsável ──────────────────────────────────────── */}
      <Dialog open={!!assignCaseId} onClose={() => setAssignCaseId(null)} title="Atribuir Responsável">
        <div className="flex flex-col gap-4">
          <Select
            label="Acolhedor"
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
            label="Vida Acolhida *"
            value={startDiscipleId}
            onChange={e => setStartDiscipleId(e.target.value)}
            placeholder="Selecionar vida acolhida"
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

// ─── Linha de case ─────────────────────────────────────────────────────────────

interface CaseRowProps {
  c: CaseListItem
  loading: string | null
  canManage: boolean
  onAssign: () => void
  onContact: () => void
  onPause: () => void
  onResume: () => void
}

function CaseRow({ c, loading, canManage, onAssign, onContact, onPause, onResume }: CaseRowProps) {
  const status = c.status
  const crit = getAttendanceCriticality(c.attendance_rate)
  const days = daysSinceContact(c.last_contact_at)
  const waitDays = status === 'PENDENTE_MATRICULA' ? daysSince(c.welcomed_on ?? c.created_at) : null
  const contactWarning = days === null || days > 30

  return (
    <div className={cn(
      'flex flex-col gap-2 rounded-lg border bg-white p-3 shadow-sm transition-shadow hover:shadow-md sm:flex-row sm:items-center sm:justify-between',
      crit === 'critical' && status === 'EM_DISCIPULADO' ? 'border-red-200' : 'border-gray-200'
    )}>
      {/* Nome + status + sinais de urgência + metadados */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <Link
            href={`/discipulandos/${c.disciple_id}`}
            className="font-medium text-blue-600 hover:underline text-sm leading-tight"
          >
            {c.disciples?.full_name}
          </Link>
          <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium', CASE_STATUS_COLOR[status])}>
            {CASE_STATUS_LABEL[status]}
          </span>
          {crit === 'critical' && status === 'EM_DISCIPULADO' && (
            <span title="Frequência crítica (<50%)">
              <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
            </span>
          )}
          {contactWarning && (
            <span title={days === null ? 'Nunca houve contato' : `Último contato há ${days} dias`}>
              <PhoneCall className="h-3.5 w-3.5 text-amber-500" />
            </span>
          )}
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs">
          {(c as any).profiles ? (
            <span className="text-gray-500 flex items-center gap-0.5">
              <UserCheck className="h-3 w-3" />
              {(c as any).profiles.name}
            </span>
          ) : (
            <span className="text-amber-600 font-medium">Sem responsável</span>
          )}

          {status === 'EM_DISCIPULADO' && (
            <span className={cn(
              'font-medium',
              crit === 'ok' ? 'text-green-700' : crit === 'warning' ? 'text-yellow-700' : 'text-red-700'
            )}>
              Freq: {c.attendance_rate.toFixed(0)}%
            </span>
          )}

          {status === 'PENDENTE_MATRICULA' && waitDays !== null && (
            <span className={cn(
              'flex items-center gap-0.5',
              waitDays > 14 ? 'text-amber-600 font-medium' : 'text-gray-400'
            )}>
              <Clock className="h-3 w-3" />
              {waitDays === 0 ? 'Acolhido hoje' : `${waitDays}d aguardando matrícula`}
            </span>
          )}

          <span className="text-gray-400">
            {days === null ? 'Sem contato registrado' : days === 0 ? 'Contato hoje' : `Contato há ${days}d`}
          </span>
        </div>
      </div>

      {/* Ações */}
      {canManage && (
        <div className="flex flex-wrap gap-1 shrink-0">
          <button
            onClick={onAssign}
            className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700 hover:bg-gray-200"
          >
            Atribuir
          </button>
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
