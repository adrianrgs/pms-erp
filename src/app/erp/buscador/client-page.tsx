'use client'

import { useState } from 'react'
import { format, addDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { Search, Building2, Users, BedDouble, ChevronRight, UserCircle, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { buscarDisponibilidad, confirmarReservaB2B, SearchResult } from './actions'

export default function BuscadorClientPage({ posadas }: { posadas: { id: string, nombre: string }[] }) {
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<SearchResult[]>([])
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
    posadas_ids: [] as string[]
  })

  // Checkout state
  const [selectedOption, setSelectedOption] = useState<SearchResult | null>(null)
  const [openCheckout, setOpenCheckout] = useState(false)
  const [guestInfo, setGuestInfo] = useState({
    nombre: '',
    documento: '',
    telefono: '',
    email: '',
    nacionalidad: ''
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
        searchParams.posadas_ids
      )
      setResults(res)
      setSelectedCategories([]) // Reset category filters on new search
      setHasSearched(true)
    } catch (error: any) {
      toast.error('Error en la búsqueda', { description: error.message })
    } finally {
      setLoading(false)
    }
  }

  const handleSelectOption = (option: SearchResult) => {
    setSelectedOption(option)
    setGuestInfo({ nombre: '', documento: '', telefono: '', email: '', nacionalidad: '' })
    setAcompanantes([])
    setOpenCheckout(true)
  }

  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedOption) return

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

      await confirmarReservaB2B(
        selectedOption.posada_id,
        selectedOption.categoria_id,
        selectedOption.habitacion_id,
        searchParams.check_in,
        searchParams.check_out,
        parseInt(searchParams.adultos),
        parseInt(searchParams.ninos),
        selectedOption.precio_total,
        selectedOption.posada_moneda,
        cliente_info
      )
      
      toast.success('Reserva Confirmada', { 
        description: `Se ha generado el localizador para ${guestInfo.nombre}.` 
      })
      
      setOpenCheckout(false)
      // Remove booked option from results to prevent double booking
      setResults(prev => prev.filter(r => r.habitacion_id !== selectedOption.habitacion_id))
      
    } catch (error: any) {
      toast.error('Error al reservar', { description: error.message })
    } finally {
      setBookingLoading(false)
    }
  }

  return (
    <div className="space-y-6">
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
              <Input id="ninos" type="number" min="0" value={searchParams.ninos} onChange={e => setSearchParams({...searchParams, ninos: e.target.value})} required />
            </div>
            <Button type="submit" className="w-full md:w-auto bg-teal-600 hover:bg-teal-700 text-white" disabled={loading}>
              {loading ? 'Buscando...' : (
                <>
                  <Search className="mr-2 h-4 w-4" /> Buscar
                </>
              )}
            </Button>
          </div>
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
                .map((result, idx) => (
                <Card key={idx} className="overflow-hidden border-zinc-200 dark:border-zinc-800 transition-all hover:border-teal-500/50 hover:shadow-md dark:hover:border-teal-500/50">
                  <CardContent className="p-0">
                    {result.fotos && result.fotos.length > 0 && (
                      <div className="h-48 w-full overflow-hidden border-b border-zinc-100 dark:border-zinc-800">
                        <img src={result.fotos[0]} alt={result.habitacion_nombre} className="w-full h-full object-cover transition-transform hover:scale-105" />
                      </div>
                    )}
                    <div className="p-5 border-b border-zinc-100 dark:border-zinc-800/50 bg-zinc-50/50 dark:bg-zinc-900/20">
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
                          <p className="text-xs text-zinc-500 dark:text-zinc-500 uppercase tracking-wider font-semibold mb-1">Tarifa Neta</p>
                          <div className="text-2xl font-black text-zinc-900 dark:text-zinc-50">
                            {result.precio_total} <span className="text-sm font-medium text-zinc-500">{result.posada_moneda}</span>
                          </div>
                        </div>
                        <Button onClick={() => handleSelectOption(result)} className="bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200">
                          Reservar <ChevronRight className="ml-1 h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Checkout Modal */}
      <Dialog open={openCheckout} onOpenChange={setOpenCheckout}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleConfirmBooking}>
            <DialogHeader>
              <DialogTitle>Confirmar Reserva B2B</DialogTitle>
              <DialogDescription>
                Completando compra para {selectedOption?.posada_nombre}.
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="rounded-lg bg-teal-50 dark:bg-teal-900/20 p-4 border border-teal-100 dark:border-teal-900/50">
                <h4 className="font-semibold text-teal-900 dark:text-teal-100 mb-2">{selectedOption?.categoria_nombre}</h4>
                <div className="space-y-1 text-sm text-teal-800 dark:text-teal-300">
                  <div className="flex justify-between">
                    <span>Fechas:</span>
                    <span className="font-medium">{searchParams.check_in} a {searchParams.check_out}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Ocupación:</span>
                    <span className="font-medium">{searchParams.adultos} Ad / {searchParams.ninos} Niños</span>
                  </div>
                  <div className="flex justify-between pt-2 mt-2 border-t border-teal-200 dark:border-teal-800 font-bold text-teal-900 dark:text-teal-50">
                    <span>Total a Pagar (Neto):</span>
                    <span>{selectedOption?.precio_total} {selectedOption?.posada_moneda}</span>
                  </div>
                </div>
              </div>

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
                
                <div className="space-y-2 p-3 bg-zinc-50 dark:bg-zinc-900/50 rounded-md border border-zinc-100 dark:border-zinc-800">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Acompañantes</Label>
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
                    <div className="space-y-2 max-h-[150px] overflow-y-auto pr-1">
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
            
            <DialogFooter>
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
