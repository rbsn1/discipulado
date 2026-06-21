/**
 * Testes unitários para regras de negócio do módulo de discipulado.
 *
 * Não dependem de banco de dados — testam a lógica pura de cálculo e
 * validação que está implementada em utils e services.
 */

import { describe, it, expect } from 'vitest'
import { getAttendanceCriticality } from '@/lib/utils'

// ---------------------------------------------------------------
// Cálculo de frequência e criticidade
// ---------------------------------------------------------------

describe('getAttendanceCriticality', () => {
  it('retorna "ok" quando frequência ≥ 75%', () => {
    expect(getAttendanceCriticality(75)).toBe('ok')
    expect(getAttendanceCriticality(100)).toBe('ok')
    expect(getAttendanceCriticality(80)).toBe('ok')
  })

  it('retorna "warning" quando frequência entre 50% e 74%', () => {
    expect(getAttendanceCriticality(74)).toBe('warning')
    expect(getAttendanceCriticality(50)).toBe('warning')
    expect(getAttendanceCriticality(60)).toBe('warning')
  })

  it('retorna "critical" quando frequência < 50%', () => {
    expect(getAttendanceCriticality(49)).toBe('critical')
    expect(getAttendanceCriticality(0)).toBe('critical')
  })
})

// ---------------------------------------------------------------
// Regra de cálculo de frequência (lógica espelhada do banco)
// ---------------------------------------------------------------

type AttendanceStatus = 'PRESENTE' | 'FALTA' | 'JUSTIFICADA'

function calculateAttendanceRate(records: AttendanceStatus[]): number {
  const total = records.length
  if (total === 0) return 0
  const present = records.filter(r => r === 'PRESENTE').length
  return Math.round((present / total) * 10000) / 100
}

describe('calculateAttendanceRate', () => {
  it('retorna 100 quando todas são PRESENTE', () => {
    expect(calculateAttendanceRate(['PRESENTE', 'PRESENTE', 'PRESENTE'])).toBe(100)
  })

  it('retorna 0 sem registros', () => {
    expect(calculateAttendanceRate([])).toBe(0)
  })

  it('retorna 0 quando todas são FALTA', () => {
    expect(calculateAttendanceRate(['FALTA', 'FALTA'])).toBe(0)
  })

  it('justificadas não contam como presença mas reduzem a taxa', () => {
    // 2 presentes / 4 total (incluindo 1 justificada) = 50%
    const records: AttendanceStatus[] = ['PRESENTE', 'PRESENTE', 'FALTA', 'JUSTIFICADA']
    expect(calculateAttendanceRate(records)).toBe(50)
  })

  it('calcula corretamente com mix de status', () => {
    // 3 presentes / 5 total = 60%
    const records: AttendanceStatus[] = ['PRESENTE', 'PRESENTE', 'PRESENTE', 'FALTA', 'JUSTIFICADA']
    expect(calculateAttendanceRate(records)).toBe(60)
  })
})

// ---------------------------------------------------------------
// Regras de conclusão de case
// ---------------------------------------------------------------

interface CaseSnapshot {
  total_lessons: number
  attendance_rate: number
  modules: { status: 'NAO_INICIADO' | 'EM_ANDAMENTO' | 'CONCLUIDO' }[]
}

function canConcludeCase(snapshot: CaseSnapshot): { ok: boolean; reasons: string[] } {
  const reasons: string[] = []

  const pendingModules = snapshot.modules.filter(m => m.status !== 'CONCLUIDO').length
  if (pendingModules > 0) {
    reasons.push(`${pendingModules} módulo(s) não concluído(s)`)
  }

  if (snapshot.total_lessons === 0) {
    reasons.push('nenhuma chamada registrada')
  }

  if (snapshot.attendance_rate < 75) {
    reasons.push(`frequência ${snapshot.attendance_rate}% abaixo de 75%`)
  }

  return { ok: reasons.length === 0, reasons }
}

describe('canConcludeCase', () => {
  it('permite conclusão quando todos os requisitos são atendidos', () => {
    const result = canConcludeCase({
      total_lessons: 8,
      attendance_rate: 80,
      modules: [
        { status: 'CONCLUIDO' },
        { status: 'CONCLUIDO' },
        { status: 'CONCLUIDO' },
      ],
    })
    expect(result.ok).toBe(true)
    expect(result.reasons).toHaveLength(0)
  })

  it('bloqueia quando há módulos pendentes', () => {
    const result = canConcludeCase({
      total_lessons: 8,
      attendance_rate: 80,
      modules: [
        { status: 'CONCLUIDO' },
        { status: 'EM_ANDAMENTO' },
      ],
    })
    expect(result.ok).toBe(false)
    expect(result.reasons).toContain('1 módulo(s) não concluído(s)')
  })

  it('bloqueia quando não há nenhuma chamada', () => {
    const result = canConcludeCase({
      total_lessons: 0,
      attendance_rate: 0,
      modules: [{ status: 'CONCLUIDO' }],
    })
    expect(result.ok).toBe(false)
    expect(result.reasons).toContain('nenhuma chamada registrada')
  })

  it('bloqueia quando frequência está abaixo de 75%', () => {
    const result = canConcludeCase({
      total_lessons: 10,
      attendance_rate: 70,
      modules: [{ status: 'CONCLUIDO' }],
    })
    expect(result.ok).toBe(false)
    expect(result.reasons).toContain('frequência 70% abaixo de 75%')
  })

  it('bloqueia com múltiplos problemas simultaneamente', () => {
    const result = canConcludeCase({
      total_lessons: 0,
      attendance_rate: 0,
      modules: [{ status: 'NAO_INICIADO' }],
    })
    expect(result.ok).toBe(false)
    expect(result.reasons).toHaveLength(3)
  })

  it('frequência exatamente igual a 75% é suficiente', () => {
    const result = canConcludeCase({
      total_lessons: 4,
      attendance_rate: 75,
      modules: [{ status: 'CONCLUIDO' }],
    })
    expect(result.ok).toBe(true)
  })
})

// ---------------------------------------------------------------
// Utilitários de CSV
// ---------------------------------------------------------------

import { toCSV } from '@/lib/utils'

describe('toCSV', () => {
  it('gera CSV correto com cabeçalho e dados', () => {
    const rows = [
      { Nome: 'João Silva', Telefone: '11999' },
      { Nome: 'Maria, Santos', Telefone: '11888' },
    ]
    const csv = toCSV(rows, ['Nome', 'Telefone'])
    const lines = csv.split('\n')
    expect(lines[0]).toBe('Nome,Telefone')
    expect(lines[1]).toBe('João Silva,11999')
    // Vírgula no nome deve ser escapada
    expect(lines[2]).toBe('"Maria, Santos",11888')
  })

  it('escapa aspas duplas', () => {
    const rows = [{ Nome: 'João "JJ" Silva', Telefone: '' }]
    const csv = toCSV(rows, ['Nome', 'Telefone'])
    expect(csv).toContain('"João ""JJ"" Silva"')
  })
})
