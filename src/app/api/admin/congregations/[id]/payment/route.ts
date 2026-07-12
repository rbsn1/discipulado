import { NextRequest, NextResponse } from 'next/server'
import { getCurrentProfile } from '@/lib/repositories/profiles'
import { getCongregationPayments, registerCongregationPayment } from '@/lib/repositories/congregations'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const profile = await getCurrentProfile()
  if (!profile || profile.role !== 'ADMIN_PLATAFORMA') {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const { id } = await params
  const payments = await getCongregationPayments(id)
  return NextResponse.json(payments)
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const profile = await getCurrentProfile()
  if (!profile || profile.role !== 'ADMIN_PLATAFORMA') {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json()
  if (!body.paid_until) {
    return NextResponse.json({ error: 'Data de vencimento obrigatória' }, { status: 400 })
  }

  try {
    const payment = await registerCongregationPayment(
      id,
      body.paid_until,
      body.amount ?? null,
      body.note ?? null
    )
    return NextResponse.json(payment, { status: 201 })
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
