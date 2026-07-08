import { NextRequest, NextResponse } from 'next/server'
import { getCurrentProfile } from '@/lib/repositories/profiles'
import { updateEventStatus } from '@/lib/repositories/events'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const profile = await getCurrentProfile()
  if (!profile?.congregation_id)
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const roles = ['ADMIN_DISCIPULADO', 'ADMIN_PLATAFORMA']
  if (!roles.includes(profile.role))
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const { id } = await params
  const body = await req.json()

  const allowed = ['PLANEJADO', 'REALIZADO', 'CANCELADO']
  if (!allowed.includes(body.status))
    return NextResponse.json({ error: 'Status inválido' }, { status: 400 })

  try {
    await updateEventStatus(id, body.status)
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
