import { NextRequest, NextResponse } from 'next/server'
import { getCurrentProfile, createUserWithProfile } from '@/lib/repositories/profiles'

export async function POST(req: NextRequest) {
  const profile = await getCurrentProfile()
  if (!profile || !['ADMIN_PLATAFORMA', 'ADMIN_DISCIPULADO'].includes(profile.role)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const body = await req.json()
  if (!body.email || !body.name) {
    return NextResponse.json({ error: 'Nome e e-mail são obrigatórios' }, { status: 400 })
  }

  // Admin de plataforma só é atribuído manualmente no banco, nunca pela aplicação
  if (body.role === 'ADMIN_PLATAFORMA') {
    return NextResponse.json({ error: 'Admin de plataforma não pode ser criado pela aplicação' }, { status: 403 })
  }

  try {
    const password = await createUserWithProfile(
      body.email,
      body.name,
      body.role ?? 'DISCIPULADOR',
      body.congregation_id ?? profile.congregation_id
    )
    return NextResponse.json({ success: true, password }, { status: 201 })
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 })
  }
}
