import { NextRequest, NextResponse } from 'next/server'
import { getCurrentProfile } from '@/lib/repositories/profiles'
import { updateCaseAssignee } from '@/lib/repositories/cases'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const profile = await getCurrentProfile()
  if (!profile) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params
  const body = await req.json()

  try {
    await updateCaseAssignee(id, body.assigned_to ?? null, profile.id)
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
