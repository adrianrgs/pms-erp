'use client'

import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { CalendarDays, Hotel, Users, Pencil, Plus, Trash2, Search, CheckCircle2, FileText } from 'lucide-react'
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

  // Sort groups by check-in date descending
  const sortedGroups = Object.values(groups).sort((a, b) => new Date(b[0].check_in).getTime() - new Date(a[0].check_in).getTime())

  // Filter groups based on search
  const filteredGroups = sortedGroups.filter(group => {
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
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cerrar</Button>
              <Button type="submit" disabled={loading}>{loading ? 'Guardando...' : 'Guardar Pasajeros'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <div className="rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-zinc-50/50 dark:bg-zinc-900/50">
                <TableHead>Huésped Principal</TableHead>
                <TableHead>Habitación</TableHead>
                <TableHead>Fechas (Check In/Out)</TableHead>
                <TableHead>Origen</TableHead>
                <TableHead>Monto Neto</TableHead>
                <TableHead>Estado / Pago</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredGroups.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-zinc-500">
                    {searchQuery ? 'No se encontraron reservas con esa búsqueda.' : 'No hay reservas registradas.'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredGroups.map((group, idx) => {
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

                  return (
                    <TableRow 
                      key={res.localizador || res.id || idx} 
                      onClick={() => handleRowClick(group)}
                      className="group hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 transition-colors cursor-pointer"
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500">
                            <Users className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                              {huesped}
                              {!tieneDoc && <div className="w-1.5 h-1.5 rounded-full bg-amber-500" title="Falta documento del titular" />}
                            </div>
                            <div className="text-xs text-zinc-500 font-normal">
                              {res.adultos} Ad / {res.ninos} Niños {countAcompanantes > 0 ? `(+${countAcompanantes} acomp.)` : ''}
                            </div>
                            {res.numero_expediente && (
                              <div className="text-[10px] text-teal-600 dark:text-teal-400 font-medium mt-0.5">
                                File: {res.numero_expediente}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                          <Hotel className="h-4 w-4" />
                          <div className="max-w-[120px] truncate" title={habNames}>
                            {group.length > 1 ? (
                              <Badge variant="secondary" className="font-normal text-xs">{group.length} Habs: {habNames}</Badge>
                            ) : (
                              `Hab. ${habNames}`
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                          <CalendarDays className="h-4 w-4 text-zinc-400" />
                          <span>
                            {format(parseISO(res.check_in), "d MMM", { locale: es })} - {format(parseISO(res.check_out), "d MMM", { locale: es })}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {res.origen === 'directa' ? (
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-900">
                            Directa
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-400 dark:border-indigo-900">
                            Agencia B2B
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-medium text-zinc-900 dark:text-zinc-100">
                        {totalGrupo} {res.moneda}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1 items-start">
                          <Badge variant="secondary" className={`capitalize text-[10px] font-normal leading-none ${res.estado === 'cancelada' ? 'bg-red-50 text-red-700' : ''}`}>
                            {res.estado}
                          </Badge>
                          
                          {res.origen === 'erp_b2b' && (
                            res.pago_verificado ? (
                              <span className="text-[10px] font-medium text-emerald-600 flex items-center gap-1 mt-1">
                                <CheckCircle2 className="w-3 h-3" /> Verificado
                              </span>
                            ) : (
                              <span className="text-[10px] font-medium text-amber-600 flex items-center gap-1 mt-1">
                                Pendiente
                              </span>
                            )
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <Pencil className="h-4 w-4 text-zinc-400" />
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
    </div>
  )
}

