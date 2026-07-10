import { NextRequest, NextResponse } from 'next/server'
import { getCurrentProfile } from '@/lib/repositories/profiles'
import { getWorshipServices, createWorshipService } from '@/lib/repositories/worship-services'

export async function GET() {
  const profile = await getCurrentProfile()
  if (!profile?.congregation_id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const services = await getWorshipServices(profile.congregation_id)
  return NextResponse.json(services)
}

export async function POST(req: NextRequest) {
  const profile = await getCurrentProfile()
  if (!profile?.congregation_id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  if (!['ADMIN_DISCIPULADO', 'ADMIN_PLATAFORMA'].includes(profile.role)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const body = await req.json()
  if (!body.name?.trim()) return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 })

  const service = await createWorshipService(profile.congregation_id, body.name.trim())
  return NextResponse.json(service, { status: 201 })
}
