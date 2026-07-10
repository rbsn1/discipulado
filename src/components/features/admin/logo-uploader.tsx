'use client'

import { useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { Upload, X, ImageIcon, Loader2 } from 'lucide-react'

interface LogoUploaderProps {
  congregationId: string
  currentUrl:     string        // URL atual (pode ser vazia)
  onChange:       (url: string) => void   // notifica o pai da nova URL
}

const ACCEPT = 'image/png,image/jpeg,image/webp,image/svg+xml'

export function LogoUploader({ congregationId, currentUrl, onChange }: LogoUploaderProps) {
  const inputRef           = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string>(currentUrl)
  const [uploading, setUploading] = useState(false)
  const [error, setError]  = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)

  async function upload(file: File) {
    setError(null)
    setUploading(true)

    // Preview local imediato (blob URL)
    const localUrl = URL.createObjectURL(file)
    setPreview(localUrl)

    const fd = new FormData()
    fd.append('file', file)

    const res = await fetch(`/api/admin/congregations/${congregationId}/logo`, {
      method: 'POST',
      body: fd,
    })

    const data = await res.json()
    setUploading(false)

    if (!res.ok) {
      setError(data.error ?? 'Erro no upload')
      setPreview(currentUrl) // reverte preview
      return
    }

    // Cache-bust: força o browser a recarregar a imagem do CDN
    const finalUrl = `${data.url}?t=${Date.now()}`
    setPreview(finalUrl)
    onChange(finalUrl)
    URL.revokeObjectURL(localUrl)
  }

  async function handleRemove() {
    setError(null)
    setUploading(true)
    const res = await fetch(`/api/admin/congregations/${congregationId}/logo`, {
      method: 'DELETE',
    })
    setUploading(false)
    if (!res.ok) {
      setError('Erro ao remover logo')
      return
    }
    setPreview('')
    onChange('')
  }

  function handleFile(file: File | undefined | null) {
    if (!file) return
    upload(file)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    handleFile(e.dataTransfer.files[0])
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-medium text-gray-600">Logo da congregação</p>

      <div className="flex items-center gap-4">
        {/* Preview */}
        <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-gray-200 bg-gray-50">
          {preview ? (
            <>
              <img
                src={preview}
                alt="Logo"
                className="h-full w-full object-contain p-1"
              />
              {/* Botão remover */}
              {!uploading && (
                <button
                  type="button"
                  onClick={handleRemove}
                  className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-rose-600 text-white opacity-0 transition-opacity hover:opacity-100 focus:opacity-100 group-hover:opacity-100"
                  title="Remover logo"
                  aria-label="Remover logo"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </>
          ) : (
            <ImageIcon className="h-6 w-6 text-gray-300" />
          )}
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/80">
              <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
            </div>
          )}
        </div>

        {/* Drop zone / botão de upload */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={e => e.key === 'Enter' && inputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={cn(
            'flex flex-1 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed px-4 py-4 text-center transition-colors',
            dragOver
              ? 'border-indigo-400 bg-indigo-50'
              : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50',
            uploading && 'pointer-events-none opacity-60'
          )}
          aria-label="Clique ou arraste uma imagem para fazer upload da logo"
        >
          <Upload className={cn('h-5 w-5', dragOver ? 'text-indigo-500' : 'text-gray-400')} />
          <div>
            <p className="text-xs font-medium text-gray-700">
              {dragOver ? 'Solte aqui' : 'Clique ou arraste'}
            </p>
            <p className="text-xs text-gray-400">PNG, JPG, WebP ou SVG · máx. 512 KB</p>
          </div>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          aria-hidden="true"
          onChange={e => handleFile(e.target.files?.[0])}
        />
      </div>

      {error && (
        <p className="text-xs text-rose-600">{error}</p>
      )}

      {/* Campo de URL manual como fallback colapsável */}
      <details className="mt-1">
        <summary className="cursor-pointer text-xs text-gray-400 hover:text-gray-600 select-none">
          Ou informe uma URL diretamente
        </summary>
        <input
          type="url"
          value={preview.includes('blob:') ? '' : preview}
          onChange={e => { setPreview(e.target.value); onChange(e.target.value) }}
          placeholder="https://exemplo.com/logo.png"
          className="mt-2 block h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-base sm:text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        />
      </details>
    </div>
  )
}
