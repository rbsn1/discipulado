import { NextRequest, NextResponse } from 'next/server'
import { getCurrentProfile } from '@/lib/repositories/profiles'
import { updateModuleProgress } from '@/lib/repositories/cases'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const profile = await getCurrentProfile()
  if (!profile) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params
  const body = await req.json()

  if (!body.module_template_id || !body.status) {
    return NextResponse.json({ error: 'module_template_id e status são obrigatórios' }, { status: 400 })
  }

  try {
    await updateModuleProgress(id, body.module_template_id, body.status, body.notes, profile.id)
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
