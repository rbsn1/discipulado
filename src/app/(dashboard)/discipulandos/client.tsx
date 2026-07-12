'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Dialog } from '@/components/ui/dialog'
import { DiscipleForm } from '@/components/features/disciples/disciple-form'
import { CASE_STATUS_LABEL, CASE_STATUS_COLOR, formatDate } from '@/lib/utils'
import { Plus, Search, X } from 'lucide-react'
import type { DiscipleListItem, CreateDiscipleInput, WorshipService, Class, Profile, CaseStatus } from '@/types'

interface Props {
  disciples: DiscipleListItem[]
  congregationId: string
  currentUserId: string
  search?: string
  status?: string
  turma?: string
  responsavel?: string
  worshipServices: WorshipService[]
  classes: Class[]
  discipuladores: Profile[]
}

const STATUS_OPTIONS: { value: CaseStatus | 'SEM_CASE'; label: string }[] = [
  { value: 'SEM_CASE', label: 'Sem case' },
  ...(Object.keys(CASE_STATUS_LABEL) as CaseStatus[]).map(s => ({ value: s, label: CASE_STATUS_LABEL[s] })),
]

export function DisciplesClientPage({
  disciples,
  congregationId,
  currentUserId,
  search,
  status,
  turma,
  responsavel,
  worshipServices,
  classes,
  discipuladores,
}: Props) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [searchValue, setSearchValue] = useState(search ?? '')

  async function handleCreate(data: CreateDiscipleInput) {
    const res = await fetch('/api/disciples', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, congregation_id: congregationId }),
    })
    if (!res.ok) {
      const err = await res.json()
      return { error: err.error ?? 'Erro ao cadastrar discipulando' }
    }
    setShowForm(false)
    router.refresh()
  }

  function applyFilters(overrides: Record<string, string | undefined>) {
    const next = { search: searchValue, status, turma, responsavel, ...overrides }
    const params = new URLSearchParams()
    if (next.search) params.set('search', next.search)
    if (next.status) params.set('status', next.status)
    if (next.turma) params.set('turma', next.turma)
    if (next.responsavel) params.set('responsavel', next.responsavel)
    router.push(`/discipulandos?${params.toString()}`)
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    applyFilters({})
  }

  const hasFilters = Boolean(status || turma || responsavel)

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Discipulandos</h1>
          <p className="text-sm text-gray-500 mt-1">{disciples.length} registro(s) encontrado(s)</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4" />
          Novo discipulando
        </Button>
      </div>

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
          value={status ?? ''}
          onChange={e => applyFilters({ status: e.target.value || undefined })}
          placeholder="Status"
          options={STATUS_OPTIONS}
          className="sm:w-40"
        />
        <Select
          value={turma ?? ''}
          onChange={e => applyFilters({ turma: e.target.value || undefined })}
          placeholder="Turma"
          options={classes.map(c => ({ value: c.id, label: c.name }))}
          className="sm:w-40"
        />
        <Select
          value={responsavel ?? ''}
          onChange={e => applyFilters({ responsavel: e.target.value || undefined })}
          placeholder="Responsável"
          options={discipuladores.map(d => ({ value: d.id, label: d.name }))}
          className="sm:w-40"
        />
        {hasFilters && (
          <Button variant="outline" onClick={() => applyFilters({ status: undefined, turma: undefined, responsavel: undefined })}>
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
              <th className="px-4 py-3 text-left font-medium text-gray-600">Origem</th>
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
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                  Nenhum discipulando encontrado
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
                  <td className="px-4 py-3 text-gray-600">{d.origin ?? '—'}</td>
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

      <Dialog open={showForm} onClose={() => setShowForm(false)} title="Novo Discipulando">
        <DiscipleForm
          worshipServices={worshipServices}
          onSubmit={handleCreate}
          onCancel={() => setShowForm(false)}
        />
      </Dialog>
    </>
  )
}
