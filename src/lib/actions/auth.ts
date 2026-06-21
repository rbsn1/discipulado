'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/repositories/profiles'

export async function login(email: string, password: string) {
  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    return { error: 'Credenciais inválidas. Verifique seu e-mail e senha.' }
  }

  const profile = await getCurrentProfile()
  if (!profile) {
    await supabase.auth.signOut()
    return { error: 'Usuário sem perfil ativo. Contate o administrador.' }
  }
  if (!profile.is_active) {
    await supabase.auth.signOut()
    return { error: 'Conta inativa. Contate o administrador.' }
  }

  redirect('/painel')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
