import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { CaseStatus, CaseStage, UserRole, AttendanceStatus, ModuleProgressStatus } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return '—'
  try {
    return format(parseISO(date), 'dd/MM/yyyy', { locale: ptBR })
  } catch {
    return date
  }
}

export function formatDateTime(date: string | null | undefined): string {
  if (!date) return '—'
  try {
    return format(parseISO(date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
  } catch {
    return date
  }
}

export const CASE_STATUS_LABEL: Record<CaseStatus, string> = {
  EM_ACOLHIMENTO: 'Em Acolhimento',
  PENDENTE_MATRICULA: 'Pendente de Matrícula',
  EM_DISCIPULADO: 'Em Discipulado',
  PAUSADO: 'Pausado',
  CONCLUIDO: 'Concluído',
}

export const CASE_STATUS_COLOR: Record<CaseStatus, string> = {
  EM_ACOLHIMENTO: 'bg-rose-100 text-rose-800',
  PENDENTE_MATRICULA: 'bg-yellow-100 text-yellow-800',
  EM_DISCIPULADO: 'bg-blue-100 text-blue-800',
  PAUSADO: 'bg-gray-100 text-gray-800',
  CONCLUIDO: 'bg-green-100 text-green-800',
}

export const CASE_STAGE_LABEL: Record<CaseStage, string> = {
  ACOLHIMENTO: 'Acolhimento',
  DISCIPULADO: 'Discipulado',
  POS_DISCIPULADO: 'Pós-Discipulado',
}

export const ROLE_LABEL: Record<UserRole, string> = {
  ADMIN_PLATAFORMA: 'Admin da Plataforma',
  ADMIN_DISCIPULADO: 'Admin do Discipulado',
  DISCIPULADOR: 'Acolhedor',
  SECRETARIA_DISCIPULADO: 'Secretaria',
  SM_DISCIPULADO: 'SM Discipulado',
}

export const ATTENDANCE_LABEL: Record<AttendanceStatus, string> = {
  PRESENTE: 'Presente',
  FALTA: 'Falta',
  JUSTIFICADA: 'Falta Justificada',
}

export const ATTENDANCE_COLOR: Record<AttendanceStatus, string> = {
  PRESENTE: 'bg-green-100 text-green-800',
  FALTA: 'bg-red-100 text-red-800',
  JUSTIFICADA: 'bg-yellow-100 text-yellow-800',
}

// Falta pendente de reposição por ter sido matriculado depois daquela aula
// não é uma falta de verdade (ninguém marcou ausência) — rótulo e cor
// próprios pra não parecer que o discipulador registrou uma falta à toa.
export function absenceLabel(item: { status: AttendanceStatus; pre_enrollment?: boolean }): string {
  return item.pre_enrollment ? 'Matriculado depois' : ATTENDANCE_LABEL[item.status]
}

export function absenceColor(item: { status: AttendanceStatus; pre_enrollment?: boolean }): string {
  return item.pre_enrollment ? 'bg-blue-100 text-blue-800' : ATTENDANCE_COLOR[item.status]
}

export const MODULE_STATUS_LABEL: Record<ModuleProgressStatus, string> = {
  NAO_INICIADO: 'Não Iniciado',
  EM_ANDAMENTO: 'Em Andamento',
  CONCLUIDO: 'Concluído',
}

export const MODULE_STATUS_COLOR: Record<ModuleProgressStatus, string> = {
  NAO_INICIADO: 'bg-gray-100 text-gray-700',
  EM_ANDAMENTO: 'bg-blue-100 text-blue-800',
  CONCLUIDO: 'bg-green-100 text-green-800',
}

export function getAttendanceCriticality(rate: number): 'ok' | 'warning' | 'critical' {
  if (rate >= 75) return 'ok'
  if (rate >= 50) return 'warning'
  return 'critical'
}

// Converte array de objetos para CSV
export function toCSV(rows: Record<string, unknown>[], headers: string[]): string {
  const escape = (v: unknown) => {
    const s = String(v ?? '')
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`
    }
    return s
  }
  const lines = [
    headers.join(','),
    ...rows.map(row => headers.map(h => escape(row[h])).join(',')),
  ]
  return lines.join('\n')
}

export function downloadCSV(csv: string, filename: string) {
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
