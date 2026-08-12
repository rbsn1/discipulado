import { createClient } from '@/lib/supabase/server'
import type { Department } from '@/types'

export async function getDepartments(
  congregationId: string,
  options?: { activeOnly?: boolean }
): Promise<Department[]> {
  const supabase = await createClient()
  let query = supabase
    .from('departments')
    .select('*')
    .eq('congregation_id', congregationId)
    .order('name')

  if (options?.activeOnly) query = query.eq('is_active', true)

  const { data, error } = await query
  if (error) throw error
  return data as Department[]
}

export async function createDepartment(
  congregationId: string,
  name: string
): Promise<Department> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('departments')
    .insert({
      congregation_id: congregationId,
      name,
    })
    .select()
    .single()

  if (error) throw error
  return data as Department
}

export async function updateDepartment(
  id: string,
  updates: { name?: string; is_active?: boolean }
): Promise<Department> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('departments')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Department
}
