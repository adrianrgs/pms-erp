'use client'

import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { CalendarDays, Hotel, Users, Pencil, Plus, Trash2, Search, CheckCircle2, FileText, Download, ArrowUpDown } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { updateClienteInfo, toggleVerificarReserva } from './actions'

type Pax = { id: string, nombre: string, documento: string, tipo: 'adulto' | 'nino' }

export default function ReservasListClientPage({ reservas, habitaciones }: { reservas: any[], habitaciones: any[] }) {
  const [open, setOpen] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState<any[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null)

  // Edit State
  const [titular, setTitular] = useState<any>({})
  const [acompanantes, setAcompanantes] = useState<Pax[]>([])

  // Group reservations
  const groups: Record<string, any[]> = {}
  reservas.forEach(res => {
    const key = res.localizador || res.id
    if (!groups[key]) groups[key] = []
    groups[key].push(res)
  })

  // Sort groups by created_at descending (natural order)
  const sortedGroups = Object.values(groups).sort((a, b) => {
    const timeA = new Date(a[0].created_at || a[0].check_in).getTime()
    const timeB = new Date(b[0].created_at || b[0].check_in).getTime()
    return timeB - timeA
  })

  // Filter groups based on search
  let processedGroups = sortedGroups.filter(group => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    const res = group[0]
    const info = res.cliente_info || {}
    const nombre = (info.titular?.nombre || info.nombre || '').toLowerCase()
    const doc = (info.titular?.documento || info.documento || '').toLowerCase()
    const loc = (res.localizador || res.id).toLowerCase()
    const exp = (res.numero_expediente || '').toLowerCase()
    
    return nombre.includes(q) || doc.includes(q) || loc.includes(q) || exp.includes(q)
  })

  if (sortConfig) {
    processedGroups.sort((a, b) => {
      const resA = a[0]
      const resB = b[0]
      let valA: any = ''
      let valB: any = ''

      switch (sortConfig.key) {
        case 'huesped':
          valA = resA.cliente_info?.titular?.nombre || resA.cliente_info?.nombre || ''
          valB = resB.cliente_info?.titular?.nombre || resB.cliente_info?.nombre || ''
          break
        case 'estadia':
          valA = a.length
          valB = b.length
          break
        case 'fechas':
          valA = new Date(resA.check_in).getTime()
          valB = new Date(resB.check_in).getTime()
          break
        case 'origen':
          valA = resA.origen
          valB = resB.origen
          break
        case 'monto':
          valA = a.reduce((sum, r) => sum + (Number(r.monto_total) || 0), 0)
          valB = b.reduce((sum, r) => sum + (Number(r.monto_total) || 0), 0)
          break
        case 'estado':
          valA = resA.estado
          valB = resB.estado
          break
      }

      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1
      return 0
    })
  }

  const handleSort = (key: string) => {
    if (sortConfig && sortConfig.key === key) {
      if (sortConfig.direction === 'asc') {
        setSortConfig({ key, direction: 'desc' })
      } else {
        setSortConfig(null) // Return to natural order
      }
    } else {
      setSortConfig({ key, direction: 'asc' })
    }
  }

  const handleRowClick = (group: any[]) => {
    setSelectedGroup(group)
    const firstRes = group[0]
    const info = firstRes.cliente_info || {}
    
    // Legacy support vs new structure
    setTitular({
      nombre: info.titular?.nombre || info.nombre || '',
      email: info.titular?.email || info.email || '',
      telefono: info.titular?.telefono || info.telefono || '',
      documento: info.titular?.documento || info.documento || '',
      nacionalidad: info.titular?.nacionalidad || info.nacionalidad || '',
      tipo: 'adulto'
    })
    setAcompanantes((info.acompanantes || []).map((a: any, i: number) => ({ 
      ...a, 
      id: a.id || `db-${i}-${Date.now()}` 
    })))
    setOpen(true)
  }

  const handleAddAcompanante = () => {
    setAcompanantes([...acompanantes, { id: Date.now().toString(), nombre: '', documento: '', tipo: 'adulto' }])
  }

  const handleRemoveAcompanante = (id: string) => {
    setAcompanantes(acompanantes.filter(a => a.id !== id))
  }

  const handleAcompananteChange = (id: string, field: string, value: string) => {
    setAcompanantes(acompanantes.map(a => a.id === id ? { ...a, [field]: value } : a))
  }

  async function handleUpdateGuestInfo(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!selectedGroup) return
    setLoading(true)
    
    const cliente_info = {
      titular,
      acompanantes
    }
    
    // Calculate new total adults and children
    let totalAdultos = 1 // Titular is always adult (usually)
    let totalNinos = 0
    
    acompanantes.forEach(a => {
      if (a.tipo === 'adulto') totalAdultos++
      else totalNinos++
    })

    try {
      const ids = selectedGroup.map(r => r.id)
      await updateClienteInfo(ids, cliente_info, totalAdultos, totalNinos)
      toast.success('Datos del huésped actualizados')
      setOpen(false)
    } catch (error: any) {
      toast.error('Error al actualizar', { description: error.message })
    } finally {
      setLoading(false)
    }
  }

  const toggleVerificar = async (e: React.MouseEvent) => {
    e.preventDefault() // prevent form submission
    if (!selectedGroup || selectedGroup[0].origen !== 'erp_b2b') return
    const res = selectedGroup[0]
    try {
      toast.loading('Actualizando estado...', { id: 'verify' })
      await toggleVerificarReserva(res.localizador, res.pago_verificado)
      toast.success('Estado de pago actualizado', { id: 'verify' })
      setOpen(false) // Close modal so it refreshes data naturally or user can see it updated in list
    } catch (error: any) {
      toast.error('Error al verificar: ' + error.message, { id: 'verify' })
    }
  }

  const handleGenerateVoucher = async () => {
    if (!selectedGroup || selectedGroup.length === 0) return

    setLoading(true)
    try {
      // Usar la utilidad de impresión nativa en lugar de html2pdf
      const { printElement } = await import('@/lib/utils/print')
      printElement('voucher-template', `Voucher_${selectedGroup[0].localizador}`)
      toast.success('Abriendo diálogo de impresión del Voucher')
    } catch (error) {
      console.error(error)
      toast.error('Error al generar el Voucher')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Listado de Reservas</h2>
        <p className="text-zinc-500 dark:text-zinc-400">Haz clic sobre cualquier reserva para ver detalles, verificar pagos y editar pasajeros.</p>
      </div>

      <div className="flex items-center gap-2 max-w-md relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
        <Input 
          placeholder="Buscar por Nombre, Doc, Localizador o Expediente..." 
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <form onSubmit={handleUpdateGuestInfo}>
            <DialogHeader>
              <DialogTitle>Detalles de la Reserva</DialogTitle>
              <DialogDescription asChild>
                <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                  <Badge variant="secondary" className="font-normal capitalize">{selectedGroup?.[0]?.origen === 'directa' ? 'Directa' : 'Agencia B2B'}</Badge>
                  {selectedGroup?.[0]?.localizador && <span className="text-xs">Loc: {selectedGroup[0].localizador}</span>}
                  {selectedGroup?.[0]?.numero_expediente && (
                    <span className="text-xs flex items-center gap-1 text-teal-600 dark:text-teal-400 font-medium">
                      <FileText className="w-3 h-3" /> File: {selectedGroup[0].numero_expediente}
                    </span>
                  )}
                </div>
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 py-4 max-h-[60vh] overflow-y-auto px-1">
              
              {/* Resumen y Verificacion para B2B */}
              {selectedGroup?.[0]?.origen === 'erp_b2b' && (
                <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
                  <div>
                    <p className="text-xs text-zinc-500 mb-1">Estado del Pago</p>
                    {selectedGroup[0]?.pago_verificado ? (
                      <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 shadow-none border-0">
                        <CheckCircle2 className="w-3 h-3 mr-1" /> Pago Verificado
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="shadow-none">Pendiente de Verificación</Badge>
                    )}
                  </div>
                  <div>
                    {selectedGroup[0]?.comprobante_url && (
                      <Button 
                        type="button"
                        variant="ghost"
                        className="mr-2 text-teal-600 hover:text-teal-700 hover:bg-teal-50"
                        asChild
                      >
                        <a href={selectedGroup[0].comprobante_url} target="_blank" rel="noopener noreferrer">
                          <FileText className="w-4 h-4 mr-2" />
                          Ver Comprobante
                        </a>
                      </Button>
                    )}
                    <Button 
                      type="button"
                      variant={selectedGroup[0]?.pago_verificado ? "outline" : "default"}
                      onClick={toggleVerificar}
                      className={!selectedGroup[0]?.pago_verificado ? "bg-teal-600 hover:bg-teal-700 text-white" : ""}
                    >
                      {selectedGroup[0]?.pago_verificado ? "Desmarcar" : "Marcar como Pagado"}
                    </Button>
                  </div>
                </div>
              )}

              {/* Titular Section */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 border-b pb-1">Pasajero Titular</h4>
                <div className="grid gap-2">
                  <Label>Nombre Completo</Label>
                  <Input value={titular.nombre} onChange={e => setTitular({...titular, nombre: e.target.value})} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Documento de Identidad</Label>
                    <Input value={titular.documento} onChange={e => setTitular({...titular, documento: e.target.value})} placeholder="Ej. 12345678" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Nacionalidad</Label>
                    <Input value={titular.nacionalidad} onChange={e => setTitular({...titular, nacionalidad: e.target.value})} placeholder="Ej. Venezolana" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Teléfono</Label>
                    <Input type="tel" value={titular.telefono} onChange={e => setTitular({...titular, telefono: e.target.value})} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Correo Electrónico</Label>
                    <Input type="email" value={titular.email} onChange={e => setTitular({...titular, email: e.target.value})} />
                  </div>
                </div>
              </div>

              {/* Acompañantes Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-1">
                  <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Acompañantes</h4>
                  <Button type="button" variant="ghost" size="sm" onClick={handleAddAcompanante} className="h-6 px-2 text-indigo-600">
                    <Plus className="h-3 w-3 mr-1" /> Agregar
                  </Button>
                </div>
                
                {acompanantes.length === 0 ? (
                  <p className="text-xs text-zinc-500 italic">No hay acompañantes registrados.</p>
                ) : (
                  <div className="space-y-3">
                    {acompanantes.map((pax, index) => (
                      <div key={pax.id} className="flex gap-2 items-start bg-zinc-50 dark:bg-zinc-900/50 p-2 rounded-md border border-zinc-100 dark:border-zinc-800 relative">
                        <div className="grid gap-2 flex-1">
                          <div className="grid grid-cols-3 gap-2">
                            <div className="col-span-2">
                              <Input placeholder="Nombre" value={pax.nombre} onChange={e => handleAcompananteChange(pax.id, 'nombre', e.target.value)} required className="h-8 text-sm" />
                            </div>
                            <div className="col-span-1">
                              <Select value={pax.tipo} onValueChange={v => handleAcompananteChange(pax.id, 'tipo', v)}>
                                <SelectTrigger className="h-8 text-sm">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="adulto">Adulto</SelectItem>
                                  <SelectItem value="nino">Niño</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div>
                            <Input placeholder="Documento (opcional)" value={pax.documento} onChange={e => handleAcompananteChange(pax.id, 'documento', e.target.value)} className="h-8 text-sm" />
                          </div>
                        </div>
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-red-500 shrink-0" onClick={() => handleRemoveAcompanante(pax.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-lg bg-indigo-50 dark:bg-indigo-900/20 p-4 mt-2 border border-indigo-100 dark:border-indigo-800/50 text-sm space-y-3">
                <div className="border-b border-indigo-100 dark:border-indigo-800/50 pb-2">
                  <h4 className="font-semibold text-indigo-800 dark:text-indigo-300 mb-2">Desglose de Habitaciones ({selectedGroup?.length})</h4>
                  <div className="space-y-2">
                    {selectedGroup?.map((r, i) => {
                      const hab = habitaciones.find(h => h.id === r.habitacion_id)
                      const nombre = r.cliente_info?.titular?.nombre || r.cliente_info?.nombre || titular.nombre || 'Huésped Principal'
                      return (
                        <div key={r.id || i} className="flex justify-between items-center text-indigo-700 dark:text-indigo-300 text-xs sm:text-sm bg-white/50 dark:bg-zinc-950/30 p-2 rounded">
                          <div>
                            <span className="font-medium mr-2">{hab ? `Hab. ${hab.numero_habitacion}` : 'Por asignar'}:</span>
                            <span className="truncate max-w-[100px] inline-block align-bottom">{nombre}</span>
                            <span className="ml-2 opacity-75">({r.adultos} Ad / {r.ninos} Ni)</span>
                          </div>
                          <span className="font-semibold">${r.monto_total}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {selectedGroup?.[0]?.servicios_adicionales && selectedGroup[0].servicios_adicionales.length > 0 && (
                  <div className="border-b border-indigo-100 dark:border-indigo-800/50 pb-2">
                    <h4 className="font-semibold text-indigo-800 dark:text-indigo-300 mb-2">Servicios Adicionales</h4>
                    <div className="space-y-1">
                      {selectedGroup[0].servicios_adicionales.map((s: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center text-indigo-700 dark:text-indigo-300 text-xs bg-white/50 dark:bg-zinc-950/30 p-2 rounded">
                          <span>{s.nombre}</span>
                          <span className="font-semibold">${s.precio}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex justify-between text-indigo-800 dark:text-indigo-300">
                  <span>Fechas:</span>
                  <span className="font-medium">
                    {selectedGroup?.[0] ? format(parseISO(selectedGroup[0].check_in), "dd MMM yyyy", { locale: es }) : ''} - 
                    {selectedGroup?.[0] ? format(parseISO(selectedGroup[0].check_out), "dd MMM yyyy", { locale: es }) : ''}
                  </span>
                </div>
                <div className="flex justify-between text-indigo-800 dark:text-indigo-300 text-base font-bold">
                  <span>Monto Total (Combinado):</span>
                  <span>
                    ${selectedGroup?.reduce((sum, r) => sum + (Number(r.monto_total) || 0), 0).toFixed(2)} {selectedGroup?.[0]?.moneda}
                  </span>
                </div>
              </div>
            </div>
            <DialogFooter className="mt-4 flex sm:justify-between items-center w-full">
              <Button type="button" variant="secondary" onClick={handleGenerateVoucher} disabled={loading} className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-900/50 dark:text-indigo-300">
                <Download className="w-4 h-4 mr-2" /> Voucher PDF
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cerrar</Button>
                <Button type="submit" disabled={loading}>{loading ? 'Guardando...' : 'Guardar Pasajeros'}</Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <div className="rounded-xl border border-zinc-200/50 dark:border-zinc-800/50 bg-white/50 dark:bg-zinc-900/20 backdrop-blur-sm overflow-hidden shadow-lg shadow-zinc-200/20 dark:shadow-none">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-zinc-50/80 dark:bg-zinc-900/40 hover:bg-zinc-50/80 dark:hover:bg-zinc-900/40 border-b-zinc-100 dark:border-b-zinc-800/50">
                <TableHead className="font-medium text-zinc-500 dark:text-zinc-400 cursor-pointer select-none" onClick={() => handleSort('huesped')}>
                  <div className="flex items-center gap-1">Huésped Principal <ArrowUpDown className="h-3 w-3" /></div>
                </TableHead>
                <TableHead className="font-medium text-zinc-500 dark:text-zinc-400 cursor-pointer select-none" onClick={() => handleSort('estadia')}>
                  <div className="flex items-center gap-1">Estadía & Servicios <ArrowUpDown className="h-3 w-3" /></div>
                </TableHead>
                <TableHead className="font-medium text-zinc-500 dark:text-zinc-400 cursor-pointer select-none" onClick={() => handleSort('fechas')}>
                  <div className="flex items-center gap-1">Fechas <ArrowUpDown className="h-3 w-3" /></div>
                </TableHead>
                <TableHead className="font-medium text-zinc-500 dark:text-zinc-400 cursor-pointer select-none" onClick={() => handleSort('origen')}>
                  <div className="flex items-center gap-1">Origen <ArrowUpDown className="h-3 w-3" /></div>
                </TableHead>
                <TableHead className="font-medium text-zinc-500 dark:text-zinc-400 cursor-pointer select-none" onClick={() => handleSort('monto')}>
                  <div className="flex items-center gap-1">Monto Neto <ArrowUpDown className="h-3 w-3" /></div>
                </TableHead>
                <TableHead className="font-medium text-zinc-500 dark:text-zinc-400 cursor-pointer select-none" onClick={() => handleSort('estado')}>
                  <div className="flex items-center gap-1">Estado / Pago <ArrowUpDown className="h-3 w-3" /></div>
                </TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {processedGroups.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-zinc-500">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Search className="h-6 w-6 text-zinc-300" />
                      <p>{searchQuery ? 'No se encontraron reservas con esa búsqueda.' : 'No hay reservas registradas.'}</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                processedGroups.map((group, idx) => {
                  const res = group[0] // Main reference
                  const habNames = group.map(r => {
                    const h = habitaciones.find(x => x.id === r.habitacion_id)
                    return h ? h.numero_habitacion : '?'
                  }).join(', ')
                  
                  const info = res.cliente_info || {}
                  const huesped = info.titular?.nombre || info.nombre || 'Sin nombre'
                  const tieneDoc = !!(info.titular?.documento || info.documento)
                  const countAcompanantes = info.acompanantes?.length || 0
                  
                  const totalGrupo = group.reduce((sum, r) => sum + (Number(r.monto_total) || 0), 0).toFixed(2)

                  // Extraer servicios adicionales
                  const todosServicios = group.flatMap(r => r.servicios_adicionales || [])
                  const uniqueServicios = Array.from(new Map(todosServicios.map(s => [s.id, s])).values())

                  return (
                    <TableRow 
                      key={res.localizador || res.id || idx} 
                      onClick={() => handleRowClick(group)}
                      className="group hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-all cursor-pointer border-b-zinc-100 dark:border-b-zinc-800/30"
                    >
                      <TableCell className="font-medium py-4">
                        <div className="flex items-start gap-3">
                          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-900 flex items-center justify-center text-zinc-500 shadow-inner">
                            <Users className="h-4 w-4" />
                          </div>
                          <div className="flex flex-col">
                            <div className="text-zinc-900 dark:text-zinc-100 font-semibold flex items-center gap-2">
                              {huesped}
                              {!tieneDoc && <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]" title="Falta documento del titular" />}
                            </div>
                            <div className="text-xs text-zinc-500 font-medium mt-0.5">
                              {res.adultos} Ad / {res.ninos} Niños {countAcompanantes > 0 ? <span className="text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-1.5 py-0.5 rounded-full ml-1">+{countAcompanantes} acomp.</span> : ''}
                            </div>
                            {res.numero_expediente && (
                              <div className="text-[10px] text-teal-600 dark:text-teal-400 font-semibold mt-1 flex items-center gap-1">
                                <FileText className="w-3 h-3" /> File: {res.numero_expediente}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300 font-medium">
                            <Hotel className="h-4 w-4 text-zinc-400" />
                            <div className="truncate">
                              {group.length > 1 ? (
                                <Badge variant="secondary" className="font-medium bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200">{group.length} Habs: {habNames}</Badge>
                              ) : (
                                `Hab. ${habNames}`
                              )}
                            </div>
                          </div>
                          {uniqueServicios.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {uniqueServicios.map((s: any, idx: number) => (
                                <span key={idx} className="text-[10px] px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800/50 rounded-md">
                                  + {s.nombre}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300 font-medium bg-zinc-50 dark:bg-zinc-900/50 w-fit px-2.5 py-1.5 rounded-md border border-zinc-100 dark:border-zinc-800/50">
                          <CalendarDays className="h-4 w-4 text-zinc-400" />
                          <span>
                            {format(parseISO(res.check_in), "d MMM", { locale: es })} <span className="text-zinc-300 dark:text-zinc-600 mx-1">→</span> {format(parseISO(res.check_out), "d MMM", { locale: es })}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        {res.origen === 'directa' ? (
                          <Badge variant="outline" className="bg-emerald-50/50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50 font-medium">
                            Directa
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-indigo-50/50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-900/50 font-medium">
                            Agencia B2B
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-bold text-zinc-900 dark:text-zinc-100 py-4">
                        ${totalGrupo} <span className="text-xs font-medium text-zinc-500">{res.moneda}</span>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex flex-col gap-1.5 items-start">
                          <Badge variant="secondary" className={`capitalize text-[10px] font-semibold leading-none ${res.estado === 'cancelada' ? 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-400 border-transparent' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'}`}>
                            {res.estado}
                          </Badge>
                          
                          {res.origen === 'erp_b2b' && (
                            res.pago_verificado ? (
                              <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1 mt-0.5">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Verificado
                              </span>
                            ) : (
                              <span className="text-[10px] font-semibold text-amber-600 flex items-center gap-1 mt-0.5 bg-amber-50 dark:bg-amber-950/30 px-1.5 py-0.5 rounded">
                                ⏳ Pendiente
                              </span>
                            )
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-4 text-right">
                        <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-all scale-95 group-hover:scale-100 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                          <Pencil className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* HIDDEN VOUCHER TEMPLATE */}
      <div style={{ display: 'none' }}>
        <div id="voucher-template" className="p-8 font-sans w-[800px]" style={{ backgroundColor: '#ffffff', color: '#000000' }}>
          <div className="flex justify-between items-start border-b-2 pb-6 mb-6" style={{ borderColor: '#4f46e5' }}>
            <div>
              <h1 className="text-4xl font-black tracking-tighter" style={{ color: '#4f46e5' }}>Voucher de Reserva</h1>
              <p className="mt-1" style={{ color: '#71717a' }}>Confirmación Oficial</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-xl">Loc: {selectedGroup?.[0]?.localizador}</p>
              <p className="mt-1" style={{ color: '#52525b' }}>Fecha de Emisión: {format(new Date(), 'dd/MM/yyyy')}</p>
            </div>
          </div>

          <div className="mb-8 grid grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-bold p-2 rounded mb-4" style={{ backgroundColor: '#eef2ff', color: '#3730a3' }}>Datos del Titular</h3>
              <p><span className="font-semibold" style={{ color: '#52525b' }}>Nombre:</span> {titular.nombre}</p>
              <p><span className="font-semibold" style={{ color: '#52525b' }}>Documento:</span> {titular.documento}</p>
              <p><span className="font-semibold" style={{ color: '#52525b' }}>Teléfono:</span> {titular.telefono}</p>
              <p><span className="font-semibold" style={{ color: '#52525b' }}>Email:</span> {titular.email}</p>
            </div>
            <div>
              <h3 className="text-lg font-bold p-2 rounded mb-4" style={{ backgroundColor: '#eef2ff', color: '#3730a3' }}>Detalles de Estadía</h3>
              <p><span className="font-semibold" style={{ color: '#52525b' }}>Check-in:</span> {selectedGroup?.[0] ? format(parseISO(selectedGroup[0].check_in), "dd/MM/yyyy") : ''}</p>
              <p><span className="font-semibold" style={{ color: '#52525b' }}>Check-out:</span> {selectedGroup?.[0] ? format(parseISO(selectedGroup[0].check_out), "dd/MM/yyyy") : ''}</p>
              <p><span className="font-semibold" style={{ color: '#52525b' }}>Total Pasajeros:</span> {selectedGroup?.reduce((sum, r) => sum + r.adultos + r.ninos, 0)}</p>
            </div>
          </div>

          <h3 className="text-lg font-bold p-2 rounded mb-4" style={{ backgroundColor: '#eef2ff', color: '#3730a3' }}>Detalle de Habitaciones</h3>
          <table className="w-full mb-8 border-collapse">
            <thead>
              <tr style={{ backgroundColor: '#f4f4f5' }}>
                <th className="p-3 text-left border-b font-bold" style={{ borderColor: '#e4e4e7' }}>Habitación</th>
                <th className="p-3 text-left border-b font-bold" style={{ borderColor: '#e4e4e7' }}>Ocupantes</th>
                <th className="p-3 text-right border-b font-bold" style={{ borderColor: '#e4e4e7' }}>Monto</th>
              </tr>
            </thead>
            <tbody>
              {selectedGroup?.map((r, i) => {
                const hab = habitaciones.find(h => h.id === r.habitacion_id)
                return (
                  <tr key={i}>
                    <td className="p-3 border-b" style={{ borderColor: '#e4e4e7', color: '#27272a' }}>Hab. {hab ? hab.numero_habitacion : 'N/A'}</td>
                    <td className="p-3 border-b" style={{ borderColor: '#e4e4e7', color: '#27272a' }}>{r.adultos} Ad, {r.ninos} Ni</td>
                    <td className="p-3 border-b text-right font-medium" style={{ borderColor: '#e4e4e7' }}>${r.monto_total}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {selectedGroup?.[0]?.servicios_adicionales && selectedGroup[0].servicios_adicionales.length > 0 && (
            <>
              <h3 className="text-lg font-bold p-2 rounded mb-4" style={{ backgroundColor: '#eef2ff', color: '#3730a3' }}>Servicios Adicionales</h3>
              <table className="w-full mb-8 border-collapse">
                <tbody>
                  {selectedGroup[0].servicios_adicionales.map((s: any) => (
                    <tr key={s.id}>
                      <td className="p-3 border-b" style={{ borderColor: '#e4e4e7', color: '#27272a' }}>{s.nombre}</td>
                      <td className="p-3 border-b text-right font-medium" style={{ borderColor: '#e4e4e7' }}>${s.precio}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          <div className="flex justify-end mt-8">
            <div className="w-64">
              <div className="flex justify-between py-2 border-t-2 font-bold text-xl" style={{ borderColor: '#000000' }}>
                <span>TOTAL Abonado:</span>
                <span>${selectedGroup?.reduce((sum, r) => sum + (Number(r.monto_total) || 0), 0).toFixed(2)} USD</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

