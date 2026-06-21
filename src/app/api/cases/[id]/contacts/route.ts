import { NextRequest, NextResponse } from 'next/server'
import { getCurrentProfile } from '@/lib/repositories/profiles'
import { addContactAttempt, getContactAttempts } from '@/lib/repositories/cases'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const profile = await getCurrentProfile()
  if (!profile) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const { id } = await params
  const contacts = await getContactAttempts(id)
  return NextResponse.json(contacts)
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const profile = await getCurrentProfile()
  if (!profile) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const { id } = await params
  const body = await req.json()
  if (!body.outcome) return NextResponse.json({ error: 'outcome é obrigatório' }, { status: 400 })

  try {
    await addContactAttempt(id, body.outcome, body.note, profile.id)
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
