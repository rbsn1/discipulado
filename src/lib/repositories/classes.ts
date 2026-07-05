import { createClient } from '@/lib/supabase/server'
import type { Class, ClassEnrollment, Lesson, AttendanceItem, AttendanceItemInput } from '@/types'

export async function getClasses(congregationId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('classes')
    .select('*')
    .eq('congregation_id', congregationId)
    .order('name')

  if (error) throw error
  return data as Class[]
}

export async function getClassById(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('classes')
    .select(`
      *,
      class_enrollments (
        *,
        disciples ( id, full_name, phone )
      )
    `)
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export async function createClass(
  congregationId: string,
  name: string,
  shift: string
): Promise<Class> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('classes')
    .insert({ congregation_id: congregationId, name, shift })
    .select()
    .single()

  if (error) throw error
  return data as Class
}

export async function updateClass(
  id: string,
  updates: { name?: string; shift?: string; is_active?: boolean }
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

export async function getLessons(classId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('lessons')
    .select('*, module_templates ( id, title )')
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
