import { createClient } from '@/lib/supabase/server'
import type { ClassShiftCatalog } from '@/types'

export async function getClassShifts(
  congregationId: string,
  options?: { activeOnly?: boolean }
): Promise<ClassShiftCatalog[]> {
  const supabase = await createClient()
  let query = supabase
    .from('class_shifts')
    .select('*')
    .eq('congregation_id', congregationId)
    .order('name')

  if (options?.activeOnly) query = query.eq('is_active', true)

  const { data, error } = await query
  if (error) throw error
  return data as ClassShiftCatalog[]
}

export async function createClassShift(
  congregationId: string,
  name: string
): Promise<ClassShiftCatalog> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('class_shifts')
    .insert({
      congregation_id: congregationId,
      name,
    })
    .select()
    .single()

  if (error) throw error
  return data as ClassShiftCatalog
}

export async function updateClassShift(
  id: string,
  updates: { name?: string; is_active?: boolean }
): Promise<ClassShiftCatalog> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('class_shifts')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as ClassShiftCatalog
}
