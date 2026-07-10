import { createClient } from '@/lib/supabase/server'

export interface MonthlyPoint {
  month: string
  label: string
  new_cases: number
  concluded: number
}

export interface ReportStats {
  total_cases: number
  acolhimento: number
  em_discipulado: number
  pausado: number
  concluido: number
  // integração
  sem_departamento: number
  aguardando_confirmacao: number
  confirmados: number
  // batismo
  batizados: number
  // taxas
  taxa_conclusao: number
  taxa_integracao: number
}

export interface ReportCase {
  id: string
  disciple_name: string
  disciple_phone: string | null
  discipulador: string | null
  status: string
  stage: string
  concluded_at: string | null
  department_name: string | null
  department_contacted_at: string | null
  baptism_status: string | null
  updated_at: string
}

export async function getReportStats(): Promise<ReportStats> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_report_stats').single()
  if (error) throw error

  const stats = data as {
    total_cases: number
    acolhimento: number
    em_discipulado: number
    pausado: number
    concluido: number
    sem_departamento: number
    aguardando_confirmacao: number
    confirmados: number
    batizados: number
  }

  return {
    ...stats,
    taxa_conclusao:  stats.total_cases > 0 ? Math.round((stats.concluido / stats.total_cases) * 100) : 0,
    taxa_integracao: stats.concluido > 0 ? Math.round((stats.confirmados / stats.concluido) * 100) : 0,
  }
}

export async function getMonthlyStats(congregationId: string): Promise<MonthlyPoint[]> {
  const supabase = await createClient()
  const since = new Date()
  since.setMonth(since.getMonth() - 11)
  since.setDate(1)
  since.setHours(0, 0, 0, 0)

  const { data } = await supabase
    .from('discipleship_cases')
    .select('created_at, status')
    .eq('congregation_id', congregationId)
    .gte('created_at', since.toISOString())

  const PT_MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  const monthMap = new Map<string, { new_cases: number; concluded: number; label: string }>()

  for (let i = 0; i < 12; i++) {
    const d = new Date()
    d.setMonth(d.getMonth() - 11 + i)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    monthMap.set(key, { new_cases: 0, concluded: 0, label: PT_MONTHS[d.getMonth()] })
  }

  for (const row of data ?? []) {
    const d = new Date(row.created_at)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const entry = monthMap.get(key)
    if (entry) {
      entry.new_cases++
      if (row.status === 'CONCLUIDO') entry.concluded++
    }
  }

  return Array.from(monthMap.entries()).map(([month, { new_cases, concluded, label }]) => ({
    month, label, new_cases, concluded,
  }))
}

export async function getReportCases(congregationId: string): Promise<ReportCase[]> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('discipleship_cases')
    .select(`
      id, status, stage, updated_at,
      disciples ( full_name, phone ),
      profiles!assigned_to ( name ),
      post_discipleship ( department_name, department_contacted_at, baptism_status, updated_at )
    `)
    .eq('congregation_id', congregationId)
    .eq('status', 'CONCLUIDO')
    .order('updated_at', { ascending: false })

  return (data ?? []).map((c: any) => ({
    id:                     c.id,
    disciple_name:          c.disciples?.full_name ?? '—',
    disciple_phone:         c.disciples?.phone ?? null,
    discipulador:           c.profiles?.name ?? null,
    status:                 c.status,
    stage:                  c.stage,
    concluded_at:           c.post_discipleship?.updated_at ?? null,
    department_name:        c.post_discipleship?.department_name ?? null,
    department_contacted_at: c.post_discipleship?.department_contacted_at ?? null,
    baptism_status:         c.post_discipleship?.baptism_status ?? null,
    updated_at:             c.updated_at,
  }))
}
