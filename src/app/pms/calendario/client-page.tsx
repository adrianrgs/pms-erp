'use client'

import { useState, useEffect } from 'react'
import { startOfMonth, endOfMonth, eachDayOfInterval, format, isWithinInterval, addMonths, subMonths, parseISO, addDays, startOfDay, differenceInDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Plus, BedDouble, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { addReserva, editReserva, deleteReserva, calcularTarifa, deleteReservaGroup } from '../reservas/actions'

export default function CalendarioClientPage({ habitaciones, reservas, categorias, serviciosAdicionalesDisponibles = [], edadMaxInfantes = 3, edadMaxNinos = 12 }: { habitaciones: any[], reservas: any[], categorias: any[], serviciosAdicionalesDisponibles?: any[], edadMaxInfantes?: number, edadMaxNinos?: number }) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [calculating, setCalculating] = useState(false)
  
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    check_in: '',
    check_out: '',
    habitacion_ids: [] as string[],
    detalles_por_habitacion: {} as Record<string, { nombre: string, documento: string, adultos: string, ninos: string, edadesNinos: number[], acompanantes: { id: string, nombre: string, documento: string }[] }>,
    tarifas_por_habitacion: {} as Record<string, number>,
    desgloses_por_habitacion: {} as Record<string, { base: number, adultos_extra: number, ninos: number }>,
    localizador: undefined as string | undefined,

    adultos: '2',
    ninos: '0',
    edadesNinos: [] as number[],
    cliente_nombre: '',
    cliente_email: '',
    cliente_telefono: '',
    cliente_documento: '',
    acompanantes_globales: [] as { id: string, nombre: string, documento: string }[],
    servicios_seleccionados: [] as any[],
    total: '',
  })

  // Live Pricing Calculation
  useEffect(() => {
    const fetchPrice = async () => {
      if (formData.check_in && formData.check_out && formData.habitacion_ids.length > 0) {
        setCalculating(true)
        try {
          let grandTotal = 0;
          let hasError = false;
          let errorMsg = '';
          
          const results = await Promise.all(formData.habitacion_ids.map(id => {
            const detail = formData.detalles_por_habitacion[id] || {}
            const ad = detail.adultos ? parseInt(detail.adultos) : parseInt(formData.adultos) || 2
            const ni = detail.ninos ? parseInt(detail.ninos) : parseInt(formData.ninos) || 0

            const edades = detail.edadesNinos || formData.edadesNinos || []
            let ninosEfectivos = 0
            edades.forEach(edad => {
              if (edad > edadMaxInfantes && edad <= edadMaxNinos) ninosEfectivos++;
            })
            if (edades.length === 0 && ni > 0) {
              ninosEfectivos = ni;
            }

            return calcularTarifa(
              id, 
              formData.check_in, 
              formData.check_out, 
              ad, 
              ninosEfectivos
            )
          }))

          const newTarifas: Record<string, number> = {}
          const newDesgloses: Record<string, { base: number, adultos_extra: number, ninos: number }> = {}

          for (let i = 0; i < results.length; i++) {
            const result = results[i]
            const id = formData.habitacion_ids[i]
            if (result && typeof result === 'object' && 'error' in result) {
              hasError = true;
              errorMsg = result.error as string;
              break;
            } else if (result && typeof result === 'object' && 'precio' in result) {
              grandTotal += (result.precio as number);
              newTarifas[id] = result.precio as number;
              newDesgloses[id] = result.desglose as { base: number, adultos_extra: number, ninos: number } || { base: 0, adultos_extra: 0, ninos: 0 };
            }
          }
          
          if (hasError) {
            toast.warning('Aviso de Tarifa', { description: errorMsg })
            setFormData(prev => ({ ...prev, total: '0', tarifas_por_habitacion: {}, desgloses_por_habitacion: {} }))
          } else {
            // Calculate days
            const d1 = new Date(formData.check_in);
            const d2 = new Date(formData.check_out);
            const dias = (d1 && d2 && d1 < d2) ? differenceInDays(d2, d1) : 0;
            
            // Calculate total persons
            let totalPersonas = 0;
            formData.habitacion_ids.forEach(id => {
              const detail = formData.detalles_por_habitacion[id] || {}
              const ad = detail.adultos ? parseInt(detail.adultos) : parseInt(formData.adultos) || 2
              const ni = detail.ninos ? parseInt(detail.ninos) : parseInt(formData.ninos) || 0
              totalPersonas += (ad + ni);
            });

            // Add services total
            const serviciosTotal = formData.servicios_seleccionados.reduce((sum, s) => {
              const precioBase = Number(s.precio) || 0;
              if (s.tipo_cobro === 'Por Persona / Por Noche') {
                return sum + (precioBase * totalPersonas * dias);
              } else {
                return sum + precioBase;
              }
            }, 0)

            const finalTotal = grandTotal + serviciosTotal

            setFormData(prev => ({ ...prev, total: finalTotal.toString(), tarifas_por_habitacion: newTarifas, desgloses_por_habitacion: newDesgloses }))
          }
        } catch (error) {
          console.error("Error calculating rate", error)
        } finally {
          setCalculating(false)
        }
      }
    }
    
    // Only fetch if it's a new reservation
    if (!editingId) {
      const delay = setTimeout(fetchPrice, 500)
      return () => clearTimeout(delay)
    }
  }, [formData.check_in, formData.check_out, formData.habitacion_ids, formData.adultos, formData.ninos, formData.edadesNinos, formData.detalles_por_habitacion, formData.servicios_seleccionados, editingId])

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const today = startOfDay(new Date())

  // Auto-scroll to today
  useEffect(() => {
    const isCurrentMonth = format(currentDate, 'yyyy-MM') === format(today, 'yyyy-MM')
    if (isCurrentMonth) {
      // Give it a tiny timeout to ensure the DOM is painted
      setTimeout(() => {
        const scrollContainer = document.getElementById('calendar-scroll-container')
        const todayCol = document.getElementById('today-column')
        if (scrollContainer && todayCol) {
          // Scroll to the element minus the width of the sticky room column (approx 120px) and a little padding
          const scrollPosition = todayCol.offsetLeft - 150
          scrollContainer.scrollTo({ left: scrollPosition, behavior: 'smooth' })
        }
      }, 100)
    } else {
      // If navigating to another month, scroll to start
      const scrollContainer = document.getElementById('calendar-scroll-container')
      if (scrollContainer) scrollContainer.scrollTo({ left: 0, behavior: 'smooth' })
    }
  }, [currentDate])

  async function handleAddReserva(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    try {
      const formNode = e.currentTarget as HTMLFormElement
      const data = new FormData(formNode)
      data.append('servicios_adicionales', JSON.stringify(formData.servicios_seleccionados))

      if (editingId) {
        await editReserva(editingId, data)
        toast.success('Reserva actualizada')
      } else {
        await addReserva(data)
        toast.success('Reserva creada exitosamente')
      }
      setOpen(false)
    } catch (error: any) {
      toast.error('Error al guardar', { description: error.message })
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!editingId) return
    if (!confirm('¿Seguro que deseas eliminar esta reserva?')) return
    setLoading(true)
    try {
      await deleteReserva(editingId)
      toast.success('Reserva eliminada')
      setOpen(false)
    } catch (error: any) {
      toast.error('Error al eliminar', { description: error.message })
    } finally {
      setLoading(false)
    }
  }

  async function handleDeleteGroup(localizador: string) {
    if (!localizador) return
    if (!confirm('Esta acción eliminará TODAS las habitaciones asociadas a este localizador. ¿Deseas continuar?')) return
    setLoading(true)
    try {
      await deleteReservaGroup(localizador)
      toast.success('Grupo de reserva eliminado')
      setOpen(false)
    } catch (error: any) {
      toast.error('Error al eliminar grupo', { description: error.message })
    } finally {
      setLoading(false)
    }
  }

  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1))
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1))

  const handleEmptyCellClick = (habitacionId: string, date: Date) => {
    setEditingId(null)
    setFormData({
      check_in: format(date, 'yyyy-MM-dd'),
      check_out: format(addDays(date, 1), 'yyyy-MM-dd'),
      habitacion_ids: [habitacionId],
      detalles_por_habitacion: {},
      tarifas_por_habitacion: {},
      desgloses_por_habitacion: {},
      localizador: undefined,
      adultos: '2',
      ninos: '0',
      edadesNinos: [],
      cliente_nombre: '',
      cliente_email: '',
      cliente_telefono: '',
      cliente_documento: '',
      acompanantes_globales: [],
      servicios_seleccionados: [],
      total: ''
    })
    setOpen(true)
  }

  const handleBookingClick = (booking: any, e: React.MouseEvent) => {
    e.stopPropagation()
    const clienteInfo = booking.cliente_info || {}
    setEditingId(booking.id)
    setFormData({
      check_in: booking.check_in,
      check_out: booking.check_out,
      habitacion_ids: [booking.habitacion_id],
      detalles_por_habitacion: {},
      tarifas_por_habitacion: {
        [booking.habitacion_id]: booking.monto_total || 0
      },
      desgloses_por_habitacion: {},
      localizador: booking.localizador,
      adultos: booking.adultos?.toString() || '2',
      ninos: booking.ninos?.toString() || '0',
      edadesNinos: [], // No guardamos edades en BD aún para calendario, asumiremos cálculo por conteo
      cliente_nombre: clienteInfo.titular?.nombre || clienteInfo.nombre || '',
      cliente_email: clienteInfo.titular?.email || clienteInfo.email || '',
      cliente_telefono: clienteInfo.titular?.telefono || clienteInfo.telefono || '',
      cliente_documento: clienteInfo.titular?.documento || clienteInfo.documento || '',
      acompanantes_globales: (clienteInfo.acompanantes || []).map((ac: any, i: number) => ({ ...ac, id: ac.id || `db-ac-${i}-${Date.now()}` })),
      servicios_seleccionados: booking.servicios_adicionales || [],
      total: booking.monto_total?.toString() || '0'
    })
    setOpen(true)
  }

  const getBookingForRoomAndDay = (habitacionId: string, day: Date) => {
    return reservas.find(res => {
      if (res.habitacion_id !== habitacionId || res.estado === 'cancelada') return false
      const checkIn = startOfDay(parseISO(res.check_in))
      const checkOut = startOfDay(parseISO(res.check_out))
      return day >= checkIn && day < checkOut
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex-1 min-w-[200px]">
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Front-Desk & Calendario</h2>
          <p className="text-zinc-500 dark:text-zinc-400">Haz clic en un día libre para registrar o en una reserva para editarla.</p>
        </div>
        
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button 
              className="shrink-0" 
              disabled={habitaciones.length === 0}
              onClick={() => {
                setEditingId(null)
                setFormData({
                  check_in: '', check_out: '', habitacion_ids: [], detalles_por_habitacion: {}, tarifas_por_habitacion: {}, desgloses_por_habitacion: {}, localizador: undefined, adultos: '2', ninos: '0', edadesNinos: [],
                  cliente_nombre: '', cliente_email: '', cliente_telefono: '', cliente_documento: '', acompanantes_globales: [], servicios_seleccionados: [], total: '0'
                })
              }}
            >
              <Plus className="mr-2 h-4 w-4" /> Nueva Reserva
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[700px]">
            <form onSubmit={handleAddReserva}>
              <DialogHeader>
                <DialogTitle>{editingId ? 'Editar Reserva' : 'Registrar Reserva'}</DialogTitle>
                <DialogDescription>
                  Modifica o carga una reservación manual.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto px-1">
                  <div className="grid gap-2">
                    <Label htmlFor="cliente_nombre">Huésped Titular Principal</Label>
                    <Input id="cliente_nombre" name="cliente_nombre" value={formData.cliente_nombre || ''} onChange={e => handleInputChange('cliente_nombre', e.target.value)} required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="cliente_documento">Documento de Identidad (Opcional)</Label>
                    <Input id="cliente_documento" name="cliente_documento" value={formData.cliente_documento || ''} onChange={e => handleInputChange('cliente_documento', e.target.value)} />
                  </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="check_in">Check-in</Label>
                    <Input 
                      id="check_in" 
                      name="check_in" 
                      type="date" 
                      min={format(new Date(), 'yyyy-MM-dd')}
                      value={formData.check_in || ''} 
                      onChange={e => {
                        const val = e.target.value
                        if(!val) {
                          handleInputChange('check_in', '')
                          return
                        }
                        const [y, m, d] = val.split('-').map(Number)
                        const nextDay = format(addDays(new Date(y, m - 1, d), 1), 'yyyy-MM-dd')
                        setFormData(prev => ({ ...prev, check_in: val, check_out: nextDay }))
                      }} 
                      required 
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="check_out">Check-out</Label>
                    <Input 
                      id="check_out" 
                      name="check_out" 
                      type="date" 
                      min={formData.check_in ? (() => {
                        const [y, m, d] = formData.check_in.split('-').map(Number)
                        return format(addDays(new Date(y, m - 1, d), 1), 'yyyy-MM-dd')
                      })() : format(new Date(), 'yyyy-MM-dd')}
                      value={formData.check_out || ''} 
                      onChange={e => handleInputChange('check_out', e.target.value)} 
                      required 
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <div className="bg-teal-50 dark:bg-teal-900/20 p-4 rounded-xl border border-teal-100 dark:border-teal-800/30 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex flex-col">
                      <span className="font-semibold text-teal-800 dark:text-teal-300">Total de la Reserva</span>
                      <span className="text-3xl font-bold text-teal-900 dark:text-teal-100 tracking-tight">
                        ${formData.total || '0'} {calculating && <span className="text-sm font-normal opacity-70 ml-2">(Calculando...)</span>}
                      </span>
                      {Object.keys(formData.desgloses_por_habitacion || {}).length > 0 && (
                        <div className="mt-2 flex gap-3 text-xs text-teal-700 dark:text-teal-400">
                          <span>Base: ${Object.values(formData.desgloses_por_habitacion || {}).reduce((a, b) => a + (b.base || 0), 0)}</span>
                          <span>Extras: ${Object.values(formData.desgloses_por_habitacion || {}).reduce((a, b) => a + (b.adultos_extra || 0), 0)}</span>
                          <span>Niños: ${Object.values(formData.desgloses_por_habitacion || {}).reduce((a, b) => a + (b.ninos || 0), 0)}</span>
                        </div>
                      )}
                    </div>
                    <Button type="submit" disabled={loading || calculating} className="bg-teal-600 hover:bg-teal-700 text-white w-full sm:w-auto shadow-sm">
                      {loading ? 'Guardando...' : (editingId ? 'Guardar Cambios' : 'Confirmar Reserva')}
                    </Button>
                  </div>
                  <input type="hidden" name="total" value={formData.total} />
                  <input type="hidden" name="tarifas_por_habitacion" value={JSON.stringify(formData.tarifas_por_habitacion)} />
                </div>

                <div className="grid gap-2">
                  <Label>Habitación(es) Asignada(s)</Label>
                  {/* Hidden inputs to send to server action */}
                  {formData.habitacion_ids.map(id => (
                    <input key={id} type="hidden" name="habitacion_ids" value={id} />
                  ))}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800" disabled={!!editingId}>
                        {formData.habitacion_ids.length === 0 
                          ? "Seleccionar habitaciones..." 
                          : `${formData.habitacion_ids.length} habitación(es) seleccionada(s)`}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0" align="start">
                      <div className="max-h-[250px] overflow-y-auto p-2">
                        {habitaciones.map(hab => (
                          <label key={hab.id} className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer">
                            <input 
                              type="checkbox"
                              checked={formData.habitacion_ids.includes(hab.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setFormData(prev => ({...prev, habitacion_ids: [...prev.habitacion_ids, hab.id]}))
                                } else {
                                  setFormData(prev => ({...prev, habitacion_ids: prev.habitacion_ids.filter(id => id !== hab.id)}))
                                }
                              }}
                              disabled={!!editingId && !formData.habitacion_ids.includes(hab.id)} // Prevent adding rooms while editing single booking
                              className="rounded border-zinc-300 text-teal-600 focus:ring-teal-500 disabled:opacity-50"
                            />
                            Hab. {hab.numero_habitacion} {hab.nombre ? `(${hab.nombre})` : ''}
                          </label>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                  {editingId && <span className="text-xs text-zinc-500">Para agregar más habitaciones, crea una nueva reserva.</span>}
                  {editingId && formData.habitacion_ids.length === 1 && (
                    <input type="hidden" name="habitacion_id" value={formData.habitacion_ids[0]} /> // Required for editReserva action
                  )}
                  
                  {/* Custom configuration per room for multi-room bookings */}
                  {!editingId && formData.habitacion_ids.length > 1 && (
                    <div className="space-y-3 mt-2 p-3 bg-zinc-50 dark:bg-zinc-900/50 rounded-md border border-zinc-100 dark:border-zinc-800">
                      <Label className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Configuración específica por habitación</Label>
                      <input type="hidden" name="detalles_por_habitacion" value={JSON.stringify(formData.detalles_por_habitacion)} />
                      {formData.habitacion_ids.map((id, index) => {
                        const hab = habitaciones.find(h => h.id === id)
                        const detail = formData.detalles_por_habitacion[id] || { nombre: '', documento: '', adultos: '', ninos: '', edadesNinos: [], acompanantes: [] }
                        
                        return (
                          <div key={id} className="grid grid-cols-12 gap-2 items-start p-3 rounded bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 relative">
                            <div className="col-span-12 flex items-center gap-2 mb-1">
                              <span className="text-xs font-semibold w-16 truncate text-zinc-700 dark:text-zinc-300" title={hab?.numero_habitacion}>Hab. {hab?.numero_habitacion}:</span>
                              <div className="flex-1 flex gap-2">
                                <Input 
                                  placeholder={index === 0 ? formData.cliente_nombre || 'Nombre del Titular' : `Nombre Titular Hab. ${hab?.numero_habitacion} (Opcional)`} 
                                  value={index === 0 && !detail.nombre ? (formData.cliente_nombre || '') : (detail.nombre || '')}
                                  onChange={e => setFormData(prev => ({ 
                                    ...prev, 
                                    detalles_por_habitacion: { 
                                      ...prev.detalles_por_habitacion, 
                                      [id]: { ...detail, nombre: e.target.value } 
                                    } 
                                  }))}
                                  className="h-7 text-xs flex-1"
                                />
                                <Input 
                                  placeholder={index === 0 ? formData.cliente_documento || 'Cédula/Doc' : 'Cédula/Doc (Opcional)'} 
                                  value={index === 0 && !detail.documento ? (formData.cliente_documento || '') : (detail.documento || '')}
                                  onChange={e => setFormData(prev => ({ 
                                    ...prev, 
                                    detalles_por_habitacion: { 
                                      ...prev.detalles_por_habitacion, 
                                      [id]: { ...detail, documento: e.target.value } 
                                    } 
                                  }))}
                                  className="h-7 text-xs w-32"
                                />
                              </div>
                            </div>
                            <div className="col-span-6 sm:col-span-3 flex items-center gap-2">
                              <span className="text-xs text-zinc-500 w-12 text-right">Adultos:</span>
                              <Select 
                                value={detail.adultos || formData.adultos} 
                                onValueChange={v => setFormData(prev => ({ 
                                  ...prev, 
                                  detalles_por_habitacion: { 
                                    ...prev.detalles_por_habitacion, 
                                    [id]: { ...detail, adultos: v } 
                                  } 
                                }))}
                              >
                                <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {[1, 2, 3, 4, 5, 6].map(n => <SelectItem key={n} value={n.toString()}>{n}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="col-span-6 sm:col-span-3 flex items-center gap-2">
                              <span className="text-xs text-zinc-500 w-10 text-right">Niños:</span>
                              <Select 
                                value={detail.ninos || formData.ninos} 
                                onValueChange={v => {
                                  const qty = parseInt(v) || 0;
                                  const currentEdades = detail.edadesNinos || formData.edadesNinos || [];
                                  let newEdades = [...currentEdades];
                                  if (qty > currentEdades.length) {
                                    newEdades = [...currentEdades, ...Array(qty - currentEdades.length).fill(10)];
                                  } else {
                                    newEdades = currentEdades.slice(0, qty);
                                  }
                                  
                                  setFormData(prev => ({ 
                                    ...prev, 
                                    detalles_por_habitacion: { 
                                      ...prev.detalles_por_habitacion, 
                                      [id]: { ...detail, ninos: v, edadesNinos: newEdades } 
                                    } 
                                  }))
                                }}
                              >
                                <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {[0, 1, 2, 3, 4, 5].map(n => <SelectItem key={n} value={n.toString()}>{n}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                            
                            {/* Selector de Edades de Niños Individual */}
                            {detail.edadesNinos && detail.edadesNinos.length > 0 && (
                              <div className="col-span-12 flex flex-wrap gap-2 items-center bg-zinc-50 dark:bg-zinc-900/50 p-2 mt-1 rounded border border-zinc-100 dark:border-zinc-800">
                                <span className="text-xs text-zinc-500 w-full mb-1">Edades de los niños:</span>
                                {detail.edadesNinos.map((edad, idx) => (
                                  <div key={idx} className="flex flex-col gap-1 w-16">
                                    <Label className="text-[10px] text-zinc-400">Niño {idx + 1}</Label>
                                    <Input 
                                      type="number" min="0" max={edadMaxNinos} 
                                      value={edad}
                                      onChange={e => {
                                        const val = parseInt(e.target.value) || 0;
                                        const clampedVal = Math.min(Math.max(val, 0), edadMaxNinos);
                                        const newEdades = [...detail.edadesNinos];
                                        newEdades[idx] = clampedVal;
                                        setFormData(prev => ({
                                          ...prev,
                                          detalles_por_habitacion: {
                                            ...prev.detalles_por_habitacion,
                                            [id]: { ...detail, edadesNinos: newEdades }
                                          }
                                        }))
                                      }}
                                      onBlur={e => {
                                        const val = parseInt(e.target.value) || 0;
                                        const clampedVal = Math.min(Math.max(val, 0), edadMaxNinos);
                                        const newEdades = [...detail.edadesNinos];
                                        newEdades[idx] = clampedVal;
                                        setFormData(prev => ({
                                          ...prev,
                                          detalles_por_habitacion: {
                                            ...prev.detalles_por_habitacion,
                                            [id]: { ...detail, edadesNinos: newEdades }
                                          }
                                        }))
                                      }}
                                      className="h-6 text-xs p-1 text-center"
                                    />
                                  </div>
                                ))}
                              </div>
                            )}
                            <div className="col-span-12 sm:col-span-2 flex justify-end">
                              <span className="text-xs font-semibold text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20 px-2 py-1 rounded">
                                ${formData.tarifas_por_habitacion[id] || 0}
                              </span>
                            </div>
                            
                            {/* Acompañantes por habitación */}
                            <div className="col-span-12 mt-2">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs text-zinc-500">Acompañantes</span>
                                <Button 
                                  type="button" 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => {
                                    const acs = detail.acompanantes || [];
                                    setFormData(prev => ({
                                      ...prev,
                                      detalles_por_habitacion: {
                                        ...prev.detalles_por_habitacion,
                                        [id]: { ...detail, acompanantes: [...acs, { id: crypto.randomUUID(), nombre: '', documento: '' }] }
                                      }
                                    }))
                                  }}
                                  className="h-5 px-1 text-xs text-indigo-600"
                                >
                                  + Añadir
                                </Button>
                              </div>
                              {detail.acompanantes && detail.acompanantes.length > 0 && (
                                <div className="space-y-1">
                                  {detail.acompanantes.map(ac => (
                                    <div key={ac.id} className="flex gap-2 items-center bg-zinc-50 dark:bg-zinc-900/50 p-1.5 rounded border border-zinc-100 dark:border-zinc-800">
                                      <Input 
                                        placeholder="Nombre" 
                                        value={ac.nombre || ''} 
                                        onChange={e => {
                                          const acs = detail.acompanantes.map(x => x.id === ac.id ? { ...x, nombre: e.target.value } : x);
                                          setFormData(prev => ({ ...prev, detalles_por_habitacion: { ...prev.detalles_por_habitacion, [id]: { ...detail, acompanantes: acs } } }))
                                        }} 
                                        className="h-6 text-xs flex-1" 
                                      />
                                      <Input 
                                        placeholder="Documento" 
                                        value={ac.documento || ''} 
                                        onChange={e => {
                                          const acs = detail.acompanantes.map(x => x.id === ac.id ? { ...x, documento: e.target.value } : x);
                                          setFormData(prev => ({ ...prev, detalles_por_habitacion: { ...prev.detalles_por_habitacion, [id]: { ...detail, acompanantes: acs } } }))
                                        }} 
                                        className="h-6 text-xs flex-1" 
                                      />
                                      <button type="button" onClick={() => {
                                        const acs = detail.acompanantes.filter(x => x.id !== ac.id);
                                        setFormData(prev => ({ ...prev, detalles_por_habitacion: { ...prev.detalles_por_habitacion, [id]: { ...detail, acompanantes: acs } } }))
                                      }} className="text-red-500 p-1">
                                        <Trash2 className="h-3 w-3" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
                
                {formData.habitacion_ids.length <= 1 && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="adultos">Adultos</Label>
                        <Input id="adultos" name="adultos" type="number" min="1" value={formData.adultos || ''} onChange={e => handleInputChange('adultos', e.target.value)} required />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="ninos">Niños</Label>
                        <Input 
                          id="ninos" name="ninos" type="number" min="0" 
                          value={formData.ninos || ''} 
                          onChange={e => {
                            const val = e.target.value
                            const qty = parseInt(val) || 0
                            const currentEdades = formData.edadesNinos || []
                            let newEdades = [...currentEdades]
                            if (qty > currentEdades.length) {
                              newEdades = [...currentEdades, ...Array(qty - currentEdades.length).fill(10)]
                            } else {
                              newEdades = currentEdades.slice(0, qty)
                            }
                            setFormData(prev => ({ ...prev, ninos: val, edadesNinos: newEdades }))
                          }} 
                          required 
                        />
                      </div>
                    </div>

                    {/* Selector de edades global */}
                    {formData.edadesNinos.length > 0 && (
                      <div className="p-3 bg-zinc-50 dark:bg-zinc-900/50 rounded-md border border-zinc-100 dark:border-zinc-800">
                        <Label className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 block mb-2">Edades de los Niños</Label>
                        <div className="flex flex-wrap gap-3">
                          {formData.edadesNinos.map((edad, idx) => (
                            <div key={idx} className="flex flex-col gap-1 w-20">
                              <Label className="text-xs text-zinc-500">Niño {idx + 1}</Label>
                              <Input 
                                type="number" min="0" max="17" 
                                value={edad}
                                onChange={e => {
                                  const val = parseInt(e.target.value) || 0;
                                  const clampedVal = Math.min(Math.max(val, 0), edadMaxNinos);
                                  const newEdades = [...formData.edadesNinos];
                                  newEdades[idx] = clampedVal;
                                  setFormData(prev => ({ ...prev, edadesNinos: newEdades }));
                                }}
                                onBlur={e => {
                                  const val = parseInt(e.target.value) || 0;
                                  const clampedVal = Math.min(Math.max(val, 0), edadMaxNinos);
                                  const newEdades = [...formData.edadesNinos];
                                  newEdades[idx] = clampedVal;
                                  setFormData(prev => ({ ...prev, edadesNinos: newEdades }));
                                }}
                                className="h-8"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Acompañantes globales para una sola habitación */}
                    <div className="space-y-2 p-3 bg-zinc-50 dark:bg-zinc-900/50 rounded-md border border-zinc-100 dark:border-zinc-800">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Acompañantes</Label>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setFormData(prev => ({
                            ...prev, 
                            acompanantes_globales: [...prev.acompanantes_globales, { id: crypto.randomUUID(), nombre: '', documento: '' }]
                          }))}
                          className="h-6 px-2 text-xs text-indigo-600"
                        >
                          <Plus className="h-3 w-3 mr-1" /> Añadir
                        </Button>
                      </div>
                      <input type="hidden" name="acompanantes_globales" value={JSON.stringify(formData.acompanantes_globales)} />
                      
                      {formData.acompanantes_globales.length === 0 ? (
                        <p className="text-xs text-zinc-500 italic">No hay acompañantes adicionales registrados.</p>
                      ) : (
                        <div className="space-y-2">
                          {formData.acompanantes_globales.map(ac => (
                            <div key={ac.id} className="flex gap-2 items-center bg-white dark:bg-zinc-950 p-2 rounded border border-zinc-200 dark:border-zinc-800">
                              <Input 
                                placeholder="Nombre completo" 
                                value={ac.nombre || ''} 
                                onChange={e => {
                                  const acs = formData.acompanantes_globales.map(x => x.id === ac.id ? { ...x, nombre: e.target.value } : x);
                                  setFormData(prev => ({ ...prev, acompanantes_globales: acs }))
                                }} 
                                className="h-8 text-sm flex-1" 
                                required
                              />
                              <Input 
                                placeholder="Documento (Opcional)" 
                                value={ac.documento || ''} 
                                onChange={e => {
                                  const acs = formData.acompanantes_globales.map(x => x.id === ac.id ? { ...x, documento: e.target.value } : x);
                                  setFormData(prev => ({ ...prev, acompanantes_globales: acs }))
                                }} 
                                className="h-8 text-sm flex-1" 
                              />
                              <button type="button" onClick={() => {
                                const acs = formData.acompanantes_globales.filter(x => x.id !== ac.id);
                                setFormData(prev => ({ ...prev, acompanantes_globales: acs }))
                              }} className="text-red-500 p-1 hover:bg-red-50 dark:hover:bg-red-950/30 rounded">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
                
                {serviciosAdicionalesDisponibles.filter(s => s.estado === 'activo' || !s.estado).length > 0 && (
                  <div className="space-y-2 mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                    <Label>Servicios Adicionales</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {serviciosAdicionalesDisponibles.filter(s => s.estado === 'activo' || !s.estado).map(servicio => {
                        const isSelected = formData.servicios_seleccionados.some(s => s.id === servicio.id)
                        return (
                          <div 
                            key={servicio.id}
                            onClick={() => {
                              if (isSelected) {
                                setFormData(prev => ({
                                  ...prev,
                                  servicios_seleccionados: prev.servicios_seleccionados.filter(s => s.id !== servicio.id)
                                }))
                              } else {
                                setFormData(prev => ({
                                  ...prev,
                                  servicios_seleccionados: [...prev.servicios_seleccionados, servicio]
                                }))
                              }
                            }}
                            className={`flex items-center justify-between p-2 rounded border cursor-pointer transition-colors ${
                              isSelected 
                                ? 'bg-indigo-50 border-indigo-200 dark:bg-indigo-900/30 dark:border-indigo-800' 
                                : 'bg-white border-zinc-200 hover:border-indigo-200 dark:bg-zinc-950 dark:border-zinc-800 dark:hover:border-indigo-800'
                            }`}
                          >
                            <div className="flex flex-col">
                              <span className={`text-sm font-medium ${isSelected ? 'text-indigo-700 dark:text-indigo-300' : 'text-zinc-700 dark:text-zinc-300'}`}>
                                {servicio.nombre}
                              </span>
                              <span className="text-xs text-zinc-500">${servicio.precio} - {servicio.tipo_cobro || 'Tarifa Fija'}</span>
                            </div>
                            <div className={`w-4 h-4 rounded border flex items-center justify-center ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-zinc-300 dark:border-zinc-700'}`}>
                              {isSelected && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                  <div className="grid gap-2">
                    <Label htmlFor="cliente_email">Email (opcional)</Label>
                    <Input id="cliente_email" name="cliente_email" type="email" value={formData.cliente_email || ''} onChange={e => handleInputChange('cliente_email', e.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="cliente_telefono">Teléfono (opcional)</Label>
                    <Input id="cliente_telefono" name="cliente_telefono" type="tel" value={formData.cliente_telefono || ''} onChange={e => handleInputChange('cliente_telefono', e.target.value)} />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="total" className="flex items-center gap-2">
                    Tarifa Total (USD) 
                    {calculating && <span className="text-[10px] text-indigo-500 font-normal animate-pulse">(Calculando...)</span>}
                  </Label>
                  <Input id="total" name="total" type="number" step="0.01" value={formData.total || ''} onChange={e => handleInputChange('total', e.target.value)} required />
                </div>
              </div>
              <DialogFooter className="flex items-center justify-between sm:justify-between w-full mt-4">
                {editingId ? (
                  <div className="flex gap-2">
                    <Button type="button" variant="destructive" onClick={handleDelete} disabled={loading} title="Eliminar SOLO esta habitación">
                      <Trash2 className="h-4 w-4 mr-2" /> Eliminar Habitación
                    </Button>
                    {(formData as any).localizador && (
                      <Button type="button" variant="destructive" onClick={() => handleDeleteGroup((formData as any).localizador)} disabled={loading} title="Eliminar todo el grupo de esta reserva">
                        <Trash2 className="h-4 w-4 mr-2" /> Eliminar Grupo
                      </Button>
                    )}
                  </div>
                ) : <div />}
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                  <Button type="submit" disabled={loading}>{loading ? 'Guardando...' : 'Guardar'}</Button>
                </div>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 shadow-sm relative w-full overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-200 dark:border-zinc-800 p-4 bg-zinc-50/50 dark:bg-zinc-900/50 gap-4">
          <div className="flex items-center justify-center gap-4">
            <Button variant="outline" size="icon" onClick={prevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h3 className="text-lg font-semibold capitalize w-40 text-center">
              {format(currentDate, 'MMMM yyyy', { locale: es })}
            </h3>
            <Button variant="outline" size="icon" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center justify-center gap-3 text-sm">
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-white border border-zinc-200 dark:border-zinc-700 rounded-sm"></div> Libre</div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-indigo-500 rounded-sm"></div> Ocupado</div>
          </div>
        </div>

        {habitaciones.length === 0 ? (
          <div className="p-8 text-center text-zinc-500">
            No tienes habitaciones creadas. Ve a la sección de Inventario primero.
          </div>
        ) : (
          <div id="calendar-scroll-container" className="w-full overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
            <table className="min-w-max border-collapse border-spacing-0">
              <thead>
                <tr>
                  <th className="sticky left-0 z-20 bg-zinc-100 dark:bg-zinc-900 border-b border-r border-zinc-200 dark:border-zinc-800 p-3 text-left text-xs font-semibold text-zinc-600 dark:text-zinc-400 w-auto whitespace-nowrap min-w-[60px] sm:min-w-[120px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                    <span className="sm:hidden">Hab.</span>
                    <span className="hidden sm:inline">Habitación</span>
                  </th>
                  {daysInMonth.map((day, i) => {
                    const isToday = format(day, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')
                    const isPastDay = day < today
                    
                    let headerClasses = 'border-b border-r border-zinc-200 dark:border-zinc-800 p-2 text-center text-xs font-medium min-w-[48px] '
                    if (isToday) {
                      headerClasses += 'bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300 ring-inset ring-2 ring-teal-500'
                    } else if (isPastDay) {
                      headerClasses += 'bg-zinc-200/60 dark:bg-zinc-900 text-zinc-400 dark:text-zinc-600'
                    } else {
                      headerClasses += 'text-zinc-500 bg-zinc-50 dark:bg-zinc-900/50'
                    }

                    return (
                    <th key={i} id={isToday ? "today-column" : undefined} className={headerClasses}>
                      <div>{format(day, 'EEEEE', { locale: es })}</div>
                      <div className="font-bold">{format(day, 'd')}</div>
                    </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {habitaciones.map(hab => (
                  <tr key={hab.id} className="group transition-colors">
                    <td className="sticky left-0 z-10 bg-white dark:bg-zinc-950 group-hover:bg-zinc-50 dark:group-hover:bg-zinc-900 border-b border-r border-zinc-200 dark:border-zinc-800 p-3 text-sm font-medium shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] w-auto whitespace-nowrap">
                      <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
                        <BedDouble className="w-4 h-4 text-zinc-400 shrink-0" />
                        <span className="font-bold sm:hidden">{hab.numero_habitacion}</span>
                        <span className="hidden sm:inline font-medium">
                          {hab.nombre ? hab.nombre : `Hab. ${hab.numero_habitacion}`}
                        </span>
                      </div>
                    </td>
                    {daysInMonth.map((day, i) => {
                      const booking = getBookingForRoomAndDay(hab.id, day)
                      const isStart = booking && format(startOfDay(parseISO(booking.check_in)), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')
                      const clienteInfo = booking?.cliente_info || {}
                      const nombre = clienteInfo.titular?.nombre || clienteInfo.nombre || 'Huésped'
                      
                      const isPastDay = day < today
                      const isToday = format(day, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')
                      
                      return (
                        <td 
                          key={i} 
                          onClick={() => {
                            if (!booking && !isPastDay) handleEmptyCellClick(hab.id, day)
                          }}
                          className={`border-b border-r border-zinc-100 dark:border-zinc-800/50 p-1 text-center relative 
                            ${isToday && !booking ? 'bg-teal-50/30 dark:bg-teal-900/10' : ''}
                            ${booking 
                              ? 'bg-indigo-50 dark:bg-indigo-900/20' 
                              : isPastDay 
                                ? 'bg-zinc-200/50 dark:bg-zinc-900/60 cursor-not-allowed text-zinc-400' 
                                : 'bg-white dark:bg-zinc-950 cursor-pointer hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10'
                            }`}
                        >
                          {booking && (
                            <div 
                              onClick={(e) => handleBookingClick(booking, e)}
                              className={`absolute inset-y-1.5 left-0 right-0 bg-indigo-500 hover:bg-indigo-600 transition-colors cursor-pointer text-white text-[10px] flex items-center overflow-hidden px-1 whitespace-nowrap shadow-sm z-0
                                ${isStart ? 'rounded-l-md ml-1' : ''} 
                                ${format(startOfDay(parseISO(booking.check_out)), 'yyyy-MM-dd') === format(addDays(day, 1), 'yyyy-MM-dd') ? 'rounded-r-md mr-1' : ''}
                              `}
                              title={`${nombre} (${booking.check_in} a ${booking.check_out})`}
                            >
                              {isStart && <span className="font-semibold truncate">{nombre}</span>}
                            </div>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
