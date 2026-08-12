'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Dialog } from '@/components/ui/dialog'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { formatDate, cn } from '@/lib/utils'
import { startPostDiscipleship, updatePostDiscipleship, confirmDepartmentContact } from '@/lib/actions/post-discipleship'
import { Edit2, CheckCircle2, Clock, AlertCircle, Phone, Search } from 'lucide-react'
import type { Profile, IntegrationStatus, BaptismStatus, Department } from '@/types'
import { isAfter, isBefore, parseISO, startOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns'

type Period = '' | 'semana' | 'mes' | 'ano'

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: 'semana', label: 'Semana' },
  { value: 'mes', label: 'Mês' },
  { value: 'ano', label: 'Ano' },
]

const BAPTISM_OPTIONS = [
  { value: 'NAO_BATIZADO', label: 'Não Batizado' },
  { value: 'AGENDADO',     label: 'Agendado' },
  { value: 'BATIZADO',     label: 'Batizado' },
]

interface PostDiscipleshipData {
  integration_status: IntegrationStatus
  baptism_status: BaptismStatus
  department_id: string | null
  departments: { id: string; name: string } | null
  notes: string | null
  department_contacted_at: string | null
  department_contacted_by: string | null
}

interface CaseData {
  id: string
  disciples: { id: string; full_name: string; phone?: string }
  profiles: { id: string; name: string } | null
  post_discipleship: PostDiscipleshipData | null
  stage: string
  updated_at: string
}

interface Props {
  cases: CaseData[]
  departments: Department[]
  currentProfile: Profile
}

type Bucket = 'sem_departamento' | 'aguardando_confirmacao' | 'confirmado'

function getBucket(c: CaseData): Bucket {
  const pd = c.post_discipleship
  if (!pd || !pd.department_id) return 'sem_departamento'
  if (!pd.department_contacted_at) return 'aguardando_confirmacao'
  return 'confirmado'
}

function BucketHeader({
  icon: Icon,
  label,
  count,
  color,
}: {
  icon: React.ElementType
  label: string
  count: number
  color: string
}) {
  return (
    <div className={cn('flex items-center gap-2 rounded-lg px-4 py-3 mb-3', color)}>
      <Icon className="h-4 w-4" />
      <span className="font-semibold text-sm">{label}</span>
      <span className="ml-auto text-sm font-bold">{count}</span>
    </div>
  )
}

export function PosDiscipuladoClient({ cases, departments, currentProfile }: Props) {
  const router = useRouter()
  const [editCase, setEditCase] = useState<CaseData | null>(null)
  const [baptism, setBaptism] = useState<BaptismStatus>('NAO_BATIZADO')
  const [department, setDepartment] = useState('')
  const [posNotes, setPosNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [confirmSearch, setConfirmSearch] = useState('')
  const [confirmPeriod, setConfirmPeriod] = useState<Period>('')

  const canEdit = ['ADMIN_DISCIPULADO', 'DISCIPULADOR', 'SECRETARIA_DISCIPULADO', 'SM_DISCIPULADO', 'ADMIN_PLATAFORMA'].includes(currentProfile.role)

  const semDepartamento    = cases.filter(c => getBucket(c) === 'sem_departamento')
  const aguardandoConfirm  = cases.filter(c => getBucket(c) === 'aguardando_confirmacao')
  const confirmados        = cases.filter(c => getBucket(c) === 'confirmado')

  // ── "Confirmados" some da tela por padrão (já foi resolvido) — busca por
  // nome/departamento ou filtro de período (baseado na data de confirmação)
  // trazem de volta, mesmo padrão já usado em Boas-vindas e Aulas.
  const today = startOfDay(new Date())
  const confirmPeriodStart =
    confirmPeriod === 'semana' ? startOfWeek(today, { weekStartsOn: 1 }) :
    confirmPeriod === 'mes'    ? startOfMonth(today) :
    confirmPeriod === 'ano'    ? startOfYear(today) :
    null
  const confirmPeriodEnd =
    confirmPeriod === 'semana' ? endOfWeek(today, { weekStartsOn: 1 }) :
    confirmPeriod === 'mes'    ? endOfMonth(today) :
    confirmPeriod === 'ano'    ? endOfYear(today) :
    null

  const isFilteringConfirmados = confirmSearch.trim().length > 0 || confirmPeriod !== ''
  const visibleConfirmados = isFilteringConfirmados
    ? confirmados.filter(c => {
        const s = confirmSearch.trim().toLowerCase()
        const matchesSearch = !s ||
          c.disciples?.full_name?.toLowerCase().includes(s) ||
          (c.post_discipleship?.departments?.name ?? '').toLowerCase().includes(s)
        const contactedAt = c.post_discipleship?.department_contacted_at
        const contactDate = contactedAt ? parseISO(contactedAt) : null
        const matchesPeriod = !confirmPeriodStart || !confirmPeriodEnd ||
          (!!contactDate && !isBefore(contactDate, confirmPeriodStart) && !isAfter(contactDate, confirmPeriodEnd))
        return matchesSearch && matchesPeriod
      })
    : []

  function openEdit(c: CaseData) {
    setEditCase(c)
    setBaptism(c.post_discipleship?.baptism_status ?? 'NAO_BATIZADO')
    setDepartment(c.post_discipleship?.department_id ?? '')
    setPosNotes(c.post_discipleship?.notes ?? '')
    setError('')
  }

  async function handleSave() {
    if (!editCase) return
    setLoading(true)
    setError('')

    if (!editCase.post_discipleship) {
      const r = await startPostDiscipleship(editCase.id)
      if (r?.error) { setError(r.error); setLoading(false); return }
    }

    const status: IntegrationStatus = department ? 'EM_ANDAMENTO' : 'PENDENTE'
    const r = await updatePostDiscipleship(editCase.id, status, baptism, department || undefined, posNotes || undefined)
    if (r?.error) setError(r.error)
    else { setEditCase(null); router.refresh() }
    setLoading(false)
  }

  async function handleConfirm(caseId: string) {
    setConfirmingId(caseId)
    const r = await confirmDepartmentContact(caseId)
    if (r?.error) setError(r.error)
    else router.refresh()
    setConfirmingId(null)
  }

  function renderRow(c: CaseData, showConfirm = false) {
    const pd = c.post_discipleship
    return (
      <div key={c.id} className="flex items-center gap-4 rounded-lg border border-gray-100 bg-white px-4 py-3">
        <div className="flex-1 min-w-0">
          <Link href={`/discipulandos/${c.disciples?.id}`} className="font-medium text-blue-600 hover:underline text-sm">
            {c.disciples?.full_name}
          </Link>
          <div className="flex items-center gap-3 mt-0.5">
            {c.profiles && <span className="text-xs text-gray-400">{c.profiles.name}</span>}
            {c.disciples?.phone && <span className="text-xs text-gray-400">{c.disciples.phone}</span>}
          </div>
        </div>

        {pd?.departments?.name && (
          <span className="text-xs text-gray-600 bg-gray-100 rounded-full px-2.5 py-1 shrink-0">
            {pd.departments.name}
          </span>
        )}

        {pd?.baptism_status && pd.baptism_status !== 'NAO_BATIZADO' && (
          <Badge variant={pd.baptism_status === 'BATIZADO' ? 'success' : 'default'}>
            {pd.baptism_status === 'BATIZADO' ? 'Batizado' : 'Batismo agendado'}
          </Badge>
        )}

        {pd?.department_contacted_at && (
          <span className="text-xs text-gray-400 shrink-0">
            Confirmado {formatDate(pd.department_contacted_at)}
          </span>
        )}

        <div className="flex items-center gap-2 shrink-0">
          {showConfirm && canEdit && (
            <Button
              size="sm"
              onClick={() => handleConfirm(c.id)}
              loading={confirmingId === c.id}
            >
              <Phone className="h-3.5 w-3.5" />
              Confirmar contato
            </Button>
          )}
          {canEdit && (
            <Button size="sm" variant="outline" onClick={() => openEdit(c)}>
              <Edit2 className="h-3.5 w-3.5" />
              {pd ? 'Editar' : 'Direcionar'}
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Integração</h1>
          <p className="text-sm text-gray-500 mt-1">{cases.length} pessoa(s) concluíram o discipulado</p>
        </div>
      </div>

      {error && <Alert type="error" className="mb-4">{error}</Alert>}

      {cases.length === 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-10 text-center text-gray-400 text-sm">
          Nenhuma vida acolhida concluída ainda
        </div>
      )}

      {cases.length > 0 && (
        <div className="flex flex-col gap-6">
          {/* Sem departamento */}
          <section>
            <BucketHeader
              icon={AlertCircle}
              label="Sem departamento definido"
              count={semDepartamento.length}
              color="bg-orange-50 text-orange-700"
            />
            {semDepartamento.length === 0
              ? <p className="text-xs text-gray-400 pl-1">Nenhum</p>
              : <div className="flex flex-col gap-2">{semDepartamento.map(c => renderRow(c))}</div>
            }
          </section>

          {/* Aguardando confirmação */}
          <section>
            <BucketHeader
              icon={Clock}
              label="Aguardando confirmação do departamento"
              count={aguardandoConfirm.length}
              color="bg-blue-50 text-blue-700"
            />
            {aguardandoConfirm.length === 0
              ? <p className="text-xs text-gray-400 pl-1">Nenhum</p>
              : <div className="flex flex-col gap-2">{aguardandoConfirm.map(c => renderRow(c, true))}</div>
            }
          </section>

          {/* Confirmados */}
          <section>
            <BucketHeader
              icon={CheckCircle2}
              label="Departamento confirmou contato"
              count={confirmados.length}
              color="bg-green-50 text-green-700"
            />
            {confirmados.length > 0 && (
              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="relative max-w-xs w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    value={confirmSearch}
                    onChange={e => setConfirmSearch(e.target.value)}
                    placeholder="Buscar por nome ou departamento..."
                    className="h-9 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-base sm:text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  {PERIOD_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setConfirmPeriod(p => p === opt.value ? '' : opt.value)}
                      className={cn(
                        'h-9 rounded-lg border px-3 text-sm font-medium transition-colors',
                        confirmPeriod === opt.value
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                          : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {confirmados.length === 0
              ? <p className="text-xs text-gray-400 pl-1">Nenhum</p>
              : isFilteringConfirmados
                ? (visibleConfirmados.length === 0
                    ? <p className="text-xs text-gray-400 pl-1">Nenhum encontrado</p>
                    : <div className="flex flex-col gap-2">{visibleConfirmados.map(c => renderRow(c))}</div>)
                : <p className="text-xs text-gray-400 pl-1">Busque por nome/departamento ou filtre por período pra ver quem já foi confirmado.</p>
            }
          </section>
        </div>
      )}

      {/* Dialog de edição / direcionamento */}
      <Dialog open={!!editCase} onClose={() => setEditCase(null)} title="Direcionar para departamento">
        {editCase && (
          <div className="flex flex-col gap-4">
            {error && <Alert type="error">{error}</Alert>}
            <p className="font-medium text-gray-900">{editCase.disciples?.full_name}</p>

            <Select
              label="Departamento"
              value={department}
              onChange={e => setDepartment(e.target.value)}
              placeholder="Nenhum"
              options={departments.map(d => ({ value: d.id, label: d.name }))}
            />
            <Select
              label="Status de Batismo"
              value={baptism}
              onChange={e => setBaptism(e.target.value as BaptismStatus)}
              options={BAPTISM_OPTIONS}
            />
            <Textarea
              label="Observações"
              value={posNotes}
              onChange={e => setPosNotes(e.target.value)}
              placeholder="Alguma observação relevante..."
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditCase(null)}>Cancelar</Button>
              <Button onClick={handleSave} loading={loading}>Salvar</Button>
            </div>
          </div>
        )}
      </Dialog>
    </>
  )
}
