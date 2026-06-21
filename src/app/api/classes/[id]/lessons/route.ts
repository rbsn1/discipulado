import { NextRequest, NextResponse } from 'next/server'
import { getCurrentProfile } from '@/lib/repositories/profiles'
import { getLessons, createLesson } from '@/lib/repositories/classes'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const profile = await getCurrentProfile()
  if (!profile) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const { id } = await params
  const lessons = await getLessons(id)
  return NextResponse.json(lessons)
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const profile = await getCurrentProfile()
  if (!profile) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  if (!body.date) return NextResponse.json({ error: 'date obrigatório' }, { status: 400 })

  try {
    const lesson = await createLesson(id, body.date, body.topic, body.module_template_id, profile.id)
    return NextResponse.json(lesson, { status: 201 })
  } catch (err: unknown) {
    const msg = (err as Error).message
    if (msg.includes('lessons_class_date_unique')) {
      return NextResponse.json({ error: 'Já existe uma aula nesta data para esta turma' }, { status: 409 })
    }
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
