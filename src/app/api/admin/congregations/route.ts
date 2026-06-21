import { NextRequest, NextResponse } from 'next/server'
import { getCurrentProfile } from '@/lib/repositories/profiles'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const profile = await getCurrentProfile()
  if (!profile || profile.role !== 'ADMIN_PLATAFORMA') {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const body = await req.json()
  if (!body.name) return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 })

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('congregations')
    .insert({ name: body.name, timezone: body.timezone ?? 'America/Sao_Paulo' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
