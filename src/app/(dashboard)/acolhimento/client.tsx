'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Dialog } from '@/components/ui/dialog'
import { Alert } from '@/components/ui/alert'
import {
  CASE_STATUS_LABEL,
  CASE_STATUS_COLOR,
  SHIFT_LABEL,
  formatDate,
  getAttendanceCriticality,
  cn,
} from '@/lib/utils'
import {
  UserCheck,
  UserX,
  PauseCircle,
  PlayCircle,
  CheckCircle2,
  Phone,
  AlertTriangle,
} from 'lucide-react'
import type { DiscipleshipCaseWithRelations, CaseStatus, Profile, UserRole } from '@/types'

const COLUMNS: { status: CaseStatus; label: string; color: string }[] = [
  { status: 'PENDENTE_MATRICULA', label: 'Pendente de Matrícula', color: 'border-yellow-400' },
  { status: 'EM_DISCIPULADO', label: 'Em Discipulado', color: 'border-blue-500' },
  { status: 'PAUSADO', label: 'Pausado', color: 'border-gray-400' },
  { status: 'CONCLUIDO', label: 'Concluído', color: 'border-green-500' },
]

interface Props {
  cases: DiscipleshipCaseWithRelations[]
  discipuladores: Profile[]
  congregationId: string
  currentUserId: string
  currentRole: UserRole
  initialStatus?: string
  initialFilter?: string
  initialSearch?: string
}

export function AcolhimentoClient({
  cases,
  discipuladores,
  congregationId,
  currentUserId,
  currentRole,
  initialStatus,
  initialFilter,
  initialSearch,
}: Props) {
  const router = useRouter()
  const [search, setSearch] = useState(initialSearch ?? '')
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [assignCaseId, setAssignCaseId] = useState<string | null>(null)
  const [assignedTo, setAssignedTo] = useState('')

  const canManage = ['ADMIN_PLATAFORMA', 'ADMIN_DISCIPULADO', 'SM_DISCIPULADO', 'DISCIPULADOR'].includes(currentRole)

  const filtered = useMemo(() => {
    let result = cases
    if (search) {
      const s = search.toLowerCase()
      result = result.filter(c =>
        c.disciples?.full_name?.toLowerCase().includes(s) ||
        (c.disciples as any)?.phone?.includes(s)
      )
    }
    if (initialFilter === 'sem_responsavel') result = result.filter(c => !c.assigned_to)
    if (initialFilter === 'baixa_frequencia') result = result.filter(c => c.attendance_rate < 75 && c.status === 'EM_DISCIPULADO')
    if (initialFilter === 'sem_contato') {
      const ago = new Date()
      ago.setDate(ago.getDate() - 30)
      result = result.filter(c => !c.last_contact_at || new Date(c.last_contact_at) < ago)
    }
    return result
  }, [cases, search, initialFilter])

  async function doAction(caseId: string, endpoint: string) {
    setLoading(caseId)
    setError('')
    const res = await fetch(`/api/cases/${caseId}/${endpoint}`, { method: 'POST' })
    if (!res.ok) {
      const d = await res.json()
      setError(d.error ?? 'Erro')
    }
    setLoading(null)
    router.refresh()
  }

  async function handleAssign() {
    if (!assignCaseId) return
    setLoading(assignCaseId)
    const res = await fetch(`/api/cases/${assignCaseId}/assign`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assigned_to: assignedTo || null }),
    })
    if (!res.ok) {
      const d = await res.json()
      setError(d.error)
    }
    setAssignCaseId(null)
    setLoading(null)
    router.refresh()
  }

  const byStatus = (status: CaseStatus) =>
    filtered.filter(c => c.status === status)

  return (
    <>
      <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-bold text-gray-900">Fila de Acolhimento</h1>
        <Input
          placeholder="Buscar discipulando..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-xs"
        />
      </div>

      {error && <Alert type="error" className="mb-4">{error}</Alert>}

      {/* Kanban */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {COLUMNS.map(({ status, label, color }) => {
          const colCases = byStatus(status)
          return (
            <div key={status} className="flex flex-col gap-3">
              <div className={`flex items-center justify-between rounded-t-lg border-t-4 bg-white px-3 py-2 shadow-sm ${color}`}>
                <span className="font-semibold text-gray-800">{label}</span>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-bold text-gray-700">
                  {colCases.length}
                </span>
              </div>
              <div className="flex flex-col gap-2 min-h-24">
                {colCases.length === 0 && (
                  <div className="rounded-lg border border-dashed border-gray-200 py-6 text-center text-sm text-gray-400">
                    Nenhum
                  </div>
                )}
                {colCases.map(c => {
                  const crit = getAttendanceCriticality(c.attendance_rate)
                  return (
                    <div key={c.id} className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm hover:shadow-md transition-shadow">
                      <div className="mb-1 flex items-start justify-between gap-2">
                        <Link
                          href={`/discipulandos/${c.disciple_id}`}
                          className="font-medium text-blue-600 hover:underline text-sm leading-tight"
                        >
                          {c.disciples?.full_name}
                        </Link>
                        {crit === 'critical' && status === 'EM_DISCIPULADO' && (
                          <AlertTriangle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
                        )}
                      </div>

                      {(c as any).profiles && (
                        <p className="text-xs text-gray-500 mb-1">
                          <UserCheck className="inline h-3 w-3 mr-0.5" />
                          {(c as any).profiles?.name}
                        </p>
                      )}

                      {status === 'EM_DISCIPULADO' && (
                        <p className={cn(
                          'text-xs font-medium',
                          crit === 'ok' ? 'text-green-700' : crit === 'warning' ? 'text-yellow-700' : 'text-red-700'
                        )}>
                          Freq: {c.attendance_rate.toFixed(0)}%
                        </p>
                      )}

                      {canManage && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {['PENDENTE_MATRICULA', 'EM_DISCIPULADO', 'PAUSADO'].includes(status) && (
                            <button
                              onClick={() => { setAssignCaseId(c.id); setAssignedTo(c.assigned_to ?? '') }}
                              className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700 hover:bg-gray-200"
                            >
                              Atribuir
                            </button>
                          )}
                          {status === 'EM_DISCIPULADO' && (
                            <button
                              onClick={() => doAction(c.id, 'pause')}
                              disabled={loading === c.id}
                              className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700 hover:bg-gray-200"
                            >
                              <PauseCircle className="inline h-3 w-3 mr-0.5" />
                              Pausar
                            </button>
                          )}
                          {status === 'PAUSADO' && (
                            <button
                              onClick={() => doAction(c.id, 'resume')}
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
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Dialog: atribuir responsável */}
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
    </>
  )
}
