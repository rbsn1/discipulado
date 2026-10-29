import { NextRequest, NextResponse } from 'next/server'
import { getCurrentProfile } from '@/lib/repositories/profiles'
import { setFbvEnabled } from '@/lib/repositories/congregations'

// Liga/desliga a Festa de Boas Vindas da congregação do próprio usuário.
// Só mexe em fbv_enabled — nunca repassa o body inteiro pro update.
export async function PATCH(req: NextRequest) {
  const profile = await getCurrentProfile()
  if (!profile) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  if (!['ADMIN_DISCIPULADO', 'ADMIN_PLATAFORMA'].includes(profile.role) || !profile.congregation_id) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const body = await req.json()
  if (typeof body.fbv_enabled !== 'boolean') {
    return NextResponse.json({ error: 'fbv_enabled deve ser true ou false' }, { status: 400 })
  }

  try {
    await setFbvEnabled(profile.congregation_id, body.fbv_enabled)
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    console.error('PATCH /api/admin/fbv', (err as Error).message)
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
