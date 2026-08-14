import { createClient } from '@/lib/supabase/server'
import type { Class, ClassEnrollment, Lesson, AttendanceItem, AttendanceItemInput } from '@/types'

export async function getClasses(congregationId: string, options?: { activeOnly?: boolean }) {
  const supabase = await createClient()
  let query = supabase
    .from('classes')
    .select('*, class_shifts ( id, name )')
    .eq('congregation_id', congregationId)
    .order('name')

  if (options?.activeOnly) query = query.eq('is_active', true)

  const { data, error } = await query
  if (error) throw error
  return data as Class[]
}

// discipleship_cases(id, status, attendance_rate): id pra permitir desmatricular
// (unenroll_disciple exige case_id), status pra filtrar da lista quem já concluiu
// o discipulado, attendance_rate pra mostrar frequência na lista de matriculados
// (ver activeEnrollments em turmas/[id]/client.tsx).
export async function getClassById(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('classes')
    .select(`
      *,
      class_shifts ( id, name ),
      class_enrollments (
        *,
        disciples ( id, full_name, phone, discipleship_cases ( id, status, attendance_rate, total_lessons ) )
      )
    `)
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

// Comparação case-insensitive — evita "Turma Manhã" e "turma manhã" coexistindo
// e confundindo quem for matricular alguém depois.
export async function classNameExists(
  congregationId: string,
  name: string,
  excludeId?: string
): Promise<boolean> {
  const supabase = await createClient()
  let query = supabase
    .from('classes')
    .select('id', { count: 'exact', head: true })
    .eq('congregation_id', congregationId)
    .ilike('name', name.trim())

  if (excludeId) query = query.neq('id', excludeId)

  const { count, error } = await query
  if (error) throw error
  return (count ?? 0) > 0
}

export async function createClass(
  congregationId: string,
  name: string,
  shiftId: string | null
): Promise<Class> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('classes')
    .insert({ congregation_id: congregationId, name, shift_id: shiftId })
    .select()
    .single()

  if (error) throw error
  return data as Class
}

export async function updateClass(
  id: string,
  updates: { name?: string; shift_id?: string | null; is_active?: boolean }
): Promise<Class> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('classes')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Class
}

// Turma criada por engano: só apaga se nunca teve matrícula nenhuma (ativa ou
// não — histórico de matrícula real bloqueia o apagar, não só a vaga atual).
// Aulas sem matriculados (criadas por engano também) são apagadas junto —
// presenças cascateiam via FK (attendance_items -> lessons on delete cascade).
export async function deleteClass(id: string): Promise<void> {
  const supabase = await createClient()

  const { count, error: countError } = await supabase
    .from('class_enrollments')
    .select('id', { count: 'exact', head: true })
    .eq('class_id', id)

  if (countError) throw countError
  if ((count ?? 0) > 0) {
    throw new Error('CLASS_HAS_ENROLLMENTS: turma possui alunos matriculados e não pode ser apagada')
  }

  const { error: lessonsError } = await supabase.from('lessons').delete().eq('class_id', id)
  if (lessonsError) throw lessonsError

  const { error: classError } = await supabase.from('classes').delete().eq('id', id)
  if (classError) throw classError
}

export async function enrollDisciple(
  discipleId: string,
  classId: string,
  caseId: string,
  createdBy: string
): Promise<string> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('enroll_disciple', {
    p_disciple_id: discipleId,
    p_class_id: classId,
    p_case_id: caseId,
    p_created_by: createdBy,
  })
  if (error) throw error
  return data as string
}

export async function unenrollDisciple(
  discipleId: string,
  caseId: string,
  createdBy: string
): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase.rpc('unenroll_disciple', {
    p_disciple_id: discipleId,
    p_case_id: caseId,
    p_created_by: createdBy,
  })
  if (error) throw error
}

// attendance_items(id) só pra saber se a chamada já foi feita (length > 0) —
// usado pra decidir se a aula já "concluiu" e pode sumir da lista por padrão.
export async function getLessons(classId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('lessons')
    .select('*, module_templates ( id, title ), attendance_items ( id )')
    .eq('class_id', classId)
    .order('date', { ascending: false })

  if (error) throw error
  return data
}

export async function createLesson(
  classId: string,
  date: string,
  topic: string | undefined,
  moduleTemplateId: string | undefined,
  createdBy: string
): Promise<Lesson> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('lessons')
    .insert({
      class_id: classId,
      date,
      topic: topic || null,
      module_template_id: moduleTemplateId || null,
      created_by: createdBy,
    })
    .select()
    .single()

  if (error) throw error
  return data as Lesson
}

export async function updateLesson(
  id: string,
  updates: { date?: string; topic?: string | null; module_template_id?: string | null }
): Promise<Lesson> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('lessons')
    .update(updates)
    .eq('id', id)
    .select('*, module_templates ( id, title )')
    .single()

  if (error) throw error
  return data as Lesson
}

export async function getLessonAttendance(lessonId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('attendance_items')
    .select('*, disciples ( id, full_name )')
    .eq('lesson_id', lessonId)

  if (error) throw error
  return data
}

export async function recordAttendance(
  lessonId: string,
  items: AttendanceItemInput[],
  markedBy: string
): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase.rpc('record_attendance', {
    p_lesson_id: lessonId,
    p_items: items,
    p_marked_by: markedBy,
  })
  if (error) throw error
}

export interface JustifiedAbsence {
  id: string
  note: string | null
  made_up: boolean
  lessons: { id: string; date: string; topic: string | null } | null
}

// Faltas justificadas de um discipulando com a aula específica de cada uma
// (attendance_items.lesson_id já guarda isso, só faltava expor) — pra saber
// exatamente qual aula precisa ser reposta, não só a contagem agregada.
export async function getJustifiedAbsences(discipleId: string): Promise<JustifiedAbsence[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('attendance_items')
    .select('id, note, made_up, lessons ( id, date, topic )')
    .eq('disciple_id', discipleId)
    .eq('status', 'JUSTIFICADA')
    .order('date', { referencedTable: 'lessons', ascending: false })

  if (error) throw error
  return data as unknown as JustifiedAbsence[]
}

export interface ClassJustifiedAbsence {
  id: string
  made_up: boolean
  disciples: { id: string; full_name: string } | null
  lessons: { id: string; date: string; topic: string | null } | null
}

// Mesma ideia de getJustifiedAbsences, só que olhando pra turma inteira em vez
// de um discipulando só — pra quem gerencia a turma ver de uma vez quem
// precisa repor o quê, sem entrar na ficha de cada aluno.
export async function getJustifiedAbsencesByClass(classId: string): Promise<ClassJustifiedAbsence[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('attendance_items')
    .select('id, made_up, disciples ( id, full_name ), lessons!inner ( id, date, topic, class_id )')
    .eq('status', 'JUSTIFICADA')
    .eq('lessons.class_id', classId)
    .order('date', { referencedTable: 'lessons', ascending: false })

  if (error) throw error
  return data as unknown as ClassJustifiedAbsence[]
}

export async function setAbsenceMadeUp(attendanceItemId: string, madeUp: boolean): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('attendance_items')
    .update({ made_up: madeUp })
    .eq('id', attendanceItemId)

  if (error) throw error
}

export async function getEnrollmentsByClass(classId: string): Promise<ClassEnrollment[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('class_enrollments')
    .select('*')
    .eq('class_id', classId)
    .eq('active', true)

  if (error) throw error
  return data as ClassEnrollment[]
}
