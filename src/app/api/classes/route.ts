import { NextRequest, NextResponse } from 'next/server'
import { getCurrentProfile } from '@/lib/repositories/profiles'
import { getClasses, createClass } from '@/lib/repositories/classes'

export async function GET() {
  const profile = await getCurrentProfile()
  if (!profile?.congregation_id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const classes = await getClasses(profile.congregation_id)
  return NextResponse.json(classes)
}

export async function POST(req: NextRequest) {
  const profile = await getCurrentProfile()
  if (!profile?.congregation_id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const roles = ['ADMIN_DISCIPULADO', 'DISCIPULADOR', 'ADMIN_PLATAFORMA']
  if (!roles.includes(profile.role)) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const body = await req.json()
  if (!body.name) return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 })

  const c = await createClass(profile.congregation_id, body.name, body.shift ?? 'NAO_INFORMADO')
  return NextResponse.json(c, { status: 201 })
}
