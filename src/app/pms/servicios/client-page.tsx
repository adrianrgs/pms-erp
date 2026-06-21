'use client'

import { useState, useMemo } from 'react'
import { Plus, Trash2, Edit2, Search } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PMSSidebar } from '../pms-sidebar'
import { createServicio, updateServicio, deleteServicio } from './actions'

const CATEGORIAS = ['Suplemento Alimenticio', 'Servicio Extra', 'Traslado', 'Excursión', 'Otro']

export default function ServiciosClientPage({ initialServicios, posadaId }: { initialServicios: any[], posadaId: string }) {
  const [servicios, setServicios] = useState(initialServicios)
  const [isOpen, setIsOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  
  const [searchTerm, setSearchTerm] = useState('')

  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    precio: '',
    tipo: 'Suplemento Alimenticio',
    tipo_cobro: 'Por Persona / Por Noche',
    estado: 'activo',
    comisionable: false,
    porcentaje_comision: '0'
  })

  const resetForm = () => {
    setFormData({ 
      nombre: '', 
      descripcion: '', 
      precio: '', 
      tipo: 'Suplemento Alimenticio',
      tipo_cobro: 'Por Persona / Por Noche',
      estado: 'activo',
      comisionable: false,
      porcentaje_comision: '0'
    })
    setEditingId(null)
  }

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (!open) resetForm()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.nombre || !formData.precio) {
      toast.error('El nombre y el precio son obligatorios')
      return
    }

    const payload = {
      posada_id: posadaId,
      nombre: formData.nombre,
      descripcion: formData.descripcion,
      precio: parseFloat(formData.precio),
      tipo: formData.tipo,
      tipo_cobro: formData.tipo_cobro,
      estado: formData.estado,
      comisionable: formData.comisionable,
      porcentaje_comision: parseFloat(formData.porcentaje_comision) || 0
    }

    if (editingId) {
      const res = await updateServicio(editingId, payload)
      if (res.error) {
        toast.error('Error al actualizar: ' + res.error)
      } else {
        toast.success('Servicio actualizado')
        setServicios(servicios.map(s => s.id === editingId ? res.data : s))
        setIsOpen(false)
      }
    } else {
      const res = await createServicio(payload)
      if (res.error) {
        toast.error('Error al crear: ' + res.error)
      } else {
        toast.success('Servicio creado')
        setServicios([...servicios, res.data])
        setIsOpen(false)
      }
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este servicio?')) return
    
    const res = await deleteServicio(id)
    if (res.error) {
      toast.error('Error al eliminar: ' + res.error)
    } else {
      toast.success('Servicio eliminado')
      setServicios(servicios.filter(s => s.id !== id))
    }
  }

  const filteredServicios = useMemo(() => {
    return servicios.filter(s => {
      const matchesSearch = s.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            (s.descripcion || '').toLowerCase().includes(searchTerm.toLowerCase())
      return matchesSearch
    })
  }, [servicios, searchTerm])

  return (
    <div className="max-w-[1600px] mx-auto">
        <div className="p-8 max-w-5xl mx-auto space-y-6">
          
          <div>
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">Gestión de Servicios Adicionales y Suplementos</h1>
            <p className="text-zinc-500 mt-1 dark:text-zinc-400">
              Administra el catálogo de extras que ofreces en tus cotizaciones y reservas.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-zinc-900 p-4 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800">
            <div className="relative w-full sm:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <Input 
                placeholder="Buscar servicios..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <Dialog open={isOpen} onOpenChange={handleOpenChange}>
              <DialogTrigger asChild>
                <Button className="bg-indigo-600 hover:bg-indigo-700 text-white shrink-0">
                  <Plus className="mr-2 h-4 w-4" />
                  Agregar Servicio
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-xl">{editingId ? 'Editar Servicio' : 'Nuevo Servicio'}</DialogTitle>
                </DialogHeader>
                
                <form onSubmit={handleSubmit} className="space-y-6 pt-4">
                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="nombre">Nombre del Servicio/Suplemento</Label>
                      <Input 
                        id="nombre" 
                        placeholder="Ej. Cena Romántica" 
                        value={formData.nombre}
                        onChange={e => setFormData({...formData, nombre: e.target.value})}
                        required
                      />
                    </div>
                    
                    <div className="grid gap-2">
                      <Label>Categoría</Label>
                      <Select value={formData.tipo} onValueChange={v => setFormData({...formData, tipo: v})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona..." />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIAS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-2">
                      <Label>Modalidad de Precio</Label>
                      <div className="flex bg-zinc-100 dark:bg-zinc-900 p-1 rounded-lg border border-zinc-200 dark:border-zinc-800">
                        <button
                          type="button"
                          className={`flex-1 text-sm font-medium py-2 px-3 rounded-md transition-all ${
                            formData.tipo_cobro === 'Por Persona / Por Noche' 
                              ? 'bg-white dark:bg-zinc-800 shadow-sm text-zinc-900 dark:text-zinc-100' 
                              : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300'
                          }`}
                          onClick={() => setFormData({...formData, tipo_cobro: 'Por Persona / Por Noche'})}
                        >
                          Por Persona / Por Noche
                        </button>
                        <button
                          type="button"
                          className={`flex-1 text-sm font-medium py-2 px-3 rounded-md transition-all ${
                            formData.tipo_cobro === 'Precio Global / Tarifa Única' 
                              ? 'bg-white dark:bg-zinc-800 shadow-sm text-zinc-900 dark:text-zinc-100' 
                              : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300'
                          }`}
                          onClick={() => setFormData({...formData, tipo_cobro: 'Precio Global / Tarifa Única'})}
                        >
                          Precio Global / Tarifa Única
                        </button>
                      </div>
                      <p className="text-[13px] text-zinc-500 mt-1">
                        {formData.tipo_cobro === 'Por Persona / Por Noche' 
                          ? 'Cargos recurrentes que dependen de la ocupación (ej. media pensión).' 
                          : 'Cargos fijos independientes de los días u ocupantes (ej. traslado privado).'}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="precio">Precio Base (USD)</Label>
                        <Input 
                          id="precio" 
                          type="number" 
                          min="0" 
                          step="0.01" 
                          placeholder="0.00" 
                          value={formData.precio}
                          onChange={e => setFormData({...formData, precio: e.target.value})}
                          required
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label>Estado</Label>
                        <div className="flex items-center gap-3 pt-2">
                          <button
                            type="button"
                            role="switch"
                            aria-checked={formData.estado === 'activo'}
                            onClick={() => setFormData({...formData, estado: formData.estado === 'activo' ? 'inactivo' : 'activo'})}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white ${formData.estado === 'activo' ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-700'}`}
                          >
                            <span
                              className={`pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform ${formData.estado === 'activo' ? 'translate-x-5' : 'translate-x-0'}`}
                            />
                          </button>
                          <span className="text-sm font-medium">
                            {formData.estado === 'activo' ? 'Activo' : 'Inactivo'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label>¿Comisionable para Agencias?</Label>
                        <div className="flex items-center gap-3 pt-2">
                          <button
                            type="button"
                            role="switch"
                            aria-checked={formData.comisionable}
                            onClick={() => setFormData({...formData, comisionable: !formData.comisionable})}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white ${formData.comisionable ? 'bg-indigo-600' : 'bg-zinc-300 dark:bg-zinc-700'}`}
                          >
                            <span className={`pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform ${formData.comisionable ? 'translate-x-5' : 'translate-x-0'}`} />
                          </button>
                          <span className="text-sm font-medium">
                            {formData.comisionable ? 'Sí' : 'No'}
                          </span>
                        </div>
                      </div>

                      {formData.comisionable && (
                        <div className="grid gap-2">
                          <Label htmlFor="porcentaje_comision">Porcentaje (%)</Label>
                          <Input 
                            id="porcentaje_comision" 
                            type="number" 
                            min="0" 
                            max="100"
                            step="0.1" 
                            placeholder="10" 
                            value={formData.porcentaje_comision}
                            onChange={e => setFormData({...formData, porcentaje_comision: e.target.value})}
                          />
                        </div>
                      )}
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="descripcion">Descripción</Label>
                      <Textarea 
                        id="descripcion" 
                        placeholder="Detalles adicionales opcionales..." 
                        value={formData.descripcion}
                        onChange={e => setFormData({...formData, descripcion: e.target.value})}
                        className="resize-none h-24"
                      />
                    </div>
                  </div>
                  
                  <DialogFooter className="pt-4 border-t border-zinc-100 dark:border-zinc-800">
                    <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white">
                      {editingId ? 'Guardar Cambios' : 'Agregar Servicio'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden dark:bg-zinc-900 dark:border-zinc-800">
            {filteredServicios.length === 0 ? (
              <div className="p-12 text-center text-zinc-500">
                {servicios.length === 0 ? 'No hay servicios registrados.' : 'No se encontraron resultados.'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-zinc-50 border-b border-zinc-200 dark:bg-zinc-800/50 dark:border-zinc-800 whitespace-nowrap">
                    <tr>
                      <th className="px-6 py-4 font-semibold text-zinc-900 dark:text-zinc-100">Nombre</th>
                      <th className="px-6 py-4 font-semibold text-zinc-900 dark:text-zinc-100">Categoría</th>
                      <th className="px-6 py-4 font-semibold text-zinc-900 dark:text-zinc-100">Tipo de Cobro</th>
                      <th className="px-6 py-4 font-semibold text-zinc-900 dark:text-zinc-100 text-right">Precio Base</th>
                      <th className="px-6 py-4 font-semibold text-zinc-900 dark:text-zinc-100 text-center">Comisión</th>
                      <th className="px-6 py-4 font-semibold text-zinc-900 dark:text-zinc-100 text-center">Estado</th>
                      <th className="px-6 py-4 font-semibold text-zinc-900 text-right dark:text-zinc-100">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {filteredServicios.map((s) => (
                      <tr key={s.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50">
                        <td className="px-6 py-4">
                          <div className="font-medium text-zinc-900 dark:text-zinc-100">{s.nombre}</div>
                          {s.descripcion && <div className="text-xs text-zinc-500 mt-0.5 line-clamp-1 dark:text-zinc-400" title={s.descripcion}>{s.descripcion}</div>}
                        </td>
                        <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">
                          {s.tipo || 'Servicio Extra'}
                        </td>
                        <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">
                          <Badge variant="outline" className="bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-normal">
                            {s.tipo_cobro || 'Por Persona / Por Noche'}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 font-medium text-indigo-600 dark:text-indigo-400 text-right whitespace-nowrap">
                          ${Number(s.precio).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {s.comisionable ? (
                            <Badge variant="outline" className="bg-indigo-50 text-indigo-600 border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-400 dark:border-indigo-800">
                              {s.porcentaje_comision}%
                            </Badge>
                          ) : (
                            <span className="text-xs text-zinc-400">No</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <Badge variant={(s.estado || 'activo') === 'activo' ? 'default' : 'secondary'} className={(s.estado || 'activo') === 'activo' ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : ''}>
                            {(s.estado || 'activo') === 'activo' ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => {
                                setFormData({
                                  nombre: s.nombre,
                                  descripcion: s.descripcion || '',
                                  precio: s.precio.toString(),
                                  tipo: s.tipo || 'Servicio Extra',
                                  tipo_cobro: s.tipo_cobro || 'Por Persona / Por Noche',
                                  estado: s.estado || 'activo',
                                  comisionable: s.comisionable || false,
                                  porcentaje_comision: (s.porcentaje_comision || 0).toString()
                                })
                                setEditingId(s.id)
                                setIsOpen(true)
                              }}
                              className="h-8 w-8 text-zinc-500 hover:text-indigo-600 dark:hover:text-indigo-400"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleDelete(s.id)}
                              className="h-8 w-8 text-zinc-500 hover:text-red-600 dark:hover:text-red-400"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
    </div>
  )
}
