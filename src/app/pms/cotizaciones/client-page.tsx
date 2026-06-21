'use client'

import { useState } from 'react'
import { format, differenceInDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { Calculator, Download, FileText, Plus, Trash2, Users, Send, Save, UserCheck } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type HabitacionConfig = {
  id: string;
  categoriaId: string;
  adultos: number;
  ninos: number;
  edadesNinos: number[];
}

export default function CotizacionesClientPage({ 
  categorias, 
  servicios, 
  temporadas,
  tarifas,
  posadaNombre,
  edadMaxInfantes = 3,
  edadMaxNinos = 12
}: { 
  categorias: any[], 
  servicios: any[], 
  temporadas: any[],
  tarifas: any[],
  posadaNombre: string,
  edadMaxInfantes?: number,
  edadMaxNinos?: number
}) {
  const [formData, setFormData] = useState({
    titular: {
      nombre: '',
      correo: '',
      telefono: ''
    },
    tipoCliente: 'final', // 'final' o 'agencia'
    fechas: {
      checkIn: '',
      checkOut: ''
    },
    habitaciones: [
      { id: Date.now().toString(), categoriaId: '', adultos: 2, ninos: 0, edadesNinos: [] }
    ] as HabitacionConfig[],
    servicios_seleccionados: [] as any[]
  })

  const [calculating, setCalculating] = useState(false)
  
  // Handlers para el Titular y Autocompletado Mock
  const handleNombreChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, titular: { ...prev.titular, nombre: value } }));
    
    // Mock autocomplete
    if (value.toLowerCase() === 'familia perez' && !formData.titular.correo) {
      setFormData(prev => ({ 
        ...prev, 
        titular: { nombre: 'Familia Pérez', correo: 'perez@ejemplo.com', telefono: '+58 414 1234567' } 
      }));
      toast.success('Cliente existente encontrado y autocompletado.', {
        icon: <UserCheck className="w-4 h-4 text-emerald-500" />
      });
    }
  }

  // Handlers de Habitaciones
  const agregarHabitacion = () => {
    setFormData(prev => ({
      ...prev,
      habitaciones: [
        ...prev.habitaciones,
        { id: Date.now().toString(), categoriaId: '', adultos: 2, ninos: 0, edadesNinos: [] }
      ]
    }))
  }

  const eliminarHabitacion = (id: string) => {
    if (formData.habitaciones.length <= 1) return;
    setFormData(prev => ({
      ...prev,
      habitaciones: prev.habitaciones.filter(h => h.id !== id)
    }))
  }

  const actualizarHabitacion = (id: string, field: keyof HabitacionConfig, value: any) => {
    setFormData(prev => ({
      ...prev,
      habitaciones: prev.habitaciones.map(h => {
        if (h.id === id) {
          const updated = { ...h, [field]: value };
          // Si cambian los niños, ajustar el arreglo de edades
          if (field === 'ninos') {
            const numNinos = Number(value);
            updated.edadesNinos = Array(numNinos).fill(0).map((_, i) => h.edadesNinos[i] || 0);
          }
          return updated;
        }
        return h;
      })
    }))
  }

  const actualizarEdadNino = (habId: string, index: number, edad: number) => {
    setFormData(prev => ({
      ...prev,
      habitaciones: prev.habitaciones.map(h => {
        if (h.id === habId) {
          const nuevasEdades = [...h.edadesNinos];
          nuevasEdades[index] = edad;
          return { ...h, edadesNinos: nuevasEdades };
        }
        return h;
      })
    }))
  }

  // Handlers para Servicios
  const toggleServicio = (item: any) => {
    setFormData(prev => {
      const existe = prev.servicios_seleccionados.some((s: any) => s.id === item.id);
      return {
        ...prev,
        servicios_seleccionados: existe 
          ? prev.servicios_seleccionados.filter((s: any) => s.id !== item.id)
          : [...prev.servicios_seleccionados, item]
      }
    })
  }

  // CÁLCULOS
  const d1 = formData.fechas.checkIn ? new Date(formData.fechas.checkIn + 'T00:00:00') : null;
  const d2 = formData.fechas.checkOut ? new Date(formData.fechas.checkOut + 'T00:00:00') : null;
  const isDateValid = d1 && d2 && d1 < d2;
  const dias = isDateValid ? differenceInDays(d2, d1) : 0;

  // Calculo de Habitaciones
  let totalHabitaciones = 0;
  let totalAdultos = 0;
  let totalNinos = 0;
  let faltanTarifas = false;
  
  const desgloseHabitaciones = formData.habitaciones.map(hab => {
    const cat = categorias.find(c => c.id.toString() === hab.categoriaId.toString());
    if (!cat) return { ...hab, tarifaNoche: 0, subtotal: 0, catNombre: 'Sin seleccionar', comisionDetalleNoches: {} };

    let adultosEfectivos = hab.adultos;
    let ninosEfectivos = 0;
    let infantesEfectivos = 0;

    hab.edadesNinos.forEach(edad => {
      if (edad <= edadMaxInfantes) {
        infantesEfectivos++;
      } else if (edad > edadMaxInfantes && edad <= edadMaxNinos) {
        ninosEfectivos++;
      } else {
        adultosEfectivos++;
      }
    });

    if (hab.edadesNinos.length === 0 && hab.ninos > 0) {
      ninosEfectivos = hab.ninos;
    }

    totalAdultos += adultosEfectivos;
    totalNinos += ninosEfectivos;

    let subtotal = 0;
    let baseTotal = 0;
    let adultosExtraTotal = 0;
    let ninosTotal = 0;
    let comisionAcumuladaPorHabitacion = 0;
    let comisionDetalleNoches: { [percent: number]: number } = {};

    if (isDateValid && d1 && d2) {
      let currentDate = new Date(d1);
      
      for (let i = 0; i < dias; i++) {
        const temporadaActiva = temporadas.find(t => {
          const parts = t.periodo.split(',');
          if (parts.length === 2) {
            const startStr = parts[0].replace('[', '').replace('(', '').trim();
            const endStr = parts[1].replace(']', '').replace(')', '').trim();
            const start = new Date(startStr + 'T00:00:00');
            const end = new Date(endStr + 'T00:00:00');
            // La exclusión del límite superior en DATERANGE [start, end)
            return currentDate >= start && currentDate < end;
          }
          return false;
        });

        if (!temporadaActiva) {
          faltanTarifas = true;
          currentDate.setDate(currentDate.getDate() + 1);
          continue;
        }

        const tarifaConfig = tarifas.find(t => t.temporada_id === temporadaActiva.id && t.categoria_id === cat.id);
        
        if (!tarifaConfig) {
          faltanTarifas = true;
          currentDate.setDate(currentDate.getDate() + 1);
          continue;
        }

        let tarifaDiaria = 0;
        let baseDiaria = 0;
        let extraDiaria = 0;
        let ninoDiaria = 0;
        
        if (tarifaConfig.modalidad_tarifa === 'por_persona') {
           baseDiaria = (adultosEfectivos * Number(tarifaConfig.tarifa_base));
           ninoDiaria = (ninosEfectivos * Number(tarifaConfig.tarifa_nino || 0));
           tarifaDiaria = baseDiaria + ninoDiaria;
        } else {
           // por_habitacion
           const capacidadBase = cat.capacidad_base_pax || 2;
           const adultosExtra = Math.max(0, adultosEfectivos - capacidadBase);
           
           baseDiaria = Number(tarifaConfig.tarifa_base);
           extraDiaria = (adultosExtra * Number(tarifaConfig.tarifa_adulto_extra));
           ninoDiaria = (ninosEfectivos * Number(tarifaConfig.tarifa_nino || 0));
           
           tarifaDiaria = baseDiaria + extraDiaria + ninoDiaria;
        }

        subtotal += tarifaDiaria;
        baseTotal += baseDiaria;
        adultosExtraTotal += extraDiaria;
        ninosTotal += ninoDiaria;
        
        if (tarifaConfig.comisionable) {
           const percent = Number(tarifaConfig.porcentaje_comision);
           const ganancia = tarifaDiaria * (percent / 100);
           comisionAcumuladaPorHabitacion += ganancia;
           if (percent > 0) {
             comisionDetalleNoches[percent] = (comisionDetalleNoches[percent] || 0) + ganancia;
           }
        }

        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    const tarifaPromedio = dias > 0 ? (subtotal / dias) : 0;
    return { ...hab, tarifaNoche: tarifaPromedio, subtotal, baseTotal, adultosExtraTotal, ninosTotal, comisionTotal: comisionAcumuladaPorHabitacion, comisionDetalleNoches, catNombre: cat.nombre };
  });

  const subtotalHabitaciones = desgloseHabitaciones.reduce((acc, hab) => acc + hab.subtotal, 0);
  const totalPersonas = totalAdultos + totalNinos;

  // Cálculo de Servicios Adicionales
  const desgloseServicios = formData.servicios_seleccionados.map(s => {
    const precioBase = Number(s.precio) || 0;
    let subtotal = 0;
    let detalle = '';

    if (s.tipo_cobro === 'Por Persona / Por Noche') {
      subtotal = precioBase * totalPersonas * dias;
      detalle = `${totalPersonas} pax x ${dias} noches`;
    } else {
      subtotal = precioBase;
      detalle = 'Tarifa Única';
    }

    let comisionMonto = 0;
    if (s.comisionable) {
       comisionMonto = subtotal * (Number(s.porcentaje_comision) / 100);
    }

    return { ...s, subtotal, comisionMonto, porcentaje_comision: s.porcentaje_comision, detalle };
  });

  const costoServicios = desgloseServicios.reduce((acc, s) => acc + s.subtotal, 0);

  const subtotalNeto = subtotalHabitaciones + costoServicios;
  
  // Agrupar Comisiones de Habitaciones
  const comisionesHabitacionesAgrupadas = desgloseHabitaciones.reduce((acc: {[k: number]: number}, hab) => {
    Object.entries(hab.comisionDetalleNoches || {}).forEach(([percentStr, monto]) => {
      const p = Number(percentStr);
      acc[p] = (acc[p] || 0) + (monto as number);
    });
    return acc;
  }, {});

  // Agrupar Comisiones de Servicios
  const comisionesServiciosAgrupadas = desgloseServicios.reduce((acc: {[k: number]: {monto: number, nombres: string[]}}, serv) => {
    if (serv.comisionMonto > 0) {
      const p = Number(serv.porcentaje_comision);
      if (!acc[p]) acc[p] = { monto: 0, nombres: [] };
      acc[p].monto += serv.comisionMonto;
      acc[p].nombres.push(serv.nombre);
    }
    return acc;
  }, {});

  const comisionHabitacionesTotal = Object.values(comisionesHabitacionesAgrupadas).reduce((a, b) => a + b, 0);
  const comisionServiciosTotal = Object.values(comisionesServiciosAgrupadas).reduce((a, b) => a + b.monto, 0);
  const comisionTotalGenerada = comisionHabitacionesTotal + comisionServiciosTotal;
  
  const comisionMontoFinal = formData.tipoCliente === 'agencia' ? comisionTotalGenerada : 0;
  const totalBruto = subtotalNeto + comisionMontoFinal;

  const todasHabitacionesTienenCategoria = formData.habitaciones.every(h => h.categoriaId !== '');
  const puedeCalcular = isDateValid && todasHabitacionesTienenCategoria && formData.habitaciones.length > 0 && !faltanTarifas;

  // Filtramos servicios activos y los separamos por tipo de cobro para la UI
  const serviciosActivos = servicios.filter(s => s.estado === 'activo' || !s.estado);
  const serviciosPorPersona = serviciosActivos.filter(s => s.tipo_cobro === 'Por Persona / Por Noche');
  const serviciosGlobales = serviciosActivos.filter(s => s.tipo_cobro === 'Precio Global / Tarifa Única');

  // Acciones (Mocks)
  const handleGuardarBorrador = () => {
    if (!puedeCalcular) return toast.error('Faltan datos para la cotización');
    toast.success('Borrador guardado exitosamente en la base de datos.');
  }

  const handleEnviarCliente = () => {
    if (!puedeCalcular) return toast.error('Faltan datos para la cotización');
    if (!formData.titular.correo) return toast.error('Ingresa el correo del cliente para enviar.');
    toast.success(`Cotización enviada a ${formData.titular.correo}`);
  }

  const handleGeneratePDF = async () => {
    try {
      setCalculating(true)
      const { printElement } = await import('@/lib/utils/print')
      printElement('pdf-template', `Cotizacion_${formData.titular.nombre || 'Cliente'}`)
      toast.success('Abriendo diálogo de impresión de la cotización')
    } catch (error) {
      console.error(error)
      toast.error('Error al generar el PDF')
    } finally {
      setCalculating(false)
    }
  }

  return (
    <div className="max-w-[1600px] mx-auto p-4 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-teal-100 text-teal-700 rounded-xl dark:bg-teal-900/50 dark:text-teal-400">
              <Calculator className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-zinc-900 dark:text-zinc-50">Generador de Cotizaciones</h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Presupuestos dinámicos para múltiples habitaciones y extras.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleGuardarBorrador} className="hidden sm:flex">
              <Save className="w-4 h-4 mr-2" /> Borrador
            </Button>
            <Button onClick={handleGeneratePDF} disabled={!puedeCalcular || calculating} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              <Download className="w-4 h-4 mr-2" /> PDF
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          {/* Columna Izquierda: Formulario */}
          <div className="xl:col-span-8 space-y-6">
            
            {/* 1. Datos del Titular */}
            <div className="bg-white rounded-xl shadow-sm border border-zinc-200 p-6 dark:bg-zinc-900 dark:border-zinc-800">
              <h3 className="text-lg font-semibold border-b pb-3 mb-4 dark:border-zinc-800 flex items-center gap-2">
                <Users className="w-5 h-5 text-zinc-400" />
                1. Datos del Titular
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label>Nombre Completo / Agencia</Label>
                  <Input value={formData.titular.nombre} onChange={handleNombreChange} placeholder="Ej. Familia Pérez" />
                  <p className="text-[10px] text-zinc-400">Autocompleta si ya existe</p>
                </div>
                <div className="grid gap-2">
                  <Label>Correo Electrónico</Label>
                  <Input type="email" value={formData.titular.correo} onChange={e => setFormData(p => ({...p, titular: {...p.titular, correo: e.target.value}}))} placeholder="correo@ejemplo.com" />
                </div>
                <div className="grid gap-2">
                  <Label>Teléfono</Label>
                  <Input value={formData.titular.telefono} onChange={e => setFormData(p => ({...p, titular: {...p.titular, telefono: e.target.value}}))} placeholder="+1 234 567 8900" />
                </div>
                
                <div className="grid gap-2 md:col-span-2">
                  <Label>Tipo de Cliente</Label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="tipo" value="final" checked={formData.tipoCliente === 'final'} onChange={() => setFormData(p => ({...p, tipoCliente: 'final'}))} className="accent-teal-600" />
                      <span className="text-sm">Cliente Final</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="tipo" value="agencia" checked={formData.tipoCliente === 'agencia'} onChange={() => setFormData(p => ({...p, tipoCliente: 'agencia'}))} className="accent-teal-600" />
                      <span className="text-sm">Agencia (Aplica Comisión)</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Fechas */}
            <div className="bg-white rounded-xl shadow-sm border border-zinc-200 p-6 dark:bg-zinc-900 dark:border-zinc-800">
              <h3 className="text-lg font-semibold border-b pb-3 mb-4 dark:border-zinc-800">2. Fechas de Estadía</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Check-in</Label>
                  <Input type="date" value={formData.fechas.checkIn} onChange={e => setFormData(p => ({...p, fechas: {...p.fechas, checkIn: e.target.value}}))} />
                </div>
                <div className="grid gap-2">
                  <Label>Check-out</Label>
                  <Input type="date" value={formData.fechas.checkOut} onChange={e => setFormData(p => ({...p, fechas: {...p.fechas, checkOut: e.target.value}}))} />
                </div>
              </div>
            </div>

            {/* 3. Habitaciones y Acompañantes */}
            <div className="bg-white rounded-xl shadow-sm border border-zinc-200 p-6 dark:bg-zinc-900 dark:border-zinc-800">
              <div className="flex items-center justify-between border-b pb-3 mb-4 dark:border-zinc-800">
                <h3 className="text-lg font-semibold">3. Habitaciones y Acompañantes</h3>
                <Button variant="outline" size="sm" onClick={agregarHabitacion}>
                  <Plus className="w-4 h-4 mr-2" /> Agregar Habitación
                </Button>
              </div>

              <div className="space-y-4">
                {formData.habitaciones.map((hab, index) => (
                  <div key={hab.id} className="relative p-4 rounded-lg border border-zinc-100 bg-zinc-50 dark:bg-zinc-900/50 dark:border-zinc-800">
                    <div className="absolute right-2 top-2">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-red-500" onClick={() => eliminarHabitacion(hab.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <h4 className="text-sm font-medium mb-3 text-zinc-700 dark:text-zinc-300">Habitación {index + 1}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="grid gap-2">
                        <Label>Categoría</Label>
                        <Select value={hab.categoriaId} onValueChange={v => actualizarHabitacion(hab.id, 'categoriaId', v)}>
                          <SelectTrigger className="bg-white dark:bg-zinc-950">
                            <SelectValue placeholder="Seleccionar..." />
                          </SelectTrigger>
                          <SelectContent>
                            {categorias.map(c => (
                              <SelectItem key={c.id} value={c.id.toString()}>{c.nombre}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label>Adultos</Label>
                        <Input type="number" min="1" className="bg-white dark:bg-zinc-950" value={hab.adultos} onChange={e => actualizarHabitacion(hab.id, 'adultos', parseInt(e.target.value) || 1)} />
                      </div>
                      <div className="grid gap-2">
                        <Label>Niños</Label>
                        <Input type="number" min="0" className="bg-white dark:bg-zinc-950" value={hab.ninos} onChange={e => actualizarHabitacion(hab.id, 'ninos', parseInt(e.target.value) || 0)} />
                      </div>
                    </div>
                    
                    {/* Edades Niños */}
                    {hab.ninos > 0 && (
                      <div className="mt-3 p-3 bg-white dark:bg-zinc-950 rounded border border-zinc-200 dark:border-zinc-800">
                        <Label className="text-xs mb-2 block text-zinc-500">Edades de los niños</Label>
                        <div className="flex flex-wrap gap-2">
                          {Array(hab.ninos).fill(0).map((_, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <span className="text-xs text-zinc-400">Nº{i+1}</span>
                              <Input 
                                type="number" 
                                min="0" 
                                max={edadMaxNinos}
                                value={hab.edadesNinos[i] || 0} 
                                onChange={(e) => {
                                  const val = parseInt(e.target.value) || 0;
                                  const clampedVal = Math.min(Math.max(val, 0), edadMaxNinos);
                                  actualizarEdadNino(hab.id, i, clampedVal);
                                }}
                                onBlur={(e) => {
                                  const val = parseInt(e.target.value) || 0;
                                  const clampedVal = Math.min(Math.max(val, 0), edadMaxNinos);
                                  actualizarEdadNino(hab.id, i, clampedVal);
                                }}
                                className="w-16 h-8 text-xs" 
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* 4. Servicios y Suplementos */}
            <div className="bg-white rounded-xl shadow-sm border border-zinc-200 p-6 dark:bg-zinc-900 dark:border-zinc-800">
              <h3 className="text-lg font-semibold border-b pb-3 mb-4 dark:border-zinc-800">4. Servicios y Suplementos</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Cargos Por Persona/Noche */}
                <div>
                  <h4 className="text-sm font-medium mb-3 text-zinc-700 dark:text-zinc-300">Cargos Por Persona / Por Noche</h4>
                  {serviciosPorPersona.length > 0 ? (
                    <div className="space-y-2">
                      {serviciosPorPersona.map(serv => {
                        const isSelected = formData.servicios_seleccionados.some(s => s.id === serv.id);
                        return (
                          <label key={serv.id} className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${isSelected ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20 dark:border-teal-700' : 'border-zinc-200 hover:border-teal-300 dark:border-zinc-800'}`}>
                            <div className="flex items-center gap-3">
                              <input 
                                type="checkbox" 
                                checked={isSelected}
                                onChange={() => toggleServicio(serv)}
                                className="w-4 h-4 rounded border-zinc-300 accent-teal-600"
                              />
                              <div>
                                <div className="text-sm font-medium">{serv.nombre}</div>
                                {serv.tipo && <div className="text-xs text-zinc-500">{serv.tipo}</div>}
                              </div>
                            </div>
                            <span className="text-xs text-zinc-500">+${serv.precio} pax/noche</span>
                          </label>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="text-sm text-zinc-500 italic p-4 bg-zinc-50 dark:bg-zinc-900 rounded border border-dashed border-zinc-200 dark:border-zinc-800">
                      No hay servicios de este tipo.
                    </div>
                  )}
                </div>

                {/* Cargos Globales */}
                <div>
                  <h4 className="text-sm font-medium mb-3 text-zinc-700 dark:text-zinc-300">Precio Global / Tarifa Única</h4>
                  {serviciosGlobales.length > 0 ? (
                    <div className="space-y-2">
                      {serviciosGlobales.map(serv => {
                        const isSelected = formData.servicios_seleccionados.some(s => s.id === serv.id);
                        return (
                          <label key={serv.id} className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${isSelected ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 dark:border-indigo-700' : 'border-zinc-200 hover:border-indigo-300 dark:border-zinc-800'}`}>
                            <div className="flex items-center gap-3">
                              <input 
                                type="checkbox" 
                                checked={isSelected}
                                onChange={() => toggleServicio(serv)}
                                className="w-4 h-4 rounded border-zinc-300 accent-indigo-600"
                              />
                              <div>
                                <div className="text-sm font-medium">{serv.nombre}</div>
                                {serv.tipo && <div className="text-xs text-zinc-500">{serv.tipo}</div>}
                              </div>
                            </div>
                            <span className="text-xs text-zinc-500">+${serv.precio} total</span>
                          </label>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="text-sm text-zinc-500 italic p-4 bg-zinc-50 dark:bg-zinc-900 rounded border border-dashed border-zinc-200 dark:border-zinc-800">
                      No hay servicios de este tipo.
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>

          {/* Columna Derecha: Panel de Resumen */}
          <div className="xl:col-span-4">
            <div className="bg-zinc-900 dark:bg-zinc-950 text-white rounded-xl shadow-xl border border-zinc-800 p-6 sticky top-8">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2 border-b border-zinc-800 pb-4">
                <FileText className="w-5 h-5 text-teal-400" /> Resumen de Costos
              </h3>
              
              <div className="space-y-4 text-sm text-zinc-300">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Titular:</span>
                  <span className="font-medium text-white truncate max-w-[200px]">{formData.titular.nombre || '---'}</span>
                </div>
                
                {puedeCalcular ? (
                  <>
                    <div className="flex justify-between border-b border-zinc-800 pb-3">
                      <span className="text-zinc-500">Fechas:</span>
                      <span className="text-white text-right">
                        {format(d1!, "d MMM", {locale: es})} - {format(d2!, "d MMM", {locale: es})} <br/>
                        <span className="text-xs text-teal-400">({dias} Noches)</span>
                      </span>
                    </div>

                    {/* Desglose Habitaciones */}
                    <div className="space-y-2 pt-2">
                      <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Alojamiento</p>
                      {desgloseHabitaciones.map((hab, i) => (
                        <div key={hab.id} className="border-b border-zinc-800 pb-2">
                          <div className="flex justify-between items-start text-xs">
                            <div>
                              <span className="text-white">Hab {i+1}: {hab.catNombre}</span>
                              <div className="text-zinc-500">{hab.adultos} Ad, {hab.ninos} Ni</div>
                            </div>
                            <div className="text-right">
                              <span className="text-white">${hab.subtotal.toFixed(2)}</span>
                              <div className="text-[10px] text-zinc-500">${hab.tarifaNoche.toFixed(2)} /noche</div>
                            </div>
                          </div>
                          {(hab.baseTotal > 0 || hab.adultosExtraTotal > 0 || hab.ninosTotal > 0) && (
                            <div className="flex gap-2 text-[10px] text-zinc-500 justify-start mt-1">
                              <span>Base: ${hab.baseTotal.toFixed(2)}</span>
                              {hab.adultosExtraTotal > 0 && <span>Adultos extra: ${hab.adultosExtraTotal.toFixed(2)}</span>}
                              {hab.ninosTotal > 0 && <span>Niños: ${hab.ninosTotal.toFixed(2)}</span>}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Desglose Extras */}
                    {desgloseServicios.length > 0 && (
                      <div className="space-y-2 pt-3 border-t border-zinc-800">
                        <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Servicios Extras</p>
                        {desgloseServicios.map(serv => (
                          <div key={serv.id} className="flex justify-between text-xs items-start">
                            <div className="flex flex-col pr-2">
                              <span className="text-zinc-300">- {serv.nombre}</span>
                              <span className="text-[10px] text-zinc-500">{serv.detalle}</span>
                            </div>
                            <span className="text-white">
                              ${serv.subtotal.toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {formData.tipoCliente === 'agencia' && comisionMontoFinal > 0 && (
                      <div className="border-t border-zinc-800 pt-3 space-y-2">
                        <p className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Desglose de Comisiones</p>
                        
                        {Object.entries(comisionesHabitacionesAgrupadas).map(([percent, monto]) => (
                          <div key={`com-hab-${percent}`} className="flex justify-between text-xs text-indigo-300 items-center">
                            <span>Alojamiento ({percent}%):</span>
                            <span>+ ${(monto as number).toFixed(2)}</span>
                          </div>
                        ))}

                        {Object.entries(comisionesServiciosAgrupadas).map(([percent, data]) => {
                          const pData = data as {monto: number, nombres: string[]};
                          const label = pData.nombres.join(', ');
                          return (
                            <div key={`com-serv-${percent}`} className="flex justify-between text-xs text-indigo-300 items-center">
                              <span className="max-w-[180px] truncate" title={label}>{label} ({percent}%):</span>
                              <span>+ ${pData.monto.toFixed(2)}</span>
                            </div>
                          );
                        })}

                        <div className="flex justify-between font-bold text-indigo-400 pt-1 border-t border-indigo-900/30">
                          <span>Total Comisiones:</span>
                          <span>+ ${comisionMontoFinal.toFixed(2)}</span>
                        </div>
                      </div>
                    )}

                    {/* Total */}
                    <div className="flex justify-between items-center pt-4 mt-2 border-t border-zinc-800 text-xl font-bold text-white">
                      <span>Total {formData.tipoCliente === 'agencia' ? 'Bruto' : ''}:</span>
                      <span className="text-teal-400">${totalBruto.toFixed(2)} USD</span>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 text-zinc-600">
                    <Calculator className="w-8 h-8 mx-auto mb-2 opacity-20" />
                    {faltanTarifas ? (
                      <div className="bg-red-500/10 p-3 rounded mt-2 border border-red-500/20">
                        <p className="text-xs text-red-500 font-medium text-left">
                          ⚠️ Faltan tarifas configuradas. <br/>
                          Una o más fechas dentro de tu estadía no pertenecen a ninguna "Temporada" o no se le ha configurado precio en "Tarifas" para la categoría seleccionada.
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs">Completa las fechas y habitaciones para calcular el presupuesto.</p>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-8 space-y-3">
                <Button 
                  onClick={handleEnviarCliente}
                  disabled={!puedeCalcular} 
                  className="w-full bg-teal-600 hover:bg-teal-700 text-white"
                >
                  <Send className="mr-2 h-4 w-4" /> Enviar al Cliente
                </Button>
                <div className="grid grid-cols-2 gap-3">
                  <Button 
                    variant="outline"
                    onClick={handleGuardarBorrador}
                    className="w-full border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white"
                  >
                    Guardar
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={handleGeneratePDF}
                    disabled={!puedeCalcular || calculating} 
                    className="w-full border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white"
                  >
                    {calculating ? '...' : 'Generar PDF'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

      {/* HIDDEN PDF TEMPLATE */}
      <div style={{ display: 'none' }}>
        <div id="pdf-template" className="p-8 font-sans w-[800px]" style={{ backgroundColor: '#ffffff', color: '#000000' }}>
          <div className="flex justify-between items-start border-b-2 pb-6 mb-6" style={{ borderColor: '#0d9488' }}>
            <div>
              <h1 className="text-4xl font-black tracking-tighter" style={{ color: '#0d9488' }}>{posadaNombre}</h1>
              <p className="mt-1" style={{ color: '#71717a' }}>Cotización Oficial</p>
            </div>
            <div className="text-right">
              <p className="font-bold">Fecha: {format(new Date(), 'dd/MM/yyyy')}</p>
              <p className="mt-1" style={{ color: '#52525b' }}>Atención a: <span className="font-semibold text-black">{formData.titular.nombre || 'Cliente'}</span></p>
              <p className="mt-1 text-sm" style={{ color: '#52525b' }}>{formData.titular.correo}</p>
              <p className="mt-1" style={{ color: '#52525b' }}>{formData.tipoCliente === 'agencia' ? 'Agencia Comercial' : 'Cliente Directo'}</p>
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-lg font-bold p-2 rounded mb-4" style={{ backgroundColor: '#f0fdfa', color: '#0f766e' }}>Detalles de Estadía</h3>
            <div className="grid grid-cols-3 gap-4">
              <div><span className="font-semibold" style={{ color: '#52525b' }}>Check-in:</span> {formData.fechas.checkIn ? format(new Date(formData.fechas.checkIn), 'dd/MM/yyyy') : '-'}</div>
              <div><span className="font-semibold" style={{ color: '#52525b' }}>Check-out:</span> {formData.fechas.checkOut ? format(new Date(formData.fechas.checkOut), 'dd/MM/yyyy') : '-'}</div>
              <div><span className="font-semibold" style={{ color: '#52525b' }}>Noches:</span> {dias}</div>
              <div><span className="font-semibold" style={{ color: '#52525b' }}>Habitaciones:</span> {formData.habitaciones.length}</div>
              <div><span className="font-semibold" style={{ color: '#52525b' }}>Huéspedes:</span> {totalAdultos} Adultos, {totalNinos} Niños</div>
            </div>
          </div>

          <table className="w-full mb-8 border-collapse">
            <thead>
              <tr style={{ backgroundColor: '#f4f4f5' }}>
                <th className="p-3 text-left border-b font-bold" style={{ borderColor: '#e4e4e7' }}>Concepto</th>
                <th className="p-3 text-center border-b font-bold" style={{ borderColor: '#e4e4e7' }}>Cant / Detalle</th>
                <th className="p-3 text-right border-b font-bold" style={{ borderColor: '#e4e4e7' }}>Importe</th>
              </tr>
            </thead>
            <tbody>
              {/* Habitaciones */}
              {desgloseHabitaciones.map((hab, i) => (
                <tr key={hab.id}>
                  <td className="p-3 border-b" style={{ borderColor: '#e4e4e7', color: '#27272a' }}>
                    <strong>Habitación {i+1}</strong>: {hab.catNombre}
                    {(hab.baseTotal > 0 || hab.adultosExtraTotal > 0 || hab.ninosTotal > 0) && (
                      <div className="mt-1 text-xs" style={{ color: '#71717a' }}>
                        Desglose: Base ${hab.baseTotal.toFixed(2)} 
                        {hab.adultosExtraTotal > 0 ? ` | Extras $${hab.adultosExtraTotal.toFixed(2)}` : ''} 
                        {hab.ninosTotal > 0 ? ` | Niños $${hab.ninosTotal.toFixed(2)}` : ''}
                      </div>
                    )}
                  </td>
                  <td className="p-3 border-b text-center text-sm" style={{ borderColor: '#e4e4e7' }}>
                    {hab.adultos} Ad, {hab.ninos} Ni <br/><span className="text-xs text-zinc-500">${hab.tarifaNoche.toFixed(2)} x {dias} noches</span>
                  </td>
                  <td className="p-3 border-b text-right font-medium" style={{ borderColor: '#e4e4e7' }}>${hab.subtotal.toFixed(2)}</td>
                </tr>
              ))}

              {/* Servicios */}
              {desgloseServicios.map(serv => (
                <tr key={serv.id}>
                  <td className="p-3 border-b" style={{ borderColor: '#e4e4e7', color: '#27272a' }}>Servicio Extra: {serv.nombre}</td>
                  <td className="p-3 border-b text-center text-sm" style={{ borderColor: '#e4e4e7' }}>
                    {serv.detalle}
                  </td>
                  <td className="p-3 border-b text-right font-medium" style={{ borderColor: '#e4e4e7' }}>
                    ${serv.subtotal.toFixed(2)}
                  </td>
                </tr>
              ))}

              {/* Comisión */}
              {formData.tipoCliente === 'agencia' && comisionMontoFinal > 0 && (
                <>
                  <tr style={{ backgroundColor: '#eef2ff' }}>
                    <td colSpan={3} className="p-3 border-b font-bold text-sm" style={{ borderColor: '#e4e4e7', color: '#4f46e5' }}>
                      Desglose de Comisiones (Agencia)
                    </td>
                  </tr>
                  {Object.entries(comisionesHabitacionesAgrupadas).map(([percent, monto]) => (
                    <tr key={`pdf-com-hab-${percent}`} style={{ backgroundColor: '#fafbff' }}>
                      <td className="p-3 border-b text-sm" style={{ borderColor: '#e4e4e7', color: '#4f46e5' }}>Comisión Alojamiento ({percent}%)</td>
                      <td className="p-3 border-b text-center text-sm" style={{ borderColor: '#e4e4e7' }}>-</td>
                      <td className="p-3 border-b text-right font-medium text-sm" style={{ borderColor: '#e4e4e7', color: '#4f46e5' }}>${(monto as number).toFixed(2)}</td>
                    </tr>
                  ))}
                  {Object.entries(comisionesServiciosAgrupadas).map(([percent, data]) => {
                    const pData = data as {monto: number, nombres: string[]};
                    return (
                      <tr key={`pdf-com-serv-${percent}`} style={{ backgroundColor: '#fafbff' }}>
                        <td className="p-3 border-b text-sm" style={{ borderColor: '#e4e4e7', color: '#4f46e5' }}>Comisión {pData.nombres.join(' + ')} ({percent}%)</td>
                        <td className="p-3 border-b text-center text-sm" style={{ borderColor: '#e4e4e7' }}>-</td>
                        <td className="p-3 border-b text-right font-medium text-sm" style={{ borderColor: '#e4e4e7', color: '#4f46e5' }}>${pData.monto.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                  <tr style={{ backgroundColor: '#eef2ff' }}>
                    <td className="p-3 border-b font-bold" style={{ borderColor: '#e4e4e7', color: '#4f46e5' }}>Total en Comisiones</td>
                    <td className="p-3 border-b text-center" style={{ borderColor: '#e4e4e7' }}>-</td>
                    <td className="p-3 border-b text-right font-bold" style={{ borderColor: '#e4e4e7', color: '#4f46e5' }}>${comisionMontoFinal.toFixed(2)}</td>
                  </tr>
                </>
              )}
            </tbody>
          </table>

          <div className="flex justify-end">
            <div className="w-64">
              <div className="flex justify-between py-2 border-t-2 font-bold text-xl" style={{ borderColor: '#000000' }}>
                <span>TOTAL:</span>
                <span style={{ color: '#0d9488' }}>${totalBruto.toFixed(2)} USD</span>
              </div>
              <p className="text-right text-xs mt-2" style={{ color: '#71717a' }}>Los precios están sujetos a disponibilidad y pueden variar.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
