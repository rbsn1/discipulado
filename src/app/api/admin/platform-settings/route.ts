import { NextRequest, NextResponse } from 'next/server'
import { getCurrentProfile } from '@/lib/repositories/profiles'
import { updatePlatformSettings } from '@/lib/repositories/platform-settings'

export async function PATCH(req: NextRequest) {
  const profile = await getCurrentProfile()
  if (!profile || profile.role !== 'ADMIN_PLATAFORMA') {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const body = await req.json()
  const login_verse_text = (body.login_verse_text ?? '').trim()
  const login_verse_reference = (body.login_verse_reference ?? '').trim()

  if (!login_verse_text || !login_verse_reference) {
    return NextResponse.json({ error: 'Texto e referência são obrigatórios' }, { status: 400 })
  }

  const data = await updatePlatformSettings({ login_verse_text, login_verse_reference })
  return NextResponse.json(data)
}
