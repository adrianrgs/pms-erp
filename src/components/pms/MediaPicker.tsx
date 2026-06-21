'use client'

import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Upload, Image as ImageIcon, CheckCircle, Loader2, Trash2 } from 'lucide-react'
import { getPosadaMedia, uploadPosadaMedia, deletePosadaMedia, type MediaFile } from '@/app/pms/media/actions'

interface MediaPickerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (urlOrUrls: string | string[]) => void
  multiple?: boolean
  title?: string
  description?: string
}

export function MediaPicker({
  open,
  onOpenChange,
  onSelect,
  multiple = false,
  title = 'Carpeta Maestra',
  description = 'Selecciona o sube imágenes a tu biblioteca de medios.',
}: MediaPickerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [images, setImages] = useState<MediaFile[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [selectedUrls, setSelectedUrls] = useState<Set<string>>(new Set())

  // Cargar imágenes al abrir
  useEffect(() => {
    if (open) {
      loadMedia()
      setSelectedUrls(new Set()) // Limpiar selección al reabrir
    }
  }, [open])

  async function loadMedia() {
    setLoading(true)
    try {
      const media = await getPosadaMedia()
      setImages(media)
    } catch (error) {
      toast.error('Error al cargar la galería')
    } finally {
      setLoading(false)
    }
  }

  // Manejo de subida
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return

    setUploading(true)
    let anySuccess = false

    for (const file of files) {
      const fd = new FormData()
      fd.append('file', file)
      
      const res = await uploadPosadaMedia(fd)
      if (res.success && res.url) {
        anySuccess = true
        // Seleccionar automáticamente si es un solo archivo o agregar a la selección si múltiple
        if (!multiple && files.length === 1) {
          setSelectedUrls(new Set([res.url]))
        } else if (multiple) {
          setSelectedUrls(prev => new Set(prev).add(res.url!))
        }
      } else {
        toast.error(`Error al subir ${file.name}: ${res.error}`)
      }
    }

    if (anySuccess) {
      toast.success('Imagen(es) subida(s) correctamente')
      await loadMedia() // Recargar para ver las nuevas
    }
    
    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = '' // Reset input
  }

  // Eliminar imágenes seleccionadas
  async function handleDeleteSelected() {
    if (selectedUrls.size === 0) return
    if (!window.confirm(`¿Seguro que deseas eliminar ${selectedUrls.size} imagen(es) de la carpeta maestra? Si se están usando en la página, dejarán de mostrarse.`)) return

    let anyError = false
    for (const url of selectedUrls) {
      const res = await deletePosadaMedia(url)
      if (res.success) {
        setImages(prev => prev.filter(img => img.url !== url))
      } else {
        anyError = true
        toast.error(`Error al eliminar una imagen: ${res.error}`)
      }
    }

    if (!anyError) {
      toast.success('Imágenes eliminadas correctamente')
    }
    setSelectedUrls(new Set())
  }

  // Manejo de selección
  function toggleSelection(url: string) {
    if (multiple) {
      setSelectedUrls(prev => {
        const next = new Set(prev)
        if (next.has(url)) next.delete(url)
        else next.add(url)
        return next
      })
    } else {
      // Si es single, reemplazar
      setSelectedUrls(new Set([url]))
    }
  }

  // Confirmar selección
  function handleConfirm() {
    if (selectedUrls.size === 0) {
      toast.error('Selecciona al menos una imagen')
      return
    }

    if (multiple) {
      onSelect(Array.from(selectedUrls))
    } else {
      onSelect(Array.from(selectedUrls)[0])
    }
    
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0 overflow-hidden bg-zinc-50 dark:bg-zinc-950">
        
        {/* Header estático */}
        <div className="px-6 py-4 bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800 flex-shrink-0">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-xl flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-indigo-500" />
                  {title}
                </DialogTitle>
                <DialogDescription className="mt-1">{description}</DialogDescription>
              </div>
              <div className="flex items-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple={multiple}
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <Button 
                  onClick={() => fileInputRef.current?.click()} 
                  disabled={uploading}
                  variant="outline"
                  className="gap-2"
                >
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {uploading ? 'Subiendo...' : 'Subir desde dispositivo'}
                </Button>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* Contenedor de la galería (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full text-zinc-400 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
              <p className="text-sm font-medium">Cargando carpeta maestra...</p>
            </div>
          ) : images.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-zinc-400 gap-4 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl mx-12">
              <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-2xl flex items-center justify-center">
                <ImageIcon className="w-8 h-8" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-zinc-700 dark:text-zinc-300">Carpeta vacía</p>
                <p className="text-sm mt-1">Sube tu primera imagen para usarla en tu posada.</p>
              </div>
              <Button onClick={() => fileInputRef.current?.click()} variant="secondary" className="mt-2">
                Subir primera imagen
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {images.map((img) => {
                const isSelected = selectedUrls.has(img.url)
                return (
                  <div
                    key={img.url}
                    onClick={() => toggleSelection(img.url)}
                    className={`group relative aspect-square rounded-xl overflow-hidden cursor-pointer border-2 transition-all duration-200 ${
                      isSelected 
                        ? 'border-indigo-500 scale-[0.98] ring-4 ring-indigo-500/20' 
                        : 'border-transparent hover:border-zinc-300 dark:hover:border-zinc-700'
                    }`}
                  >
                    <img 
                      src={img.url} 
                      alt={img.name} 
                      className="w-full h-full object-cover bg-zinc-200 dark:bg-zinc-800"
                    />
                    
                    {/* Overlay degradado siempre presente abajo para que el texto sea legible */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                    {/* Check indicator (arriba izquierda) */}
                    <div className={`absolute top-3 left-3 transition-transform duration-200 ${isSelected ? 'scale-100' : 'scale-0'}`}>
                      <div className="bg-white rounded-full p-0.5 shadow-md">
                        <CheckCircle className="w-6 h-6 text-indigo-500 fill-indigo-500 text-white" />
                      </div>
                    </div>

                    {/* Info de tamaño (abajo) */}
                    <div className="absolute bottom-2 left-2 right-2 flex justify-between text-white text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="truncate pr-2 font-medium drop-shadow-md">{img.name.split('_').pop()}</span>
                      <span className="font-semibold drop-shadow-md">{(img.size / 1024).toFixed(0)} KB</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer estático */}
        <div className="px-6 py-4 bg-white dark:bg-zinc-900 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-4">
            <p className="text-sm text-zinc-500 font-medium">
              {selectedUrls.size} seleccionada{selectedUrls.size !== 1 ? 's' : ''}
            </p>
            {selectedUrls.size > 0 && (
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={handleDeleteSelected}
                className="gap-2 h-8"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Eliminar de la nube
              </Button>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleConfirm} 
              disabled={selectedUrls.size === 0 || uploading}
              className="px-6"
            >
              Confirmar selección
            </Button>
          </DialogFooter>
        </div>

      </DialogContent>
    </Dialog>
  )
}
