import { NextRequest, NextResponse } from 'next/server'
import { getCurrentProfile } from '@/lib/repositories/profiles'
import { getModuleTemplates, createModuleTemplate } from '@/lib/repositories/modules'

export async function GET() {
  const profile = await getCurrentProfile()
  if (!profile?.congregation_id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const modules = await getModuleTemplates(profile.congregation_id)
  return NextResponse.json(modules)
}

export async function POST(req: NextRequest) {
  const profile = await getCurrentProfile()
  if (!profile?.congregation_id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  if (!['ADMIN_DISCIPULADO', 'ADMIN_PLATAFORMA'].includes(profile.role)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const body = await req.json()
  if (!body.title) return NextResponse.json({ error: 'Título obrigatório' }, { status: 400 })

  const modules = await getModuleTemplates(profile.congregation_id)
  const m = await createModuleTemplate(
    profile.congregation_id,
    body.title,
    body.description,
    body.sort_order ?? (modules.length + 1)
  )
  return NextResponse.json(m, { status: 201 })
}
