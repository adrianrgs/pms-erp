'use client'

import { useState, useRef } from 'react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { CalendarDays, Hotel, Users, Search, Info, Trash2, FileText, UploadCloud, Eye, X } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { cancelReservaB2B, editReservaB2B, uploadComprobante, deleteComprobante } from './actions'

export default function ERPReservasListClient({ reservas }: { reservas: any[] }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRes, setSelectedRes] = useState<any>(null)
  
  // Modal state
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Edit state
  const [editAdultos, setEditAdultos] = useState(2)
  const [editNinos, setEditNinos] = useState(0)
  const [editExpediente, setEditExpediente] = useState('')

  const filteredReservas = reservas.filter(res => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    const info = res.cliente_info || {}
    const nombre = (info.titular?.nombre || info.nombre || '').toLowerCase()
    const doc = (info.titular?.documento || info.documento || '').toLowerCase()
    const loc = (res.localizador || res.id).toLowerCase()
    const exp = (res.numero_expediente || '').toLowerCase()
    
    return nombre.includes(q) || doc.includes(q) || loc.includes(q) || exp.includes(q)
  })

  const openDetails = (res: any) => {
    setSelectedRes(res)
    setEditAdultos(res.adultos || 1)
    setEditNinos(res.ninos || 0)
    setEditExpediente(res.numero_expediente || '')
    setDetailsOpen(true)
  }

  const handleCancel = async () => {
    if (!selectedRes) return
    if (!confirm(`¿Estás seguro de anular la reserva ${selectedRes.localizador}?`)) return
    
    setLoading(true)
    try {
      await cancelReservaB2B(selectedRes.id)
      toast.success('Reserva anulada correctamente')
      setDetailsOpen(false)
    } catch (error: any) {
      toast.error('No se pudo anular', { description: error.message })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedRes) return
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('adultos', editAdultos.toString())
      formData.append('ninos', editNinos.toString())
      formData.append('numero_expediente', editExpediente)
      
      if (selectedRes.cliente_info) {
        formData.append('cliente_info', JSON.stringify(selectedRes.cliente_info))
      }

      await editReservaB2B(selectedRes.id, formData)
      toast.success('Cambios guardados correctamente.')
      setDetailsOpen(false)
    } catch (error: any) {
      toast.error('Error al guardar', { description: error.message })
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !selectedRes) return

    setLoading(true)
    const toastId = toast.loading('Subiendo comprobante...')
    try {
      const formData = new FormData()
      formData.append('file', file)
      await uploadComprobante(selectedRes.id, formData)
      toast.success('Comprobante subido', { id: toastId })
      // Update local state temporarily to show the file
      setSelectedRes({ ...selectedRes, comprobante_url: 'uploaded' }) // It won't have the actual URL immediately without a refetch, but this hides the input and allows closing modal. Wait, better to let server action revalidate.
      setDetailsOpen(false) // Close and let it refresh
    } catch (error: any) {
      toast.error(error.message, { id: toastId })
    } finally {
      setLoading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleDeleteComprobante = async () => {
    if (!selectedRes || !selectedRes.comprobante_url) return
    if (!confirm('¿Eliminar el comprobante adjunto?')) return

    setLoading(true)
    const toastId = toast.loading('Eliminando comprobante...')
    try {
      await deleteComprobante(selectedRes.id, selectedRes.comprobante_url)
      toast.success('Comprobante eliminado', { id: toastId })
      setDetailsOpen(false) // Close and let it refresh
    } catch (error: any) {
      toast.error(error.message, { id: toastId })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 max-w-md relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
        <Input 
          placeholder="Buscar por Nombre, Doc, Localizador o Expediente..." 
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-teal-50/50 dark:bg-teal-900/20">
                <TableHead>Huésped Titular</TableHead>
                <TableHead>Posada y Habitación</TableHead>
                <TableHead>Fechas y File</TableHead>
                <TableHead>Neto (Tarifa B2B)</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!filteredReservas || filteredReservas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-zinc-500">
                    {searchQuery ? 'No se encontraron resultados.' : 'Aún no has generado reservas.'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredReservas.map((res: any) => {
                  const info = res.cliente_info || {}
                  const huesped = info.titular?.nombre || info.nombre || 'Desconocido'
                  const posadaNombre = (res.posadas as any)?.nombre || 'Hotel'
                  const habNum = (res.habitaciones as any)?.numero_habitacion || 'S/A'
                  const isActive = res.estado !== 'cancelada'
                  
                  return (
                    <TableRow 
                      key={res.id} 
                      onClick={() => openDetails(res)}
                      className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 transition-colors cursor-pointer"
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-teal-100 dark:bg-teal-900/50 flex items-center justify-center text-teal-700 dark:text-teal-400">
                            <Users className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="text-zinc-900 dark:text-zinc-100 flex items-center gap-1">
                              {huesped}
                            </div>
                            <div className="text-xs text-zinc-500 font-normal">
                              {res.adultos} Ad / {res.ninos} Ni 
                              {res.localizador && <span className="ml-2 text-teal-600 dark:text-teal-400">[{res.localizador}]</span>}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <div className="font-medium text-zinc-900 dark:text-zinc-100">{posadaNombre}</div>
                          <div className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
                            <Hotel className="h-3 w-3" />
                            Hab. {habNum}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1 text-sm text-zinc-600 dark:text-zinc-400">
                          <div className="flex items-center gap-2">
                            <CalendarDays className="h-4 w-4 text-zinc-400" />
                            <span>
                              {format(parseISO(res.check_in), "d MMM", { locale: es })} - {format(parseISO(res.check_out), "d MMM", { locale: es })}
                            </span>
                          </div>
                          {res.numero_expediente && (
                            <div className="flex items-center gap-2 text-xs font-medium text-teal-600 dark:text-teal-400">
                              <FileText className="h-3 w-3" /> File: {res.numero_expediente}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium text-zinc-900 dark:text-zinc-100">
                        {res.monto_total} {res.moneda}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1 items-start">
                          <Badge variant="outline" className={`capitalize ${!isActive ? 'bg-red-50 text-red-700 border-red-200' : 'bg-teal-50 text-teal-700 border-teal-200'} dark:bg-teal-900/30 dark:text-teal-400 dark:border-teal-800`}>
                            {res.estado}
                          </Badge>
                          {res.pago_verificado ? (
                            <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-1 mt-0.5">
                              Pagado
                            </span>
                          ) : (
                            res.comprobante_url && (
                              <span className="text-[10px] text-zinc-500 font-medium flex items-center gap-1 mt-0.5">
                                Comprobante enviado
                              </span>
                            )
                          )}
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

      {/* Details Modal */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle>Detalles de la Reserva</DialogTitle>
              <DialogDescription>
                Localizador: <strong className="text-zinc-900 dark:text-zinc-100">{selectedRes?.localizador}</strong>
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-6 py-4">
              
              {/* Estatus Header */}
              <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
                <div>
                  <p className="text-xs text-zinc-500 mb-1">Estado</p>
                  <Badge variant="outline" className={`capitalize ${selectedRes?.estado === 'cancelada' ? 'bg-red-50 text-red-700' : 'bg-teal-50 text-teal-700'}`}>
                    {selectedRes?.estado}
                  </Badge>
                </div>
                <div className="text-right">
                  <p className="text-xs text-zinc-500 mb-1">Verificación Posada</p>
                  {selectedRes?.pago_verificado ? (
                    <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 shadow-none border-0">Pagada</Badge>
                  ) : (
                    <Badge variant="secondary" className="shadow-none">Pendiente</Badge>
                  )}
                </div>
              </div>

              {/* Editable Fields */}
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label>Número de Expediente (File)</Label>
                  <Input 
                    placeholder="Ej. EXP-2023-445" 
                    value={editExpediente} 
                    onChange={e => setEditExpediente(e.target.value)} 
                    disabled={selectedRes?.estado === 'cancelada'}
                  />
                  <p className="text-[10px] text-zinc-500">Agrega tu identificador interno para conciliar esta reserva.</p>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                  <div className="grid gap-2">
                    <Label>Adultos</Label>
                    <Input type="number" min={1} value={editAdultos} onChange={e => setEditAdultos(parseInt(e.target.value) || 1)} disabled={selectedRes?.estado === 'cancelada'} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Niños</Label>
                    <Input type="number" min={0} value={editNinos} onChange={e => setEditNinos(parseInt(e.target.value) || 0)} disabled={selectedRes?.estado === 'cancelada'} />
                  </div>
                </div>

                {/* Comprobante de pago section */}
                <div className="pt-2 border-t">
                  <Label className="mb-2 block">Comprobante de Pago</Label>
                  {selectedRes?.comprobante_url && selectedRes?.comprobante_url !== 'uploaded' ? (
                    <div className="flex items-center justify-between p-2 rounded-md border bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
                      <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
                        <FileText className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                        <span>Comprobante adjunto</span>
                      </div>
                      <div className="flex gap-1">
                        <Button type="button" variant="ghost" size="sm" asChild className="h-7 px-2">
                          <a href={selectedRes.comprobante_url} target="_blank" rel="noopener noreferrer">
                            <Eye className="w-4 h-4" />
                          </a>
                        </Button>
                        {!selectedRes?.pago_verificado && (
                          <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-red-500 hover:text-red-600" onClick={handleDeleteComprobante} disabled={loading}>
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Input 
                        type="file" 
                        accept="image/*,.pdf" 
                        className="text-xs" 
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        disabled={loading || selectedRes?.estado === 'cancelada' || selectedRes?.pago_verificado}
                      />
                    </div>
                  )}
                  {selectedRes?.pago_verificado && !selectedRes?.comprobante_url && (
                    <p className="text-[10px] text-zinc-500 mt-1">El pago ya fue verificado por la posada.</p>
                  )}
                </div>
                
                {selectedRes?.estado !== 'cancelada' && (
                  <div className="bg-indigo-50 dark:bg-indigo-950/30 p-2 rounded text-xs text-indigo-800 dark:text-indigo-300">
                    Al guardar, el sistema simulará la tarifa y ajustará el total si se excede la capacidad base. Se notificará a la posada de este cambio.
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="flex justify-between sm:justify-between items-center w-full">
              {selectedRes?.estado !== 'cancelada' ? (
                <Button 
                  type="button" 
                  variant="ghost" 
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 px-2"
                  onClick={handleCancel}
                  disabled={loading}
                >
                  <Trash2 className="h-4 w-4 mr-2" /> Anular
                </Button>
              ) : <div />}
              
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setDetailsOpen(false)}>Cerrar</Button>
                {selectedRes?.estado !== 'cancelada' && (
                  <Button type="submit" disabled={loading}>{loading ? 'Guardando...' : 'Guardar Cambios'}</Button>
                )}
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

