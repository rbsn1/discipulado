import { NextRequest, NextResponse } from 'next/server'
import { getCurrentProfile, getProfileById, resetUserPassword } from '@/lib/repositories/profiles'
import { resolvePasswordResetRequests } from '@/lib/repositories/password-reset-requests'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const profile = await getCurrentProfile()
  if (!profile || !['ADMIN_PLATAFORMA', 'ADMIN_DISCIPULADO'].includes(profile.role)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json()
  if (!body.password || String(body.password).length < 6) {
    return NextResponse.json({ error: 'Senha deve ter pelo menos 6 caracteres' }, { status: 400 })
  }

  // supabase.auth.admin.* usa service role, que ignora RLS — por isso a
  // checagem de congregação tem que ser feita aqui, não dá pra confiar só
  // na policy da tabela (que nem se aplica a essa chamada).
  const targetProfile = await getProfileById(id)
  if (!targetProfile) {
    return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
  }
  if (profile.role === 'ADMIN_DISCIPULADO' && targetProfile.congregation_id !== profile.congregation_id) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  try {
    await resetUserPassword(id, body.password)
    await resolvePasswordResetRequests(id, profile.id)
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
