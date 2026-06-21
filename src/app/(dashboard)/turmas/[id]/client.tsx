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
import { SHIFT_LABEL, ATTENDANCE_LABEL, ATTENDANCE_COLOR, formatDate, cn } from '@/lib/utils'
import { Plus, ChevronRight, CalendarDays, Users, CheckCircle, X, Minus } from 'lucide-react'
import type { Profile, ModuleTemplate, AttendanceStatus } from '@/types'

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
}

interface Props {
  turma: {
    id: string
    name: string
    shift: string
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

  const canManage = ['ADMIN_DISCIPULADO', 'DISCIPULADOR', 'ADMIN_PLATAFORMA'].includes(currentProfile.role)
  const activeEnrollments = turma.class_enrollments.filter(e => e.active)

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
          <p className="text-sm text-gray-500">{SHIFT_LABEL[turma.shift as keyof typeof SHIFT_LABEL]}</p>
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
          {canManage && (
            <div className="mb-4">
              <Button onClick={() => setShowNewLesson(true)}>
                <Plus className="h-4 w-4" />
                Nova aula
              </Button>
            </div>
          )}

          {lessons.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 py-12 text-center text-gray-500">
              Nenhuma aula cadastrada
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {lessons.map(l => (
                <div key={l.id} className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3">
                  <div>
                    <p className="font-medium text-gray-900">{formatDate(l.date)}</p>
                    {l.topic && <p className="text-sm text-gray-500">{l.topic}</p>}
                    {l.module_templates && (
                      <p className="text-xs text-blue-600 mt-0.5">{l.module_templates.title}</p>
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
