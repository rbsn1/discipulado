import { NextRequest, NextResponse } from 'next/server'
import { getCurrentProfile, updateProfile } from '@/lib/repositories/profiles'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const profile = await getCurrentProfile()
  if (!profile || !['ADMIN_PLATAFORMA', 'ADMIN_DISCIPULADO'].includes(profile.role)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json()

  try {
    const updated = await updateProfile(id, body)
    return NextResponse.json(updated)
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
