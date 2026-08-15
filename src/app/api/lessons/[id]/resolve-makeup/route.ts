import { NextRequest, NextResponse } from 'next/server'
import { getCurrentProfile } from '@/lib/repositories/profiles'
import { getLessonById, resolveMakeupAttendance } from '@/lib/repositories/classes'

// [id] é a aula de REPOSIÇÃO (não a original) — resolve server-side qual
// é a aula original (makeup_for_lesson_id) em vez de confiar no client,
// pra não depender de um id vindo solto no corpo da requisição.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const profile = await getCurrentProfile()
  if (!profile?.congregation_id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const roles = ['ADMIN_DISCIPULADO', 'DISCIPULADOR', 'ADMIN_PLATAFORMA']
  if (!roles.includes(profile.role)) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const { id } = await params
  const body = await req.json()
  if (!Array.isArray(body.disciple_ids) || body.disciple_ids.length === 0) {
    return NextResponse.json({ error: 'disciple_ids obrigatório' }, { status: 400 })
  }

  try {
    const lesson = await getLessonById(id)
    if (!lesson?.makeup_for_lesson_id) {
      return NextResponse.json({ error: 'Essa aula não é uma reposição' }, { status: 400 })
    }
    await resolveMakeupAttendance(lesson.makeup_for_lesson_id, body.disciple_ids, profile.id)
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
