import { NextRequest, NextResponse } from 'next/server'
import { getCurrentProfile } from '@/lib/repositories/profiles'
import { resumeCase } from '@/lib/repositories/cases'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const profile = await getCurrentProfile()
  if (!profile) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const { id } = await params
  try {
    await resumeCase(id, profile.id)
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
