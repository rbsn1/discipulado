'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Dialog } from '@/components/ui/dialog'
import { DiscipleForm } from '@/components/features/disciples/disciple-form'
import { CASE_STATUS_LABEL, CASE_STATUS_COLOR, formatDate, cn } from '@/lib/utils'
import { Plus, Search, X, CalendarDays, Church } from 'lucide-react'
import type { DiscipleListItem, CreateDiscipleInput, WorshipService, Profile, CaseStatus, UserRole } from '@/types'

interface Props {
  disciples: DiscipleListItem[]
  congregationId: string
  currentUserId: string
  currentRole: UserRole
  search?: string
  status?: string
  culto?: string
  worshipServices: WorshipService[]
  discipuladores: Profile[]
}

function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const STATUS_OPTIONS: { value: CaseStatus | 'SEM_CASE'; label: string }[] = [
  { value: 'SEM_CASE', label: 'Sem case' },
  ...(Object.keys(CASE_STATUS_LABEL) as CaseStatus[]).map(s => ({ value: s, label: CASE_STATUS_LABEL[s] })),
]

export function DisciplesClientPage({
  disciples,
  congregationId,
  currentUserId,
  currentRole,
  search,
  status,
  culto,
  worshipServices,
  discipuladores,
}: Props) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [searchValue, setSearchValue] = useState(search ?? '')
  const [cultoDate, setCultoDate] = useState('')

  async function handleCreate(data: CreateDiscipleInput) {
    const res = await fetch('/api/disciples', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, congregation_id: congregationId }),
    })
    if (!res.ok) {
      const err = await res.json()
      return { error: err.error ?? 'Erro ao cadastrar vida acolhida' }
    }
    setShowForm(false)
    router.refresh()
  }

  function applyFilters(overrides: Record<string, string | undefined>) {
    const next = { search: searchValue, status, culto, ...overrides }
    const params = new URLSearchParams()
    if (next.search) params.set('search', next.search)
    if (next.status) params.set('status', next.status)
    if (next.culto) params.set('culto', next.culto)
    router.push(`/discipulandos?${params.toString()}`)
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    applyFilters({})
  }

  const hasFilters = Boolean(status || culto)

  // Quantas vidas acolhidas (da lista atual, já com os filtros aplicados)
  // vieram de cada culto — pra quem responde por um culto conseguir prestar
  // contas sem precisar contar linha por linha na tabela. Cultos sem
  // ninguém ainda aparecem com 0, não somem da lista.
  //
  // Sem data selecionada mostra o total acumulado; com data, filtra por
  // welcomed_on (data em que a vida foi de fato acolhida, não a data de
  // cadastro no sistema) — é isso que a liderança precisa prestar contas
  // por dia de culto, não o total geral desde sempre.
  const cultoStats = useMemo(() => {
    const base = cultoDate
      ? disciples.filter(d => d.discipleship_cases?.[0]?.welcomed_on === cultoDate)
      : disciples

    const counts = new Map<string, number>()
    worshipServices.forEach(w => counts.set(w.name, 0))
    let semCulto = 0
    base.forEach(d => {
      const name = d.worship_services?.name
      if (name) counts.set(name, (counts.get(name) ?? 0) + 1)
      else semCulto++
    })
    const entries = [...counts.entries()].map(([name, count]) => ({ name, count }))
    if (semCulto > 0) entries.push({ name: 'Não informado', count: semCulto })
    return entries
  }, [disciples, worshipServices, cultoDate])

  const cultoTotal = cultoStats.reduce((sum, c) => sum + c.count, 0)
  const isToday = cultoDate === todayISO()

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vidas Acolhidas</h1>
          <p className="text-sm text-gray-500 mt-1">{disciples.length} registro(s) encontrado(s)</p>
          {currentRole === 'DISCIPULADOR' && (
            <p className="text-xs text-gray-500 mt-0.5">Mostrando suas vidas acolhidas e as que ainda não têm responsável.</p>
          )}
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4" />
          Nova vida
        </Button>
      </div>

      {cultoStats.length > 0 && (
        <div className="mb-6 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50">
                  <Church className="h-4 w-4 text-indigo-600" />
                </span>
                Vidas acolhidas por culto
                <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700">
                  {cultoTotal} {cultoTotal === 1 ? 'vida' : 'vidas'}
                </span>
              </p>
              <p className="mt-1.5 text-xs text-gray-500">
                {cultoDate
                  ? <>Prestação de contas de <strong className="text-gray-700">{formatDate(cultoDate)}</strong></>
                  : 'Total acumulado — escolha um dia abaixo pra prestação de contas do culto'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <CalendarDays className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                <input
                  type="date"
                  value={cultoDate}
                  onChange={e => setCultoDate(e.target.value)}
                  className="h-9 rounded-lg border border-gray-200 bg-white pl-8 pr-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
              <button
                type="button"
                onClick={() => setCultoDate(todayISO())}
                className={cn(
                  'h-9 rounded-lg border px-3 text-sm font-medium transition-colors',
                  isToday
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                )}
              >
                Hoje
              </button>
              {cultoDate && (
                <button
                  type="button"
                  onClick={() => setCultoDate('')}
                  className="flex h-9 items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-600 hover:bg-gray-50"
                >
                  <X className="h-3.5 w-3.5" />
                  Total geral
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {cultoStats.map(({ name, count }) => {
              const isUnspecified = name === 'Não informado'
              const hasPeople = count > 0
              return (
                <div
                  key={name}
                  className={cn(
                    'rounded-xl border p-4 text-center transition-colors',
                    isUnspecified
                      ? 'border-dashed border-gray-200 bg-gray-50'
                      : hasPeople
                        ? 'border-indigo-100 bg-indigo-50/50'
                        : 'border-gray-100 bg-gray-50/50'
                  )}
                >
                  <p className={cn(
                    'text-3xl font-bold tabular-nums',
                    isUnspecified ? 'text-gray-400' : hasPeople ? 'text-indigo-700' : 'text-gray-300'
                  )}>
                    {count}
                  </p>
                  <p className="mt-1 truncate text-xs font-medium text-gray-600" title={name}>
                    {name}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <form onSubmit={handleSearch} className="flex flex-1 gap-2">
          <div className="flex-1">
            <Input
              placeholder="Buscar por nome ou telefone..."
              value={searchValue}
              onChange={e => setSearchValue(e.target.value)}
            />
          </div>
          <Button type="submit" variant="outline">
            <Search className="h-4 w-4" />
          </Button>
        </form>

        <Select
          value={culto ?? ''}
          onChange={e => applyFilters({ culto: e.target.value || undefined })}
          placeholder="Culto"
          options={worshipServices.map(w => ({ value: w.id, label: w.name }))}
          className="sm:w-40"
        />
        <Select
          value={status ?? ''}
          onChange={e => applyFilters({ status: e.target.value || undefined })}
          placeholder="Status"
          options={STATUS_OPTIONS}
          className="sm:w-40"
        />
        {hasFilters && (
          <Button variant="outline" onClick={() => applyFilters({ status: undefined, culto: undefined })}>
            <X className="h-4 w-4" />
            Limpar
          </Button>
        )}
      </div>

      <div className="rounded-lg border border-gray-200 bg-white overflow-x-auto">
        <table className="w-full text-sm min-w-[880px]">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-4 py-3 text-left font-medium text-gray-600">Nome</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Telefone</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Culto</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Turma</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Responsável</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Cadastro</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {disciples.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  Nenhuma vida acolhida encontrada
                </td>
              </tr>
            )}
            {disciples.map(d => {
              const activeCase = d.discipleship_cases?.[0]
              const turmaAtiva = d.class_enrollments?.find(e => e.active)?.classes
              return (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">
                    <Link href={`/discipulandos/${d.id}`} className="text-blue-600 hover:underline">
                      {d.full_name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{d.phone ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{d.worship_services?.name ?? '—'}</td>
                  <td className="px-4 py-3">
                    {activeCase ? (
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${CASE_STATUS_COLOR[activeCase.status]}`}>
                        {CASE_STATUS_LABEL[activeCase.status]}
                      </span>
                    ) : (
                      <span className="text-gray-400">Sem case</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{turmaAtiva?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{activeCase?.profiles?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{formatDate(d.created_at)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <Dialog open={showForm} onClose={() => setShowForm(false)} title="Nova Vida">
        <DiscipleForm
          worshipServices={worshipServices}
          acolhedores={discipuladores}
          onSubmit={handleCreate}
          onCancel={() => setShowForm(false)}
        />
      </Dialog>
    </>
  )
}
