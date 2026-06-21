import { NextRequest, NextResponse } from 'next/server'
import { getCurrentProfile } from '@/lib/repositories/profiles'
import { startCase, getCases } from '@/lib/repositories/cases'

export async function GET(req: NextRequest) {
  const profile = await getCurrentProfile()
  if (!profile?.congregation_id) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }
  const status = req.nextUrl.searchParams.getAll('status') as string[]
  const cases = await getCases(profile.congregation_id, {
    status: status.length ? status as import('@/types').CaseStatus[] : undefined,
  })
  return NextResponse.json(cases)
}

export async function POST(req: NextRequest) {
  const profile = await getCurrentProfile()
  if (!profile?.congregation_id) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const body = await req.json()
  try {
    const caseId = await startCase(body, profile.congregation_id, profile.id)
    return NextResponse.json({ id: caseId }, { status: 201 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro interno'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
