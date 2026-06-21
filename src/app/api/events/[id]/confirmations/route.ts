import { NextRequest, NextResponse } from 'next/server'
import { getCurrentProfile } from '@/lib/repositories/profiles'
import { upsertConfirmation, getConfirmationsForEvent } from '@/lib/repositories/events'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const profile = await getCurrentProfile()
  if (!profile) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const { id } = await params
  const data = await getConfirmationsForEvent(id)
  return NextResponse.json(data)
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const profile = await getCurrentProfile()
  if (!profile) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const { id } = await params
  const body = await req.json()
  if (!body.case_id) return NextResponse.json({ error: 'case_id obrigatório' }, { status: 400 })

  try {
    await upsertConfirmation(
      id,
      body.case_id,
      body.confirmed ?? false,
      body.attended ?? false,
      body.class_shift ?? null,
      profile.id
    )
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
