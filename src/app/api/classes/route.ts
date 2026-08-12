import { NextRequest, NextResponse } from 'next/server'
import { getCurrentProfile } from '@/lib/repositories/profiles'
import { getClasses, createClass, classNameExists } from '@/lib/repositories/classes'

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

  if (await classNameExists(profile.congregation_id, body.name)) {
    return NextResponse.json({ error: 'Já existe uma turma com esse nome' }, { status: 409 })
  }

  const c = await createClass(profile.congregation_id, body.name, body.shift_id ?? null)
  return NextResponse.json(c, { status: 201 })
}
