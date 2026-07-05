import { NextRequest, NextResponse } from 'next/server'
import { getCurrentProfile } from '@/lib/repositories/profiles'
import { updateClass } from '@/lib/repositories/classes'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const profile = await getCurrentProfile()
  if (!profile?.congregation_id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const roles = ['ADMIN_DISCIPULADO', 'DISCIPULADOR', 'ADMIN_PLATAFORMA']
  if (!roles.includes(profile.role)) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const { id } = await params
  const body = await req.json()

  try {
    const updated = await updateClass(id, {
      name: body.name,
      shift: body.shift,
      is_active: body.is_active,
    })
    return NextResponse.json(updated)
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
