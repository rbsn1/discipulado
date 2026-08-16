'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile, getProfileByEmail } from '@/lib/repositories/profiles'
import { createPasswordResetRequest } from '@/lib/repositories/password-reset-requests'

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

// Sem SMTP configurado no projeto — em vez de e-mail com link, o pedido vira
// um registro visível pro admin da congregação no painel, que redefine a
// senha manualmente em /admin/usuários. Sempre retorna a mesma mensagem
// genérica, exista ou não esse e-mail no sistema — não dá pra usar essa tela
// pra descobrir se um e-mail está cadastrado.
export async function requestPasswordReset(email: string): Promise<void> {
  const profile = await getProfileByEmail(email.trim().toLowerCase())
  if (profile?.is_active && profile.congregation_id) {
    await createPasswordResetRequest(profile.id, profile.congregation_id)
  }
}

// Chamado pela pessoa já autenticada (com a senha temporária) na tela de
// troca obrigatória — atualiza a própria senha e libera o acesso ao resto
// do app, desligando must_change_password.
export async function changeOwnPassword(newPassword: string): Promise<{ error?: string }> {
  if (newPassword.length < 6) {
    return { error: 'Senha deve ter pelo menos 6 caracteres' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) return { error: error.message }

  const { error: profileError } = await supabase
    .from('profiles')
    .update({ must_change_password: false })
    .eq('id', user.id)
  if (profileError) return { error: profileError.message }

  return {}
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
