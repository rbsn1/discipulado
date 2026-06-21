import { NextRequest, NextResponse } from 'next/server'
import { getCurrentProfile } from '@/lib/repositories/profiles'
import { enrollDisciple, unenrollDisciple } from '@/lib/repositories/classes'

export async function POST(req: NextRequest) {
  const profile = await getCurrentProfile()
  if (!profile) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await req.json()
  if (!body.disciple_id || !body.class_id || !body.case_id) {
    return NextResponse.json({ error: 'disciple_id, class_id e case_id são obrigatórios' }, { status: 400 })
  }

  try {
    const id = await enrollDisciple(body.disciple_id, body.class_id, body.case_id, profile.id)
    return NextResponse.json({ id }, { status: 201 })
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 })
  }
}

export async function DELETE(req: NextRequest) {
  const profile = await getCurrentProfile()
  if (!profile) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await req.json()
  await unenrollDisciple(body.disciple_id, body.case_id, profile.id)
  return NextResponse.json({ success: true })
}
