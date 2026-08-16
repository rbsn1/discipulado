import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { PasswordResetRequest } from '@/types'

// Client admin: chamado a partir da tela de login, sem sessão nenhuma —
// anon não teria permissão de inserir (não existe policy de insert de
// propósito, só service role grava aqui).
export async function createPasswordResetRequest(
  profileId: string,
  congregationId: string
): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('password_reset_requests')
    .insert({ profile_id: profileId, congregation_id: congregationId })

  if (error) throw error
}

// Sem congregationId (ADMIN_PLATAFORMA vendo tudo) confia na RLS
// (is_platform_admin()) pra não vazar nada de quem não devia ver.
export async function getPendingPasswordResetRequests(
  congregationId?: string
): Promise<PasswordResetRequest[]> {
  const supabase = await createClient()
  let query = supabase
    .from('password_reset_requests')
    .select('*, profiles!profile_id ( id, name, email )')
    .eq('resolved', false)
    .order('requested_at', { ascending: true })

  if (congregationId) query = query.eq('congregation_id', congregationId)

  const { data, error } = await query
  if (error) throw error
  return data as unknown as PasswordResetRequest[]
}

export async function resolvePasswordResetRequests(
  profileId: string,
  resolvedBy: string
): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('password_reset_requests')
    .update({ resolved: true, resolved_at: new Date().toISOString(), resolved_by: resolvedBy })
    .eq('profile_id', profileId)
    .eq('resolved', false)

  if (error) throw error
}
