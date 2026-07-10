'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog } from '@/components/ui/dialog'
import { DiscipleForm } from '@/components/features/disciples/disciple-form'
import { CASE_STATUS_LABEL, CASE_STATUS_COLOR, formatDate } from '@/lib/utils'
import { Plus, Search } from 'lucide-react'
import type { DiscipleWithCase, CreateDiscipleInput, WorshipService } from '@/types'

interface Props {
  disciples: DiscipleWithCase[]
  congregationId: string
  currentUserId: string
  search?: string
  worshipServices: WorshipService[]
}

export function DisciplesClientPage({ disciples, congregationId, currentUserId, search, worshipServices }: Props) {
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

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const params = new URLSearchParams()
    if (searchValue) params.set('search', searchValue)
    router.push(`/discipulandos?${params.toString()}`)
  }

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

      <form onSubmit={handleSearch} className="mb-4 flex gap-2">
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

      <div className="rounded-lg border border-gray-200 bg-white overflow-x-auto">
        <table className="w-full text-sm min-w-[560px]">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-4 py-3 text-left font-medium text-gray-600">Nome</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Telefone</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Origem</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Culto</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Cadastro</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {disciples.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  Nenhum discipulando encontrado
                </td>
              </tr>
            )}
            {disciples.map(d => {
              const activeCase = d.discipleship_cases?.[0]
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
