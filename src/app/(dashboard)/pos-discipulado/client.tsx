'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Dialog } from '@/components/ui/dialog'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { formatDate, cn } from '@/lib/utils'
import { startPostDiscipleship, updatePostDiscipleship } from '@/lib/actions/post-discipleship'
import { Star, Edit2 } from 'lucide-react'
import type { Profile, IntegrationStatus, BaptismStatus } from '@/types'

const INTEGRATION_OPTIONS = [
  { value: 'PENDENTE', label: 'Pendente' },
  { value: 'EM_ANDAMENTO', label: 'Em Andamento' },
  { value: 'INTEGRADO', label: 'Integrado' },
  { value: 'DESISTIU', label: 'Desistiu' },
]

const BAPTISM_OPTIONS = [
  { value: 'NAO_BATIZADO', label: 'Não Batizado' },
  { value: 'AGENDADO', label: 'Agendado' },
  { value: 'BATIZADO', label: 'Batizado' },
]

const INTEGRATION_COLOR: Record<IntegrationStatus, string> = {
  PENDENTE: 'bg-gray-100 text-gray-700',
  EM_ANDAMENTO: 'bg-blue-100 text-blue-800',
  INTEGRADO: 'bg-green-100 text-green-800',
  DESISTIU: 'bg-red-100 text-red-800',
}

interface CaseData {
  id: string
  disciples: { id: string; full_name: string; phone?: string }
  profiles: { id: string; name: string } | null
  post_discipleship: {
    integration_status: IntegrationStatus
    baptism_status: BaptismStatus
    department_name: string | null
    notes: string | null
  } | null
  stage: string
  updated_at: string
}

interface Props {
  cases: CaseData[]
  currentProfile: Profile
}

export function PosDiscipuladoClient({ cases, currentProfile }: Props) {
  const router = useRouter()
  const [editCase, setEditCase] = useState<CaseData | null>(null)
  const [integration, setIntegration] = useState<IntegrationStatus>('PENDENTE')
  const [baptism, setBaptism] = useState<BaptismStatus>('NAO_BATIZADO')
  const [department, setDepartment] = useState('')
  const [posNotes, setPosNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const canEdit = ['ADMIN_DISCIPULADO', 'DISCIPULADOR', 'SECRETARIA_DISCIPULADO', 'SM_DISCIPULADO', 'ADMIN_PLATAFORMA'].includes(currentProfile.role)

  function openEdit(c: CaseData) {
    setEditCase(c)
    setIntegration(c.post_discipleship?.integration_status ?? 'PENDENTE')
    setBaptism(c.post_discipleship?.baptism_status ?? 'NAO_BATIZADO')
    setDepartment(c.post_discipleship?.department_name ?? '')
    setPosNotes(c.post_discipleship?.notes ?? '')
    setError('')
  }

  async function handleSave() {
    if (!editCase) return
    setLoading(true)
    setError('')

    // Se ainda não tem post_discipleship, iniciar
    if (!editCase.post_discipleship) {
      const r = await startPostDiscipleship(editCase.id)
      if (r?.error) { setError(r.error); setLoading(false); return }
    }

    const r = await updatePostDiscipleship(editCase.id, integration, baptism, department || undefined, posNotes || undefined)
    if (r?.error) setError(r.error)
    else { setEditCase(null); router.refresh() }
    setLoading(false)
  }

  async function handleStart(caseId: string) {
    setLoading(true)
    const r = await startPostDiscipleship(caseId)
    if (r?.error) setError(r.error)
    else router.refresh()
    setLoading(false)
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Pós-Discipulado</h1>
        <p className="text-sm text-gray-500 mt-1">{cases.length} case(s) concluído(s)</p>
      </div>

      {error && <Alert type="error" className="mb-4">{error}</Alert>}

      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-4 py-3 text-left font-medium text-gray-600">Discipulando</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Integração</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Batismo</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Departamento</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {cases.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  Nenhum discipulando concluído ainda
                </td>
              </tr>
            )}
            {cases.map(c => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <Link href={`/discipulandos/${c.disciples?.id}`} className="font-medium text-blue-600 hover:underline">
                    {c.disciples?.full_name}
                  </Link>
                  {c.profiles && (
                    <p className="text-xs text-gray-500">{c.profiles.name}</p>
                  )}
                </td>
                <td className="px-4 py-3">
                  {c.post_discipleship ? (
                    <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', INTEGRATION_COLOR[c.post_discipleship.integration_status])}>
                      {INTEGRATION_OPTIONS.find(o => o.value === c.post_discipleship!.integration_status)?.label}
                    </span>
                  ) : (
                    <span className="text-gray-400 text-xs">Não iniciado</span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-600 text-xs">
                  {c.post_discipleship
                    ? BAPTISM_OPTIONS.find(o => o.value === c.post_discipleship!.baptism_status)?.label
                    : '—'}
                </td>
                <td className="px-4 py-3 text-gray-600 text-xs">
                  {c.post_discipleship?.department_name ?? '—'}
                </td>
                <td className="px-4 py-3 text-right">
                  {canEdit && (
                    <Button size="sm" variant="outline" onClick={() => openEdit(c)}>
                      <Edit2 className="h-3.5 w-3.5" />
                      {c.post_discipleship ? 'Editar' : 'Iniciar'}
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={!!editCase} onClose={() => setEditCase(null)} title="Pós-Discipulado">
        <div className="flex flex-col gap-4">
          {error && <Alert type="error">{error}</Alert>}
          <p className="font-medium text-gray-900">{editCase?.disciples?.full_name}</p>
          <Select
            label="Status de Integração"
            value={integration}
            onChange={e => setIntegration(e.target.value as IntegrationStatus)}
            options={INTEGRATION_OPTIONS}
          />
          <Select
            label="Status de Batismo"
            value={baptism}
            onChange={e => setBaptism(e.target.value as BaptismStatus)}
            options={BAPTISM_OPTIONS}
          />
          <Input
            label="Departamento"
            value={department}
            onChange={e => setDepartment(e.target.value)}
            placeholder="Nome do departamento"
          />
          <Textarea
            label="Observações"
            value={posNotes}
            onChange={e => setPosNotes(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditCase(null)}>Cancelar</Button>
            <Button onClick={handleSave} loading={loading}>Salvar</Button>
          </div>
        </div>
      </Dialog>
    </>
  )
}
