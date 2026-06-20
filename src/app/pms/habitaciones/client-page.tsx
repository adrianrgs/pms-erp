'use client'

import { useState } from 'react'
import { Plus, BedDouble, CheckCircle2, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'
import { addHabitacion, deleteHabitacion, editHabitacion } from './actions'
import { createClient } from '@/lib/supabase/client'

export default function HabitacionesClientPage({ habitaciones, categorias }: { habitaciones: any[], categorias: any[] }) {
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({ numero_habitacion: '', nombre: '', categoria_id: '', descripcion: '' })
  const [servicios, setServicios] = useState<string[]>([])
  const [newServicio, setNewServicio] = useState('')
  const [fotos, setFotos] = useState<string[]>([])
  const [newFoto, setNewFoto] = useState('')
  const [uploadingFotos, setUploadingFotos] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const supabase = createClient()

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setUploadingFotos(true)
    const newUrls: string[] = []
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (!file.type.startsWith('image/')) continue // Skip non-images
      
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`
      const filePath = `${fileName}`
      
      const { data, error } = await supabase.storage
        .from('posadas-media')
        .upload(filePath, file)
        
      if (error) {
        toast.error(`Error subiendo ${file.name}: ${error.message}`)
        continue
      }
      
      const { data: publicUrlData } = supabase.storage
        .from('posadas-media')
        .getPublicUrl(filePath)
        
      if (publicUrlData) {
        newUrls.push(publicUrlData.publicUrl)
      }
    }
    
    setFotos(prev => [...prev, ...newUrls])
    setUploadingFotos(false)
  }

  function handleEditClick(hab: any) {
    setEditingId(hab.id)
    setFormData({
      numero_habitacion: hab.numero_habitacion,
      nombre: hab.nombre || '',
      categoria_id: hab.categoria_id,
      descripcion: hab.descripcion || ''
    })
    setServicios(hab.servicios || [])
    setFotos(hab.fotos || [])
    setOpen(true)
  }

  function handleAddClick() {
    setEditingId(null)
    setFormData({ numero_habitacion: '', nombre: '', categoria_id: '', descripcion: '' })
    setServicios([])
    setFotos([])
    setOpen(true)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (uploadingFotos) {
      toast.error('Espera a que terminen de subir las fotos')
      return
    }
    setLoading(true)
    try {
      const data = new FormData(e.currentTarget)
      if (editingId) {
        await editHabitacion(editingId, data)
        toast.success('Habitación actualizada')
      } else {
        await addHabitacion(data)
        toast.success('Habitación agregada exitosamente')
      }
      setOpen(false)
    } catch (error: any) {
      toast.error('Error al guardar', { description: error.message })
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Estás seguro de que deseas eliminar esta habitación?')) return
    try {
      await deleteHabitacion(id)
      toast.success('Habitación eliminada')
    } catch (error: any) {
      toast.error('Error al eliminar', { description: error.message })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Habitaciones Físicas</h2>
          <p className="text-zinc-500 dark:text-zinc-400">Asigna números y nombres a tus habitaciones.</p>
        </div>
        
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="shrink-0" onClick={handleAddClick} disabled={categorias.length === 0}>
              <Plus className="mr-2 h-4 w-4" /> Agregar Habitación
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <form 
              onSubmit={handleSubmit}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={(e) => { e.preventDefault(); setIsDragging(false) }}
              onDrop={(e) => {
                e.preventDefault()
                setIsDragging(false)
                handleFiles(e.dataTransfer.files)
              }}
              className={isDragging ? 'ring-2 ring-indigo-500 rounded-lg bg-indigo-50/50 dark:bg-indigo-900/10' : ''}
            >
              <DialogHeader>
                <DialogTitle>{editingId ? 'Editar Habitación' : 'Nueva Habitación'}</DialogTitle>
                <DialogDescription>Crea o modifica la información de tu habitación.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto px-1">
                
                <input type="hidden" name="servicios" value={JSON.stringify(servicios)} />
                <input type="hidden" name="fotos" value={JSON.stringify(fotos)} />

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="numero_habitacion">Número Corto</Label>
                    <Input id="numero_habitacion" name="numero_habitacion" defaultValue={formData.numero_habitacion} placeholder="Ej. 101" required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="nombre">Nombre (opcional)</Label>
                    <Input id="nombre" name="nombre" defaultValue={formData.nombre} placeholder="Ej. Cabaña VIP" />
                  </div>
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="categoria_id">Categoría</Label>
                  <Select name="categoria_id" defaultValue={formData.categoria_id} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      {categorias.map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="descripcion">Descripción</Label>
                  <Textarea id="descripcion" name="descripcion" defaultValue={formData.descripcion} placeholder="Describe esta habitación..." rows={3} />
                </div>

                <div className="grid gap-2">
                  <Label>Servicios</Label>
                  <div className="flex gap-2">
                    <Input 
                      placeholder="Ej. Wi-Fi, Piscina Privada" 
                      value={newServicio} 
                      onChange={e => setNewServicio(e.target.value)} 
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          if (newServicio.trim() && !servicios.includes(newServicio.trim())) {
                            setServicios([...servicios, newServicio.trim()])
                            setNewServicio('')
                          }
                        }
                      }}
                    />
                    <Button 
                      type="button" 
                      onClick={() => {
                        if (newServicio.trim() && !servicios.includes(newServicio.trim())) {
                          setServicios([...servicios, newServicio.trim()])
                          setNewServicio('')
                        }
                      }}
                    >
                      Añadir
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {servicios.map((s, idx) => (
                      <div key={idx} className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded text-sm">
                        <span>{s}</span>
                        <button type="button" onClick={() => setServicios(servicios.filter((_, i) => i !== idx))} className="text-zinc-500 hover:text-red-500">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label>Fotos (Subir o URL)</Label>
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2 items-center">
                      <Input 
                        type="file" 
                        accept="image/*" 
                        multiple 
                        disabled={uploadingFotos}
                        onChange={async (e) => {
                          await handleFiles(e.target.files)
                          e.target.value = '' // Reset input
                        }}
                        className="text-xs file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 dark:file:bg-indigo-900/50 dark:file:text-indigo-300"
                      />
                      {uploadingFotos && <span className="text-xs text-indigo-500 animate-pulse whitespace-nowrap">Subiendo...</span>}
                    </div>
                    <div className="flex gap-2">
                      <Input 
                        placeholder="O pega una URL: https://ejemplo.com/foto.jpg" 
                        value={newFoto} 
                        onChange={e => setNewFoto(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            if (newFoto.trim()) {
                              setFotos([...fotos, newFoto.trim()])
                              setNewFoto('')
                            }
                          }
                        }}
                      />
                      <Button 
                        type="button" 
                        onClick={() => {
                          if (newFoto.trim()) {
                            setFotos([...fotos, newFoto.trim()])
                            setNewFoto('')
                          }
                        }}
                      >
                        Añadir URL
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2 mt-2">
                    {fotos.map((f, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/50 p-2 rounded border border-zinc-200 dark:border-zinc-800">
                        <span className="text-xs truncate max-w-[400px] text-zinc-500">{f}</span>
                        <button type="button" onClick={() => setFotos(fotos.filter((_, i) => i !== idx))} className="text-red-500 p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={loading}>{loading ? 'Guardando...' : 'Guardar'}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {categorias.length === 0 && (
        <div className="rounded-lg bg-amber-50 p-4 border border-amber-200">
          <p className="text-sm text-amber-800">Debes crear al menos una Categoría de Habitación.</p>
        </div>
      )}

      <div className="rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Número</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {habitaciones.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">No tienes habitaciones registradas.</TableCell>
              </TableRow>
            ) : (
              habitaciones.map((hab) => {
                const cat = categorias.find(c => c.id === hab.categoria_id)
                return (
                  <TableRow key={hab.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                        <BedDouble className="h-4 w-4" /> {hab.numero_habitacion}
                      </div>
                    </TableCell>
                    <TableCell className="text-zinc-600 dark:text-zinc-400">{hab.nombre || '-'}</TableCell>
                    <TableCell className="text-zinc-600 dark:text-zinc-400">{cat ? cat.nombre : 'Sin Categoría'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        <span className="text-sm capitalize">{hab.estado}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEditClick(hab)}>
                          <Pencil className="h-4 w-4 text-zinc-500" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(hab.id)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
