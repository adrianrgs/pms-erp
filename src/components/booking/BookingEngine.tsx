'use client'

import { useState, useTransition, useCallback } from 'react'
import { format, differenceInCalendarDays, addDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { DayPicker } from 'react-day-picker'
import 'react-day-picker/dist/style.css'
import {
  Calendar,
  Users,
  ChevronDown,
  Plus,
  Minus,
  Bed,
  Star,
  CreditCard,
  Bitcoin,
  ArrowRight,
  Search,
  X,
  CheckCircle,
  MapPin,
  Clock,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import type { HabitacionDisponible, ReservaSeleccion } from '@/app/booking/types'
import { getHabitacionesDisponibles } from '@/app/booking/[slug]/actions'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  VES: 'Bs',
}

function formatPrice(amount: number, moneda: string) {
  const sym = CURRENCY_SYMBOLS[moneda] ?? moneda
  return `${sym} ${amount.toLocaleString('es-VE', { minimumFractionDigits: 2 })}`
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function OcupantesSelector({
  adultos,
  ninos,
  edadesNinos,
  onChangeAdultos,
  onChangeNinos,
  onChangeEdadesNinos,
  edadMaxNinos,
}: {
  adultos: number
  ninos: number
  edadesNinos: number[]
  onChangeAdultos: (v: number) => void
  onChangeNinos: (v: number) => void
  onChangeEdadesNinos: (v: number[]) => void
  edadMaxNinos: number
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="booking-input w-full flex items-center justify-between gap-2 text-left"
        aria-expanded={open}
        id="ocupantes-trigger"
      >
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-[var(--brand-primary)]" />
          <span className="text-sm text-gray-700">
            {adultos} Adulto{adultos !== 1 ? 's' : ''}
            {ninos > 0 && `, ${ninos} Niño${ninos !== 1 ? 's' : ''}`}
          </span>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-100 p-4 z-50">
          <div className="flex items-center justify-between py-3 border-b border-gray-50">
            <div>
              <p className="text-sm font-medium text-gray-800">Adultos</p>
            </div>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => onChangeAdultos(Math.max(1, adultos - 1))} disabled={adultos <= 1} className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)] disabled:opacity-30 transition-colors">
                <Minus className="w-3 h-3" />
              </button>
              <span className="w-5 text-center text-sm font-semibold text-gray-800">{adultos}</span>
              <button type="button" onClick={() => onChangeAdultos(Math.min(10, adultos + 1))} disabled={adultos >= 10} className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)] disabled:opacity-30 transition-colors">
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-gray-50">
            <div>
              <p className="text-sm font-medium text-gray-800">Niños</p>
              <p className="text-xs text-gray-400">0 a {edadMaxNinos} años</p>
            </div>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => {
                const newNinos = Math.max(0, ninos - 1)
                onChangeNinos(newNinos)
                onChangeEdadesNinos(edadesNinos.slice(0, newNinos))
              }} disabled={ninos <= 0} className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)] disabled:opacity-30 transition-colors">
                <Minus className="w-3 h-3" />
              </button>
              <span className="w-5 text-center text-sm font-semibold text-gray-800">{ninos}</span>
              <button type="button" onClick={() => {
                const newNinos = Math.min(6, ninos + 1)
                onChangeNinos(newNinos)
                onChangeEdadesNinos([...edadesNinos, 0])
              }} disabled={ninos >= 6} className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)] disabled:opacity-30 transition-colors">
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>

          {ninos > 0 && (
            <div className="py-3 border-b border-gray-50 space-y-3">
              <p className="text-xs font-semibold text-gray-500 uppercase">Edades de los niños</p>
              <div className="grid grid-cols-2 gap-2">
                {edadesNinos.map((edad, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 w-12">Niño {idx + 1}</span>
                    <select
                      value={edad}
                      onChange={(e) => {
                        const newEdades = [...edadesNinos]
                        newEdades[idx] = parseInt(e.target.value)
                        onChangeEdadesNinos(newEdades)
                      }}
                      className="flex-1 text-sm border-gray-200 rounded-md py-1 px-2 focus:ring-[var(--brand-primary)] focus:border-[var(--brand-primary)]"
                    >
                      {Array.from({ length: Math.min(18, edadMaxNinos + 1) }, (_, i) => (
                        <option key={i} value={i}>{i} años</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-gray-400 mt-2 leading-tight">
                * Niños mayores a {edadMaxNinos} años pagarán tarifa de adulto.
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={() => setOpen(false)}
            className="mt-3 w-full text-center text-sm font-medium text-[var(--brand-primary)] hover:underline"
          >
            Listo
          </button>
        </div>
      )}
    </div>
  )
}

function HabitacionCard({
  hab,
  moneda,
  noches,
  onSeleccionar,
}: {
  hab: HabitacionDisponible
  moneda: string
  noches: number
  onSeleccionar: () => void
}) {
  const [fotoIdx, setFotoIdx] = useState(0)
  const precioPorNoche = noches > 0 && hab.precio_total > 0 ? hab.precio_total / noches : 0
  const fotos = hab.fotos ?? []
  
  const prevFoto = (e: React.MouseEvent) => { e.stopPropagation(); setFotoIdx((i) => (i - 1 + fotos.length) % fotos.length) }
  const nextFoto = (e: React.MouseEvent) => { e.stopPropagation(); setFotoIdx((i) => (i + 1) % fotos.length) }

  return (
    <div className="habitacion-card group flex flex-col sm:flex-row gap-0 bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
      {/* Foto / Carrusel */}
      <div className="sm:w-56 h-48 sm:h-auto flex-shrink-0 relative bg-gray-100 overflow-hidden">
        {fotos.length > 0 ? (
          <>
            <img
              src={fotos[fotoIdx]}
              alt={hab.nombre_categoria}
              className="w-full h-full object-cover transition-all duration-500"
            />
            {fotos.length > 1 && (
              <>
                <button type="button" onClick={prevFoto} className="absolute left-2 top-1/2 -translate-y-1/2 w-6 h-6 bg-black/40 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60 backdrop-blur-sm">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button type="button" onClick={nextFoto} className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 bg-black/40 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60 backdrop-blur-sm">
                  <ChevronRight className="w-4 h-4" />
                </button>
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                  {fotos.map((_, i) => (
                    <div key={i} className={`w-1.5 h-1.5 rounded-full ${i === fotoIdx ? 'bg-white' : 'bg-white/40'}`} />
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-gray-300">
            <Bed className="w-8 h-8" />
            <span className="text-xs">Sin foto</span>
          </div>
        )}
        <div className="absolute top-2 left-2 bg-white/95 backdrop-blur-sm text-[10px] font-bold text-gray-700 px-2 py-0.5 rounded-md shadow-sm uppercase tracking-wider">
          {hab.habitaciones_disponibles} disp.
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 p-4 flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-semibold text-gray-900 text-base leading-tight">{hab.nombre_categoria}</h3>
            <div className="flex items-center gap-1 text-amber-400 flex-shrink-0 bg-amber-50 px-1.5 py-0.5 rounded">
              <Star className="w-3 h-3 fill-current" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Top</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-[11px] text-gray-500 mb-2">
            <span className="flex items-center gap-1 font-medium text-gray-700">
              <Users className="w-3 h-3 text-[var(--brand-primary)]" />
              Máx. {hab.capacidad_max_pax}
            </span>
          </div>

          {hab.descripcion && (
            <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 mb-3">
              {hab.descripcion}
            </p>
          )}

          {/* Servicios */}
          {hab.servicios && hab.servicios.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {hab.servicios.slice(0, 4).map((s) => (
                <span key={s} className="px-2 py-0.5 bg-gray-50 text-gray-600 rounded text-[10px] font-medium border border-gray-100">
                  {s}
                </span>
              ))}
              {hab.servicios.length > 4 && (
                <span 
                  className="px-2 py-0.5 bg-gray-50 text-gray-400 rounded text-[10px] font-medium border border-gray-100 cursor-help"
                  title={hab.servicios.slice(4).join(', ')}
                >
                  +{hab.servicios.length - 4}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-end justify-between mt-3 pt-3 border-t border-gray-50">
          <div>
            {hab.sin_tarifa ? (
              <>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded mb-1">
                  ⚠ Sin tarifa
                </span>
                <p className="text-xs text-gray-500">Consultar precio</p>
              </>
            ) : (
              <>
                <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold mb-0.5">{noches > 0 ? `${noches} noche${noches !== 1 ? 's' : ''}` : 'Total'}</p>
                <p className="text-xl font-black text-[var(--brand-primary)] leading-none">
                  {formatPrice(hab.precio_total, moneda)}
                </p>
                {noches > 1 && precioPorNoche > 0 && (
                  <p className="text-[10px] text-gray-400 mt-1">
                    {formatPrice(precioPorNoche, moneda)} / noche en total
                  </p>
                )}
                {hab.modalidad_tarifa && !hab.sin_tarifa && (
                  <p className="text-[9px] text-gray-400 mt-0.5">
                    {hab.modalidad_tarifa === 'por_persona' ? '* Tarifa calculada por persona' : '* Tarifa base por habitación'}
                  </p>
                )}
                {hab.desglose && (hab.desglose.base > 0 || hab.desglose.adultos_extra > 0 || hab.desglose.ninos > 0) && !hab.sin_tarifa && (
                  <div className="flex gap-2 text-[10px] text-gray-500 mt-1.5 font-medium">
                    <span>Base: {formatPrice(hab.desglose.base, moneda)}</span>
                    {hab.desglose.adultos_extra > 0 && <span>Extras: {formatPrice(hab.desglose.adultos_extra, moneda)}</span>}
                    {hab.desglose.ninos > 0 && <span>Niños: {formatPrice(hab.desglose.ninos, moneda)}</span>}
                  </div>
                )}
              </>
            )}
          </div>
          <button
            type="button"
            onClick={onSeleccionar}
            id={`seleccionar-${hab.categoria_id}`}
            className="brand-btn flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          >
            Reservar
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

function CheckoutPanel({
  seleccion,
  onConfirmar,
  onCancelar,
}: {
  seleccion: ReservaSeleccion
  onConfirmar: () => void
  onCancelar: () => void
}) {
  const [metodoPago, setMetodoPago] = useState<'tarjeta' | 'binance' | null>(null)
  const [step, setStep] = useState<'resumen' | 'pago' | 'confirmado'>('resumen')

  if (step === 'confirmado') {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
        <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-green-500" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">¡Reserva Recibida!</h3>
        <p className="text-sm text-gray-500 mb-6">
          Tu solicitud fue enviada. Recibirás la confirmación en tu correo en los próximos minutos.
        </p>
        <button
          onClick={onCancelar}
          className="text-sm text-[var(--brand-primary)] font-medium hover:underline"
        >
          Volver al motor de reservas
        </button>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header del panel */}
      <div className="p-5 border-b border-gray-50 flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Resumen de tu reserva</h3>
        <button onClick={onCancelar} className="text-gray-400 hover:text-gray-600 transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-5 space-y-4">
        {/* Habitación seleccionada */}
        <div className="flex gap-3">
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 flex-shrink-0 overflow-hidden">
            {seleccion.fotoUrl
              ? <img src={seleccion.fotoUrl} alt={seleccion.nombreCategoria} className="w-full h-full object-cover" />
              : <Bed className="w-6 h-6 text-gray-300 m-auto mt-5" />
            }
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm">{seleccion.nombreCategoria}</p>
            <p className="text-xs text-gray-400 mt-0.5">{seleccion.adultos} adultos{seleccion.ninos > 0 ? `, ${seleccion.ninos} niños` : ''}</p>
          </div>
        </div>

        {/* Fechas */}
        <div className="bg-gray-50 rounded-xl p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Check-in</span>
            <span className="font-medium text-gray-800">{format(seleccion.checkIn, 'dd MMM yyyy', { locale: es })}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Check-out</span>
            <span className="font-medium text-gray-800">{format(seleccion.checkOut, 'dd MMM yyyy', { locale: es })}</span>
          </div>
          <div className="flex justify-between text-sm pt-2 border-t border-gray-200">
            <span className="text-gray-500 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Duración</span>
            <span className="font-medium text-gray-800">{seleccion.noches} noche{seleccion.noches !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {/* Total */}
        <div className="flex justify-between items-center py-3 border-t border-gray-100">
          <span className="text-gray-600 font-medium">Total</span>
          <span className="text-2xl font-bold text-gray-900">
            {formatPrice(seleccion.precioTotal, seleccion.moneda)}
          </span>
        </div>

        {/* Paso 2: Selección de método de pago */}
        {step === 'pago' && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-700">Elige cómo pagar:</p>

            {/* Tarjeta Internacional */}
            <button
              type="button"
              onClick={() => setMetodoPago('tarjeta')}
              className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                metodoPago === 'tarjeta'
                  ? 'border-[var(--brand-primary)] bg-[rgba(var(--brand-primary-rgb),0.05)]'
                  : 'border-gray-100 hover:border-gray-200'
              }`}
            >
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <CreditCard className="w-5 h-5 text-blue-600" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-gray-800">Tarjeta Internacional</p>
                <p className="text-xs text-gray-400">Visa, Mastercard, AMEX</p>
              </div>
              {metodoPago === 'tarjeta' && (
                <CheckCircle className="w-5 h-5 text-[var(--brand-primary)] ml-auto" />
              )}
            </button>

            {/* Binance Pay */}
            <button
              type="button"
              onClick={() => setMetodoPago('binance')}
              className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                metodoPago === 'binance'
                  ? 'border-[var(--brand-primary)] bg-[rgba(var(--brand-primary-rgb),0.05)]'
                  : 'border-gray-100 hover:border-gray-200'
              }`}
            >
              <div className="w-10 h-10 bg-yellow-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <Bitcoin className="w-5 h-5 text-yellow-500" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-gray-800">Binance Pay</p>
                <p className="text-xs text-gray-400">Pago cripto instantáneo</p>
              </div>
              {metodoPago === 'binance' && (
                <CheckCircle className="w-5 h-5 text-[var(--brand-primary)] ml-auto" />
              )}
            </button>

            {/* Placeholder de integración */}
            {metodoPago && (
              <div className="mt-3 p-4 bg-amber-50 border border-amber-100 rounded-xl">
                <p className="text-xs text-amber-700 text-center">
                  🔧 Integración de pasarela de pago en desarrollo.
                  <br />El equipo de la posada te contactará para coordinar el pago.
                </p>
              </div>
            )}
          </div>
        )}

        {/* CTAs */}
        <div className="space-y-2 pt-2">
          {step === 'resumen' && (
            <button
              type="button"
              onClick={() => setStep('pago')}
              className="brand-btn w-full py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
            >
              Continuar al pago
              <ArrowRight className="w-4 h-4" />
            </button>
          )}

          {step === 'pago' && (
            <button
              type="button"
              disabled={!metodoPago}
              onClick={() => { onConfirmar(); setStep('confirmado') }}
              className="brand-btn w-full py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Confirmar Reserva
              <CheckCircle className="w-4 h-4" />
            </button>
          )}

          <p className="text-center text-xs text-gray-400">
            Sin cargos adicionales • Cancelación gratuita*
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── Componente Principal ────────────────────────────────────────────────────

interface BookingEngineProps {
  posadaId: string
  posadaNombre: string
  moneda: string
}

export default function BookingEngine({
  posadaId,
  posadaNombre,
  moneda,
  edadMaxNinos = 12,
}: BookingEngineProps & { edadMaxNinos?: number }) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [checkIn, setCheckIn] = useState<Date | undefined>(undefined)
  const [checkOut, setCheckOut] = useState<Date | undefined>(undefined)
  const [showCalendario, setShowCalendario] = useState<'checkin' | 'checkout' | null>(null)
  const [adultos, setAdultos] = useState(2)
  const [ninos, setNinos] = useState(0)
  const [edadesNinos, setEdadesNinos] = useState<number[]>([])
  const [habitaciones, setHabitaciones] = useState<HabitacionDisponible[]>([])
  const [buscado, setBuscado] = useState(false)
  const [seleccion, setSeleccion] = useState<ReservaSeleccion | null>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const noches = checkIn && checkOut ? differenceInCalendarDays(checkOut, checkIn) : 0

  const buscarHabitaciones = useCallback(() => {
    if (!checkIn || !checkOut) {
      setError('Por favor selecciona las fechas de entrada y salida.')
      return
    }
    setError(null)
    setBuscado(true)
    startTransition(async () => {
      const resultado = await getHabitacionesDisponibles(
        posadaId,
        format(checkIn, 'yyyy-MM-dd'),
        format(checkOut, 'yyyy-MM-dd'),
        adultos,
        ninos,
        edadesNinos,
      )
      setHabitaciones(resultado)
    })
  }, [checkIn, checkOut, adultos, ninos, edadesNinos, posadaId])

  // ── Render MODO STANDALONE (página completa) ──────────────────────────────
  return (
    <div className="booking-engine-standalone max-w-5xl mx-auto px-4">
      {/* Formulario de búsqueda superpuesto */}
      <div className="relative z-[60] bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl border border-white/40 p-4 sm:p-6 mb-8 transition-all">
        {!buscado && (
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Search className="w-5 h-5 text-[var(--brand-primary)]" />
            Encuentra tu estadía perfecta
          </h2>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto] gap-4 items-end">
          {/* Check-in */}
          <div className="relative">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Check-in</label>
            <button
              type="button"
              onClick={() => setShowCalendario(showCalendario === 'checkin' ? null : 'checkin')}
              className="booking-input w-full flex items-center gap-2"
            >
              <Calendar className="w-4 h-4 text-[var(--brand-primary)] flex-shrink-0" />
              <span className="text-sm text-gray-700">
                {checkIn ? format(checkIn, 'dd MMM yyyy', { locale: es }) : 'Fecha de entrada'}
              </span>
            </button>
            {showCalendario === 'checkin' && (
              <div className="absolute top-full left-0 mt-2 z-50 bg-white rounded-xl shadow-2xl border border-gray-100 p-3">
                <DayPicker
                  mode="single"
                  selected={checkIn}
                  onSelect={(d) => { setCheckIn(d); if (d && checkOut && d >= checkOut) setCheckOut(addDays(d, 1)); setShowCalendario(null) }}
                  disabled={{ before: today }}
                  locale={es}
                />
              </div>
            )}
          </div>

          {/* Check-out */}
          <div className="relative">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Check-out</label>
            <button
              type="button"
              onClick={() => setShowCalendario(showCalendario === 'checkout' ? null : 'checkout')}
              className="booking-input w-full flex items-center gap-2"
            >
              <Calendar className="w-4 h-4 text-[var(--brand-primary)] flex-shrink-0" />
              <span className="text-sm text-gray-700">
                {checkOut ? format(checkOut, 'dd MMM yyyy', { locale: es }) : 'Fecha de salida'}
              </span>
            </button>
            {showCalendario === 'checkout' && (
              <div className="absolute top-full left-0 mt-2 z-50 bg-white rounded-xl shadow-2xl border border-gray-100 p-3">
                <DayPicker
                  mode="single"
                  selected={checkOut}
                  onSelect={(d) => { setCheckOut(d); setShowCalendario(null) }}
                  disabled={{ before: checkIn ? addDays(checkIn, 1) : addDays(today, 1) }}
                  locale={es}
                />
              </div>
            )}
          </div>

          {/* Ocupantes */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Huéspedes</label>
            <OcupantesSelector
              adultos={adultos}
              ninos={ninos}
              edadesNinos={edadesNinos}
              onChangeAdultos={setAdultos}
              onChangeNinos={setNinos}
              onChangeEdadesNinos={setEdadesNinos}
              edadMaxNinos={edadMaxNinos}
            />
          </div>

          {/* CTA */}
          <button
            type="button"
            onClick={buscarHabitaciones}
            disabled={isPending}
            id="buscar-habitaciones-standalone"
            className="brand-btn h-[42px] px-6 rounded-xl font-semibold text-sm flex items-center gap-2"
          >
            {isPending ? (
              <span className="animate-spin w-4 h-4 border-2 border-white/40 border-t-white rounded-full" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            Buscar
          </button>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 text-red-600 text-sm bg-red-50 px-4 py-2.5 rounded-lg">
            <X className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {checkIn && checkOut && noches > 0 && (
          <p className="mt-3 text-xs text-gray-400 text-center">
            {noches} noche{noches !== 1 ? 's' : ''} · {adultos} adulto{adultos !== 1 ? 's' : ''}{ninos > 0 ? ` · ${ninos} niño${ninos !== 1 ? 's' : ''}` : ''}
          </p>
        )}
      </div>

      {/* Resultados + Panel Checkout */}
      {buscado && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 items-start">
          {/* Listado de habitaciones */}
          <div className="space-y-4">
            {isPending ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-48 bg-gray-100 rounded-2xl animate-pulse" />
              ))
            ) : habitaciones.length > 0 ? (
              <>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-gray-600">
                    <span className="font-semibold text-gray-900">{habitaciones.length}</span> tipo{habitaciones.length !== 1 ? 's' : ''} disponible{habitaciones.length !== 1 ? 's' : ''}
                  </p>
                  {noches > 0 && (
                    <span className="text-xs text-gray-400 bg-gray-50 px-3 py-1 rounded-full">
                      {noches} noche{noches !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                {habitaciones.map((hab) => (
                  <HabitacionCard
                    key={hab.categoria_id}
                    hab={hab}
                    moneda={moneda}
                    noches={noches}
                    onSeleccionar={() =>
                      setSeleccion({
                        categoriaId: hab.categoria_id,
                        nombreCategoria: hab.nombre_categoria,
                        fotoUrl: hab.fotos?.[0] ?? null,
                        checkIn: checkIn!,
                        checkOut: checkOut!,
                        adultos,
                        ninos,
                        precioTotal: hab.precio_total,
                        moneda,
                        noches,
                      })
                    }
                  />
                ))}
              </>
            ) : (
              <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Bed className="w-8 h-8 text-gray-300" />
                </div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">Sin disponibilidad</h3>
                <p className="text-sm text-gray-400">
                  No encontramos habitaciones disponibles para esas fechas.
                  <br />Intenta con otras fechas o contacta directamente a la posada.
                </p>
              </div>
            )}
          </div>

          {/* Panel lateral: checkout o prompt de selección */}
          <div className="lg:sticky lg:top-6">
            {seleccion ? (
              <CheckoutPanel
                seleccion={seleccion}
                onConfirmar={() => { /* TODO: integrar pasarela */ }}
                onCancelar={() => setSeleccion(null)}
              />
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center">
                <div className="w-12 h-12 bg-[rgba(var(--brand-primary-rgb),0.08)] rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Bed className="w-6 h-6 text-[var(--brand-primary)]" />
                </div>
                <p className="text-sm font-medium text-gray-700 mb-1">Tu selección aparecerá aquí</p>
                <p className="text-xs text-gray-400">Elige una habitación de la lista para continuar con tu reserva.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
