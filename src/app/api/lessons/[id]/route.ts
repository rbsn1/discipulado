import { NextRequest, NextResponse } from 'next/server'
import { getCurrentProfile } from '@/lib/repositories/profiles'
import { updateLesson } from '@/lib/repositories/classes'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const profile = await getCurrentProfile()
  if (!profile?.congregation_id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const roles = ['ADMIN_DISCIPULADO', 'DISCIPULADOR', 'ADMIN_PLATAFORMA']
  if (!roles.includes(profile.role)) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const { id } = await params
  const body = await req.json()
  if (!body.date) return NextResponse.json({ error: 'date obrigatório' }, { status: 400 })

  try {
    const lesson = await updateLesson(id, {
      date: body.date,
      topic: body.topic ?? null,
      module_template_id: body.module_template_id ?? null,
    })
    return NextResponse.json(lesson)
  } catch (err: unknown) {
    const msg = (err as Error).message
    if (msg.includes('lessons_class_date_unique')) {
      return NextResponse.json({ error: 'Já existe uma aula nesta data para esta turma' }, { status: 409 })
    }
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
