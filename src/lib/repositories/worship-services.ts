import { createClient } from '@/lib/supabase/server'
import type { WorshipService } from '@/types'

export async function getWorshipServices(congregationId: string): Promise<WorshipService[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('worship_services')
    .select('*')
    .eq('congregation_id', congregationId)
    .order('name')

  if (error) throw error
  return data as WorshipService[]
}

export async function createWorshipService(
  congregationId: string,
  name: string
): Promise<WorshipService> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('worship_services')
    .insert({
      congregation_id: congregationId,
      name,
    })
    .select()
    .single()

  if (error) throw error
  return data as WorshipService
}

export async function updateWorshipService(
  id: string,
  updates: { name?: string; is_active?: boolean }
): Promise<WorshipService> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('worship_services')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as WorshipService
}

export async function deleteWorshipService(id: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('worship_services')
    .update({ is_active: false })
    .eq('id', id)

  if (error) throw error
}
