import { cache } from 'react'
import { randomInt } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Profile, ProfileWithCongregation, UserRole } from '@/types'

// Sem caracteres ambíguos (0/O, 1/l/I) — essa senha é lida em voz alta ou
// digitada de um print de WhatsApp, então precisa ser fácil de repassar
// sem erro de leitura.
const TEMP_PASSWORD_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'

function generateTempPassword(length = 10): string {
  let out = ''
  for (let i = 0; i < length; i++) {
    out += TEMP_PASSWORD_CHARS[randomInt(TEMP_PASSWORD_CHARS.length)]
  }
  return out
}

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

// Gera a senha temporária no servidor (nunca o admin digitando uma) e
// obriga troca no próximo login — a senha só é exibida uma vez, na resposta
// dessa chamada, pro admin repassar por fora (WhatsApp/telefone).
export async function resetUserPassword(id: string): Promise<string> {
  const supabase = createAdminClient()
  const password = generateTempPassword()
  const { error } = await supabase.auth.admin.updateUserById(id, { password })
  if (error) throw error

  const { error: profileError } = await supabase
    .from('profiles')
    .update({ must_change_password: true })
    .eq('id', id)
  if (profileError) throw profileError

  return password
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

// Mesma lógica de senha temporária de resetUserPassword — quem cria a
// conta não escolhe a senha, o servidor gera uma e a pessoa troca no
// primeiro login.
export async function createUserWithProfile(
  email: string,
  name: string,
  role: UserRole,
  congregationId: string | null
): Promise<string> {
  const supabase = createAdminClient()
  const password = generateTempPassword()
  const { data, error } = await supabase.auth.admin.createUser({
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

  if (data.user) {
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ must_change_password: true })
      .eq('id', data.user.id)
    if (profileError) throw profileError
  }

  return password
}
