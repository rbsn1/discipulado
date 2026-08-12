import { NextRequest, NextResponse } from 'next/server'
import { getCurrentProfile } from '@/lib/repositories/profiles'
import { getDepartments, createDepartment } from '@/lib/repositories/departments'

export async function GET() {
  const profile = await getCurrentProfile()
  if (!profile?.congregation_id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const departments = await getDepartments(profile.congregation_id)
  return NextResponse.json(departments)
}

export async function POST(req: NextRequest) {
  const profile = await getCurrentProfile()
  if (!profile?.congregation_id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  if (!['ADMIN_DISCIPULADO', 'ADMIN_PLATAFORMA'].includes(profile.role)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const body = await req.json()
  if (!body.name?.trim()) return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 })

  const department = await createDepartment(profile.congregation_id, body.name.trim())
  return NextResponse.json(department, { status: 201 })
}
