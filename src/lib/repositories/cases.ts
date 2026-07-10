import { createClient } from '@/lib/supabase/server'
import type {
  CaseListItem,
  CaseStatus,
  StartCaseInput,
  CaseEvent,
  ContactAttempt,
  ContactOutcome,
} from '@/types'

// Só os campos renderizados nas listagens de acolhimento/confraternização (ver CaseListItem)
export async function getCases(congregationId: string, filters?: {
  status?: CaseStatus[]
  assigned_to?: string
  search?: string
}): Promise<CaseListItem[]> {
  const supabase = await createClient()
  let query = supabase
    .from('discipleship_cases')
    .select(`
      id, disciple_id, status, assigned_to, welcomed_on, last_contact_at, attendance_rate, created_at,
      disciples ( full_name, phone ),
      profiles!assigned_to ( name )
    `)
    .eq('congregation_id', congregationId)
    .order('created_at', { ascending: false })

  if (filters?.status?.length) {
    query = query.in('status', filters.status)
  }

  if (filters?.assigned_to) {
    query = query.eq('assigned_to', filters.assigned_to)
  }

  const { data, error } = await query
  if (error) throw error

  let result = data as unknown as CaseListItem[]
  if (filters?.search) {
    const s = filters.search.toLowerCase()
    result = result.filter(c =>
      c.disciples?.full_name?.toLowerCase().includes(s) ||
      c.disciples?.phone?.includes(s)
    )
  }
  return result
}

export async function startCase(
  input: StartCaseInput,
  congregationId: string,
  createdBy: string
): Promise<string> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('create_discipleship_case', {
    p_disciple_id: input.disciple_id,
    p_congregation_id: congregationId,
    p_assigned_to: input.assigned_to || null,
    p_welcomed_on: input.welcomed_on || null,
    p_notes: input.notes || null,
    p_created_by: createdBy,
  })

  if (error) throw error
  return data as string
}

export async function updateCaseAssignee(
  caseId: string,
  assignedTo: string | null,
  updatedBy: string
): Promise<void> {
  const supabase = await createClient()
  const { error: updateError } = await supabase
    .from('discipleship_cases')
    .update({ assigned_to: assignedTo })
    .eq('id', caseId)

  if (updateError) throw updateError

  const { error: eventError } = await supabase
    .from('case_events')
    .insert({
      case_id: caseId,
      type: 'NOTA',
      description: assignedTo
        ? 'Responsável atribuído'
        : 'Responsável removido',
      created_by: updatedBy,
    })
  if (eventError) throw eventError
}

export async function pauseCase(caseId: string, createdBy: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('discipleship_cases')
    .update({ status: 'PAUSADO' })
    .eq('id', caseId)
    .eq('status', 'EM_DISCIPULADO')

  if (error) throw error

  await supabase.from('case_events').insert({
    case_id: caseId,
    type: 'PAUSA',
    description: 'Discipulado pausado',
    created_by: createdBy,
  })
}

export async function resumeCase(caseId: string, createdBy: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('discipleship_cases')
    .update({ status: 'EM_DISCIPULADO' })
    .eq('id', caseId)
    .eq('status', 'PAUSADO')

  if (error) throw error

  await supabase.from('case_events').insert({
    case_id: caseId,
    type: 'RETOMADA',
    description: 'Discipulado retomado',
    created_by: createdBy,
  })
}

export async function concludeCase(caseId: string, createdBy: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase.rpc('conclude_case', {
    p_case_id: caseId,
    p_created_by: createdBy,
  })
  if (error) throw error
}

export async function getCaseTimeline(caseId: string): Promise<CaseEvent[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('case_events')
    .select('*, profiles!created_by ( id, name )')
    .eq('case_id', caseId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as CaseEvent[]
}

export async function getContactAttempts(caseId: string): Promise<ContactAttempt[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('contact_attempts')
    .select('*')
    .eq('case_id', caseId)
    .order('occurred_at', { ascending: false })

  if (error) throw error
  return data as ContactAttempt[]
}

export async function addContactAttempt(
  caseId: string,
  outcome: ContactOutcome,
  note: string | undefined,
  createdBy: string
): Promise<void> {
  const supabase = await createClient()
  const { error: contactError } = await supabase
    .from('contact_attempts')
    .insert({
      case_id: caseId,
      outcome,
      note: note || null,
      created_by: createdBy,
    })

  if (contactError) throw contactError

  // Atualizar last_contact_at e inserir evento
  await supabase
    .from('discipleship_cases')
    .update({ last_contact_at: new Date().toISOString() })
    .eq('id', caseId)

  await supabase.from('case_events').insert({
    case_id: caseId,
    type: 'CONTATO',
    description: `Contato registrado: ${outcome}`,
    metadata: { outcome, note },
    created_by: createdBy,
  })
}

export async function updateModuleProgress(
  caseId: string,
  moduleTemplateId: string,
  status: 'NAO_INICIADO' | 'EM_ANDAMENTO' | 'CONCLUIDO',
  notes: string | undefined,
  updatedBy: string
): Promise<void> {
  const supabase = await createClient()
  const now = new Date().toISOString()
  const update: Record<string, unknown> = { status, notes: notes || null }

  if (status === 'EM_ANDAMENTO') update.started_at = now
  if (status === 'CONCLUIDO') {
    update.completed_at = now
    update.completed_by = updatedBy
  }

  const { error } = await supabase
    .from('case_module_progress')
    .update(update)
    .eq('case_id', caseId)
    .eq('module_template_id', moduleTemplateId)

  if (error) throw error

  const eventType =
    status === 'CONCLUIDO' ? 'MODULO_CONCLUIDO' : 'MODULO_INICIADO'

  await supabase.from('case_events').insert({
    case_id: caseId,
    type: eventType,
    description: `Módulo ${status === 'CONCLUIDO' ? 'concluído' : 'iniciado'}`,
    metadata: { module_template_id: moduleTemplateId, status },
    created_by: updatedBy,
  })
}

export interface DashboardStats {
  acolhimento: number
  pendente_matricula: number
  em_discipulado: number
  pausado: number
  concluido: number
  sem_responsavel: number
  sem_matricula: number
  baixa_frequencia: number
  sem_contato_recente: number
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_dashboard_stats').single()

  if (error) throw error
  return data as DashboardStats
}
