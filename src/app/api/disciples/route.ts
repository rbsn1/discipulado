import { NextRequest, NextResponse } from 'next/server'
import { getCurrentProfile } from '@/lib/repositories/profiles'
import { createDisciple, getDisciples } from '@/lib/repositories/disciples'

export async function GET(req: NextRequest) {
  const profile = await getCurrentProfile()
  if (!profile?.congregation_id) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }
  const search = req.nextUrl.searchParams.get('search') ?? undefined
  const disciples = await getDisciples(profile.congregation_id, { search })
  return NextResponse.json(disciples)
}

export async function POST(req: NextRequest) {
  const profile = await getCurrentProfile()
  if (!profile?.congregation_id) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const roles = ['ADMIN_DISCIPULADO', 'DISCIPULADOR', 'SECRETARIA_DISCIPULADO', 'SM_DISCIPULADO', 'ADMIN_PLATAFORMA']
  if (!roles.includes(profile.role)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const body = await req.json()
  if (!body.full_name?.trim()) {
    return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })
  }

  try {
    const disciple = await createDisciple(profile.congregation_id, body, profile.id)
    return NextResponse.json(disciple, { status: 201 })
  } catch (err: unknown) {
    const msg = (err as { message?: string })?.message ?? 'Erro interno'
    console.error('[POST /api/disciples]', err)
    if (msg.includes('disciples_phone_congregation_unique')) {
      return NextResponse.json({ error: 'Este telefone já está cadastrado nesta congregação' }, { status: 409 })
    }
    if (msg.includes('row-level security') || msg.includes('violates')) {
      return NextResponse.json({ error: 'Sem permissão para cadastrar nesta congregação' }, { status: 403 })
    }
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
