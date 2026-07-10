import { createClient } from '@/lib/supabase/server'
import type { ModuleTemplate } from '@/types'

export async function getModuleTemplates(
  congregationId: string,
  options?: { activeOnly?: boolean }
): Promise<ModuleTemplate[]> {
  const supabase = await createClient()
  let query = supabase
    .from('module_templates')
    .select('*')
    .eq('congregation_id', congregationId)
    .order('sort_order')

  if (options?.activeOnly) query = query.eq('is_active', true)

  const { data, error } = await query
  if (error) throw error
  return data as ModuleTemplate[]
}

export async function createModuleTemplate(
  congregationId: string,
  title: string,
  description: string | undefined,
  sortOrder: number
): Promise<ModuleTemplate> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('module_templates')
    .insert({
      congregation_id: congregationId,
      title,
      description: description || null,
      sort_order: sortOrder,
    })
    .select()
    .single()

  if (error) throw error
  return data as ModuleTemplate
}

export async function updateModuleTemplate(
  id: string,
  updates: { title?: string; description?: string; sort_order?: number; is_active?: boolean }
): Promise<ModuleTemplate> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('module_templates')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as ModuleTemplate
}

export async function deleteModuleTemplate(id: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('module_templates')
    .update({ is_active: false })
    .eq('id', id)

  if (error) throw error
}
