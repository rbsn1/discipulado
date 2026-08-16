import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Profile, ProfileWithCongregation, UserRole } from '@/types'

export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error) return null
  return data as Profile
})

// Respeita RLS (client de sessão) — usado pra confirmar que um perfil alvo
// pertence à mesma congregação de quem está chamando, antes de uma ação
// que usa client admin (que ignora RLS) como resetUserPassword.
export async function getProfileById(id: string): Promise<Profile | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  return data as Profile | null
}

// Client admin: precisa bypassar RLS porque é chamado sem sessão (tela de
// login, ninguém autenticado ainda) — anon não conseguiria ler profiles.
export async function getProfileByEmail(email: string): Promise<Profile | null> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', email)
    .maybeSingle()

  if (error) throw error
  return data as Profile | null
}

export async function resetUserPassword(id: string, newPassword: string): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase.auth.admin.updateUserById(id, { password: newPassword })
  if (error) throw error
}

export async function getProfilesByCongregation(congregationId: string): Promise<ProfileWithCongregation[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('*, congregations ( id, name )')
    .eq('congregation_id', congregationId)
    .order('name')

  if (error) throw error
  return data as ProfileWithCongregation[]
}

export async function getAllProfiles(): Promise<ProfileWithCongregation[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('*, congregations ( id, name )')
    .order('name')

  if (error) throw error
  return data as ProfileWithCongregation[]
}

export async function updateProfile(
  id: string,
  updates: { name?: string; role?: UserRole; is_active?: boolean; congregation_id?: string | null }
): Promise<Profile> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Profile
}

export async function createUserWithProfile(
  email: string,
  password: string,
  name: string,
  role: UserRole,
  congregationId: string | null
): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      name,
      role,
      congregation_id: congregationId,
    },
  })
  if (error) throw error
}
