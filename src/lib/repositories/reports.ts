import { createClient } from '@/lib/supabase/server'

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

export async function getReportStats(congregationId: string): Promise<ReportStats> {
  const supabase = await createClient()

  const { data: cases } = await supabase
    .from('discipleship_cases')
    .select(`
      id, status, stage,
      post_discipleship ( integration_status, baptism_status, department_name, department_contacted_at )
    `)
    .eq('congregation_id', congregationId)

  const rows = cases ?? []
  const concluded = rows.filter(c => c.status === 'CONCLUIDO')

  const semDep   = concluded.filter(c => !c.post_discipleship || !(c.post_discipleship as any).department_name)
  const aguard   = concluded.filter(c => {
    const pd = c.post_discipleship as any
    return pd?.department_name && !pd?.department_contacted_at
  })
  const confirm  = concluded.filter(c => !!(c.post_discipleship as any)?.department_contacted_at)
  const batizado = concluded.filter(c => (c.post_discipleship as any)?.baptism_status === 'BATIZADO')

  const total = rows.length
  return {
    total_cases:          total,
    acolhimento:          rows.filter(c => c.stage === 'ACOLHIMENTO' && c.status !== 'CONCLUIDO').length,
    em_discipulado:       rows.filter(c => c.status === 'EM_DISCIPULADO').length,
    pausado:              rows.filter(c => c.status === 'PAUSADO').length,
    concluido:            concluded.length,
    sem_departamento:     semDep.length,
    aguardando_confirmacao: aguard.length,
    confirmados:          confirm.length,
    batizados:            batizado.length,
    taxa_conclusao:       total > 0 ? Math.round((concluded.length / total) * 100) : 0,
    taxa_integracao:      concluded.length > 0 ? Math.round((confirm.length / concluded.length) * 100) : 0,
  }
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
