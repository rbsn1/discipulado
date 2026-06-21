'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import { formatDate, downloadCSV, toCSV, SHIFT_LABEL, cn } from '@/lib/utils'
import { ChevronRight, CheckCircle, X, Download } from 'lucide-react'
import type { Profile, DiscipleshipCaseWithRelations, ClassShift } from '@/types'

interface Confirmation {
  id: string
  event_id: string
  case_id: string
  confirmed: boolean
  attended: boolean
  class_shift: ClassShift | null
}

interface Props {
  event: {
    id: string
    title: string
    date: string
    status: string
    notes?: string
    event_confirmations: Array<Confirmation & {
      discipleship_cases: {
        id: string
        disciples: { id: string; full_name: string; phone?: string }
        profiles: { id: string; name: string } | null
      }
    }>
  }
  activeCases: DiscipleshipCaseWithRelations[]
  currentProfile: Profile
}

const SHIFT_OPTIONS = [
  { value: '', label: 'Não informado' },
  { value: 'MANHA', label: 'Manhã' },
  { value: 'TARDE', label: 'Tarde' },
  { value: 'NOITE', label: 'Noite' },
]

export function EventDetailClient({ event, activeCases, currentProfile }: Props) {
  const router = useRouter()
  const [confirmations, setConfirmations] = useState(event.event_confirmations)
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState('')

  const canManage = ['ADMIN_DISCIPULADO', 'DISCIPULADOR', 'SECRETARIA_DISCIPULADO', 'SM_DISCIPULADO', 'ADMIN_PLATAFORMA'].includes(currentProfile.role)
  const canExport = ['ADMIN_DISCIPULADO', 'SECRETARIA_DISCIPULADO', 'SM_DISCIPULADO', 'ADMIN_PLATAFORMA'].includes(currentProfile.role)
  const canUpdateStatus = ['ADMIN_DISCIPULADO', 'ADMIN_PLATAFORMA'].includes(currentProfile.role)

  const confirmedCaseIds = new Set(confirmations.map(c => c.case_id))

  async function toggle(caseId: string, field: 'confirmed' | 'attended', currentValue: boolean, shift?: ClassShift | null) {
    setLoading(caseId + field)
    const existing = confirmations.find(c => c.case_id === caseId)
    const body = {
      case_id: caseId,
      confirmed: field === 'confirmed' ? !currentValue : (existing?.confirmed ?? false),
      attended: field === 'attended' ? !currentValue : (existing?.attended ?? false),
      class_shift: shift ?? existing?.class_shift ?? null,
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

  function exportCSV() {
    const rows = confirmations
      .filter(c => c.confirmed || c.attended)
      .map(c => ({
        'Nome': c.discipleship_cases?.disciples?.full_name ?? '',
        'Telefone': (c.discipleship_cases?.disciples as any)?.phone ?? '',
        'Turno': c.class_shift ? SHIFT_LABEL[c.class_shift] : '',
        'Confirmado': c.confirmed ? 'Sim' : 'Não',
        'Presente': c.attended ? 'Sim' : 'Não',
      }))
    downloadCSV(toCSV(rows, ['Nome', 'Telefone', 'Turno', 'Confirmado', 'Presente']), `confraternizacao-${event.date}.csv`)
  }

  // Cases sem confirmação
  const unconfirmedCases = activeCases.filter(c => !confirmedCaseIds.has(c.id))

  return (
    <>
      <div className="mb-2 flex items-center gap-2 text-sm text-gray-500">
        <Link href="/confraternizacao" className="hover:underline">Confraternização</Link>
        <ChevronRight className="h-4 w-4" />
        <span>{event.title}</span>
      </div>

      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{event.title}</h1>
          <p className="text-sm text-gray-500">{formatDate(event.date)}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {canExport && (
            <Button variant="outline" size="sm" onClick={exportCSV}>
              <Download className="h-4 w-4" />
              Exportar CSV
            </Button>
          )}
        </div>
      </div>

      {error && <Alert type="error" className="mb-4">{error}</Alert>}

      {/* Tabela de confirmados */}
      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden mb-6">
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <p className="font-semibold text-gray-900">
            Confirmações ({confirmations.length})
          </p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="px-4 py-3 text-left text-gray-600 font-medium">Discipulando</th>
              <th className="px-4 py-3 text-left text-gray-600 font-medium">Turno</th>
              <th className="px-4 py-3 text-center text-gray-600 font-medium">Confirmado</th>
              <th className="px-4 py-3 text-center text-gray-600 font-medium">Presente</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {confirmations.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-500">Nenhum confirmado ainda</td></tr>
            )}
            {confirmations.map(c => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-4 py-2.5">
                  <Link href={`/discipulandos/${c.discipleship_cases?.disciples?.id}`} className="text-blue-600 hover:underline">
                    {c.discipleship_cases?.disciples?.full_name}
                  </Link>
                </td>
                <td className="px-4 py-2.5 text-gray-600">
                  {c.class_shift ? SHIFT_LABEL[c.class_shift] : '—'}
                </td>
                <td className="px-4 py-2.5 text-center">
                  {canManage ? (
                    <button onClick={() => toggle(c.case_id, 'confirmed', c.confirmed)}>
                      {c.confirmed
                        ? <CheckCircle className="h-5 w-5 text-green-600 mx-auto" />
                        : <X className="h-5 w-5 text-gray-300 mx-auto" />}
                    </button>
                  ) : (
                    c.confirmed ? <CheckCircle className="h-5 w-5 text-green-600 mx-auto" /> : <X className="h-5 w-5 text-gray-300 mx-auto" />
                  )}
                </td>
                <td className="px-4 py-2.5 text-center">
                  {canManage ? (
                    <button onClick={() => toggle(c.case_id, 'attended', c.attended)}>
                      {c.attended
                        ? <CheckCircle className="h-5 w-5 text-blue-600 mx-auto" />
                        : <X className="h-5 w-5 text-gray-300 mx-auto" />}
                    </button>
                  ) : (
                    c.attended ? <CheckCircle className="h-5 w-5 text-blue-600 mx-auto" /> : <X className="h-5 w-5 text-gray-300 mx-auto" />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Adicionar novos */}
      {canManage && unconfirmedCases.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <p className="font-semibold text-gray-900">Adicionar participante</p>
          </div>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-gray-50">
              {unconfirmedCases.map(c => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5">
                    {c.disciples?.full_name}
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
    </>
  )
}
