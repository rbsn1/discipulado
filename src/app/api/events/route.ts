import { NextRequest, NextResponse } from 'next/server'
import { getCurrentProfile } from '@/lib/repositories/profiles'
import { createEvent } from '@/lib/repositories/events'

export async function POST(req: NextRequest) {
  const profile = await getCurrentProfile()
  if (!profile?.congregation_id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const roles = ['ADMIN_DISCIPULADO', 'ADMIN_PLATAFORMA']
  if (!roles.includes(profile.role)) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const body = await req.json()
  if (!body.title || !body.date) return NextResponse.json({ error: 'Título e data obrigatórios' }, { status: 400 })

  try {
    const event = await createEvent(profile.congregation_id, body.title, body.date, body.notes, profile.id)
    return NextResponse.json(event, { status: 201 })
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
