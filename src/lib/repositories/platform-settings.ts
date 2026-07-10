import { createClient } from '@/lib/supabase/server'
import type { PlatformSettings } from '@/types'

export async function getPlatformSettings(): Promise<PlatformSettings> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('platform_settings')
    .select('*')
    .eq('id', 1)
    .single()

  if (error) throw error
  return data as PlatformSettings
}

export async function updatePlatformSettings(
  updates: { login_verse_text: string; login_verse_reference: string }
): Promise<PlatformSettings> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('platform_settings')
    .update(updates)
    .eq('id', 1)
    .select()
    .single()

  if (error) throw error
  return data as PlatformSettings
}
