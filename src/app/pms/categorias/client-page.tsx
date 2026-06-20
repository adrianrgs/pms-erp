'use client'

import { useState } from 'react'
import { Plus, Users, LayoutList, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'
import { addCategoria, deleteCategoria, editCategoria } from './actions'

export default function CategoriasClientPage({ categorias }: { categorias: any[] }) {
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Categorías de Habitaciones</h2>
          <p className="text-zinc-500 dark:text-zinc-400">Administra los tipos de habitaciones que ofreces.</p>
        </div>
        
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="shrink-0" onClick={handleAddClick}>
              <Plus className="mr-2 h-4 w-4" /> Agregar Categoría
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>{editingId ? 'Editar Categoría' : 'Nueva Categoría'}</DialogTitle>
                <DialogDescription>
                  Define el tipo de habitación, capacidad de adultos y niños permitidos.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="nombre">Nombre</Label>
                  <Input id="nombre" name="nombre" defaultValue={formData.nombre} required />
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
              <TableHead>Nombre</TableHead>
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
                <TableCell colSpan={6} className="h-24 text-center">
                  No tienes categorías registradas aún.
                </TableCell>
              </TableRow>
            ) : (
              categorias.map((cat) => (
                <TableRow key={cat.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <LayoutList className="h-4 w-4 text-zinc-400" />
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
