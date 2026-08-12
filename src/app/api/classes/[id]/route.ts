import { NextRequest, NextResponse } from 'next/server'
import { getCurrentProfile } from '@/lib/repositories/profiles'
import { updateClass, classNameExists } from '@/lib/repositories/classes'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const profile = await getCurrentProfile()
  if (!profile?.congregation_id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const roles = ['ADMIN_DISCIPULADO', 'DISCIPULADOR', 'ADMIN_PLATAFORMA']
  if (!roles.includes(profile.role)) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const { id } = await params
  const body = await req.json()

  if (body.name && await classNameExists(profile.congregation_id, body.name, id)) {
    return NextResponse.json({ error: 'Já existe uma turma com esse nome' }, { status: 409 })
  }

  try {
    const updated = await updateClass(id, {
      name: body.name,
      shift_id: body.shift_id,
      is_active: body.is_active,
    })
    return NextResponse.json(updated)
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
