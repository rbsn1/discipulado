'use client'

import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import type { ReportStats, ReportCase, MonthlyPoint } from '@/lib/repositories/reports'
import { Users, CheckCircle2, TrendingUp, Heart, Clock, AlertCircle, BookOpen, Droplets, Download } from 'lucide-react'

interface Props {
  stats: ReportStats
  cases: ReportCase[]
  monthly: MonthlyPoint[]
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  accent,
}: {
  label: string
  value: number | string
  sub?: string
  icon: React.ElementType
  accent: string
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="mt-1 text-3xl font-bold text-gray-900 font-variant-numeric tabular-nums">{value}</p>
          {sub && <p className="mt-1 text-xs text-gray-400">{sub}</p>}
        </div>
        <div className={`rounded-lg p-2.5 ${accent}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  )
}

function FunnelBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-gray-600">{label}</span>
        <span className="text-sm font-semibold text-gray-900 tabular-nums">{count} <span className="text-gray-400 font-normal">({pct}%)</span></span>
      </div>
      <div className="h-2 rounded-full bg-gray-100">
        <div className={`h-2 rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function MonthlyChart({ data }: { data: MonthlyPoint[] }) {
  const W = 600, H = 180
  const PAD = { top: 16, right: 16, bottom: 36, left: 32 }
  const chartW = W - PAD.left - PAD.right
  const chartH = H - PAD.top - PAD.bottom
  const maxVal = Math.max(1, ...data.map(d => Math.max(d.new_cases, d.concluded)))
  const barGroupW = chartW / data.length
  const barW = Math.min(barGroupW * 0.3, 14)
  const gap = 3

  const y = (v: number) => chartH - (v / maxVal) * chartH
  const ticks = Array.from(new Set([0, Math.ceil(maxVal / 2), maxVal]))

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 180 }}>
      <g transform={`translate(${PAD.left},${PAD.top})`}>
        {ticks.map(t => (
          <g key={t}>
            <line x1={0} x2={chartW} y1={y(t)} y2={y(t)} stroke="#f1f5f9" strokeWidth={1} />
            <text x={-6} y={y(t)} dy="0.32em" textAnchor="end" fontSize={9} fill="#94a3b8">{t}</text>
          </g>
        ))}
        {data.map((d, i) => {
          const cx = (i + 0.5) * barGroupW
          const x1 = cx - barW - gap / 2
          const x2 = cx + gap / 2
          return (
            <g key={d.month}>
              <rect x={x1} y={y(d.new_cases)} width={barW} height={Math.max(0, chartH - y(d.new_cases))} fill="#818cf8" rx={2} />
              <rect x={x2} y={y(d.concluded)} width={barW} height={Math.max(0, chartH - y(d.concluded))} fill="#34d399" rx={2} />
              <text x={cx} y={chartH + 14} textAnchor="middle" fontSize={9} fill="#64748b">{d.label}</text>
            </g>
          )
        })}
        <line x1={0} x2={chartW} y1={chartH} y2={chartH} stroke="#e2e8f0" strokeWidth={1} />
      </g>
    </svg>
  )
}

function downloadCSV(cases: ReportCase[]) {
  const header = ['Nome', 'Telefone', 'Discipulador', 'Departamento', 'Integração', 'Batismo', 'Atualizado']
  const rows = cases.map(c => [
    c.disciple_name,
    c.disciple_phone ?? '',
    c.discipulador ?? '',
    c.department_name ?? '',
    c.department_contacted_at ? 'Confirmado' : c.department_name ? 'Aguardando' : 'Sem departamento',
    c.baptism_status === 'BATIZADO' ? 'Batizado' : c.baptism_status === 'AGENDADO' ? 'Agendado' : 'Não batizado',
    formatDate(c.updated_at),
  ])
  const csv = [header, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `relatorio-discipulado.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function integrationLabel(c: ReportCase) {
  if (!c.department_name) return { label: 'Sem departamento', cls: 'bg-orange-100 text-orange-700' }
  if (!c.department_contacted_at) return { label: 'Aguardando confirmação', cls: 'bg-blue-100 text-blue-700' }
  return { label: 'Contato confirmado', cls: 'bg-green-100 text-green-700' }
}

function baptismLabel(status: string | null) {
  if (status === 'BATIZADO') return { label: 'Batizado', cls: 'bg-indigo-100 text-indigo-700' }
  if (status === 'AGENDADO') return { label: 'Batismo agendado', cls: 'bg-violet-100 text-violet-700' }
  return null
}

export function RelatoriosClient({ stats, cases, monthly }: Props) {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Relatórios</h1>
          <p className="text-sm text-gray-500 mt-1">Visão geral do discipulado</p>
        </div>
        <button
          onClick={() => downloadCSV(cases)}
          className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <Download className="h-4 w-4" />
          Exportar CSV
        </button>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total de casos" value={stats.total_cases} icon={Users} accent="bg-slate-100 text-slate-600" />
        <StatCard label="Em discipulado" value={stats.em_discipulado} icon={BookOpen} accent="bg-sky-100 text-sky-600" />
        <StatCard label="Concluídos" value={stats.concluido} icon={CheckCircle2} accent="bg-emerald-100 text-emerald-600" />
        <StatCard
          label="Taxa de conclusão"
          value={`${stats.taxa_conclusao}%`}
          icon={TrendingUp}
          accent="bg-indigo-100 text-indigo-600"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {/* Funil de integração */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Funil de integração</h2>
          <div className="flex flex-col gap-4">
            <FunnelBar label="Acolhimento" count={stats.acolhimento} total={stats.total_cases} color="bg-rose-400" />
            <FunnelBar label="Em discipulado" count={stats.em_discipulado} total={stats.total_cases} color="bg-sky-400" />
            <FunnelBar label="Concluídos" count={stats.concluido} total={stats.total_cases} color="bg-emerald-400" />
            <FunnelBar label="Contato confirmado" count={stats.confirmados} total={stats.total_cases} color="bg-indigo-500" />
          </div>
        </div>

        {/* Status de integração dos concluídos */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">
            Integração — {stats.concluido} concluído(s)
          </h2>
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100">
                <AlertCircle className="h-4 w-4 text-orange-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-600">Sem departamento</p>
              </div>
              <span className="text-lg font-bold text-gray-900 tabular-nums">{stats.sem_departamento}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                <Clock className="h-4 w-4 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-600">Aguardando confirmação</p>
              </div>
              <span className="text-lg font-bold text-gray-900 tabular-nums">{stats.aguardando_confirmacao}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-600">Contato confirmado</p>
                <p className="text-xs text-gray-400">{stats.taxa_integracao}% dos concluídos</p>
              </div>
              <span className="text-lg font-bold text-gray-900 tabular-nums">{stats.confirmados}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100">
                <Droplets className="h-4 w-4 text-indigo-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-600">Batizados</p>
              </div>
              <span className="text-lg font-bold text-gray-900 tabular-nums">{stats.batizados}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Gráfico mensal */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-700">Evolução mensal — últimos 12 meses</h2>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-indigo-400" />Acolhimentos</span>
            <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-emerald-400" />Concluídos</span>
          </div>
        </div>
        <MonthlyChart data={monthly} />
      </div>

      {/* Tabela de concluídos */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Histórico de concluídos</h2>
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Nome</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Discipulador</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Departamento</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Integração</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Batismo</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Atualizado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {cases.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-400">Nenhum concluído ainda</td>
                  </tr>
                )}
                {cases.map(c => {
                  const integ = integrationLabel(c)
                  const bapt = baptismLabel(c.baptism_status)
                  return (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <Link href={`/discipulandos/${c.id}`} className="font-medium text-blue-600 hover:underline">
                          {c.disciple_name}
                        </Link>
                        {c.disciple_phone && <p className="text-xs text-gray-400">{c.disciple_phone}</p>}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{c.discipulador ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{c.department_name ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${integ.cls}`}>
                          {integ.label}
                        </span>
                        {c.department_contacted_at && (
                          <p className="text-xs text-gray-400 mt-0.5">{formatDate(c.department_contacted_at)}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {bapt
                          ? <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${bapt.cls}`}>{bapt.label}</span>
                          : <span className="text-gray-400 text-xs">—</span>
                        }
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">{formatDate(c.updated_at)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
