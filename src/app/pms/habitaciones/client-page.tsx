'use client'

import { useState } from 'react'
import { Plus, BedDouble, CheckCircle2, Pencil, Trash2, LayoutList, KeyRound, Calendar as CalendarIcon, DollarSign, Percent } from 'lucide-react'
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Switch } from '@/components/ui/switch'
import { Calendar } from "@/components/ui/calendar"
import { toast } from 'sonner'
import { DateRange } from "react-day-picker"
import { addHabitacion, deleteHabitacion, editHabitacion, addCategoria, deleteCategoria, editCategoria } from './actions'
import { addTemporada, deleteTemporada, saveTarifa } from '../tarifas/actions'
import { MediaPicker } from '@/components/pms/MediaPicker'

function CategoriasTab({ categorias }: { categorias: any[] }) {
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    capacidad_base_pax: '2',
    capacidad_max_adultos: '2',
    capacidad_max_ninos: '0'
  })

  function handleEditClick(cat: any) {
    setEditingId(cat.id)
    setFormData({
      nombre: cat.nombre,
      descripcion: cat.descripcion || '',
      capacidad_base_pax: cat.capacidad_base_pax.toString(),
      capacidad_max_adultos: cat.capacidad_max_adultos.toString(),
      capacidad_max_ninos: cat.capacidad_max_ninos.toString()
    })
    setOpen(true)
  }

  function handleAddClick() {
    setEditingId(null)
    setFormData({
      nombre: '',
      descripcion: '',
      capacidad_base_pax: '2',
      capacidad_max_adultos: '2',
      capacidad_max_ninos: '0'
    })
    setOpen(true)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    try {
      const data = new FormData(e.currentTarget)
      if (editingId) {
        await editCategoria(editingId, data)
        toast.success('Categoría actualizada')
      } else {
        await addCategoria(data)
        toast.success('Categoría agregada exitosamente')
      }
      setOpen(false)
    } catch (error: any) {
      toast.error('Error al guardar', { description: error.message })
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Estás seguro de que deseas eliminar esta categoría? Se podrían eliminar las habitaciones asociadas.')) return
    try {
      await deleteCategoria(id)
      toast.success('Categoría eliminada')
    } catch (error: any) {
      toast.error('Error al eliminar', { description: error.message })
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleAddClick}>
              <Plus className="mr-2 h-4 w-4" /> Agregar Tipo
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>{editingId ? 'Editar Tipo' : 'Nuevo Tipo'}</DialogTitle>
                <DialogDescription>
                  Define la categoría (Ej. Doble, Suite), capacidad de adultos y niños permitidos.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="nombre">Nombre</Label>
                  <Input id="nombre" name="nombre" defaultValue={formData.nombre} placeholder="Ej. Habitación Doble Standard" required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="descripcion">Descripción</Label>
                  <Textarea id="descripcion" name="descripcion" defaultValue={formData.descripcion} rows={2} />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="capacidad_base_pax">Pax Base</Label>
                    <Input id="capacidad_base_pax" name="capacidad_base_pax" type="number" min="1" defaultValue={formData.capacidad_base_pax} required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="capacidad_max_adultos">Max Adultos</Label>
                    <Input id="capacidad_max_adultos" name="capacidad_max_adultos" type="number" min="1" defaultValue={formData.capacidad_max_adultos} required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="capacidad_max_ninos">Max Niños</Label>
                    <Input id="capacidad_max_ninos" name="capacidad_max_ninos" type="number" min="0" defaultValue={formData.capacidad_max_ninos} required />
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

      <div className="rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Categoría</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead className="text-center">Pax Base</TableHead>
              <TableHead className="text-center">Max Adultos</TableHead>
              <TableHead className="text-center">Max Niños</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categorias.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-zinc-500">
                  No has creado ningún tipo de habitación.
                </TableCell>
              </TableRow>
            ) : (
              categorias.map((cat) => (
                <TableRow key={cat.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <LayoutList className="h-4 w-4 text-indigo-500" />
                      {cat.nombre}
                    </div>
                  </TableCell>
                  <TableCell className="text-zinc-500 truncate max-w-[200px]">{cat.descripcion || '-'}</TableCell>
                  <TableCell className="text-center text-zinc-600">{cat.capacidad_base_pax}</TableCell>
                  <TableCell className="text-center font-medium">{cat.capacidad_max_adultos}</TableCell>
                  <TableCell className="text-center text-zinc-500">{cat.capacidad_max_ninos}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEditClick(cat)}>
                        <Pencil className="h-4 w-4 text-zinc-500" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(cat.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

function UnidadesTab({ habitaciones, categorias }: { habitaciones: any[], categorias: any[] }) {
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({ numero_habitacion: '', nombre: '', categoria_id: '', descripcion: '' })
  const [servicios, setServicios] = useState<string[]>([])
  const [newServicio, setNewServicio] = useState('')
  const [fotos, setFotos] = useState<string[]>([])
  const [newFoto, setNewFoto] = useState('')
  const [pickerOpen, setPickerOpen] = useState(false)

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
    setLoading(true)
    try {
      const data = new FormData(e.currentTarget)
      if (editingId) {
        await editHabitacion(editingId, data)
        toast.success('Unidad física actualizada')
      } else {
        await addHabitacion(data)
        toast.success('Unidad física agregada exitosamente')
      }
      setOpen(false)
    } catch (error: any) {
      toast.error('Error al guardar', { description: error.message })
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Estás seguro de que deseas eliminar esta unidad física?')) return
    try {
      await deleteHabitacion(id)
      toast.success('Unidad física eliminada')
    } catch (error: any) {
      toast.error('Error al eliminar', { description: error.message })
    }
  }

  return (
    <div className="space-y-4">
      {categorias.length === 0 && (
        <div className="rounded-lg bg-amber-50 p-4 border border-amber-200">
          <p className="text-sm text-amber-800 font-medium">Atención: Para crear una unidad física primero debes crear al menos un "Tipo de Habitación" en la pestaña anterior.</p>
        </div>
      )}

      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button disabled={categorias.length === 0} onClick={handleAddClick}>
              <Plus className="mr-2 h-4 w-4" /> Agregar Unidad Físicas
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <form 
              onSubmit={handleSubmit}
            >
              <DialogHeader>
                <DialogTitle>{editingId ? 'Editar Unidad' : 'Nueva Unidad'}</DialogTitle>
                <DialogDescription>Asigna el número o nombre real de la habitación dentro de tu propiedad.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto px-1">
                
                <input type="hidden" name="servicios" value={JSON.stringify(servicios)} />
                <input type="hidden" name="fotos" value={JSON.stringify(fotos)} />

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="numero_habitacion">Número / Identificador</Label>
                    <Input id="numero_habitacion" name="numero_habitacion" defaultValue={formData.numero_habitacion} placeholder="Ej. 101, Cabaña A" required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="nombre">Nombre Especial (opcional)</Label>
                    <Input id="nombre" name="nombre" defaultValue={formData.nombre} placeholder="Ej. Vista al Mar" />
                  </div>
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="categoria_id">Tipo de Habitación (Categoría)</Label>
                  <Select name="categoria_id" defaultValue={formData.categoria_id} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona el tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {categorias.map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="descripcion">Descripción particular</Label>
                  <Textarea id="descripcion" name="descripcion" defaultValue={formData.descripcion} placeholder="Detalles específicos de esta unidad..." rows={3} />
                </div>

                <div className="grid gap-2">
                  <Label>Amenidades Adicionales</Label>
                  <div className="flex gap-2">
                    <Input 
                      placeholder="Ej. Jacuzzi, Balcón" 
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
                  <Label>Fotos de la Unidad</Label>
                  <div className="flex flex-col gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setPickerOpen(true)}
                      className="w-full border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/50 hover:border-indigo-400"
                    >
                      <Plus className="w-4 h-4 mr-2" /> Seleccionar fotos desde Carpeta Maestra
                    </Button>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-2">
                    {fotos.map((f, idx) => (
                      <div key={idx} className="relative aspect-square rounded-md overflow-hidden border border-zinc-200 dark:border-zinc-800 group">
                        <img src={f} alt={`Foto ${idx}`} className="w-full h-full object-cover" />
                        <button 
                          type="button" 
                          onClick={() => setFotos(fotos.filter((_, i) => i !== idx))} 
                          className="absolute top-1 right-1 bg-red-500/90 text-white p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
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

        <MediaPicker
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          multiple={true}
          title="Seleccionar fotos de habitación"
          onSelect={(newUrls) => {
            const arr = Array.isArray(newUrls) ? newUrls : [newUrls]
            // Add only new ones
            const unique = arr.filter(url => !fotos.includes(url))
            setFotos(prev => [...prev, ...unique])
          }}
        />
      </div>

      <div className="rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Número/ID</TableHead>
              <TableHead>Nombre Especial</TableHead>
              <TableHead>Tipo (Categoría)</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {habitaciones.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-zinc-500">No hay unidades físicas registradas.</TableCell>
              </TableRow>
            ) : (
              habitaciones.map((hab) => {
                const cat = categorias.find(c => c.id === hab.categoria_id)
                return (
                  <TableRow key={hab.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                        <KeyRound className="h-4 w-4" /> {hab.numero_habitacion}
                      </div>
                    </TableCell>
                    <TableCell className="text-zinc-600 dark:text-zinc-400">{hab.nombre || '-'}</TableCell>
                    <TableCell className="text-zinc-600 dark:text-zinc-400 font-medium">{cat ? cat.nombre : 'Sin Categoría'}</TableCell>
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

function TarifaFormCard({ tempId, cat, existingTarifa, moneda_base }: { tempId: string, cat: any, existingTarifa: any, moneda_base: string }) {
  const [modalidad, setModalidad] = useState(existingTarifa?.modalidad_tarifa || 'por_habitacion')
  const [plan, setPlan] = useState(existingTarifa?.plan_alimentacion || 'RO')
  const [comisionable, setComisionable] = useState(existingTarifa?.comisionable || false)
  const [comision, setComision] = useState<number>(existingTarifa?.porcentaje_comision || 0)
  const [tarifaBase, setTarifaBase] = useState<number>(existingTarifa?.tarifa_base || 0)

  const precioPublico = tarifaBase;
  const descuento = precioPublico * (comision / 100);
  const precioNeto = precioPublico - descuento;

  return (
    <form 
      onSubmit={async (e) => {
        e.preventDefault()
        try {
          const formData = new FormData(e.currentTarget)
          if (comisionable) formData.set('comisionable', 'on')
          await saveTarifa(tempId, cat.id, formData)
          toast.success(`Tarifa guardada para ${cat.nombre}`)
        } catch (error: any) {
          toast.error('Error al guardar tarifa', { description: error.message })
        }
      }}
      className="flex flex-col gap-6 bg-zinc-50/50 p-6 rounded-xl border border-zinc-200 dark:bg-zinc-900/30 dark:border-zinc-800"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4 gap-4">
        <div>
          <h4 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">{cat.nombre}</h4>
          <p className="text-sm text-zinc-500">Capacidad Base: {cat.capacidad_base_pax} | Max: {cat.capacidad_max_adultos} Ad / {cat.capacidad_max_ninos} Ni</p>
        </div>
        <Button type="submit" className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 text-white">
          <DollarSign className="w-4 h-4 mr-2" /> Guardar Tarifa
        </Button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        <div className="lg:col-span-5 space-y-6">
          <div className="space-y-3">
            <Label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Modalidad de Tarifa</Label>
            <div className="flex bg-white dark:bg-zinc-950 p-1 rounded-lg border border-zinc-200 dark:border-zinc-800">
              <label className={`flex-1 text-center py-2 text-sm rounded-md cursor-pointer transition-colors ${modalidad === 'por_habitacion' ? 'bg-zinc-100 dark:bg-zinc-800 font-medium' : 'text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-900/50'}`}>
                <input type="radio" name="modalidad_tarifa" value="por_habitacion" checked={modalidad === 'por_habitacion'} onChange={() => setModalidad('por_habitacion')} className="hidden" />
                Por Habitación
              </label>
              <label className={`flex-1 text-center py-2 text-sm rounded-md cursor-pointer transition-colors ${modalidad === 'por_persona' ? 'bg-zinc-100 dark:bg-zinc-800 font-medium' : 'text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-900/50'}`}>
                <input type="radio" name="modalidad_tarifa" value="por_persona" checked={modalidad === 'por_persona'} onChange={() => setModalidad('por_persona')} className="hidden" />
                Por Persona
              </label>
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Plan de Alimentación</Label>
            <Select name="plan_alimentacion" value={plan} onValueChange={setPlan}>
              <SelectTrigger className="bg-white dark:bg-zinc-950">
                <SelectValue placeholder="Selecciona un plan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="RO">Solo Alojamiento (RO)</SelectItem>
                <SelectItem value="BB">Solo Desayuno (BB)</SelectItem>
                <SelectItem value="AI">Todo Incluido (AI)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="lg:col-span-7 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Tarifa Base ({moneda_base}) / Noche</Label>
              <Input 
                name="tarifa_base" 
                type="number" 
                step="0.01" 
                value={tarifaBase}
                onChange={(e) => setTarifaBase(parseFloat(e.target.value) || 0)}
                className="text-lg font-medium bg-white dark:bg-zinc-950 border-zinc-300 focus:border-indigo-500" 
                required 
              />
            </div>
            
            {modalidad === 'por_habitacion' ? (
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label className="text-xs text-zinc-500">Adulto Extra</Label>
                  <Input name="tarifa_adulto_extra" type="number" step="0.01" defaultValue={existingTarifa?.tarifa_adulto_extra || 0} className="bg-white dark:bg-zinc-950 h-9" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-zinc-500">Niño Extra</Label>
                  <Input name="tarifa_nino" type="number" step="0.01" defaultValue={existingTarifa?.tarifa_nino || 0} className="bg-white dark:bg-zinc-950 h-9" />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2">
                <div className="space-y-2">
                  <Label className="text-xs text-zinc-500">Tarifa Niño (Por Persona)</Label>
                  <Input name="tarifa_nino" type="number" step="0.01" defaultValue={existingTarifa?.tarifa_nino || 0} className="bg-white dark:bg-zinc-950 h-9" />
                </div>
              </div>
            )}
          </div>

          <div className="p-4 bg-white dark:bg-zinc-950 rounded-lg border border-zinc-200 dark:border-zinc-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 block mb-1">Tarifa Comisionable para Agencias</Label>
                <span className="text-xs text-zinc-500">Habilita si esta tarifa permite margen para B2B.</span>
              </div>
              <Switch checked={comisionable} onCheckedChange={setComisionable} />
            </div>
            
            {comisionable && (
              <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 grid grid-cols-1 sm:grid-cols-3 gap-4 items-end animate-in fade-in slide-in-from-top-2">
                <div className="space-y-2">
                  <Label className="text-xs text-zinc-500 flex items-center gap-1"><Percent className="w-3 h-3" /> Comisión</Label>
                  <Input 
                    name="porcentaje_comision" 
                    type="number" 
                    step="0.1" 
                    max="100"
                    value={comision}
                    onChange={(e) => setComision(parseFloat(e.target.value) || 0)}
                    className="h-9" 
                  />
                </div>
                <div className="p-2 bg-zinc-50 dark:bg-zinc-900 rounded border border-zinc-100 dark:border-zinc-800 text-center">
                  <span className="block text-[10px] text-zinc-400 uppercase tracking-wider mb-1">Precio Neto</span>
                  <span className="font-semibold text-indigo-600 dark:text-indigo-400">${precioNeto.toFixed(2)}</span>
                </div>
                <div className="p-2 bg-teal-50 dark:bg-teal-900/20 rounded border border-teal-100 dark:border-teal-800 text-center">
                  <span className="block text-[10px] text-teal-600/70 dark:text-teal-400/70 uppercase tracking-wider mb-1">Público (Venta)</span>
                  <span className="font-semibold text-teal-700 dark:text-teal-300">${precioPublico.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </form>
  )
}

function TarifasTab({ temporadas, categorias, tarifas, moneda_base }: { temporadas: any[], categorias: any[], tarifas: any[], moneda_base: string }) {
  const [openTemporada, setOpenTemporada] = useState(false)
  const [loading, setLoading] = useState(false)
  const [date, setDate] = useState<DateRange | undefined>()
  const [selectedTemporadaId, setSelectedTemporadaId] = useState<string>(temporadas.length > 0 ? temporadas[0].id : '')

  async function handleAddTemporada(formData: FormData) {
    if (!date?.from || !date?.to) {
      toast.error('Debes seleccionar un rango de fechas.')
      return
    }
    setLoading(true)
    try {
      formData.set('from', format(date.from, 'yyyy-MM-dd'))
      formData.set('to', format(date.to, 'yyyy-MM-dd'))
      await addTemporada(formData)
      toast.success('Temporada creada exitosamente')
      setOpenTemporada(false)
      setDate(undefined)
    } catch (error: any) {
      toast.error('Error al crear temporada', { description: error.message })
    } finally {
      setLoading(false)
    }
  }

  async function handleDeleteTemporada(id: string) {
    if (!confirm('¿Seguro que deseas eliminar esta temporada? Se borrarán sus tarifas asociadas.')) return
    try {
      await deleteTemporada(id)
      if (selectedTemporadaId === id) setSelectedTemporadaId('')
      toast.success('Temporada eliminada')
    } catch (error: any) {
      toast.error('Error al eliminar', { description: error.message })
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Editor de Temporadas Mini */}
        <div className="bg-white dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Temporadas Creadas</h3>
              <p className="text-xs text-zinc-500">Crea tus temporadas (alta, baja, festivos)</p>
            </div>
            <Dialog open={openTemporada} onOpenChange={setOpenTemporada}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline"><Plus className="mr-2 h-4 w-4" /> Crear</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <form action={handleAddTemporada}>
                  <DialogHeader>
                    <DialogTitle>Nueva Temporada</DialogTitle>
                    <DialogDescription>Selecciona un rango de fechas.</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="nombre">Nombre de la Temporada</Label>
                      <Input id="nombre" name="nombre" placeholder="Ej. Alta" required />
                    </div>
                    <div className="grid gap-2">
                      <Label>Fechas</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className={`w-full justify-start text-left font-normal ${!date && "text-muted-foreground"}`}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {date?.from ? (
                              date.to ? <>{format(date.from, "LLL dd", { locale: es })} - {format(date.to, "LLL dd", { locale: es })}</> : format(date.from, "LLL dd", { locale: es })
                            ) : <span>Seleccionar</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="range" defaultMonth={date?.from} selected={date} onSelect={setDate} numberOfMonths={2} />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={loading}>{loading ? 'Guardando...' : 'Guardar'}</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          
          <div className="space-y-2 max-h-[150px] overflow-y-auto">
            {temporadas.length === 0 ? (
              <p className="text-sm text-zinc-500 italic">No hay temporadas creadas.</p>
            ) : (
              temporadas.map(temp => {
                const dates = temp.periodo.replace(/[\[\]\(\)]/g, '').split(',')
                return (
                  <div key={temp.id} className="flex items-center justify-between p-2 rounded bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800">
                    <div>
                      <p className="text-sm font-medium">{temp.nombre}</p>
                      <p className="text-xs text-zinc-500">{dates[0]} a {dates[1]}</p>
                    </div>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-500" onClick={() => handleDeleteTemporada(temp.id)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Seleccion de Temporada */}
        <div className="bg-white dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 flex flex-col justify-center">
           <Label className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 block mb-2">Seleccionar Temporada a Editar</Label>
           <Select value={selectedTemporadaId} onValueChange={setSelectedTemporadaId}>
            <SelectTrigger>
              <SelectValue placeholder="Elige una temporada..." />
            </SelectTrigger>
            <SelectContent>
              {temporadas.map(t => (
                <SelectItem key={t.id} value={t.id}>{t.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="mt-4 text-xs text-zinc-500">
            Moneda Base: <strong className="text-zinc-900 dark:text-zinc-100 uppercase">{moneda_base}</strong>
          </div>
        </div>
      </div>

      {temporadas.length > 0 && categorias.length > 0 && selectedTemporadaId && (
        <div className="grid gap-6">
          {categorias.map(cat => {
            const existingTarifa = tarifas.find(t => t.temporada_id === selectedTemporadaId && t.categoria_id === cat.id)
            return (
              <TarifaFormCard 
                key={cat.id} 
                tempId={selectedTemporadaId} 
                cat={cat} 
                existingTarifa={existingTarifa} 
                moneda_base={moneda_base} 
              />
            )
          })}
        </div>
      )}
      
      {categorias.length === 0 && temporadas.length > 0 && (
         <div className="rounded-lg bg-amber-50 p-4 border border-amber-200">
          <p className="text-sm text-amber-800">Debes crear al menos una Categoría de Habitación en la pestaña 1 para poder asignarle precios.</p>
        </div>
      )}
    </div>
  )
}

export default function InventarioClientPage({ 
  habitaciones, 
  categorias, 
  temporadas,
  tarifas,
  moneda_base
}: { 
  habitaciones: any[], 
  categorias: any[],
  temporadas: any[],
  tarifas: any[],
  moneda_base: string
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Inventario y Tarifas</h2>
        <p className="text-zinc-500 dark:text-zinc-400">Sigue el flujo paso a paso: crea los tipos de habitación, asigna tus unidades físicas, y finalmente cárgarles tarifas.</p>
      </div>

      <Tabs defaultValue="categorias" className="w-full">
        <TabsList className="flex w-full justify-start border-b border-zinc-200 dark:border-zinc-800 bg-transparent p-0 h-auto rounded-none overflow-x-auto">
          <TabsTrigger 
            value="categorias" 
            className="flex items-center gap-2 py-3 px-4 sm:px-6 rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400 bg-transparent hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-all data-[state=active]:shadow-none"
          >
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 font-bold text-xs data-[state=active]:bg-indigo-100 data-[state=active]:text-indigo-700">1</span>
            <span className="font-medium text-sm">Crear Tipos</span>
          </TabsTrigger>
          <TabsTrigger 
            value="unidades" 
            disabled={categorias.length === 0}
            className="flex items-center gap-2 py-3 px-4 sm:px-6 rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400 bg-transparent hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-all data-[state=active]:shadow-none disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 font-bold text-xs data-[state=active]:bg-indigo-100 data-[state=active]:text-indigo-700">2</span>
            <span className="font-medium text-sm">Asignar Unidades</span>
          </TabsTrigger>
          <TabsTrigger 
            value="tarifas" 
            disabled={categorias.length === 0 || habitaciones.length === 0}
            className="flex items-center gap-2 py-3 px-4 sm:px-6 rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400 bg-transparent hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-all data-[state=active]:shadow-none disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 font-bold text-xs data-[state=active]:bg-indigo-100 data-[state=active]:text-indigo-700">3</span>
            <span className="font-medium text-sm">Cargar Tarifas</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="categorias" className="mt-6 space-y-4">
          <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-800 dark:text-indigo-200 rounded-lg text-sm border border-indigo-100 dark:border-indigo-800/50">
            <strong>Consejo:</strong> Crea categorías distintas si tus habitaciones tienen precios o capacidades distintas (Ej: Estándar vs. Suite con Vista al Mar).
          </div>
          <CategoriasTab categorias={categorias} />
        </TabsContent>

        <TabsContent value="unidades" className="mt-6 space-y-4">
           <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-800 dark:text-indigo-200 rounded-lg text-sm border border-indigo-100 dark:border-indigo-800/50">
            <strong>Consejo:</strong> Registra las habitaciones reales (Ej: Habitación 101, 102) y asígnales uno de los Tipos creados en el paso anterior.
          </div>
          <UnidadesTab habitaciones={habitaciones} categorias={categorias} />
        </TabsContent>
        
        <TabsContent value="tarifas" className="mt-6 space-y-4">
          <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-800 dark:text-indigo-200 rounded-lg text-sm border border-indigo-100 dark:border-indigo-800/50">
            <strong>Consejo:</strong> Establece el precio base por cada Temporada. Todas las unidades físicas heredarán automáticamente el precio del Tipo de Habitación al que pertenecen.
          </div>
          <TarifasTab 
            temporadas={temporadas} 
            categorias={categorias} 
            tarifas={tarifas} 
            moneda_base={moneda_base} 
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
