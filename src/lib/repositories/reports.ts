import { createClient } from '@/lib/supabase/server'

export interface ReportPeriod {
  start?: string // yyyy-mm-dd
  end?: string   // yyyy-mm-dd
}

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
  disciple_id: string
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

export interface AssigneeStats {
  assigned_to: string | null
  assignee_name: string
  total: number
  concluido: number
  taxa_conclusao: number
}

// Sem período (padrão) mantém o comportamento de sempre: todo o histórico.
// Com período, get_report_stats() filtra por coorte (dc.created_at) —
// "quantos casos começaram nesse intervalo, e em que status estão hoje".
export async function getReportStats(period?: ReportPeriod): Promise<ReportStats> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .rpc('get_report_stats', { p_start: period?.start ?? null, p_end: period?.end ?? null })
    .single()
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

export async function getReportStatsByAssignee(period?: ReportPeriod): Promise<AssigneeStats[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_report_stats_by_assignee', {
    p_start: period?.start ?? null,
    p_end: period?.end ?? null,
  })
  if (error) throw error
  return (data ?? []) as AssigneeStats[]
}

// "Concluídos" por mês vem de case_events (type = 'CONCLUSAO'), não de
// "criado nesse mês e já concluído hoje" — o cálculo antigo sub-representava
// sistematicamente os meses recentes (quem começou mês passado ainda não
// teve tempo de concluir), o que parecia "conclusão caindo" sem ser real.
export async function getMonthlyStats(congregationId: string): Promise<MonthlyPoint[]> {
  const supabase = await createClient()
  const since = new Date()
  since.setMonth(since.getMonth() - 11)
  since.setDate(1)
  since.setHours(0, 0, 0, 0)

  const [{ data: newCases }, { data: concludedEvents }] = await Promise.all([
    supabase
      .from('discipleship_cases')
      .select('created_at')
      .eq('congregation_id', congregationId)
      .gte('created_at', since.toISOString()),
    supabase
      .from('case_events')
      .select('created_at, discipleship_cases!inner ( congregation_id )')
      .eq('type', 'CONCLUSAO')
      .eq('discipleship_cases.congregation_id', congregationId)
      .gte('created_at', since.toISOString()),
  ])

  const PT_MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  const monthMap = new Map<string, { new_cases: number; concluded: number; label: string }>()

  for (let i = 0; i < 12; i++) {
    const d = new Date()
    d.setMonth(d.getMonth() - 11 + i)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    monthMap.set(key, { new_cases: 0, concluded: 0, label: PT_MONTHS[d.getMonth()] })
  }

  for (const row of newCases ?? []) {
    const d = new Date(row.created_at)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const entry = monthMap.get(key)
    if (entry) entry.new_cases++
  }

  for (const row of concludedEvents ?? []) {
    const d = new Date(row.created_at)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const entry = monthMap.get(key)
    if (entry) entry.concluded++
  }

  return Array.from(monthMap.entries()).map(([month, { new_cases, concluded, label }]) => ({
    month, label, new_cases, concluded,
  }))
}

export async function getReportCases(congregationId: string, period?: ReportPeriod): Promise<ReportCase[]> {
  const supabase = await createClient()

  // concluded_at vem de case_events (quando o case REALMENTE concluiu) —
  // antes vinha de post_discipleship.updated_at, que muda toda vez que o
  // departamento/batismo é editado depois, não representa a conclusão.
  const { data: events, error: eventsError } = await supabase
    .from('case_events')
    .select('case_id, created_at')
    .eq('type', 'CONCLUSAO')
  if (eventsError) throw eventsError
  const concludedAtByCase = new Map((events ?? []).map(e => [e.case_id, e.created_at]))

  const { data, error } = await supabase
    .from('discipleship_cases')
    .select(`
      id, disciple_id, status, stage, updated_at,
      disciples ( full_name, phone ),
      profiles!assigned_to ( name ),
      post_discipleship ( department_contacted_at, baptism_status, departments ( name ) )
    `)
    .eq('congregation_id', congregationId)
    .eq('status', 'CONCLUIDO')
    .order('updated_at', { ascending: false })
  if (error) throw error

  interface CaseRow {
    id: string
    disciple_id: string
    status: string
    stage: string
    updated_at: string
    disciples: { full_name: string; phone: string | null } | null
    profiles: { name: string } | null
    post_discipleship: {
      department_contacted_at: string | null
      baptism_status: string | null
      departments: { name: string } | null
    } | null
  }

  const rows = (data ?? []) as unknown as CaseRow[]
  let result = rows.map((c) => ({
    id:                      c.id,
    disciple_id:             c.disciple_id,
    disciple_name:           c.disciples?.full_name ?? '—',
    disciple_phone:          c.disciples?.phone ?? null,
    discipulador:            c.profiles?.name ?? null,
    status:                  c.status,
    stage:                   c.stage,
    concluded_at:            concludedAtByCase.get(c.id) ?? null,
    department_name:         c.post_discipleship?.departments?.name ?? null,
    department_contacted_at: c.post_discipleship?.department_contacted_at ?? null,
    baptism_status:          c.post_discipleship?.baptism_status ?? null,
    updated_at:              c.updated_at,
  }))

  if (period?.start) {
    result = result.filter(c => c.concluded_at && c.concluded_at >= period.start!)
  }
  if (period?.end) {
    const endExclusive = new Date(period.end)
    endExclusive.setDate(endExclusive.getDate() + 1)
    result = result.filter(c => c.concluded_at && c.concluded_at < endExclusive.toISOString())
  }

  return result
}
