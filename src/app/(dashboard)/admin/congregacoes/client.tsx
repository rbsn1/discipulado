'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Dialog } from '@/components/ui/dialog'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Plus, Building2, Pencil, CreditCard } from 'lucide-react'
import { THEME_PRESETS, deriveTheme } from '@/lib/theme'
import { LogoUploader } from '@/components/features/admin/logo-uploader'
import { formatDate, formatDateTime } from '@/lib/utils'
import type { Congregation, CongregationPayment } from '@/types'

const TIMEZONE_OPTIONS = [
  { value: 'America/Sao_Paulo',  label: 'Brasília (GMT-3)'             },
  { value: 'America/Manaus',     label: 'Manaus (GMT-4)'               },
  { value: 'America/Belem',      label: 'Belém (GMT-3)'                },
  { value: 'America/Fortaleza',  label: 'Fortaleza (GMT-3)'            },
  { value: 'America/Cuiaba',     label: 'Cuiabá (GMT-4)'               },
  { value: 'America/Porto_Velho',label: 'Porto Velho (GMT-4)'          },
  { value: 'America/Rio_Branco', label: 'Rio Branco (GMT-5)'           },
  { value: 'America/Noronha',    label: 'Fernando de Noronha (GMT-2)'  },
]

interface EditState {
  id:           string
  name:         string
  timezone:     string
  logoUrl:      string
  accentColor:  string
  sidebarColor: string
}

function billingBadge(c: Congregation): { variant: 'success' | 'danger' | 'muted'; label: string } {
  if (!c.is_active) return { variant: 'muted', label: 'Desativada' }
  if (!c.subscription_paid_until) return { variant: 'muted', label: 'Sem vencimento definido' }
  const overdue = new Date(c.subscription_paid_until) < new Date(new Date().toDateString())
  return overdue
    ? { variant: 'danger', label: `Vencida em ${formatDate(c.subscription_paid_until)}` }
    : { variant: 'success', label: `Em dia até ${formatDate(c.subscription_paid_until)}` }
}

// ── Preview realista com paleta derivada ──────────────────────────────────────

function SidebarPreview({ accent, sidebar }: { accent: string; sidebar: string }) {
  const palette = deriveTheme({ accentColor: accent, sidebarColor: sidebar })
  return (
    <div
      className="relative overflow-hidden rounded-xl p-3 shadow-lg ring-1 ring-white/5"
      style={{ background: `linear-gradient(160deg, ${palette.sidebarDark} 0%, ${palette.sidebarBg} 100%)` }}
    >
      {/* Brilho de topo */}
      <div
        className="pointer-events-none absolute -top-8 left-1/2 h-16 w-24 -translate-x-1/2 rounded-full blur-2xl"
        style={{ background: palette.glowColor }}
      />
      {/* Borda direita */}
      <div
        className="pointer-events-none absolute inset-y-0 right-0 w-px"
        style={{ background: `linear-gradient(180deg, transparent, ${palette.accentRing}, transparent)` }}
      />

      {/* Logo simulado */}
      <div className="relative mb-3 flex items-center gap-2">
        <div
          className="flex h-7 w-7 items-center justify-center rounded-lg shadow ring-1 ring-white/10"
          style={{ background: `linear-gradient(135deg, ${palette.accentLight}, ${palette.accent})` }}
        >
          <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <div>
          <div className="h-2 w-16 rounded-full bg-white/80" />
          <div className="mt-1 h-1.5 w-10 rounded-full" style={{ background: palette.mutedText }} />
        </div>
      </div>

      {/* Separador */}
      <div className="mb-2 h-px" style={{ background: palette.divider }} />

      {/* Nav items simulados */}
      <div className="flex flex-col gap-1">
        <div
          className="flex items-center gap-2 rounded-md px-2 py-1.5"
          style={{ background: palette.accentSubtle }}
        >
          <div className="h-3 w-3 rounded-sm" style={{ background: palette.accentLight }} />
          <div className="h-1.5 w-14 rounded-full bg-white/90" />
          <div className="ml-auto h-1.5 w-1.5 rounded-full" style={{ background: palette.accent }} />
        </div>
        {[40, 48, 32].map((w, i) => (
          <div key={i} className="flex items-center gap-2 rounded-md px-2 py-1.5">
            <div className="h-3 w-3 rounded-sm bg-white/20" />
            <div className="h-1.5 rounded-full bg-white/30" style={{ width: w }} />
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────

interface Props {
  congregations: Congregation[]
}

export function CongregacoesClient({ congregations }: Props) {
  const router = useRouter()

  const [showCreate, setShowCreate]         = useState(false)
  const [newName, setNewName]               = useState('')
  const [newTimezone, setNewTimezone]       = useState('America/Sao_Paulo')
  const [createLoading, setCreateLoading]   = useState(false)
  const [createError, setCreateError]       = useState('')

  const [editTarget, setEditTarget]         = useState<EditState | null>(null)
  const [editLoading, setEditLoading]       = useState(false)
  const [editError, setEditError]           = useState('')

  const [paymentTarget, setPaymentTarget]   = useState<Congregation | null>(null)
  const [paymentHistory, setPaymentHistory] = useState<CongregationPayment[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [paidUntil, setPaidUntil]           = useState('')
  const [amount, setAmount]                 = useState('')
  const [note, setNote]                     = useState('')
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [paymentError, setPaymentError]     = useState('')

  function openEdit(c: Congregation) {
    setEditError('')
    setEditTarget({
      id:           c.id,
      name:         c.name,
      timezone:     c.timezone,
      logoUrl:      c.logo_url ?? '',
      accentColor:  c.accent_color ?? '#4F46E5',
      sidebarColor: c.sidebar_color ?? '#0F172A',
    })
  }

  async function handleCreate() {
    if (!newName.trim()) { setCreateError('Nome obrigatório'); return }
    setCreateLoading(true)
    setCreateError('')
    const res = await fetch('/api/admin/congregations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim(), timezone: newTimezone }),
    })
    if (!res.ok) setCreateError((await res.json()).error)
    else { setShowCreate(false); setNewName(''); router.refresh() }
    setCreateLoading(false)
  }

  async function handleEdit() {
    if (!editTarget) return
    if (!editTarget.name.trim()) { setEditError('Nome obrigatório'); return }
    setEditLoading(true)
    setEditError('')
    const res = await fetch(`/api/admin/congregations/${editTarget.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name:          editTarget.name.trim(),
        timezone:      editTarget.timezone,
        logo_url:      editTarget.logoUrl || null,
        accent_color:  editTarget.accentColor,
        sidebar_color: editTarget.sidebarColor,
      }),
    })
    if (!res.ok) setEditError((await res.json()).error)
    else { setEditTarget(null); router.refresh() }
    setEditLoading(false)
  }

  async function handleToggle(id: string, isActive: boolean) {
    const res = await fetch(`/api/admin/congregations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !isActive }),
    })
    if (res.ok) router.refresh()
  }

  async function openPayment(c: Congregation) {
    setPaymentError('')
    setPaymentTarget(c)
    setPaidUntil(c.subscription_paid_until ?? '')
    setAmount('')
    setNote('')
    setHistoryLoading(true)
    const res = await fetch(`/api/admin/congregations/${c.id}/payment`)
    if (res.ok) setPaymentHistory(await res.json())
    setHistoryLoading(false)
  }

  async function handleRegisterPayment() {
    if (!paymentTarget) return
    if (!paidUntil) { setPaymentError('Data de vencimento obrigatória'); return }
    setPaymentLoading(true)
    setPaymentError('')
    const res = await fetch(`/api/admin/congregations/${paymentTarget.id}/payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paid_until: paidUntil,
        amount: amount ? Number(amount) : null,
        note: note.trim() || null,
      }),
    })
    if (!res.ok) {
      setPaymentError((await res.json()).error)
    } else {
      setPaymentTarget(null)
      router.refresh()
    }
    setPaymentLoading(false)
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Congregações</h1>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4" />
          Nova congregação
        </Button>
      </div>

      <div className="flex flex-col gap-3">
        {congregations.map(c => (
          <div key={c.id} className="flex items-center gap-4 rounded-lg border border-gray-200 bg-white p-4">
            <div
              className="rounded-lg p-2 shrink-0"
              style={{ background: c.sidebar_color ?? '#0F172A' }}
            >
              {c.logo_url
                ? <img src={c.logo_url} alt="Logo" className="h-5 w-5 rounded object-cover" />
                : <Building2 className="h-5 w-5" style={{ color: c.accent_color ?? '#4F46E5' }} />
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 truncate">{c.name}</p>
              <p className="text-xs text-gray-500">{c.timezone}</p>
            </div>
            <div
              className="h-4 w-4 shrink-0 rounded-full ring-2 ring-white shadow"
              style={{ background: c.accent_color ?? '#4F46E5' }}
              title="Cor do tema"
            />
            <Badge variant={billingBadge(c).variant}>
              {billingBadge(c).label}
            </Badge>
            <Button size="sm" variant="outline" onClick={() => openPayment(c)}>
              <CreditCard className="h-3.5 w-3.5" />
              Pagamento
            </Button>
            <Button size="sm" variant="outline" onClick={() => openEdit(c)}>
              <Pencil className="h-3.5 w-3.5" />
              Editar
            </Button>
            <Button size="sm" variant="outline" onClick={() => handleToggle(c.id, c.is_active)}>
              {c.is_active ? 'Desativar' : 'Ativar'}
            </Button>
          </div>
        ))}
      </div>

      {/* ── Dialog: criar ── */}
      <Dialog open={showCreate} onClose={() => setShowCreate(false)} title="Nova Congregação">
        <div className="flex flex-col gap-4">
          {createError && <Alert type="error">{createError}</Alert>}
          <Input
            label="Nome *"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Nome da congregação"
          />
          <Select
            label="Fuso horário"
            value={newTimezone}
            onChange={e => setNewTimezone(e.target.value)}
            options={TIMEZONE_OPTIONS}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
            <Button onClick={handleCreate} loading={createLoading}>Criar</Button>
          </div>
        </div>
      </Dialog>

      {/* ── Dialog: editar ── */}
      <Dialog open={!!editTarget} onClose={() => setEditTarget(null)} title="Editar Congregação">
        {editTarget && (
          <div className="flex flex-col gap-5">
            {editError && <Alert type="error">{editError}</Alert>}

            <Input
              label="Nome *"
              value={editTarget.name}
              onChange={e => setEditTarget({ ...editTarget, name: e.target.value })}
            />
            <Select
              label="Fuso horário"
              value={editTarget.timezone}
              onChange={e => setEditTarget({ ...editTarget, timezone: e.target.value })}
              options={TIMEZONE_OPTIONS}
            />

            <div className="h-px bg-gray-100" />

            {/* Identidade visual */}
            <div>
              <p className="mb-3 text-sm font-semibold text-gray-800">Identidade Visual</p>
              <SidebarPreview accent={editTarget.accentColor} sidebar={editTarget.sidebarColor} />
            </div>

            {/* Temas prontos */}
            <div>
              <p className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-gray-400">
                Temas prontos
              </p>
              <div className="grid grid-cols-2 gap-2">
                {THEME_PRESETS.map(p => {
                  const isActive =
                    editTarget.accentColor === p.accent &&
                    editTarget.sidebarColor === p.sidebar
                  return (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => setEditTarget({
                        ...editTarget,
                        accentColor:  p.accent,
                        sidebarColor: p.sidebar,
                      })}
                      className={`flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-all ${
                        isActive
                          ? 'border-indigo-400 bg-indigo-50 ring-1 ring-indigo-400/30'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {/* Mini preview das duas cores */}
                      <div
                        className="flex shrink-0 overflow-hidden rounded-md shadow-sm"
                        style={{ width: 28, height: 28 }}
                      >
                        <div className="h-full w-1/2" style={{ background: p.sidebar }} />
                        <div className="h-full w-1/2" style={{ background: p.accent  }} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium leading-tight text-gray-900">{p.label}</p>
                        <p className="text-xs text-gray-400">{p.description}</p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Personalização manual */}
            <div>
              <p className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-gray-400">
                Personalizar manualmente
              </p>
              <div className="flex gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-gray-600">Cor de destaque</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={editTarget.accentColor}
                      onChange={e => setEditTarget({ ...editTarget, accentColor: e.target.value })}
                      className="h-9 w-9 cursor-pointer rounded-md border border-gray-200 p-0.5"
                    />
                    <span className="font-mono text-xs text-gray-500">{editTarget.accentColor}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-gray-600">Fundo da sidebar</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={editTarget.sidebarColor}
                      onChange={e => setEditTarget({ ...editTarget, sidebarColor: e.target.value })}
                      className="h-9 w-9 cursor-pointer rounded-md border border-gray-200 p-0.5"
                    />
                    <span className="font-mono text-xs text-gray-500">{editTarget.sidebarColor}</span>
                  </div>
                </div>
              </div>
            </div>

            <LogoUploader
              congregationId={editTarget.id}
              currentUrl={editTarget.logoUrl}
              onChange={url => setEditTarget({ ...editTarget, logoUrl: url })}
            />

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditTarget(null)}>Cancelar</Button>
              <Button onClick={handleEdit} loading={editLoading}>Salvar</Button>
            </div>
          </div>
        )}
      </Dialog>

      {/* ── Dialog: pagamento ── */}
      <Dialog open={!!paymentTarget} onClose={() => setPaymentTarget(null)} title="Mensalidade">
        {paymentTarget && (
          <div className="flex flex-col gap-5">
            {paymentError && <Alert type="error">{paymentError}</Alert>}

            <div>
              <p className="text-sm font-semibold text-gray-800">{paymentTarget.name}</p>
              <Badge variant={billingBadge(paymentTarget).variant} className="mt-1.5">
                {billingBadge(paymentTarget).label}
              </Badge>
            </div>

            <div className="h-px bg-gray-100" />

            <div>
              <p className="mb-3 text-sm font-semibold text-gray-800">Registrar pagamento</p>
              <div className="flex flex-col gap-3">
                <Input
                  type="date"
                  label="Pago até *"
                  value={paidUntil}
                  onChange={e => setPaidUntil(e.target.value)}
                />
                <Input
                  type="number"
                  label="Valor (opcional)"
                  placeholder="0,00"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                />
                <Input
                  label="Observação (opcional)"
                  placeholder="Ex: PIX recebido dia 05"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                />
              </div>
              <div className="mt-3 flex justify-end">
                <Button onClick={handleRegisterPayment} loading={paymentLoading}>
                  Registrar pagamento
                </Button>
              </div>
            </div>

            <div className="h-px bg-gray-100" />

            <div>
              <p className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-gray-400">
                Histórico
              </p>
              {historyLoading ? (
                <p className="text-sm text-gray-400">Carregando…</p>
              ) : paymentHistory.length === 0 ? (
                <p className="text-sm text-gray-400">Nenhum pagamento registrado ainda.</p>
              ) : (
                <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
                  {paymentHistory.map(p => (
                    <div key={p.id} className="rounded-lg border border-gray-100 px-3 py-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-800">
                          Pago até {formatDate(p.paid_until)}
                          {p.amount != null && ` · R$ ${p.amount.toFixed(2)}`}
                        </span>
                        <span className="text-gray-400">{formatDateTime(p.recorded_at)}</span>
                      </div>
                      {p.note && <p className="mt-1 text-gray-500">{p.note}</p>}
                      {p.profiles?.name && (
                        <p className="mt-1 text-gray-400">Registrado por {p.profiles.name}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setPaymentTarget(null)}>Fechar</Button>
            </div>
          </div>
        )}
      </Dialog>
    </>
  )
}
