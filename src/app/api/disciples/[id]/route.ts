import { NextRequest, NextResponse } from 'next/server'
import { getCurrentProfile } from '@/lib/repositories/profiles'
import { updateDisciple } from '@/lib/repositories/disciples'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const profile = await getCurrentProfile()
  if (!profile) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params
  const body = await req.json()

  try {
    const d = await updateDisciple(id, body)
    return NextResponse.json(d)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro'
    if (msg.includes('disciples_phone_congregation_unique')) {
      return NextResponse.json({ error: 'Telefone já cadastrado nesta congregação' }, { status: 409 })
    }
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
