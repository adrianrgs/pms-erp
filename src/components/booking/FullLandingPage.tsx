'use client'

import { useState } from 'react'
import {
  Wifi, Coffee, Waves, Car, MapPin, Phone, Mail,
  ChevronLeft, ChevronRight, Star, Shield, Heart,
  ExternalLink, AirVent, Dumbbell, Utensils, Tv, Moon, Sun, Leaf,
} from 'lucide-react'
import type { PosadaPublica } from '@/app/booking/types'
import BookingEngine from './BookingEngine'

// ─── Icono map completo (legacy + custom) ────────────────────────────────────

const ALL_ICONS: Record<string, React.ComponentType<any>> = {
  wifi: Wifi, coffee: Coffee, waves: Waves, car: Car,
  airvent: AirVent, dumbbell: Dumbbell, utensils: Utensils,
  shield: Shield, mappin: MapPin, tv: Tv, moon: Moon, sun: Sun, leaf: Leaf,
}

// Compatibilidad con amenidades legacy del PMS (campo amenidades JSONB)
const AMENIDAD_LEGACY: Record<string, { icon: React.ComponentType<any>; label: string; desc: string }> = {
  wifi:     { icon: Wifi,   label: 'Wi-Fi Gratis',       desc: 'Conexión de alta velocidad en todas las áreas' },
  desayuno: { icon: Coffee, label: 'Desayuno Incluido',   desc: 'Desayuno buffet servido cada mañana' },
  piscina:  { icon: Waves,  label: 'Piscina',             desc: 'Piscina al aire libre con área de descanso' },
  parking:  { icon: Car,    label: 'Estacionamiento',     desc: 'Amplio estacionamiento privado y seguro' },
}

// ─── Hero Section ─────────────────────────────────────────────────────────────

function HeroSection({ posada }: { posada: PosadaPublica }) {
  const { landing_settings, theme, nombre, descripcion } = posada
  const heroUrl = theme.heroImageUrl
  const titulo  = landing_settings.hero.titulo   || nombre
  const subtitulo = landing_settings.hero.subtitulo || descripcion || ''

  return (
    <section id="inicio" className="relative min-h-[85vh] flex flex-col items-center justify-center pb-24">
      {/* Fondo */}
      {heroUrl ? (
        <img src={heroUrl} alt={`${nombre} - Hero`} className="absolute inset-0 w-full h-full object-cover" fetchPriority="high" />
      ) : (
        <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-secondary) 100%)` }} />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/70" />

      {/* Partículas decorativas */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="absolute rounded-full opacity-10 animate-pulse" style={{
            width: `${80 + i * 40}px`, height: `${80 + i * 40}px`, background: 'white',
            top: `${10 + i * 15}%`, left: `${5 + i * 16}%`,
            animationDelay: `${i * 0.5}s`, animationDuration: `${3 + i}s`,
          }} />
        ))}
      </div>

      {/* Contenido */}
      <div className="relative z-10 text-center px-4 max-w-4xl mx-auto pt-24 pb-8">
        <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2 mb-6">
          <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
          <span className="text-white/90 text-xs font-medium tracking-wide">Reserva directa · Mejor precio garantizado</span>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-tight mb-4 tracking-tight">
          {titulo}
        </h1>

        {subtitulo && (
          <p className="text-lg sm:text-xl text-white/80 leading-relaxed max-w-2xl mx-auto">
            {subtitulo}
          </p>
        )}
      </div>

      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/50 animate-bounce pointer-events-none">
        <span className="text-xs tracking-widest uppercase">Reservar</span>
        <div className="w-px h-6 bg-white/30" />
      </div>
    </section>
  )
}

// ─── Amenidades Section ───────────────────────────────────────────────────────

function AmenidadesSection({ posada }: { posada: PosadaPublica }) {
  const { landing_settings, amenidades } = posada

  // Prioridad: amenidades_custom del configurador, sino legacy del PMS
  const customAmenidades = landing_settings.amenidades_custom
  const legacyActivas = Object.entries(amenidades ?? {})
    .filter(([, v]) => v === true)
    .map(([k]) => k)
    .filter((k) => k in AMENIDAD_LEGACY)

  const hasCustom  = customAmenidades.length > 0
  const hasLegacy  = legacyActivas.length > 0
  const hasAny     = hasCustom || hasLegacy

  if (!hasAny || !landing_settings.secciones.mostrar_amenidades) return null

  return (
    <section id="amenidades" className="py-20 px-4 bg-white">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <span className="text-xs font-bold tracking-widest uppercase mb-3 block" style={{ color: 'var(--brand-primary)' }}>
            Lo que incluye tu estadía
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-gray-900">
            Todo lo que necesitas,<br />
            <span style={{ color: 'var(--brand-primary)' }}>ya está aquí</span>
          </h2>
        </div>

        {/* Amenidades custom (del configurador) */}
        {hasCustom && (
          <div className={`grid gap-6 ${customAmenidades.length <= 2 ? 'sm:grid-cols-2' : customAmenidades.length <= 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2 lg:grid-cols-4'}`}>
            {customAmenidades.map((am) => {
              const Icon = ALL_ICONS[am.icono] ?? Wifi
              return (
                <div key={am.id} className="group relative p-6 rounded-2xl border border-gray-100 hover:border-[var(--brand-primary)] hover:shadow-lg transition-all duration-300 text-center overflow-hidden">
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity duration-300 rounded-2xl" style={{ background: 'var(--brand-primary)' }} />
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-transform group-hover:scale-110 duration-300" style={{ background: 'rgba(var(--brand-primary-rgb), 0.08)' }}>
                    <Icon className="w-7 h-7" style={{ color: 'var(--brand-primary)' }} />
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">{am.nombre}</h3>
                </div>
              )
            })}
          </div>
        )}

        {/* Amenidades legacy (del PMS) — solo si no hay custom */}
        {!hasCustom && hasLegacy && (
          <div className={`grid gap-6 ${legacyActivas.length <= 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-4'}`}>
            {legacyActivas.map((key) => {
              const config = AMENIDAD_LEGACY[key]
              const Icon = config.icon
              return (
                <div key={key} className="group relative p-6 rounded-2xl border border-gray-100 hover:border-[var(--brand-primary)] hover:shadow-lg transition-all duration-300 text-center overflow-hidden">
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity duration-300 rounded-2xl" style={{ background: 'var(--brand-primary)' }} />
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-transform group-hover:scale-110 duration-300" style={{ background: 'rgba(var(--brand-primary-rgb), 0.08)' }}>
                    <Icon className="w-7 h-7" style={{ color: 'var(--brand-primary)' }} />
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">{config.label}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{config.desc}</p>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}

// ─── Galería Section ──────────────────────────────────────────────────────────

function GaleriaSection({ posada }: { posada: PosadaPublica }) {
  const fotos = posada.theme.galeriaUrls
  const [activeIdx, setActiveIdx] = useState(0)

  if (fotos.length === 0 || !posada.landing_settings.secciones.mostrar_galeria) return null

  const prev = () => setActiveIdx((i) => (i - 1 + fotos.length) % fotos.length)
  const next = () => setActiveIdx((i) => (i + 1) % fotos.length)

  return (
    <section id="galeria" className="py-20 px-4 bg-gray-50">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <span className="text-xs font-bold tracking-widest uppercase mb-3 block" style={{ color: 'var(--brand-primary)' }}>Galería</span>
          <h2 className="text-3xl sm:text-4xl font-black text-gray-900">
            Conoce nuestros{' '}<span style={{ color: 'var(--brand-primary)' }}>espacios</span>
          </h2>
        </div>

        <div className="relative">
          <div className="relative h-72 sm:h-96 rounded-3xl overflow-hidden shadow-xl mb-4">
            <img src={fotos[activeIdx]} alt={`${posada.nombre} - Foto ${activeIdx + 1}`} className="w-full h-full object-cover transition-all duration-500" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/40 backdrop-blur-sm text-white text-xs px-3 py-1 rounded-full">
              {activeIdx + 1} / {fotos.length}
            </div>
            {fotos.length > 1 && (
              <>
                <button type="button" onClick={prev} aria-label="Foto anterior" className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center shadow-md hover:bg-white transition-colors">
                  <ChevronLeft className="w-5 h-5 text-gray-700" />
                </button>
                <button type="button" onClick={next} aria-label="Foto siguiente" className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center shadow-md hover:bg-white transition-colors">
                  <ChevronRight className="w-5 h-5 text-gray-700" />
                </button>
              </>
            )}
          </div>

          {fotos.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-2 justify-center">
              {fotos.map((url, i) => (
                <button key={i} type="button" onClick={() => setActiveIdx(i)}
                  className={`flex-shrink-0 w-20 h-16 rounded-xl overflow-hidden border-2 transition-all duration-200 ${i === activeIdx ? 'border-[var(--brand-primary)] scale-105 shadow-md' : 'border-transparent opacity-60 hover:opacity-100'}`}
                >
                  <img src={url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

// ─── CTA Section ──────────────────────────────────────────────────────────────

function CtaSection({ posada }: { posada: PosadaPublica }) {
  return (
    <section className="py-20 px-4" style={{ background: `linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-secondary) 100%)` }}>
      <div className="max-w-3xl mx-auto text-center">
        <div className="flex items-center justify-center gap-2 mb-6">
          <Heart className="w-5 h-5 text-white/70" />
          <span className="text-white/70 text-sm font-medium">Reserva directa</span>
        </div>
        <h2 className="text-3xl sm:text-4xl font-black text-white mb-4 leading-tight">
          ¿Listo para vivir<br />la experiencia {posada.nombre}?
        </h2>
        <p className="text-white/70 mb-10 text-lg">Reserva directamente con nosotros y obtén el mejor precio, sin intermediarios.</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a href="#inicio" className="inline-flex items-center gap-2 bg-white font-bold px-8 py-4 rounded-xl text-sm shadow-xl hover:shadow-2xl hover:-translate-y-0.5 transition-all duration-200" style={{ color: 'var(--brand-primary)' }}>
            Reservar ahora <ExternalLink className="w-4 h-4" />
          </a>
          <div className="flex items-center gap-3 justify-center text-white/70 text-sm">
            <Shield className="w-4 h-4" /> Pago 100% seguro · Sin cargos ocultos
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function Footer({ posada }: { posada: PosadaPublica }) {
  const year = new Date().getFullYear()
  return (
    <footer className="bg-gray-900 text-gray-400 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-10">
          <div className="sm:col-span-1">
            {posada.theme.logoUrl
              ? <img src={posada.theme.logoUrl} alt={posada.nombre} className="h-10 object-contain mb-3 brightness-0 invert" />
              : <h3 className="text-white font-bold text-xl mb-3">{posada.nombre}</h3>
            }
            {posada.descripcion && <p className="text-sm leading-relaxed text-gray-500 line-clamp-3">{posada.descripcion}</p>}
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wide">Contacto</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-2"><MapPin className="w-4 h-4 flex-shrink-0" /><span>Venezuela</span></li>
              <li className="flex items-center gap-2"><Phone className="w-4 h-4 flex-shrink-0" /><span>+58 000-000-0000</span></li>
              <li className="flex items-center gap-2"><Mail className="w-4 h-4 flex-shrink-0" /><span>info@{posada.slug}.com</span></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wide">Información</h4>
            {posada.politicas && <p className="text-sm text-gray-500 leading-relaxed line-clamp-5">{posada.politicas}</p>}
          </div>
        </div>
        <div className="border-t border-gray-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs">© {year} {posada.nombre}. Todos los derechos reservados.</p>
          <p className="text-xs flex items-center gap-1.5"><span>Potenciado por</span><span className="text-white font-semibold">PosadaCloud PMS</span></p>
        </div>
      </div>
    </footer>
  )
}

// ─── Navbar ───────────────────────────────────────────────────────────────────

function Navbar({ posada }: { posada: PosadaPublica }) {
  const { landing_settings, theme, nombre, amenidades } = posada
  const hasAmenidades = landing_settings.amenidades_custom.length > 0 ||
    Object.values(amenidades ?? {}).some(Boolean)

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black/20 backdrop-blur-md border-b border-white/10">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {theme.logoUrl
            ? <img src={theme.logoUrl} alt={nombre} className="h-8 object-contain brightness-0 invert" />
            : <span className="text-white font-bold text-lg">{nombre}</span>
          }
        </div>
        <div className="hidden sm:flex items-center gap-6 text-sm text-white/80">
          <a href="#inicio" className="hover:text-white transition-colors">Inicio</a>
          {hasAmenidades && landing_settings.secciones.mostrar_amenidades && (
            <a href="#amenidades" className="hover:text-white transition-colors">Amenidades</a>
          )}
          {theme.galeriaUrls.length > 0 && landing_settings.secciones.mostrar_galeria && (
            <a href="#galeria" className="hover:text-white transition-colors">Galería</a>
          )}
        </div>
        <a href="#inicio" className="text-sm font-semibold px-4 py-2 rounded-lg transition-all hover:scale-105" style={{ background: 'var(--brand-primary)', color: 'white' }}>
          Reservar
        </a>
      </div>
    </nav>
  )
}

// ─── Componente Principal ─────────────────────────────────────────────────────

export default function FullLandingPage({ posada }: { posada: PosadaPublica }) {
  return (
    <div className="full-landing-page bg-gray-50">
      <Navbar posada={posada} />
      <HeroSection posada={posada} />
      
      {/* Motor de reservas superpuesto */}
      <div className="relative z-20 -mt-16 sm:-mt-24 mb-10">
        <BookingEngine posadaId={posada.id} posadaNombre={posada.nombre} moneda={posada.moneda_base} edadMaxNinos={posada.edad_max_ninos} />
      </div>

      <AmenidadesSection posada={posada} />
      <GaleriaSection posada={posada} />
      <CtaSection posada={posada} />
      <Footer posada={posada} />
    </div>
  )
}
