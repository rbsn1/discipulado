import { NextRequest, NextResponse } from 'next/server'
import { getCurrentProfile } from '@/lib/repositories/profiles'
import { updateModuleTemplate } from '@/lib/repositories/modules'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const profile = await getCurrentProfile()
  if (!profile || !['ADMIN_DISCIPULADO', 'ADMIN_PLATAFORMA'].includes(profile.role)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json()

  const m = await updateModuleTemplate(id, body)
  return NextResponse.json(m)
}
