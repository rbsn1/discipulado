'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Dialog } from '@/components/ui/dialog'
import { Alert } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ATTENDANCE_LABEL, ATTENDANCE_COLOR, formatDate, cn } from '@/lib/utils'
import { Plus, ChevronRight, CalendarDays, Users, CheckCircle, X, Minus, Search, UserMinus, UserPlus, Pencil, RotateCcw } from 'lucide-react'
import type { Profile, ModuleTemplate, AttendanceStatus, CaseListItem } from '@/types'
import type { ClassJustifiedAbsence } from '@/lib/repositories/classes'
import { isAfter, isBefore, parseISO, startOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns'
import { getAttendanceCriticality } from '@/lib/utils'

interface Enrollment {
  id: string
  disciple_id: string
  active: boolean
  disciples: { id: string; full_name: string; phone?: string; discipleship_cases?: { id: string; status: string; attendance_rate: number; total_lessons: number }[] }
}

interface Lesson {
  id: string
  date: string
  topic: string | null
  module_templates?: { id: string; title: string } | null
  attendance_items?: { id: string; status: AttendanceStatus }[]
}

// Resumo de presença de uma aula + se a chamada está de fato completa —
// "completa" exige que todo mundo do quadro atual da turma tenha status
// marcado, não só que exista 1 registro (isso escondia chamada pela metade).
function getLessonSummary(lesson: Lesson, rosterSize: number) {
  const items = lesson.attendance_items ?? []
  const present = items.filter(i => i.status === 'PRESENTE').length
  const absent = items.filter(i => i.status === 'FALTA').length
  const justified = items.filter(i => i.status === 'JUSTIFICADA').length
  const total = items.length
  const isComplete = rosterSize > 0 && total >= rosterSize
  return { present, absent, justified, total, isComplete }
}

type Period = '' | 'semana' | 'mes' | 'ano'

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: 'semana', label: 'Semana' },
  { value: 'mes', label: 'Mês' },
  { value: 'ano', label: 'Ano' },
]

interface Props {
  turma: {
    id: string
    name: string
    class_shifts: { name: string } | null
    is_active: boolean
    congregation_id: string
    class_enrollments: Enrollment[]
  }
  modules: ModuleTemplate[]
  eligibleCases: CaseListItem[]
  justifiedAbsences: ClassJustifiedAbsence[]
  currentProfile: Profile
}

const ATTENDANCE_ICON: Record<AttendanceStatus, React.ElementType> = {
  PRESENTE: CheckCircle,
  FALTA: X,
  JUSTIFICADA: Minus,
}

const ATTENDANCE_BTN: Record<AttendanceStatus, string> = {
  PRESENTE: 'bg-green-100 text-green-800 border-green-300',
  FALTA: 'bg-red-100 text-red-800 border-red-300',
  JUSTIFICADA: 'bg-yellow-100 text-yellow-800 border-yellow-300',
}

export function TurmaDetailClient({ turma, modules, eligibleCases, justifiedAbsences, currentProfile }: Props) {
  const router = useRouter()
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [lessonLoaded, setLessonLoaded] = useState(false)
  const [activeTab, setActiveTab] = useState<'alunos' | 'aulas' | 'reposicoes'>('alunos')
  const [makeUpLoadingId, setMakeUpLoadingId] = useState<string | null>(null)
  const [showNewLesson, setShowNewLesson] = useState(false)
  const [editLesson, setEditLesson] = useState<Lesson | null>(null)
  const [showAttendance, setShowAttendance] = useState<string | null>(null)
  const [attendanceItems, setAttendanceItems] = useState<Record<string, AttendanceStatus>>({})
  const [attendanceIsNew, setAttendanceIsNew] = useState(true)
  const [attendanceReadOnly, setAttendanceReadOnly] = useState(false)
  const [lessonDate, setLessonDate] = useState('')
  const [lessonTopic, setLessonTopic] = useState('')
  const [lessonModule, setLessonModule] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [lessonSearch, setLessonSearch] = useState('')
  const [lessonPeriod, setLessonPeriod] = useState<Period>('')
  const [unenrollingId, setUnenrollingId] = useState<string | null>(null)
  const [addSearch, setAddSearch] = useState('')
  const [addingId, setAddingId] = useState<string | null>(null)

  const canManage = ['ADMIN_DISCIPULADO', 'DISCIPULADOR', 'ADMIN_PLATAFORMA'].includes(currentProfile.role)
  // Quem chega nessa página (Acolhedor é bloqueado antes, no page.tsx) já pode
  // pelo menos VER a chamada, mesmo sem poder editar — Secretaria e SM
  // Discipulado acompanham a turma mas hoje ficavam sem nenhuma visibilidade.
  const canViewAttendance = ['ADMIN_DISCIPULADO', 'DISCIPULADOR', 'ADMIN_PLATAFORMA', 'SECRETARIA_DISCIPULADO', 'SM_DISCIPULADO'].includes(currentProfile.role)
  // Quem já concluiu o discipulado não conta mais como matriculado — a
  // matrícula em si não é desfeita (class_enrollments.active continua true),
  // só sai da fila de alunos ativos da turma.
  const activeEnrollments = turma.class_enrollments.filter(e =>
    e.active && e.disciples?.discipleship_cases?.[0]?.status !== 'CONCLUIDO'
  )

  const visibleEligible = !addSearch.trim()
    ? eligibleCases
    : eligibleCases.filter(c => {
        const s = addSearch.trim().toLowerCase()
        return c.disciples?.full_name?.toLowerCase().includes(s) || c.disciples?.phone?.includes(s)
      })

  // ── Filtrar aulas por busca (tema) e/ou período / esconder concluídas por padrão ──
  // Aula "concluída" (data já passou E chamada completa — todo mundo do quadro atual
  // marcado, não só alguém) some da lista assim que processada — continua acessível
  // buscando pelo tema ou limitando por semana/mês/ano, que trazem TODAS as aulas
  // (concluídas ou não) dentro do período.

  const today = startOfDay(new Date())
  const lessonPeriodStart =
    lessonPeriod === 'semana' ? startOfWeek(today, { weekStartsOn: 1 }) :
    lessonPeriod === 'mes'    ? startOfMonth(today) :
    lessonPeriod === 'ano'    ? startOfYear(today) :
    null
  const lessonPeriodEnd =
    lessonPeriod === 'semana' ? endOfWeek(today, { weekStartsOn: 1 }) :
    lessonPeriod === 'mes'    ? endOfMonth(today) :
    lessonPeriod === 'ano'    ? endOfYear(today) :
    null

  const isFilteringLessons = lessonSearch.trim().length > 0 || lessonPeriod !== ''
  const visibleLessons = isFilteringLessons
    ? lessons.filter(l => {
        const matchesSearch = !lessonSearch.trim() || (l.topic ?? '').toLowerCase().includes(lessonSearch.trim().toLowerCase())
        const lDate = parseISO(l.date)
        const matchesPeriod = !lessonPeriodStart || !lessonPeriodEnd || (!isBefore(lDate, lessonPeriodStart) && !isAfter(lDate, lessonPeriodEnd))
        return matchesSearch && matchesPeriod
      })
    : lessons.filter(l => !(getLessonSummary(l, activeEnrollments.length).isComplete && isBefore(parseISO(l.date), today)))

  async function loadLessons() {
    if (lessonLoaded) return
    const res = await fetch(`/api/classes/${turma.id}/lessons`)
    if (res.ok) {
      setLessons(await res.json())
      setLessonLoaded(true)
    }
  }

  async function handleTabChange(tab: 'alunos' | 'aulas' | 'reposicoes') {
    setActiveTab(tab)
    if (tab === 'aulas') await loadLessons()
  }

  async function toggleMadeUp(item: ClassJustifiedAbsence) {
    setMakeUpLoadingId(item.id)
    const res = await fetch(`/api/attendance-items/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ made_up: !item.made_up }),
    })
    if (!res.ok) setError((await res.json()).error)
    else router.refresh()
    setMakeUpLoadingId(null)
  }

  async function handleUnenroll(e: Enrollment) {
    const caseId = e.disciples?.discipleship_cases?.[0]?.id
    if (!caseId) return
    if (!confirm(`Desmatricular ${e.disciples.full_name} desta turma?`)) return
    setUnenrollingId(e.id)
    setError('')
    const res = await fetch('/api/classes/enroll', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ disciple_id: e.disciple_id, case_id: caseId }),
    })
    if (!res.ok) setError((await res.json()).error ?? 'Erro ao desmatricular')
    else router.refresh()
    setUnenrollingId(null)
  }

  async function handleAddParticipant(c: CaseListItem) {
    setAddingId(c.id)
    setError('')
    const res = await fetch('/api/classes/enroll', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ disciple_id: c.disciple_id, class_id: turma.id, case_id: c.id }),
    })
    if (!res.ok) setError((await res.json()).error ?? 'Erro ao matricular')
    else router.refresh()
    setAddingId(null)
  }

  function openNewLesson() {
    setEditLesson(null)
    setLessonDate('')
    setLessonTopic('')
    setLessonModule('')
    setError('')
    setShowNewLesson(true)
  }

  function openEditLesson(l: Lesson) {
    setEditLesson(l)
    setLessonDate(l.date)
    setLessonTopic(l.topic ?? '')
    setLessonModule(l.module_templates?.id ?? '')
    setError('')
    setShowNewLesson(true)
  }

  async function handleSaveLesson() {
    if (!lessonDate) { setError('Data obrigatória'); return }
    setLoading(true)
    setError('')
    const body = {
      date: lessonDate,
      topic: lessonTopic || null,
      module_template_id: lessonModule || null,
    }
    const res = await fetch(
      editLesson ? `/api/lessons/${editLesson.id}` : `/api/classes/${turma.id}/lessons`,
      {
        method: editLesson ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    )
    if (!res.ok) {
      setError((await res.json()).error)
    } else {
      const lesson = await res.json()
      setLessons(prev =>
        editLesson
          ? prev.map(l => (l.id === lesson.id ? { ...l, ...lesson } : l))
          : [lesson, ...prev]
      )
      setShowNewLesson(false)
      setEditLesson(null)
      setLessonDate('')
      setLessonTopic('')
      setLessonModule('')
    }
    setLoading(false)
  }

  async function openAttendance(lessonId: string, readOnly = false) {
    setShowAttendance(lessonId)
    setAttendanceReadOnly(readOnly)
    const res = await fetch(`/api/lessons/${lessonId}/attendance`)
    if (res.ok) {
      const existing: Array<{ disciple_id: string; status: AttendanceStatus }> = await res.json()
      const map: Record<string, AttendanceStatus> = {}
      existing.forEach(a => { map[a.disciple_id] = a.status })
      // Só completa com falta padrão quem falta marcar na PRIMEIRA vez que a
      // chamada dessa aula é feita — e só em modo de edição. Reabrir uma
      // chamada já salva (ou abrir em modo leitura) não pode inserir registro
      // novo pra quem não fazia parte dela (ex.: aluno matriculado depois
      // daquela aula) — isso inflava a frequência de gente que nem estava na
      // turma naquele dia, só porque está ativa hoje.
      const isNew = existing.length === 0
      if (isNew && !readOnly) {
        activeEnrollments.forEach(e => {
          if (!map[e.disciple_id]) map[e.disciple_id] = 'FALTA'
        })
      }
      setAttendanceIsNew(isNew)
      setAttendanceItems(map)
    }
  }

  function toggleAttendance(discipleId: string) {
    const cycle: AttendanceStatus[] = ['PRESENTE', 'FALTA', 'JUSTIFICADA']
    setAttendanceItems(prev => {
      const cur = prev[discipleId] ?? 'FALTA'
      const next = cycle[(cycle.indexOf(cur) + 1) % cycle.length]
      return { ...prev, [discipleId]: next }
    })
  }

  async function saveAttendance() {
    if (!showAttendance) return
    setLoading(true)
    const items = Object.entries(attendanceItems).map(([disciple_id, status]) => ({
      disciple_id,
      status,
    }))
    const res = await fetch(`/api/lessons/${showAttendance}/attendance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    })
    if (!res.ok) setError((await res.json()).error)
    else setShowAttendance(null)
    setLoading(false)
  }

  return (
    <>
      <div className="mb-2 flex items-center gap-2 text-sm text-gray-500">
        <Link href="/turmas" className="hover:underline">Turmas</Link>
        <ChevronRight className="h-4 w-4" />
        <span>{turma.name}</span>
      </div>

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{turma.name}</h1>
          <p className="text-sm text-gray-500">{turma.class_shifts?.name ?? 'Não informado'}</p>
        </div>
      </div>

      {error && <Alert type="error" className="mb-4">{error}</Alert>}

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border border-gray-200 bg-gray-100 p-1 mb-6 w-fit">
        {(['alunos', 'aulas', 'reposicoes'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => handleTabChange(tab)}
            className={cn(
              'rounded-md px-4 py-2 text-sm font-medium transition-colors',
              activeTab === tab ? 'bg-white shadow-sm text-gray-900' : 'text-gray-600 hover:text-gray-900'
            )}
          >
            {tab === 'alunos' ? <><Users className="inline h-4 w-4 mr-1" />Alunos ({activeEnrollments.length})</> :
              tab === 'aulas' ? <><CalendarDays className="inline h-4 w-4 mr-1" />Aulas</> :
              <><RotateCcw className="inline h-4 w-4 mr-1" />Reposições ({justifiedAbsences.filter(j => !j.made_up).length})</>}
          </button>
        ))}
      </div>

      {activeTab === 'alunos' && (
        <Card>
          <CardHeader>
            <CardTitle>Alunos matriculados</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {activeEnrollments.length === 0 ? (
              <p className="px-6 py-8 text-center text-gray-500">Nenhum aluno matriculado</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {activeEnrollments.map(e => {
                  const activeCase = e.disciples?.discipleship_cases?.[0]
                  const hasAttendance = (activeCase?.total_lessons ?? 0) > 0
                  const crit = hasAttendance ? getAttendanceCriticality(activeCase!.attendance_rate) : null
                  return (
                    <li key={e.id} className="flex items-center justify-between gap-3 px-6 py-3">
                      <div className="min-w-0">
                        <Link href={`/discipulandos/${e.disciple_id}`} className="text-sm font-medium text-blue-600 hover:underline">
                          {e.disciples.full_name}
                        </Link>
                        {e.disciples.phone && (
                          <p className="text-xs text-gray-500">{e.disciples.phone}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {crit && (
                          <span
                            className={cn(
                              'text-xs font-medium tabular-nums',
                              crit === 'ok' ? 'text-green-600' : crit === 'warning' ? 'text-yellow-600' : 'text-red-600'
                            )}
                            title="Frequência"
                          >
                            {Math.round(activeCase!.attendance_rate)}%
                          </span>
                        )}
                        {canManage && (
                          <button
                            onClick={() => handleUnenroll(e)}
                            disabled={unenrollingId === e.id}
                            className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50"
                            title="Desmatricular"
                            aria-label="Desmatricular"
                          >
                            <UserMinus className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'alunos' && canManage && eligibleCases.length > 0 && (
        <div className="mt-6 rounded-lg border border-gray-200 bg-white overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between gap-3 flex-wrap">
            <p className="font-semibold text-gray-900 flex items-center gap-1.5">
              <UserPlus className="h-4 w-4 text-gray-500" />
              Adicionar participante
            </p>
            <div className="relative max-w-xs w-full">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={addSearch}
                onChange={e => setAddSearch(e.target.value)}
                placeholder="Buscar por nome ou telefone..."
                className="h-8 w-full rounded-lg border border-gray-200 bg-white pl-8 pr-3 text-base sm:text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          {visibleEligible.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-gray-500">
              {addSearch ? 'Nenhum discipulando encontrado' : 'Todos já foram adicionados'}
            </p>
          ) : (
            <ul className="divide-y divide-gray-50">
              {visibleEligible.map(c => (
                <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 text-sm">{c.disciples?.full_name}</p>
                    {c.disciples?.phone && (
                      <p className="text-xs text-gray-400">{c.disciples.phone}</p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    loading={addingId === c.id}
                    onClick={() => handleAddParticipant(c)}
                  >
                    + Confirmar
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {activeTab === 'aulas' && (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            {canManage ? (
              <Button onClick={openNewLesson}>
                <Plus className="h-4 w-4" />
                Nova aula
              </Button>
            ) : <div />}

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative max-w-xs w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  value={lessonSearch}
                  onChange={e => setLessonSearch(e.target.value)}
                  placeholder="Buscar aula por tema..."
                  className="h-9 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-base sm:text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
              <div className="flex items-center gap-1.5">
                {PERIOD_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setLessonPeriod(p => p === opt.value ? '' : opt.value)}
                    className={cn(
                      'h-9 rounded-lg border px-3 text-sm font-medium transition-colors',
                      lessonPeriod === opt.value
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {lessons.length > 0 && visibleLessons.length === 0 && (
            <div className="rounded-lg border border-dashed border-gray-300 py-12 text-center text-gray-500">
              {isFilteringLessons ? 'Nenhuma aula encontrada' : 'Nenhuma aula em aberto. Busque pelo tema ou filtre por período pra ver as já concluídas.'}
            </div>
          )}

          {lessons.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 py-12 text-center text-gray-500">
              Nenhuma aula cadastrada
            </div>
          ) : visibleLessons.length === 0 ? null : (
            <div className="flex flex-col gap-3">
              {visibleLessons.map(l => {
                const summary = getLessonSummary(l, activeEnrollments.length)
                return (
                  <div key={l.id} className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-gray-900">{formatDate(l.date)}</p>
                        <span className={cn(
                          'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                          summary.isComplete
                            ? 'bg-emerald-100 text-emerald-800'
                            : summary.total > 0
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-500'
                        )}>
                          {summary.isComplete ? 'Chamada feita' : summary.total > 0 ? 'Chamada parcial' : 'Chamada pendente'}
                        </span>
                      </div>
                      {l.topic && <p className="text-sm text-gray-500">{l.topic}</p>}
                      {l.module_templates && (
                        <p className="text-xs mt-0.5 flex items-center gap-1 text-indigo-600">
                          <span title="Presença nesta aula avança o módulo automaticamente">⚡</span>
                          {l.module_templates.title}
                        </p>
                      )}
                      {summary.total > 0 && (
                        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs">
                          <span className="text-green-700">{summary.present} presente{summary.present === 1 ? '' : 's'}</span>
                          <span className="text-red-700">{summary.absent} falta{summary.absent === 1 ? '' : 's'}</span>
                          <span className="text-yellow-700">{summary.justified} justificada{summary.justified === 1 ? '' : 's'}</span>
                        </p>
                      )}
                    </div>
                    {canManage ? (
                      <div className="flex shrink-0 items-center gap-1.5">
                        <button
                          onClick={() => openEditLesson(l)}
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                          title="Editar aula"
                          aria-label="Editar aula"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openAttendance(l.id)}
                        >
                          Chamada
                        </Button>
                      </div>
                    ) : canViewAttendance ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="shrink-0"
                        onClick={() => openAttendance(l.id, true)}
                      >
                        Ver chamada
                      </Button>
                    ) : null}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {activeTab === 'reposicoes' && (
        <Card>
          <CardHeader>
            <CardTitle>Faltas justificadas</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {justifiedAbsences.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-gray-500">Nenhuma falta justificada registrada nesta turma</p>
            ) : (
              <ul className="divide-y divide-gray-50">
                {justifiedAbsences.map(item => (
                  <li key={item.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <p className={cn('font-medium text-sm', item.made_up ? 'text-gray-500 line-through' : 'text-gray-900')}>
                        {item.disciples?.full_name ?? '—'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {item.lessons ? formatDate(item.lessons.date) : '—'}
                        {item.lessons?.topic && ` · ${item.lessons.topic}`}
                      </p>
                    </div>
                    {canManage ? (
                      <Button
                        size="sm"
                        variant={item.made_up ? 'outline' : 'primary'}
                        loading={makeUpLoadingId === item.id}
                        onClick={() => toggleMadeUp(item)}
                      >
                        {item.made_up ? 'Reposta' : 'Marcar reposição'}
                      </Button>
                    ) : (
                      <span className={cn(
                        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                        item.made_up ? 'bg-gray-100 text-gray-600' : 'bg-yellow-100 text-yellow-800'
                      )}>
                        {item.made_up ? 'Reposta' : 'Pendente'}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      {/* Modal: nova aula / editar aula */}
      <Dialog
        open={showNewLesson}
        onClose={() => { setShowNewLesson(false); setEditLesson(null) }}
        title={editLesson ? 'Editar Aula' : 'Nova Aula'}
      >
        <div className="flex flex-col gap-4">
          {error && <Alert type="error">{error}</Alert>}
          <Input
            label="Data *"
            type="date"
            value={lessonDate}
            onChange={e => setLessonDate(e.target.value)}
          />
          <Input
            label="Tema"
            value={lessonTopic}
            onChange={e => setLessonTopic(e.target.value)}
            placeholder="Tema da aula"
          />
          <Select
            label="Módulo (opcional)"
            value={lessonModule}
            onChange={e => setLessonModule(e.target.value)}
            placeholder="Nenhum"
            options={modules.map(m => ({ value: m.id, label: m.title }))}
          />
          {lessonModule && (
            <p className="rounded-lg bg-indigo-50 px-3 py-2 text-xs text-indigo-700">
              ⚡ Alunos marcados como <strong>Presente</strong> nesta aula terão o módulo <strong>"{modules.find(m => m.id === lessonModule)?.title}"</strong> avançado automaticamente para <strong>Em Andamento</strong>.
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => { setShowNewLesson(false); setEditLesson(null) }}>Cancelar</Button>
            <Button onClick={handleSaveLesson} loading={loading}>
              {editLesson ? 'Salvar alterações' : 'Criar aula'}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Modal: chamada (edição ou só visualização) */}
      <Dialog
        open={!!showAttendance}
        onClose={() => setShowAttendance(null)}
        title={attendanceReadOnly ? 'Chamada (visualização)' : 'Chamada'}
        className="max-w-sm"
      >
        <div className="flex flex-col gap-3">
          {(() => {
            const showAllRoster = attendanceIsNew && !attendanceReadOnly
            const roster = showAllRoster
              ? activeEnrollments
              : activeEnrollments.filter(e => e.disciple_id in attendanceItems)

            if (attendanceReadOnly && roster.length === 0) {
              return <p className="text-sm text-gray-500">Chamada ainda não foi registrada nesta aula.</p>
            }

            return (
              <>
                <p className="text-sm text-gray-500">
                  {attendanceReadOnly
                    ? 'Somente visualização — quem gerencia a turma pode editar.'
                    : 'Clique no nome para alternar entre Presente / Falta / Justificada'}
                </p>
                {roster.map(e => {
                  const status = attendanceItems[e.disciple_id] ?? 'FALTA'
                  const rowClasses = cn(
                    'flex items-center justify-between rounded-lg border px-3 py-2 text-sm font-medium',
                    ATTENDANCE_BTN[status],
                    attendanceReadOnly && 'cursor-default opacity-90'
                  )
                  return attendanceReadOnly ? (
                    <div key={e.disciple_id} className={rowClasses}>
                      <span>{e.disciples.full_name}</span>
                      <span>{ATTENDANCE_LABEL[status]}</span>
                    </div>
                  ) : (
                    <button key={e.disciple_id} onClick={() => toggleAttendance(e.disciple_id)} className={rowClasses}>
                      <span>{e.disciples.full_name}</span>
                      <span>{ATTENDANCE_LABEL[status]}</span>
                    </button>
                  )
                })}
              </>
            )
          })()}
          <div className="flex justify-end gap-2 pt-2">
            {attendanceReadOnly ? (
              <Button variant="outline" onClick={() => setShowAttendance(null)}>Fechar</Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setShowAttendance(null)}>Cancelar</Button>
                <Button onClick={saveAttendance} loading={loading}>Salvar chamada</Button>
              </>
            )}
          </div>
        </div>
      </Dialog>
    </>
  )
}
