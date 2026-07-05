import { createClient } from '@/lib/supabase/server'
import type { Disciple, CreateDiscipleInput, DiscipleWithCase } from '@/types'

export async function getDisciples(congregationId: string, search?: string) {
  const supabase = await createClient()
  let query = supabase
    .from('disciples')
    .select(`
      *,
      discipleship_cases (
        id, status, stage, assigned_to, attendance_rate,
        profiles!assigned_to ( id, name )
      )
    `)
    .eq('congregation_id', congregationId)
    .order('full_name')

  if (search) {
    query = query.or(`full_name.ilike.%${search}%,phone.ilike.%${search}%`)
  }

  const { data, error } = await query
  if (error) throw error
  return data as DiscipleWithCase[]
}

export async function getDiscipleById(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('disciples')
    .select(`
      *,
      class_enrollments ( id, active, class_id, classes ( id, name, shift ) ),
      discipleship_cases (
        *,
        profiles!assigned_to ( id, name ),
        case_module_progress (
          *,
          module_templates ( id, title, sort_order )
        )
      )
    `)
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export async function createDisciple(
  congregationId: string,
  input: CreateDiscipleInput,
  createdBy: string
): Promise<Disciple> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('disciples')
    .insert({
      congregation_id: congregationId,
      full_name: input.full_name,
      phone: input.phone || null,
      email: input.email || null,
      birth_date: input.birth_date || null,
      address: input.address || null,
      conversion_date: input.conversion_date || null,
      origin: input.origin || null,
      notes: input.notes || null,
      created_by: createdBy,
    })
    .select()
    .single()

  if (error) throw error
  return data as Disciple
}

export async function updateDisciple(
  id: string,
  input: Partial<CreateDiscipleInput>
): Promise<Disciple> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('disciples')
    .update({
      ...input,
      phone: input.phone || null,
      email: input.email || null,
      birth_date: input.birth_date || null,
      address: input.address || null,
      conversion_date: input.conversion_date || null,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Disciple
}
