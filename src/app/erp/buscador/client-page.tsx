'use client'

import { useState } from 'react'
import { format, addDays, differenceInDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { Search, Building2, Users, BedDouble, ChevronRight, UserCircle, Plus, Trash2, ShoppingCart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { buscarDisponibilidad, confirmarReservaB2B, SearchResult } from './actions'

export default function BuscadorClientPage({ posadas }: { posadas: { id: string, nombre: string }[] }) {
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<SearchResult[]>([])
  const [availableServices, setAvailableServices] = useState<any[]>([])
  const [hasSearched, setHasSearched] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [openPosadaFilter, setOpenPosadaFilter] = useState(false)
  
  // Results filter state
  const [categoryFilterSearch, setCategoryFilterSearch] = useState('')
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [openCategoryFilter, setOpenCategoryFilter] = useState(false)
  
  // Date utils
  const today = format(new Date(), 'yyyy-MM-dd')
  
  // Search state
  const [searchParams, setSearchParams] = useState({
    check_in: '',
    check_out: '',
    adultos: '2',
    ninos: '0',
    posadas_ids: [] as string[],
    edadesNinos: [] as number[],
  })

  // Cart & Checkout state
  const [selectedRooms, setSelectedRooms] = useState<SearchResult[]>([])
  const [selectedServices, setSelectedServices] = useState<any[]>([])
  const [openCheckout, setOpenCheckout] = useState(false)
  
  const [guestInfo, setGuestInfo] = useState({
    nombre: '',
    documento: '',
    telefono: '',
    email: '',
    nacionalidad: '',
    numero_expediente: ''
  })
  const [acompanantes, setAcompanantes] = useState<{ id: string, nombre: string, documento: string }[]>([])
  const [bookingLoading, setBookingLoading] = useState(false)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await buscarDisponibilidad(
        searchParams.check_in, 
        searchParams.check_out, 
        parseInt(searchParams.adultos), 
        parseInt(searchParams.ninos),
        searchParams.posadas_ids,
        searchParams.edadesNinos
      )
      
      const parsedResults = Array.isArray(res) ? res : (res?.results || [])
      const parsedServices = !Array.isArray(res) ? (res?.servicios || []) : []
      
      setResults(parsedResults)
      setAvailableServices(parsedServices)
      setSelectedCategories([]) // Reset category filters on new search
      setSelectedRooms([]) // Clear cart on new search
      setSelectedServices([])
      setHasSearched(true)
    } catch (error: any) {
      toast.error('Error en la búsqueda', { description: error.message })
    } finally {
      setLoading(false)
    }
  }

  const toggleRoomSelection = (room: SearchResult) => {
    setSelectedRooms(prev => {
      if (prev.some(r => r.habitacion_id === room.habitacion_id)) {
        return prev.filter(r => r.habitacion_id !== room.habitacion_id)
      } else {
        return [...prev, room]
      }
    })
  }

  const toggleServiceSelection = (service: any) => {
    setSelectedServices(prev => {
      if (prev.some(s => s.id === service.id)) {
        return prev.filter(s => s.id !== service.id)
      } else {
        return [...prev, service]
      }
    })
  }

  const handleOpenCheckout = () => {
    if (selectedRooms.length === 0) return
    setGuestInfo({ nombre: '', documento: '', telefono: '', email: '', nacionalidad: '', numero_expediente: '' })
    setAcompanantes([])
    setOpenCheckout(true)
  }

  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedRooms.length === 0) return

    setBookingLoading(true)
    try {
      const dbAcompanantes = acompanantes
        .filter(ac => ac.nombre.trim() !== '')
        .map(ac => ({
          nombre: ac.nombre,
          documento: ac.documento || '',
          nacionalidad: '',
          tipo: 'adulto'
        }))

      const cliente_info = {
        titular: {
          nombre: guestInfo.nombre,
          documento: guestInfo.documento,
          telefono: guestInfo.telefono,
          email: guestInfo.email,
          nacionalidad: guestInfo.nacionalidad,
          tipo: 'adulto'
        },
        acompanantes: dbAcompanantes
      }

      const habitacionesToBook = selectedRooms.map(room => ({
        posada_id: room.posada_id,
        categoria_id: room.categoria_id,
        habitacion_id: room.habitacion_id,
        monto_total: room.precio_total,
        moneda: room.posada_moneda
      }))

      await confirmarReservaB2B(
        habitacionesToBook,
        searchParams.check_in,
        searchParams.check_out,
        parseInt(searchParams.adultos),
        parseInt(searchParams.ninos),
        cliente_info,
        selectedServices,
        guestInfo.numero_expediente
      )
      
      toast.success('Reserva Confirmada', { 
        description: `Se ha generado el localizador para ${guestInfo.nombre}.` 
      })
      
      setOpenCheckout(false)
      // Remove booked options from results to prevent double booking
      const bookedIds = selectedRooms.map(r => r.habitacion_id)
      setResults(prev => prev.filter(r => !bookedIds.includes(r.habitacion_id)))
      setSelectedRooms([])
      setSelectedServices([])
      
    } catch (error: any) {
      toast.error('Error al reservar', { description: error.message })
    } finally {
      setBookingLoading(false)
    }
  }

  // --- Calculations for Checkout Modal ---
  const d1 = new Date(searchParams.check_in || today)
  const d2 = new Date(searchParams.check_out || addDays(d1, 1).toISOString())
  const dias = (d1 && d2 && d1 < d2) ? differenceInDays(d2, d1) : 0
  const totalPersonas = parseInt(searchParams.adultos) + parseInt(searchParams.ninos)

  // 1. Calculate Room Totals & Commissions
  let subtotalHabitaciones = 0
  const comisionesTotalesAgrupadas: Record<number, { monto: number, nombres: string[] }> = {}

  selectedRooms.forEach(room => {
    subtotalHabitaciones += room.precio_total
    
    if (room.comision_detalle) {
      Object.entries(room.comision_detalle).forEach(([percentStr, monto]) => {
        const p = Number(percentStr)
        if (!comisionesTotalesAgrupadas[p]) comisionesTotalesAgrupadas[p] = { monto: 0, nombres: [] }
        comisionesTotalesAgrupadas[p].monto += monto
        if (!comisionesTotalesAgrupadas[p].nombres.includes('Alojamiento')) {
          comisionesTotalesAgrupadas[p].nombres.push('Alojamiento')
        }
      })
    }
  })

  // 2. Calculate Services Totals & Commissions
  let subtotalServicios = 0
  selectedServices.forEach(s => {
    const precioBase = Number(s.precio) || 0;
    let srvSubtotal = 0;
    if (s.tipo_cobro === 'Por Persona / Por Noche') {
      srvSubtotal = precioBase * totalPersonas * dias;
    } else {
      srvSubtotal = precioBase; // Tarifa Fija
    }
    subtotalServicios += srvSubtotal

    if (s.comisionable) {
      const p = Number(s.porcentaje_comision || 0)
      if (p > 0) {
        const comisionMonto = srvSubtotal * (p / 100)
        if (!comisionesTotalesAgrupadas[p]) comisionesTotalesAgrupadas[p] = { monto: 0, nombres: [] }
        comisionesTotalesAgrupadas[p].monto += comisionMonto
        comisionesTotalesAgrupadas[p].nombres.push(s.nombre || 'Servicio')
      }
    }
  })

  const granTotalPublico = subtotalHabitaciones + subtotalServicios
  const comisionTotalAgencia = Object.values(comisionesTotalesAgrupadas).reduce((acc, curr) => acc + curr.monto, 0)
  const totalNetoPagar = granTotalPublico - comisionTotalAgencia

  // Determine the currency from the first selected room
  const monedaGlobal = selectedRooms.length > 0 ? selectedRooms[0].posada_moneda : 'USD'
  
  // Available services filtered by selected posadas
  const posadasInCart = Array.from(new Set(selectedRooms.map(r => r.posada_id)))
  const filteredAvailableServices = availableServices.filter(s => posadasInCart.includes(s.posada_id))

  return (
    <div className="space-y-6 pb-24">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Buscador Global B2B</h2>
        <p className="text-zinc-500 dark:text-zinc-400">Consulta disponibilidad en tiempo real en todas las posadas asociadas.</p>
      </div>

      {/* Search Bar */}
      <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <form onSubmit={handleSearch} className="flex flex-col gap-4">
          <div className="grid gap-2 w-full">
            <Label>Filtrar por Posadas</Label>
            <Popover open={openPosadaFilter} onOpenChange={setOpenPosadaFilter}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
                  {searchParams.posadas_ids.length === 0 
                    ? "Todas las posadas" 
                    : `${searchParams.posadas_ids.length} posada(s) seleccionada(s)`}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-0" align="start">
                <div className="p-2 border-b border-zinc-100 dark:border-zinc-800">
                  <Input 
                    placeholder="Buscar posada..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-8"
                  />
                </div>
                <div className="max-h-[200px] overflow-y-auto p-2">
                  {posadas.filter(p => p.nombre.toLowerCase().includes(searchQuery.toLowerCase())).map(p => (
                    <label key={p.id} className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer">
                      <input 
                        type="checkbox"
                        checked={searchParams.posadas_ids.includes(p.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSearchParams(prev => ({...prev, posadas_ids: [...prev.posadas_ids, p.id]}))
                          } else {
                            setSearchParams(prev => ({...prev, posadas_ids: prev.posadas_ids.filter(id => id !== p.id)}))
                          }
                        }}
                        className="rounded border-zinc-300 text-teal-600 focus:ring-teal-500"
                      />
                      {p.nombre}
                    </label>
                  ))}
                  {posadas.filter(p => p.nombre.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                    <div className="p-2 text-sm text-zinc-500 text-center">No se encontraron posadas.</div>
                  )}
                </div>
                {searchParams.posadas_ids.length > 0 && (
                  <div className="p-2 border-t border-zinc-100 dark:border-zinc-800">
                    <Button 
                      variant="ghost" 
                      className="w-full h-8 text-xs text-zinc-500"
                      onClick={() => setSearchParams(prev => ({...prev, posadas_ids: []}))}
                    >
                      Limpiar selección
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex flex-col md:flex-row gap-4 items-end w-full">
            <div className="grid gap-2 flex-1 w-full">
              <Label htmlFor="check_in">Check-in</Label>
              <Input 
                id="check_in" 
                type="date" 
                min={today}
                value={searchParams.check_in} 
                onChange={e => {
                  const check_in_val = e.target.value;
                  if (!check_in_val) {
                    setSearchParams({...searchParams, check_in: ''});
                    return;
                  }
                  const [y, m, d] = check_in_val.split('-').map(Number)
                  const localDate = new Date(y, m - 1, d)
                  const nextDay = addDays(localDate, 1)
                  const check_out_val = format(nextDay, 'yyyy-MM-dd')
                  setSearchParams({
                    ...searchParams, 
                    check_in: check_in_val,
                    check_out: check_out_val
                  })
                }} 
                required 
              />
            </div>
            <div className="grid gap-2 flex-1 w-full">
              <Label htmlFor="check_out">Check-out</Label>
              <Input 
                id="check_out" 
                type="date" 
                min={searchParams.check_in ? (() => {
                  const [y, m, d] = searchParams.check_in.split('-').map(Number)
                  return format(addDays(new Date(y, m - 1, d), 1), 'yyyy-MM-dd')
                })() : today}
                value={searchParams.check_out} 
                onChange={e => setSearchParams({...searchParams, check_out: e.target.value})} 
                required 
              />
            </div>
            <div className="grid gap-2 w-full md:w-24">
              <Label htmlFor="adultos">Adultos</Label>
              <Input id="adultos" type="number" min="1" value={searchParams.adultos} onChange={e => setSearchParams({...searchParams, adultos: e.target.value})} required />
            </div>
            <div className="grid gap-2 w-full md:w-24">
              <Label htmlFor="ninos">Niños</Label>
              <Input id="ninos" type="number" min="0" value={searchParams.ninos} onChange={e => {
                const newNinos = parseInt(e.target.value) || 0
                setSearchParams({
                  ...searchParams, 
                  ninos: e.target.value,
                  edadesNinos: newNinos > searchParams.edadesNinos.length 
                    ? [...searchParams.edadesNinos, ...Array(newNinos - searchParams.edadesNinos.length).fill(0)]
                    : searchParams.edadesNinos.slice(0, newNinos)
                })
              }} required />
            </div>
            <Button type="submit" className="w-full md:w-auto bg-teal-600 hover:bg-teal-700 text-white" disabled={loading}>
              {loading ? 'Buscando...' : (
                <>
                  <Search className="mr-2 h-4 w-4" /> Buscar
                </>
              )}
            </Button>
          </div>
          {parseInt(searchParams.ninos) > 0 && (
            <div className="flex flex-wrap gap-4 items-center bg-zinc-50 dark:bg-zinc-900/50 p-3 rounded-lg border border-zinc-100 dark:border-zinc-800">
              <Label className="text-zinc-500 text-xs uppercase tracking-wider font-semibold w-full sm:w-auto">Edades de los niños:</Label>
              {searchParams.edadesNinos.map((edad, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-xs text-zinc-500">Niño {idx + 1}</span>
                  <Select
                    value={edad.toString()}
                    onValueChange={(val) => {
                      const newEdades = [...searchParams.edadesNinos]
                      newEdades[idx] = parseInt(val)
                      setSearchParams({...searchParams, edadesNinos: newEdades})
                    }}
                  >
                    <SelectTrigger className="w-[80px] h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({length: 18}, (_, i) => (
                        <SelectItem key={i} value={i.toString()}>{i} años</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          )}
        </form>
      </div>

      {/* Results */}
      {hasSearched && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              {(() => {
                const filtered = results.filter(r => selectedCategories.length === 0 || selectedCategories.includes(r.categoria_nombre));
                return `${filtered.length} opciones encontradas`;
              })()}
            </h3>
            
            {results.length > 0 && (
              <div className="flex items-center gap-2">
                <Label className="text-zinc-500 whitespace-nowrap">Filtrar por Habitación:</Label>
                <Popover open={openCategoryFilter} onOpenChange={setOpenCategoryFilter}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="w-[200px] justify-start text-left font-normal bg-white dark:bg-zinc-950">
                      {selectedCategories.length === 0 
                        ? "Todas las habitaciones" 
                        : `${selectedCategories.length} seleccionada(s)`}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[250px] p-0" align="end">
                    <div className="p-2 border-b border-zinc-100 dark:border-zinc-800">
                      <Input 
                        placeholder="Buscar tipo..." 
                        value={categoryFilterSearch}
                        onChange={(e) => setCategoryFilterSearch(e.target.value)}
                        className="h-8"
                      />
                    </div>
                    <div className="max-h-[200px] overflow-y-auto p-2">
                      {Array.from(new Set(results.map(r => r.categoria_nombre)))
                        .filter(cat => cat.toLowerCase().includes(categoryFilterSearch.toLowerCase()))
                        .sort()
                        .map(cat => (
                        <label key={cat} className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer">
                          <input 
                            type="checkbox"
                            checked={selectedCategories.includes(cat)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedCategories(prev => [...prev, cat])
                              } else {
                                setSelectedCategories(prev => prev.filter(c => c !== cat))
                              }
                            }}
                            className="rounded border-zinc-300 text-teal-600 focus:ring-teal-500"
                          />
                          {cat}
                        </label>
                      ))}
                    </div>
                    {selectedCategories.length > 0 && (
                      <div className="p-2 border-t border-zinc-100 dark:border-zinc-800">
                        <Button 
                          variant="ghost" 
                          className="w-full h-8 text-xs text-zinc-500"
                          onClick={() => setSelectedCategories([])}
                        >
                          Limpiar selección
                        </Button>
                      </div>
                    )}
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </div>
          
          {results.length === 0 ? (
            <div className="rounded-lg border border-dashed border-zinc-300 p-12 text-center dark:border-zinc-800">
              <Search className="mx-auto h-12 w-12 text-zinc-300 dark:text-zinc-700" />
              <h3 className="mt-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">No hay disponibilidad</h3>
              <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                Intenta cambiar las fechas o la cantidad de personas.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {results
                .filter(result => selectedCategories.length === 0 || selectedCategories.includes(result.categoria_nombre))
                .map((result, idx) => {
                  const isSelected = selectedRooms.some(r => r.habitacion_id === result.habitacion_id)
                  
                  return (
                    <Card 
                      key={idx} 
                      className={`overflow-hidden transition-all cursor-pointer ${
                        isSelected 
                          ? 'border-teal-500 ring-2 ring-teal-500 ring-offset-2 dark:ring-offset-zinc-950' 
                          : 'border-zinc-200 dark:border-zinc-800 hover:border-teal-500/50 hover:shadow-md'
                      }`}
                      onClick={() => toggleRoomSelection(result)}
                    >
                      <CardContent className="p-0">
                        {result.fotos && result.fotos.length > 0 && (
                          <div className="h-48 w-full overflow-hidden border-b border-zinc-100 dark:border-zinc-800 relative">
                            {isSelected && (
                              <div className="absolute top-2 right-2 bg-teal-600 text-white p-1 rounded-full z-10 shadow-lg">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                              </div>
                            )}
                            <img src={result.fotos[0]} alt={result.habitacion_nombre} className="w-full h-full object-cover transition-transform hover:scale-105" />
                          </div>
                        )}
                        <div className={`p-5 border-b ${isSelected ? 'bg-teal-50/50 dark:bg-teal-900/10 border-teal-100 dark:border-teal-900/30' : 'bg-zinc-50/50 dark:bg-zinc-900/20 border-zinc-100 dark:border-zinc-800/50'}`}>
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-1.5 text-teal-600 dark:text-teal-400 font-semibold mb-1">
                                <Building2 className="h-4 w-4" />
                                {result.posada_nombre}
                              </div>
                              <h4 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                                {result.categoria_nombre} <span className="text-sm font-normal text-zinc-500">({result.habitacion_nombre})</span>
                              </h4>
                            </div>
                          </div>
                        </div>
                        <div className="p-5 space-y-4">
                          <div className="flex gap-4 text-sm text-zinc-600 dark:text-zinc-400">
                            <div className="flex items-center gap-1.5">
                              <Users className="h-4 w-4 text-zinc-400" />
                              Hasta {result.capacidad_base} Pax Base
                            </div>
                            <div className="flex items-center gap-1.5">
                              <BedDouble className="h-4 w-4 text-zinc-400" />
                              Disp. Inmediata
                            </div>
                          </div>

                          {result.descripcion && (
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2">
                              {result.descripcion}
                            </p>
                          )}

                          {result.servicios && result.servicios.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {result.servicios.map((srv: string, i: number) => (
                                <span key={i} className="inline-flex items-center rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                                  {srv}
                                </span>
                              ))}
                            </div>
                          )}
                          
                          <div className="flex items-end justify-between pt-2">
                            <div>
                              <p className="text-xs text-zinc-500 dark:text-zinc-500 uppercase tracking-wider font-semibold mb-1">Tarifa Pública</p>
                              <div className="text-2xl font-black text-zinc-900 dark:text-zinc-50">
                                {result.precio_total} <span className="text-sm font-medium text-zinc-500">{result.posada_moneda}</span>
                              </div>
                            </div>
                            <Button 
                              variant={isSelected ? "default" : "outline"}
                              className={isSelected ? "bg-teal-600 text-white hover:bg-teal-700" : "hover:bg-zinc-100 dark:hover:bg-zinc-800"}
                            >
                              {isSelected ? 'Seleccionada' : 'Seleccionar'}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
            </div>
          )}
        </div>
      )}

      {/* Floating Cart Footer */}
      {selectedRooms.length > 0 && (
        <div className="fixed bottom-0 left-0 lg:left-64 right-0 p-4 bg-white dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800 shadow-[0_-10px_30px_rgba(0,0,0,0.05)] z-40 animate-in slide-in-from-bottom flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-teal-100 dark:bg-teal-900/50 rounded-full flex items-center justify-center text-teal-600 dark:text-teal-400">
              <ShoppingCart className="h-6 w-6" />
            </div>
            <div>
              <p className="font-semibold text-zinc-900 dark:text-zinc-100">{selectedRooms.length} Habitación(es) seleccionada(s)</p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Suma parcial: <span className="font-bold text-zinc-900 dark:text-zinc-100">{subtotalHabitaciones} {monedaGlobal}</span>
              </p>
            </div>
          </div>
          <Button onClick={handleOpenCheckout} size="lg" className="bg-teal-600 hover:bg-teal-700 text-white px-8">
            Proceder al Checkout <ChevronRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      )}

      {/* Checkout Modal */}
      <Dialog open={openCheckout} onOpenChange={setOpenCheckout}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col p-0">
          <form onSubmit={handleConfirmBooking} className="flex flex-col h-full overflow-hidden">
            <DialogHeader className="p-6 pb-2 shrink-0">
              <DialogTitle>Checkout y Comisiones B2B</DialogTitle>
              <DialogDescription>
                Revisa los detalles de la reserva y completa los datos del huésped.
              </DialogDescription>
            </DialogHeader>
            
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
              
              {/* Selected Rooms List */}
              <div className="space-y-3">
                <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <BedDouble className="h-4 w-4" /> Habitaciones Seleccionadas
                </h4>
                {selectedRooms.map((room, i) => (
                  <div key={i} className="flex justify-between items-center p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                    <div>
                      <p className="font-medium text-sm text-zinc-900 dark:text-zinc-100">{room.posada_nombre}</p>
                      <p className="text-xs text-zinc-500">{room.categoria_nombre} - {room.habitacion_nombre}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{room.precio_total} {room.posada_moneda}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Extra Services Selection */}
              {filteredAvailableServices.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <Plus className="h-4 w-4" /> Agregar Servicios Extra
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {filteredAvailableServices.map(servicio => {
                      const isSelected = selectedServices.some(s => s.id === servicio.id)
                      return (
                        <div 
                          key={servicio.id}
                          onClick={() => toggleServiceSelection(servicio)}
                          className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                            isSelected 
                              ? 'bg-teal-50 border-teal-200 dark:bg-teal-900/20 dark:border-teal-800/50' 
                              : 'bg-white border-zinc-200 hover:border-teal-200 dark:bg-zinc-950 dark:border-zinc-800 dark:hover:border-teal-800/50'
                          }`}
                        >
                          <div className="flex flex-col">
                            <span className={`text-sm font-medium ${isSelected ? 'text-teal-700 dark:text-teal-300' : 'text-zinc-700 dark:text-zinc-300'}`}>
                              {servicio.nombre}
                            </span>
                            <span className="text-xs text-zinc-500">{servicio.precio} {monedaGlobal} - {servicio.tipo_cobro || 'Fijo'}</span>
                          </div>
                          <div className={`w-4 h-4 rounded border flex items-center justify-center ${isSelected ? 'bg-teal-600 border-teal-600' : 'border-zinc-300 dark:border-zinc-700'}`}>
                            {isSelected && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Commission Breakdown */}
              <div className="bg-indigo-50 dark:bg-indigo-900/10 rounded-xl p-5 border border-indigo-100 dark:border-indigo-900/30">
                <h4 className="font-semibold text-indigo-900 dark:text-indigo-100 mb-4">Resumen y Comisiones</h4>
                <div className="space-y-2 text-sm text-indigo-800 dark:text-indigo-300">
                  <div className="flex justify-between items-center pb-2 border-b border-indigo-200 dark:border-indigo-800">
                    <span>Total PVP (Público):</span>
                    <span className="font-bold text-lg">{granTotalPublico.toFixed(2)} {monedaGlobal}</span>
                  </div>
                  
                  {Object.entries(comisionesTotalesAgrupadas).length > 0 ? (
                    <div className="py-2 space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600/70 dark:text-indigo-400/70">Desglose de tu Comisión</p>
                      {Object.entries(comisionesTotalesAgrupadas).map(([porcentaje, info]) => (
                        <div key={porcentaje} className="flex justify-between items-center bg-white/50 dark:bg-black/20 p-2 rounded">
                          <span className="text-xs">Comisión {porcentaje}% <span className="text-indigo-500/50">({info.nombres.join(', ')})</span></span>
                          <span className="font-medium text-emerald-600 dark:text-emerald-400">
                            + {info.monto.toFixed(2)} {monedaGlobal}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-2 text-xs italic text-indigo-500/70">
                      No hay comisiones configuradas para estos items.
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-3 border-t-2 border-indigo-200 dark:border-indigo-800 font-bold text-indigo-900 dark:text-indigo-100 text-lg">
                    <span>Neto a Pagar a Posada:</span>
                    <span>{totalNetoPagar.toFixed(2)} {monedaGlobal}</span>
                  </div>
                </div>
              </div>

              {/* Guest Data */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100 font-semibold border-b pb-2">
                  <UserCircle className="h-5 w-5" />
                  Datos del Huésped Titular
                </div>
                <div className="grid gap-2">
                  <Label>Nombre Completo</Label>
                  <Input value={guestInfo.nombre} onChange={e => setGuestInfo({...guestInfo, nombre: e.target.value})} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Documento</Label>
                    <Input value={guestInfo.documento} onChange={e => setGuestInfo({...guestInfo, documento: e.target.value})} required />
                  </div>
                  <div className="grid gap-2">
                    <Label>Nacionalidad</Label>
                    <Input value={guestInfo.nacionalidad} onChange={e => setGuestInfo({...guestInfo, nacionalidad: e.target.value})} />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>N° de Expediente / File (Opcional)</Label>
                  <Input placeholder="Referencia interna de la agencia" value={guestInfo.numero_expediente || ''} onChange={e => setGuestInfo({...guestInfo, numero_expediente: e.target.value})} />
                </div>
                
                <div className="space-y-2 p-3 bg-zinc-50 dark:bg-zinc-900/50 rounded-md border border-zinc-100 dark:border-zinc-800">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Acompañantes Extras</Label>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setAcompanantes(prev => [...prev, { id: Date.now().toString(), nombre: '', documento: '' }])}
                      className="h-6 px-2 text-xs text-teal-600 dark:text-teal-400"
                    >
                      <Plus className="h-3 w-3 mr-1" /> Añadir
                    </Button>
                  </div>
                  
                  {acompanantes.length === 0 ? (
                    <p className="text-xs text-zinc-500 italic">No hay acompañantes adicionales registrados.</p>
                  ) : (
                    <div className="space-y-2 pr-1">
                      {acompanantes.map(ac => (
                        <div key={ac.id} className="flex gap-2 items-center bg-white dark:bg-zinc-950 p-2 rounded border border-zinc-200 dark:border-zinc-800">
                          <Input 
                            placeholder="Nombre completo" 
                            value={ac.nombre} 
                            onChange={e => setAcompanantes(prev => prev.map(x => x.id === ac.id ? { ...x, nombre: e.target.value } : x))}
                            className="h-8 text-sm flex-1" 
                            required
                          />
                          <Input 
                            placeholder="Documento (Opcional)" 
                            value={ac.documento} 
                            onChange={e => setAcompanantes(prev => prev.map(x => x.id === ac.id ? { ...x, documento: e.target.value } : x))}
                            className="h-8 text-sm flex-1" 
                          />
                          <button type="button" onClick={() => setAcompanantes(prev => prev.filter(x => x.id !== ac.id))} className="text-red-500 p-1 hover:bg-red-50 dark:hover:bg-red-950/30 rounded">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <DialogFooter className="p-6 pt-4 shrink-0 border-t border-zinc-200 dark:border-zinc-800">
              <Button type="button" variant="outline" onClick={() => setOpenCheckout(false)}>Cancelar</Button>
              <Button type="submit" className="bg-teal-600 hover:bg-teal-700 text-white" disabled={bookingLoading}>
                {bookingLoading ? 'Procesando...' : 'Confirmar Reserva'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
