// =============================================================
// Tipos centrais da aplicação de discipulado
// =============================================================

export type UserRole =
  | 'ADMIN_PLATAFORMA'
  | 'ADMIN_DISCIPULADO'
  | 'DISCIPULADOR'
  | 'SECRETARIA_DISCIPULADO'
  | 'SM_DISCIPULADO'

export type CaseStatus =
  | 'PENDENTE_MATRICULA'
  | 'EM_DISCIPULADO'
  | 'PAUSADO'
  | 'CONCLUIDO'

export type CaseStage = 'ACOLHIMENTO' | 'DISCIPULADO' | 'POS_DISCIPULADO'

export type ModuleProgressStatus = 'NAO_INICIADO' | 'EM_ANDAMENTO' | 'CONCLUIDO'

export type ClassShift = 'MANHA' | 'TARDE' | 'NOITE' | 'NAO_INFORMADO'

export type AttendanceStatus = 'PRESENTE' | 'FALTA' | 'JUSTIFICADA'

export type ContactOutcome =
  | 'ATENDEU'
  | 'NAO_ATENDEU'
  | 'MENSAGEM_ENVIADA'
  | 'VISITA_REALIZADA'

export type EventType = 'CONFRATERNIZACAO'

export type EventStatus = 'PLANEJADO' | 'REALIZADO' | 'CANCELADO'

export type IntegrationStatus = 'PENDENTE' | 'EM_ANDAMENTO' | 'INTEGRADO' | 'DESISTIU'

export type BaptismStatus = 'NAO_BATIZADO' | 'BATIZADO' | 'AGENDADO'

export type CaseEventType =
  | 'CADASTRO'
  | 'ACOLHIMENTO'
  | 'MATRICULA'
  | 'DESmatricula'
  | 'MODULO_INICIADO'
  | 'MODULO_CONCLUIDO'
  | 'CHAMADA'
  | 'CONTATO'
  | 'PAUSA'
  | 'RETOMADA'
  | 'CONCLUSAO'
  | 'POS_DISCIPULADO'
  | 'NOTA'

// ---------------------------------------------------------------
// Entidades do banco
// ---------------------------------------------------------------

export interface Congregation {
  id: string
  name: string
  timezone: string
  is_active: boolean
  logo_url?: string | null
  accent_color?: string | null
  sidebar_color?: string | null
  created_at: string
  updated_at: string
}

export interface Profile {
  id: string
  name: string
  email: string
  congregation_id: string | null
  role: UserRole
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ProfileWithCongregation extends Profile {
  congregations: Pick<Congregation, 'id' | 'name'> | null
}

export interface Disciple {
  id: string
  congregation_id: string
  full_name: string
  phone: string | null
  email: string | null
  birth_date: string | null
  address: string | null
  conversion_date: string | null
  origin: string | null
  worship_service_id: string | null
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface DiscipleWithCase extends Disciple {
  discipleship_cases: DiscipleshipCase[]
  worship_services: Pick<WorshipService, 'id' | 'name'> | null
}

// Versão enxuta usada na listagem de /discipulandos — só os campos
// realmente renderizados/filtráveis na tabela (ver getDisciples em repositories/disciples.ts)
export interface DiscipleListItem {
  id: string
  full_name: string
  phone: string | null
  origin: string | null
  created_at: string
  worship_services: Pick<WorshipService, 'name'> | null
  discipleship_cases: (Pick<DiscipleshipCase, 'status' | 'assigned_to'> & {
    profiles: Pick<Profile, 'name'> | null
  })[]
  class_enrollments: { active: boolean; class_id: string; classes: Pick<Class, 'name'> | null }[]
}

export interface DiscipleshipCase {
  id: string
  disciple_id: string
  congregation_id: string
  status: CaseStatus
  stage: CaseStage
  assigned_to: string | null
  welcomed_on: string | null
  notes: string | null
  total_lessons: number
  present_count: number
  justified_count: number
  absence_count: number
  attendance_rate: number
  last_contact_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface DiscipleshipCaseWithRelations extends DiscipleshipCase {
  disciples: Disciple
  profiles: Pick<Profile, 'id' | 'name'> | null
  case_module_progress: CaseModuleProgress[]
}

// Versão enxuta usada nas listagens de cases (acolhimento, confraternização) —
// só os campos realmente renderizados (ver getCases em repositories/cases.ts)
export interface CaseListItem {
  id: string
  disciple_id: string
  status: CaseStatus
  assigned_to: string | null
  welcomed_on: string | null
  last_contact_at: string | null
  attendance_rate: number
  created_at: string
  disciples: Pick<Disciple, 'full_name' | 'phone'>
  profiles: Pick<Profile, 'name'> | null
}

export interface ModuleTemplate {
  id: string
  congregation_id: string
  title: string
  description: string | null
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface WorshipService {
  id: string
  congregation_id: string
  name: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface PlatformSettings {
  id: number
  login_verse_text: string
  login_verse_reference: string
  updated_at: string
}

export interface CaseModuleProgress {
  case_id: string
  module_template_id: string
  status: ModuleProgressStatus
  started_at: string | null
  completed_at: string | null
  completed_by: string | null
  notes: string | null
  created_at: string
  updated_at: string
  module_templates?: Pick<ModuleTemplate, 'id' | 'title' | 'sort_order'>
}

export interface Class {
  id: string
  congregation_id: string
  name: string
  shift: ClassShift
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ClassEnrollment {
  id: string
  class_id: string
  disciple_id: string
  enrolled_at: string
  active: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface Lesson {
  id: string
  class_id: string
  date: string
  topic: string | null
  module_template_id: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface AttendanceItem {
  id: string
  lesson_id: string
  disciple_id: string
  status: AttendanceStatus
  note: string | null
  marked_at: string
  marked_by: string | null
  created_at: string
  updated_at: string
}

export interface ContactAttempt {
  id: string
  case_id: string
  occurred_at: string
  outcome: ContactOutcome
  note: string | null
  created_by: string | null
  created_at: string
}

export interface Event {
  id: string
  congregation_id: string
  type: EventType
  title: string
  date: string
  status: EventStatus
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface EventConfirmation {
  id: string
  event_id: string
  case_id: string
  confirmed: boolean
  attended: boolean
  class_shift: ClassShift | null
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface CaseEvent {
  id: string
  case_id: string
  type: CaseEventType
  description: string
  metadata: Record<string, unknown> | null
  created_by: string | null
  created_at: string
  profiles?: Pick<Profile, 'id' | 'name'> | null
}

export interface PostDiscipleship {
  case_id: string
  integration_status: IntegrationStatus
  baptism_status: BaptismStatus
  department_name: string | null
  notes: string | null
  department_contacted_at: string | null
  department_contacted_by: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
}

// ---------------------------------------------------------------
// DTOs de formulário
// ---------------------------------------------------------------

export interface CreateDiscipleInput {
  full_name: string
  phone?: string
  email?: string
  birth_date?: string
  address?: string
  conversion_date?: string
  origin?: string
  worship_service_id?: string
  notes?: string
}

export interface StartCaseInput {
  disciple_id: string
  assigned_to?: string
  welcomed_on?: string
  notes?: string
}

export interface CreateLessonInput {
  class_id: string
  date: string
  topic?: string
  module_template_id?: string
}

export interface AttendanceItemInput {
  disciple_id: string
  status: AttendanceStatus
  note?: string
}

// ---------------------------------------------------------------
// Tipos de dashboard
// ---------------------------------------------------------------

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
