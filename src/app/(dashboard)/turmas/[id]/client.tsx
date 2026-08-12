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
import { Plus, ChevronRight, CalendarDays, Users, CheckCircle, X, Minus, Search } from 'lucide-react'
import type { Profile, ModuleTemplate, AttendanceStatus } from '@/types'
import { isAfter, isBefore, parseISO, startOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns'

interface Enrollment {
  id: string
  disciple_id: string
  active: boolean
  disciples: { id: string; full_name: string; phone?: string }
}

interface Lesson {
  id: string
  date: string
  topic: string | null
  module_templates?: { id: string; title: string } | null
  attendance_items?: { id: string }[]
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

export function TurmaDetailClient({ turma, modules, currentProfile }: Props) {
  const router = useRouter()
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [lessonLoaded, setLessonLoaded] = useState(false)
  const [activeTab, setActiveTab] = useState<'alunos' | 'aulas'>('alunos')
  const [showNewLesson, setShowNewLesson] = useState(false)
  const [showAttendance, setShowAttendance] = useState<string | null>(null)
  const [attendanceItems, setAttendanceItems] = useState<Record<string, AttendanceStatus>>({})
  const [lessonDate, setLessonDate] = useState('')
  const [lessonTopic, setLessonTopic] = useState('')
  const [lessonModule, setLessonModule] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [lessonSearch, setLessonSearch] = useState('')
  const [lessonPeriod, setLessonPeriod] = useState<Period>('')

  const canManage = ['ADMIN_DISCIPULADO', 'DISCIPULADOR', 'ADMIN_PLATAFORMA'].includes(currentProfile.role)
  const activeEnrollments = turma.class_enrollments.filter(e => e.active)

  // ── Filtrar aulas por busca (tema) e/ou período / esconder concluídas por padrão ──
  // Aula "concluída" (data já passou E chamada já foi feita) some da lista assim que
  // processada — continua acessível buscando pelo tema ou limitando por semana/mês/ano,
  // que trazem TODAS as aulas (concluídas ou não) dentro do período.

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
    : lessons.filter(l => !((l.attendance_items?.length ?? 0) > 0 && isBefore(parseISO(l.date), today)))

  async function loadLessons() {
    if (lessonLoaded) return
    const res = await fetch(`/api/classes/${turma.id}/lessons`)
    if (res.ok) {
      setLessons(await res.json())
      setLessonLoaded(true)
    }
  }

  async function handleTabChange(tab: 'alunos' | 'aulas') {
    setActiveTab(tab)
    if (tab === 'aulas') await loadLessons()
  }

  async function handleCreateLesson() {
    if (!lessonDate) { setError('Data obrigatória'); return }
    setLoading(true)
    setError('')
    const res = await fetch(`/api/classes/${turma.id}/lessons`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: lessonDate,
        topic: lessonTopic || null,
        module_template_id: lessonModule || null,
      }),
    })
    if (!res.ok) {
      setError((await res.json()).error)
    } else {
      const lesson = await res.json()
      setLessons(prev => [lesson, ...prev])
      setShowNewLesson(false)
      setLessonDate('')
      setLessonTopic('')
      setLessonModule('')
    }
    setLoading(false)
  }

  async function openAttendance(lessonId: string) {
    setShowAttendance(lessonId)
    const res = await fetch(`/api/lessons/${lessonId}/attendance`)
    if (res.ok) {
      const existing: Array<{ disciple_id: string; status: AttendanceStatus }> = await res.json()
      const map: Record<string, AttendanceStatus> = {}
      existing.forEach(a => { map[a.disciple_id] = a.status })
      // Preenche falta para quem não tem status
      activeEnrollments.forEach(e => {
        if (!map[e.disciple_id]) map[e.disciple_id] = 'FALTA'
      })
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
        {(['alunos', 'aulas'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => handleTabChange(tab)}
            className={cn(
              'rounded-md px-4 py-2 text-sm font-medium transition-colors',
              activeTab === tab ? 'bg-white shadow-sm text-gray-900' : 'text-gray-600 hover:text-gray-900'
            )}
          >
            {tab === 'alunos' ? <><Users className="inline h-4 w-4 mr-1" />Alunos ({activeEnrollments.length})</> :
              <><CalendarDays className="inline h-4 w-4 mr-1" />Aulas</>}
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
                {activeEnrollments.map(e => (
                  <li key={e.id} className="flex items-center justify-between px-6 py-3">
                    <div>
                      <Link href={`/discipulandos/${e.disciple_id}`} className="text-sm font-medium text-blue-600 hover:underline">
                        {e.disciples.full_name}
                      </Link>
                      {e.disciples.phone && (
                        <p className="text-xs text-gray-500">{e.disciples.phone}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'aulas' && (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            {canManage ? (
              <Button onClick={() => setShowNewLesson(true)}>
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
              {visibleLessons.map(l => (
                <div key={l.id} className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3">
                  <div>
                    <p className="font-medium text-gray-900">{formatDate(l.date)}</p>
                    {l.topic && <p className="text-sm text-gray-500">{l.topic}</p>}
                    {l.module_templates && (
                      <p className="text-xs mt-0.5 flex items-center gap-1 text-indigo-600">
                        <span title="Presença nesta aula avança o módulo automaticamente">⚡</span>
                        {l.module_templates.title}
                      </p>
                    )}
                  </div>
                  {canManage && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openAttendance(l.id)}
                    >
                      Chamada
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Modal: nova aula */}
      <Dialog open={showNewLesson} onClose={() => setShowNewLesson(false)} title="Nova Aula">
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
            <Button variant="outline" onClick={() => setShowNewLesson(false)}>Cancelar</Button>
            <Button onClick={handleCreateLesson} loading={loading}>Criar aula</Button>
          </div>
        </div>
      </Dialog>

      {/* Modal: chamada */}
      <Dialog open={!!showAttendance} onClose={() => setShowAttendance(null)} title="Chamada" className="max-w-sm">
        <div className="flex flex-col gap-3">
          <p className="text-sm text-gray-500">Clique no nome para alternar entre Presente / Falta / Justificada</p>
          {activeEnrollments.map(e => {
            const status = attendanceItems[e.disciple_id] ?? 'FALTA'
            return (
              <button
                key={e.disciple_id}
                onClick={() => toggleAttendance(e.disciple_id)}
                className={cn(
                  'flex items-center justify-between rounded-lg border px-3 py-2 text-sm font-medium',
                  ATTENDANCE_BTN[status]
                )}
              >
                <span>{e.disciples.full_name}</span>
                <span>{ATTENDANCE_LABEL[status]}</span>
              </button>
            )
          })}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowAttendance(null)}>Cancelar</Button>
            <Button onClick={saveAttendance} loading={loading}>Salvar chamada</Button>
          </div>
        </div>
      </Dialog>
    </>
  )
}
