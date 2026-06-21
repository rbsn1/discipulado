import { NextRequest, NextResponse } from 'next/server'
import { getCurrentProfile } from '@/lib/repositories/profiles'
import { getLessonAttendance, recordAttendance } from '@/lib/repositories/classes'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const profile = await getCurrentProfile()
  if (!profile) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const { id } = await params
  const items = await getLessonAttendance(id)
  return NextResponse.json(items)
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const profile = await getCurrentProfile()
  if (!profile) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const { id } = await params
  const body = await req.json()
  if (!Array.isArray(body.items)) {
    return NextResponse.json({ error: 'items deve ser um array' }, { status: 400 })
  }

  try {
    await recordAttendance(id, body.items, profile.id)
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
