import { createClient } from '@/lib/supabase/server'
import type { CongregationPayment, AccessStatus } from '@/types'

export async function getCongregationPayments(congregationId: string): Promise<CongregationPayment[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('congregation_payments')
    .select('*, profiles ( name )')
    .eq('congregation_id', congregationId)
    .order('recorded_at', { ascending: false })

  if (error) throw error
  return data as unknown as CongregationPayment[]
}

export async function registerCongregationPayment(
  congregationId: string,
  paidUntil: string,
  amount: number | null,
  note: string | null
): Promise<CongregationPayment> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .rpc('register_congregation_payment', {
      p_congregation_id: congregationId,
      p_paid_until: paidUntil,
      p_amount: amount,
      p_note: note,
    })
    .single()

  if (error) throw error
  return data as CongregationPayment
}

export async function getMyAccessStatus(): Promise<AccessStatus | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_my_access_status').single()

  if (error) return null
  return data as AccessStatus
}

// Festa de Boas Vindas ligada pra congregação (migration 037). Na dúvida
// (erro de leitura) trata como ligada — é o default do banco e não esconde
// nada de quem já usa.
export async function isFbvEnabled(congregationId: string): Promise<boolean> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('congregations')
    .select('fbv_enabled')
    .eq('id', congregationId)
    .single()

  if (error || !data) return true
  return data.fbv_enabled !== false
}

export async function setFbvEnabled(congregationId: string, enabled: boolean): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('congregations')
    .update({ fbv_enabled: enabled })
    .eq('id', congregationId)

  if (error) throw error
}
