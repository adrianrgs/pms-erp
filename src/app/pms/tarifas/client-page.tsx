'use client'

import { useState } from 'react'
import { Plus, Trash2, Calendar as CalendarIcon, DollarSign } from 'lucide-react'
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { toast } from 'sonner'
import { addTemporada, deleteTemporada, saveTarifa } from './actions'
import { DateRange } from "react-day-picker"

export default function TarifasClientPage({ temporadas, categorias, tarifas, moneda_base }: { temporadas: any[], categorias: any[], tarifas: any[], moneda_base: string }) {
  const [openTemporada, setOpenTemporada] = useState(false)
  const [loading, setLoading] = useState(false)
  const [date, setDate] = useState<DateRange | undefined>()

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
      toast.success('Temporada eliminada')
    } catch (error: any) {
      toast.error('Error al eliminar', { description: error.message })
    }
  }

  async function handleSaveTarifa(e: React.FormEvent<HTMLFormElement>, temporadaId: string, categoriaId: string) {
    e.preventDefault()
    try {
      const formData = new FormData(e.currentTarget)
      await saveTarifa(temporadaId, categoriaId, formData)
      toast.success('Tarifa guardada')
    } catch (error: any) {
      toast.error('Error al guardar tarifa', { description: error.message })
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Motor de Tarifas</h2>
        <p className="text-zinc-500 dark:text-zinc-400">Define tus temporadas y asigna los precios para cada tipo de habitación.</p>
      </div>

      <Tabs defaultValue="temporadas" className="w-full">
        <TabsList className="grid w-full sm:w-[400px] grid-cols-2">
          <TabsTrigger value="temporadas">1. Temporadas</TabsTrigger>
          <TabsTrigger value="tarifas">2. Precios por Categoría</TabsTrigger>
        </TabsList>

        <TabsContent value="temporadas" className="mt-6 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Temporadas Creadas</h3>
            <Dialog open={openTemporada} onOpenChange={setOpenTemporada}>
              <DialogTrigger asChild>
                <Button><Plus className="mr-2 h-4 w-4" /> Crear Temporada</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <form action={handleAddTemporada}>
                  <DialogHeader>
                    <DialogTitle>Nueva Temporada</DialogTitle>
                    <DialogDescription>
                      Selecciona un rango de fechas. No debe solaparse con otras temporadas.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="nombre">Nombre de la Temporada</Label>
                      <Input id="nombre" name="nombre" placeholder="Ej. Temporada Alta Navidad" required />
                    </div>
                    <div className="grid gap-2">
                      <Label>Rango de Fechas</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className={`w-full justify-start text-left font-normal ${!date && "text-muted-foreground"}`}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {date?.from ? (
                              date.to ? (
                                <>{format(date.from, "LLL dd, y", { locale: es })} - {format(date.to, "LLL dd, y", { locale: es })}</>
                              ) : (
                                format(date.from, "LLL dd, y", { locale: es })
                              )
                            ) : (
                              <span>Selecciona las fechas</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            initialFocus
                            mode="range"
                            defaultMonth={date?.from}
                            selected={date}
                            onSelect={setDate}
                            numberOfMonths={2}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setOpenTemporada(false)}>Cancelar</Button>
                    <Button type="submit" disabled={loading}>{loading ? 'Creando...' : 'Crear Temporada'}</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Temporada</TableHead>
                  <TableHead>Rango de Fechas</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {temporadas.length === 0 ? (
                  <TableRow><TableCell colSpan={3} className="text-center h-24">No has creado temporadas.</TableCell></TableRow>
                ) : (
                  temporadas.map(temp => {
                    // Postgres daterange string parser
                    const dates = temp.periodo.replace(/[\[\]\(\)]/g, '').split(',')
                    return (
                      <TableRow key={temp.id}>
                        <TableCell className="font-medium">{temp.nombre}</TableCell>
                        <TableCell className="text-zinc-500">Del {dates[0]} al {dates[1]}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteTemporada(temp.id)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="tarifas" className="mt-6 space-y-8">
          {temporadas.length === 0 ? (
            <div className="rounded-lg bg-amber-50 p-4 border border-amber-200">
              <p className="text-sm text-amber-800">Debes crear al menos una Temporada para poder asignar tarifas.</p>
            </div>
          ) : categorias.length === 0 ? (
             <div className="rounded-lg bg-amber-50 p-4 border border-amber-200">
              <p className="text-sm text-amber-800">Debes crear al menos una Categoría de Habitación para poder asignarle precios.</p>
            </div>
          ) : (
            temporadas.map(temp => (
              <div key={temp.id} className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                    <CalendarIcon className="h-5 w-5 text-indigo-600" />
                    {temp.nombre}
                  </h3>
                  <span className="text-sm text-zinc-500 bg-zinc-100 px-3 py-1 rounded-full dark:bg-zinc-800">
                    Moneda Base: <strong>{moneda_base}</strong>
                  </span>
                </div>
                
                <div className="grid gap-6">
                  {categorias.map(cat => {
                    const existingTarifa = tarifas.find(t => t.temporada_id === temp.id && t.categoria_id === cat.id)
                    return (
                      <form 
                        key={cat.id} 
                        onSubmit={(e) => handleSaveTarifa(e, temp.id, cat.id)}
                        className="flex flex-col lg:flex-row gap-4 items-end bg-zinc-50/50 p-4 rounded-lg border border-zinc-100 dark:bg-zinc-900/50 dark:border-zinc-800/50"
                      >
                        <div className="flex-1 w-full">
                          <Label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">{cat.nombre}</Label>
                          <p className="text-xs text-zinc-500 mb-2">Pax Base: {cat.capacidad_base_pax} | Max: {cat.capacidad_max_adultos}A / {cat.capacidad_max_ninos}N</p>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-3 w-full lg:w-auto">
                          <div>
                            <Label className="text-xs">Tarifa Base ({moneda_base})</Label>
                            <Input name="tarifa_base" type="number" step="0.01" defaultValue={existingTarifa?.tarifa_base} required />
                          </div>
                          <div>
                            <Label className="text-xs">Adulto Extra ({moneda_base})</Label>
                            <Input name="tarifa_adulto_extra" type="number" step="0.01" defaultValue={existingTarifa?.tarifa_adulto_extra || 0} required />
                          </div>
                          <div>
                            <Label className="text-xs">Niño Extra ({moneda_base})</Label>
                            <Input name="tarifa_nino" type="number" step="0.01" defaultValue={existingTarifa?.tarifa_nino || 0} required />
                          </div>
                        </div>
                        
                        <Button type="submit" variant="secondary" className="w-full lg:w-auto">
                          <DollarSign className="w-4 h-4 mr-2" /> Guardar
                        </Button>
                      </form>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
