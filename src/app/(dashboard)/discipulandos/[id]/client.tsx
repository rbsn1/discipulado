'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { Alert } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { DiscipleForm } from '@/components/features/disciples/disciple-form'
import {
  CASE_STATUS_LABEL,
  CASE_STATUS_COLOR,
  CASE_STAGE_LABEL,
  MODULE_STATUS_LABEL,
  MODULE_STATUS_COLOR,
  ATTENDANCE_COLOR,
  ATTENDANCE_LABEL,
  formatDate,
  formatDateTime,
  getAttendanceCriticality,
  cn,
} from '@/lib/utils'
import {
  User,
  Phone,
  Mail,
  Calendar,
  MapPin,
  Edit2,
  PlayCircle,
  PauseCircle,
  CheckCircle2,
  Clock,
  PhoneCall,
  BookOpen,
  ChevronRight,
  AlertCircle,
} from 'lucide-react'
import type {
  Disciple,
  DiscipleshipCaseWithRelations,
  CaseEvent,
  Profile,
  Class,
  CreateDiscipleInput,
  ContactOutcome,
} from '@/types'

interface Props {
  disciple: Disciple & { congregation_id: string; class_enrollments?: { id: string; active: boolean; class_id: string; classes: { id: string; name: string; shift: string } | null }[] }
  activeCase: DiscipleshipCaseWithRelations | null
  timeline: CaseEvent[]
  discipuladores: Profile[]
  classes: Class[]
  currentProfile: Profile
  hasAttendedConfraternizacao: boolean
  preferredShift: string | null
}

const CONTACT_OUTCOMES: { value: ContactOutcome; label: string }[] = [
  { value: 'ATENDEU', label: 'Atendeu' },
  { value: 'NAO_ATENDEU', label: 'Não atendeu' },
  { value: 'MENSAGEM_ENVIADA', label: 'Mensagem enviada' },
  { value: 'VISITA_REALIZADA', label: 'Visita realizada' },
]

const MODULE_STATUS_OPTIONS = [
  { value: 'NAO_INICIADO', label: 'Não Iniciado' },
  { value: 'EM_ANDAMENTO', label: 'Em Andamento' },
  { value: 'CONCLUIDO', label: 'Concluído' },
]

export function DiscipleDetailClient({
  disciple,
  activeCase,
  timeline,
  discipuladores,
  classes,
  currentProfile,
  hasAttendedConfraternizacao,
  preferredShift,
}: Props) {
  const router = useRouter()
  const [editDisciple, setEditDisciple] = useState(false)
  const [startCaseModal, setStartCaseModal] = useState(false)
  const [enrollModal, setEnrollModal] = useState(false)
  const [contactModal, setContactModal] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Start case form
  const [assignedTo, setAssignedTo] = useState('')
  const [welcomedOn, setWelcomedOn] = useState('')
  const [caseNotes, setCaseNotes] = useState('')

  // Enroll form
  const [selectedClass, setSelectedClass] = useState('')

  // Contact form
  const [contactOutcome, setContactOutcome] = useState<ContactOutcome>('ATENDEU')
  const [contactNote, setContactNote] = useState('')

  const canEdit = ['ADMIN_DISCIPULADO', 'DISCIPULADOR', 'SECRETARIA_DISCIPULADO', 'SM_DISCIPULADO', 'ADMIN_PLATAFORMA'].includes(currentProfile.role)
  const canManageCase = ['ADMIN_DISCIPULADO', 'DISCIPULADOR', 'SM_DISCIPULADO', 'ADMIN_PLATAFORMA'].includes(currentProfile.role)

  async function call(url: string, method: string, body?: Record<string, unknown>) {
    setLoading(true)
    setError('')
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) {
      setError(data.error ?? 'Erro')
      return false
    }
    router.refresh()
    return true
  }

  async function handleUpdateDisciple(input: CreateDiscipleInput) {
    const ok = await call(`/api/disciples/${disciple.id}`, 'PATCH', input as unknown as Record<string, unknown>)
    if (ok) setEditDisciple(false)
  }

  async function handleStartCase() {
    const ok = await call('/api/cases', 'POST', {
      disciple_id: disciple.id,
      assigned_to: assignedTo || null,
      welcomed_on: welcomedOn || null,
      notes: caseNotes || null,
    })
    if (ok) setStartCaseModal(false)
  }

  async function handleEnroll() {
    if (!selectedClass || !activeCase) return
    const ok = await call('/api/classes/enroll', 'POST', {
      disciple_id: disciple.id,
      class_id: selectedClass,
      case_id: activeCase.id,
    })
    if (ok) setEnrollModal(false)
  }

  async function handleContact() {
    if (!activeCase) return
    const ok = await call(`/api/cases/${activeCase.id}/contacts`, 'POST', {
      outcome: contactOutcome,
      note: contactNote || null,
    })
    if (ok) { setContactModal(false); setContactNote('') }
  }

  async function handleModuleStatus(moduleTemplateId: string, status: string) {
    if (!activeCase) return
    await call(`/api/cases/${activeCase.id}/modules`, 'PATCH', {
      module_template_id: moduleTemplateId,
      status,
    })
  }

  async function handleConclude() {
    if (!activeCase) return
    if (!confirm('Confirmar conclusão do discipulado?')) return
    await call(`/api/cases/${activeCase.id}/conclude`, 'POST')
  }

  async function handlePause() {
    if (!activeCase) return
    await call(`/api/cases/${activeCase.id}/pause`, 'POST')
  }

  async function handleResume() {
    if (!activeCase) return
    await call(`/api/cases/${activeCase.id}/resume`, 'POST')
  }

  const crit = activeCase ? getAttendanceCriticality(activeCase.attendance_rate) : null
  const modules = (activeCase as any)?.case_module_progress ?? []

  const allModulesDone = modules.length > 0 && modules.every((m: any) => m.status === 'CONCLUIDO')
  const hasAttendance = (activeCase?.total_lessons ?? 0) > 0
  const freqOk = (activeCase?.attendance_rate ?? 0) >= 75
  const canConclude = allModulesDone && hasAttendance && freqOk

  return (
    <>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Link href="/discipulandos" className="hover:underline">Discipulandos</Link>
            <ChevronRight className="h-4 w-4" />
            <span>{disciple.full_name}</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{disciple.full_name}</h1>
          {activeCase && (
            <div className="flex items-center gap-2 mt-1">
              <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', CASE_STATUS_COLOR[activeCase.status])}>
                {CASE_STATUS_LABEL[activeCase.status]}
              </span>
              <span className="text-xs text-gray-500">{CASE_STAGE_LABEL[activeCase.stage]}</span>
            </div>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          {canEdit && (
            <Button variant="outline" size="sm" onClick={() => setEditDisciple(true)}>
              <Edit2 className="h-4 w-4" />
              Editar
            </Button>
          )}
          {!activeCase && canManageCase && (
            <Button size="sm" onClick={() => setStartCaseModal(true)}>
              <PlayCircle className="h-4 w-4" />
              Iniciar acolhimento
            </Button>
          )}
          {activeCase && canManageCase && activeCase.status === 'PENDENTE_MATRICULA' && (
            <Button
              size="sm"
              onClick={() => setEnrollModal(true)}
              disabled={!hasAttendedConfraternizacao}
              title={!hasAttendedConfraternizacao ? 'Discipulando precisa participar de uma confraternização primeiro' : ''}
            >
              <BookOpen className="h-4 w-4" />
              Matricular em turma
            </Button>
          )}
          {activeCase && canManageCase && activeCase.status === 'EM_DISCIPULADO' && (
            <Button size="sm" variant="outline" onClick={handlePause}>
              <PauseCircle className="h-4 w-4" />
              Pausar
            </Button>
          )}
          {activeCase && canManageCase && activeCase.status === 'PAUSADO' && (
            <Button size="sm" onClick={handleResume}>
              <PlayCircle className="h-4 w-4" />
              Retomar
            </Button>
          )}
          {activeCase && canManageCase && activeCase.status === 'EM_DISCIPULADO' && (
            <Button
              size="sm"
              variant={canConclude ? 'primary' : 'outline'}
              onClick={handleConclude}
              disabled={!canConclude}
              title={!canConclude ? 'Módulos pendentes, sem chamada ou frequência < 75%' : ''}
            >
              <CheckCircle2 className="h-4 w-4" />
              Concluir
            </Button>
          )}
          {activeCase && (
            <Button size="sm" variant="outline" onClick={() => setContactModal(true)}>
              <PhoneCall className="h-4 w-4" />
              Registrar contato
            </Button>
          )}
        </div>
      </div>

      {error && <Alert type="error" className="mb-4">{error}</Alert>}

      {/* Aviso: aguardando confraternização */}
      {activeCase?.status === 'PENDENTE_MATRICULA' && !hasAttendedConfraternizacao && (
        <Alert type="warning" className="mb-4">
          <AlertCircle className="inline h-4 w-4 mr-1" />
          Aguardando participação em uma confraternização para liberar a matrícula em turma.
        </Alert>
      )}

      {/* Bloqueios para conclusão */}
      {activeCase?.status === 'EM_DISCIPULADO' && !canConclude && (
        <Alert type="warning" className="mb-4">
          Para concluir: {!allModulesDone && 'módulos pendentes; '}
          {!hasAttendance && 'nenhuma chamada registrada; '}
          {!freqOk && `frequência ${activeCase.attendance_rate.toFixed(0)}% abaixo de 75%;`}
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Coluna esquerda */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Dados pessoais */}
          <Card>
            <CardHeader>
              <CardTitle>Dados Pessoais</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <div>
                  <dt className="text-gray-500 flex items-center gap-1"><Phone className="h-3.5 w-3.5" />Telefone</dt>
                  <dd className="font-medium">{disciple.phone ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-gray-500 flex items-center gap-1"><Mail className="h-3.5 w-3.5" />E-mail</dt>
                  <dd className="font-medium">{disciple.email ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-gray-500 flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />Nascimento</dt>
                  <dd className="font-medium">{formatDate(disciple.birth_date)}</dd>
                </div>
                <div>
                  <dt className="text-gray-500 flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />Conversão</dt>
                  <dd className="font-medium">{formatDate(disciple.conversion_date)}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Origem</dt>
                  <dd className="font-medium">{disciple.origin ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-gray-500 flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />Endereço</dt>
                  <dd className="font-medium">{disciple.address ?? '—'}</dd>
                </div>
              </dl>
              {disciple.notes && (
                <div className="mt-3 border-t border-gray-100 pt-3 text-sm text-gray-600">
                  {disciple.notes}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Módulos */}
          {activeCase && modules.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Progresso dos Módulos</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ul className="divide-y divide-gray-100">
                  {modules
                    .sort((a: any, b: any) => (a.module_templates?.sort_order ?? 0) - (b.module_templates?.sort_order ?? 0))
                    .map((m: any) => (
                      <li key={m.module_template_id} className="flex items-center gap-3 px-6 py-3">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{m.module_templates?.title}</p>
                          {m.completed_at && (
                            <p className="text-xs text-gray-500">Concluído em {formatDate(m.completed_at)}</p>
                          )}
                        </div>
                        {canManageCase && activeCase.status !== 'CONCLUIDO' ? (
                          <select
                            value={m.status}
                            onChange={e => handleModuleStatus(m.module_template_id, e.target.value)}
                            className={cn(
                              'rounded-full px-2 py-0.5 text-xs font-medium border-0 cursor-pointer',
                              MODULE_STATUS_COLOR[m.status as keyof typeof MODULE_STATUS_COLOR]
                            )}
                          >
                            {MODULE_STATUS_OPTIONS.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        ) : (
                          <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', MODULE_STATUS_COLOR[m.status as keyof typeof MODULE_STATUS_COLOR])}>
                            {MODULE_STATUS_LABEL[m.status as keyof typeof MODULE_STATUS_LABEL]}
                          </span>
                        )}
                      </li>
                    ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Timeline */}
          {timeline.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Linha do Tempo</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="relative border-l border-gray-200 ml-3">
                  {timeline.map(ev => (
                    <li key={ev.id} className="mb-5 ml-6">
                      <span className="absolute -left-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-blue-100">
                        <Clock className="h-3 w-3 text-blue-600" />
                      </span>
                      <div className="flex items-baseline gap-2">
                        <p className="text-sm font-medium text-gray-900">{ev.description}</p>
                        <time className="text-xs text-gray-400">{formatDateTime(ev.created_at)}</time>
                      </div>
                      {(ev as any).profiles?.name && (
                        <p className="text-xs text-gray-500">por {(ev as any).profiles.name}</p>
                      )}
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Coluna direita */}
        <div className="flex flex-col gap-6">
          {/* Frequência */}
          {activeCase && (
            <Card>
              <CardHeader>
                <CardTitle>Frequência</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center mb-3">
                  <p className={cn(
                    'text-4xl font-bold',
                    crit === 'ok' ? 'text-green-600' : crit === 'warning' ? 'text-yellow-600' : 'text-red-600'
                  )}>
                    {activeCase.attendance_rate.toFixed(0)}%
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {activeCase.present_count} de {activeCase.total_lessons} aulas
                  </p>
                </div>
                <dl className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded bg-green-50 p-2">
                    <dd className="font-bold text-green-700">{activeCase.present_count}</dd>
                    <dt className="text-green-600">Presentes</dt>
                  </div>
                  <div className="rounded bg-yellow-50 p-2">
                    <dd className="font-bold text-yellow-700">{activeCase.justified_count}</dd>
                    <dt className="text-yellow-600">Justificadas</dt>
                  </div>
                  <div className="rounded bg-red-50 p-2">
                    <dd className="font-bold text-red-700">{activeCase.absence_count}</dd>
                    <dt className="text-red-600">Faltas</dt>
                  </div>
                </dl>
              </CardContent>
            </Card>
          )}

          {/* Responsável e turma */}
          {activeCase && (
            <Card>
              <CardHeader><CardTitle>Acompanhamento</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-col gap-2 text-sm">
                  <div>
                    <p className="text-gray-500">Responsável</p>
                    <p className="font-medium">{(activeCase as any).profiles?.name ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Turma</p>
                    <p className="font-medium">
                      {disciple.class_enrollments?.find(e => e.active)?.classes?.name ?? '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Acolhimento</p>
                    <p className="font-medium">{formatDate(activeCase.welcomed_on)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Último contato</p>
                    <p className="font-medium">{formatDateTime(activeCase.last_contact_at)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Modal: editar discipulando */}
      <Dialog open={editDisciple} onClose={() => setEditDisciple(false)} title="Editar Discipulando">
        <DiscipleForm
          defaultValues={disciple}
          onSubmit={async (data) => { await handleUpdateDisciple(data) }}
          onCancel={() => setEditDisciple(false)}
        />
      </Dialog>

      {/* Modal: iniciar acolhimento */}
      <Dialog open={startCaseModal} onClose={() => setStartCaseModal(false)} title="Iniciar Acolhimento">
        <div className="flex flex-col gap-4">
          <Input
            label="Data do acolhimento"
            type="date"
            value={welcomedOn}
            onChange={e => setWelcomedOn(e.target.value)}
          />
          <Select
            label="Responsável"
            placeholder="Selecionar discipulador"
            value={assignedTo}
            onChange={e => setAssignedTo(e.target.value)}
            options={discipuladores.filter(d =>
              ['DISCIPULADOR', 'ADMIN_DISCIPULADO', 'SM_DISCIPULADO'].includes(d.role)
            ).map(d => ({ value: d.id, label: d.name }))}
          />
          <Textarea
            label="Observações"
            value={caseNotes}
            onChange={e => setCaseNotes(e.target.value)}
            placeholder="Informações iniciais..."
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStartCaseModal(false)}>Cancelar</Button>
            <Button onClick={handleStartCase} loading={loading}>Iniciar</Button>
          </div>
        </div>
      </Dialog>

      {/* Modal: matricular em turma */}
      <Dialog open={enrollModal} onClose={() => setEnrollModal(false)} title="Matricular em Turma">
        <div className="flex flex-col gap-4">
          {preferredShift && (
            <div className="rounded-lg bg-indigo-50 px-3 py-2 text-sm text-indigo-800">
              Turno preferido (confraternização): <strong>
                {preferredShift === 'MANHA' ? 'Manhã' : preferredShift === 'TARDE' ? 'Tarde' : preferredShift === 'NOITE' ? 'Noite' : 'Não informado'}
              </strong>
            </div>
          )}
          <Select
            label="Turma"
            placeholder="Selecionar turma"
            value={selectedClass}
            onChange={e => setSelectedClass(e.target.value)}
            options={classes.map(c => ({ value: c.id, label: `${c.name} — ${c.shift === 'MANHA' ? 'Manhã' : c.shift === 'TARDE' ? 'Tarde' : c.shift === 'NOITE' ? 'Noite' : 'Turno não informado'}` }))}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEnrollModal(false)}>Cancelar</Button>
            <Button onClick={handleEnroll} loading={loading} disabled={!selectedClass}>
              Matricular
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Modal: registrar contato */}
      <Dialog open={contactModal} onClose={() => setContactModal(false)} title="Registrar Contato">
        <div className="flex flex-col gap-4">
          <Select
            label="Resultado do contato"
            value={contactOutcome}
            onChange={e => setContactOutcome(e.target.value as ContactOutcome)}
            options={CONTACT_OUTCOMES}
          />
          <Textarea
            label="Observação"
            value={contactNote}
            onChange={e => setContactNote(e.target.value)}
            placeholder="Detalhe o contato..."
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setContactModal(false)}>Cancelar</Button>
            <Button onClick={handleContact} loading={loading}>Registrar</Button>
          </div>
        </div>
      </Dialog>
    </>
  )
}
