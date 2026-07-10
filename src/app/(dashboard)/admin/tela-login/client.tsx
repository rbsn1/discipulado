'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import type { PlatformSettings } from '@/types'

export function TelaLoginClient({ settings }: { settings: PlatformSettings }) {
  const router = useRouter()
  const [verseText, setVerseText] = useState(settings.login_verse_text)
  const [verseReference, setVerseReference] = useState(settings.login_verse_reference)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  async function handleSave() {
    if (!verseText.trim() || !verseReference.trim()) {
      setError('Texto e referência são obrigatórios')
      return
    }
    setLoading(true)
    setError('')
    setSaved(false)
    const res = await fetch('/api/admin/platform-settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        login_verse_text: verseText.trim(),
        login_verse_reference: verseReference.trim(),
      }),
    })
    if (!res.ok) {
      setError((await res.json()).error)
    } else {
      setSaved(true)
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tela de login</h1>
        <p className="mt-1 text-sm text-gray-500">
          Texto bíblico exibido no painel da tela de login, antes de o usuário entrar.
        </p>
      </div>

      {error && <Alert type="error">{error}</Alert>}
      {saved && !error && <Alert type="success">Alterações salvas.</Alert>}

      <div className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-5">
        <Textarea
          label="Texto do versículo"
          value={verseText}
          onChange={e => { setVerseText(e.target.value); setSaved(false) }}
          rows={4}
        />
        <Input
          label="Referência"
          placeholder="Ex.: Mateus 28:19"
          value={verseReference}
          onChange={e => { setVerseReference(e.target.value); setSaved(false) }}
        />
        <Button onClick={handleSave} loading={loading} className="self-start">
          Salvar
        </Button>
      </div>
    </div>
  )
}
