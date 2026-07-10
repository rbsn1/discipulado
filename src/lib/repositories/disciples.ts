import { createClient } from '@/lib/supabase/server'
import type { Disciple, CreateDiscipleInput, DiscipleListItem } from '@/types'

// Só os campos renderizados na tabela de /discipulandos (ver DiscipleListItem)
export async function getDisciples(congregationId: string, search?: string): Promise<DiscipleListItem[]> {
  const supabase = await createClient()
  let query = supabase
    .from('disciples')
    .select(`
      id, full_name, phone, origin, created_at,
      worship_services ( name ),
      discipleship_cases ( status )
    `)
    .eq('congregation_id', congregationId)
    .order('full_name')

  if (search) {
    query = query.or(`full_name.ilike.%${search}%,phone.ilike.%${search}%`)
  }

  const { data, error } = await query
  if (error) throw error
  return data as unknown as DiscipleListItem[]
}

// Versão enxuta pra casos que só precisam de id/nome/telefone (ex.: dropdown
// de "discipulandos sem case" no acolhimento) — evita os joins pesados de getDisciples().
export async function getDisciplesLite(
  congregationId: string
): Promise<Pick<Disciple, 'id' | 'full_name' | 'phone'>[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('disciples')
    .select('id, full_name, phone')
    .eq('congregation_id', congregationId)
    .order('full_name')

  if (error) throw error
  return data as Pick<Disciple, 'id' | 'full_name' | 'phone'>[]
}

// Colunas trazidas = exatamente o que a tela de detalhe do discipulando
// (page.tsx -> client.tsx -> DiscipleForm) lê hoje.
export async function getDiscipleById(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('disciples')
    .select(`
      id, congregation_id, full_name, phone, email, birth_date, conversion_date,
      origin, worship_service_id, address, notes,
      worship_services ( name ),
      class_enrollments ( active, classes ( name ) ),
      discipleship_cases (
        id, status, stage, attendance_rate, total_lessons, present_count,
        justified_count, absence_count, welcomed_on, last_contact_at,
        profiles!assigned_to ( name ),
        case_module_progress (
          module_template_id, status, completed_at,
          module_templates ( title, sort_order )
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
      worship_service_id: input.worship_service_id || null,
      notes: input.notes || null,
      created_by: createdBy,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
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
