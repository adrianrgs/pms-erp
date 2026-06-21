'use client'

import { useState, useRef, useTransition, useCallback } from 'react'
import { toast } from 'sonner'
import {
  Tabs, TabsList, TabsTrigger, TabsContent,
} from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Palette, Image as ImageIcon, LayoutTemplate, GalleryHorizontal,
  Upload, Trash2, Plus, Save, Eye, ExternalLink, GripVertical,
  Wifi, Coffee, Waves, Car, AirVent, Dumbbell, Utensils,
  Shield, MapPin, Tv, Moon, Sun, Leaf, X, Check,
} from 'lucide-react'
import {
  saveLandingConfig, deleteGaleriaImage,
} from './actions'
import type { PosadaLandingData, LandingSettings, AmenidadCustom } from './types'
import { MediaPicker } from '@/components/pms/MediaPicker'

// ─── Icono map para amenidades ────────────────────────────────────────────────

const ICONOS_DISPONIBLES = [
  { id: 'wifi', icon: Wifi, label: 'WiFi' },
  { id: 'coffee', icon: Coffee, label: 'Desayuno' },
  { id: 'waves', icon: Waves, label: 'Piscina' },
  { id: 'car', icon: Car, label: 'Parking' },
  { id: 'airvent', icon: AirVent, label: 'A/C' },
  { id: 'dumbbell', icon: Dumbbell, label: 'Gym' },
  { id: 'utensils', icon: Utensils, label: 'Restaurante' },
  { id: 'shield', icon: Shield, label: 'Seguridad' },
  { id: 'mappin', icon: MapPin, label: 'Ubicación' },
  { id: 'tv', icon: Tv, label: 'TV' },
  { id: 'moon', icon: Moon, label: 'Tranquilidad' },
  { id: 'sun', icon: Sun, label: 'Soleado' },
  { id: 'leaf', icon: Leaf, label: 'Eco' },
]

function getIconComponent(id: string) {
  return ICONOS_DISPONIBLES.find((i) => i.id === id)?.icon ?? Wifi
}

// ─── Sub-componente: ImageUploader ────────────────────────────────────────────

function ImageUploader({
  label,
  hint,
  currentUrl,
  tipo,
  onUploaded,
}: {
  label: string
  hint?: string
  currentUrl: string | null
  tipo: 'logo' | 'hero' | 'galeria'
  onUploaded: (url: string) => void
}) {
  const [pickerOpen, setPickerOpen] = useState(false)

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">{label}</Label>
      {hint && <p className="text-xs text-zinc-500">{hint}</p>}

      <div
        onClick={() => setPickerOpen(true)}
        className="relative group cursor-pointer rounded-xl border-2 border-dashed border-zinc-200 hover:border-indigo-400 transition-colors overflow-hidden"
        style={{ minHeight: tipo === 'hero' ? '160px' : '120px' }}
      >
        {currentUrl ? (
          <>
            <img
              src={currentUrl}
              alt={label}
              className={`w-full object-cover transition-opacity group-hover:opacity-80 ${
                tipo === 'logo' ? 'max-h-28 object-contain p-4' : 'h-40 object-cover'
              }`}
            />
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30 rounded-xl">
              <div className="flex flex-col items-center gap-1 text-white">
                <Upload className="w-6 h-6" />
                <span className="text-xs font-medium">Cambiar imagen</span>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-zinc-400">
            <div className="w-12 h-12 rounded-xl bg-zinc-100 flex items-center justify-center">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-zinc-600">Haz clic para seleccionar</p>
              <p className="text-xs">Abre la Carpeta Maestra</p>
            </div>
          </div>
        )}
      </div>

      <MediaPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        multiple={false}
        title={`Seleccionar ${label}`}
        onSelect={(url) => {
          onUploaded(url as string)
        }}
      />
    </div>
  )
}

// ─── Sub-componente: GaleriaManager ──────────────────────────────────────────

function GaleriaManager({
  urls,
  onAdd,
  onRemove,
}: {
  urls: string[]
  onAdd: (url: string) => void
  onRemove: (url: string) => void
}) {
  const [pickerOpen, setPickerOpen] = useState(false)

  async function handleRemove(url: string) {
    onRemove(url)
    // Ya no borramos físicamente de posadas-media aquí, solo quitamos la URL de la galería
    // El usuario puede borrarla desde la Carpeta Maestra si quiere
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-500">{urls.length} foto{urls.length !== 1 ? 's' : ''} en la galería</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setPickerOpen(true)}
          className="gap-2"
        >
          <Plus className="w-4 h-4" />
          Añadir fotos
        </Button>
      </div>

      {urls.length === 0 ? (
        <div
          onClick={() => setPickerOpen(true)}
          className="cursor-pointer border-2 border-dashed border-zinc-200 rounded-2xl p-12 text-center hover:border-indigo-300 transition-colors"
        >
          <GalleryHorizontal className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-zinc-500">La galería está vacía</p>
          <p className="text-xs text-zinc-400 mt-1">Haz clic para abrir la carpeta maestra</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {urls.map((url, i) => (
            <div key={url} className="group relative aspect-square rounded-xl overflow-hidden bg-zinc-100 border border-zinc-200">
              <img src={url} alt={`Galería ${i + 1}`} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors rounded-xl" />
              <button
                type="button"
                onClick={() => handleRemove(url)}
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity w-7 h-7 bg-red-500 hover:bg-red-600 text-white rounded-lg flex items-center justify-center shadow-md"
                aria-label="Quitar de galería"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <div className="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <GripVertical className="w-4 h-4 text-white/70" />
              </div>
            </div>
          ))}

          {/* Botón de añadir inline */}
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="aspect-square rounded-xl border-2 border-dashed border-zinc-200 hover:border-indigo-400 transition-colors flex flex-col items-center justify-center gap-1 text-zinc-400 hover:text-indigo-500"
          >
            <Plus className="w-6 h-6" />
            <span className="text-xs">Añadir</span>
          </button>
        </div>
      )}

      <MediaPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        multiple={true}
        title="Añadir a Galería"
        onSelect={(newUrls) => {
          const arr = Array.isArray(newUrls) ? newUrls : [newUrls]
          arr.forEach((u) => onAdd(u))
        }}
      />
    </div>
  )
}

// ─── Sub-componente: AmenidadesEditor ─────────────────────────────────────────

function AmenidadesEditor({
  amenidades,
  onChange,
}: {
  amenidades: AmenidadCustom[]
  onChange: (items: AmenidadCustom[]) => void
}) {
  const [showIconPicker, setShowIconPicker] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [nuevoNombre, setNuevoNombre] = useState('')
  const [nuevoIcono, setNuevoIcono] = useState('wifi')

  function agregar() {
    if (!nuevoNombre.trim()) return
    const nueva: AmenidadCustom = {
      id: crypto.randomUUID(),
      icono: nuevoIcono,
      nombre: nuevoNombre.trim(),
    }
    onChange([...amenidades, nueva])
    setNuevoNombre('')
    setNuevoIcono('wifi')
    setShowIconPicker(false)
  }

  function eliminar(id: string) {
    onChange(amenidades.filter((a) => a.id !== id))
  }

  const IconSel = getIconComponent(nuevoIcono)

  return (
    <div className="space-y-4">
      {/* Lista actual */}
      <div className="space-y-2">
        {amenidades.length === 0 ? (
          <div className="text-center py-8 text-zinc-400 border border-dashed border-zinc-200 rounded-xl">
            <Waves className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Sin amenidades personalizadas aún</p>
            <p className="text-xs mt-1">Añade las que ofrece tu posada</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {amenidades.map((am) => {
              const Icon = getIconComponent(am.icono)
              return (
                <div
                  key={am.id}
                  className="group flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-100 dark:border-zinc-700"
                >
                  <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <span className="text-sm font-medium flex-1 text-zinc-800 dark:text-zinc-200">{am.nombre}</span>
                  <button
                    type="button"
                    onClick={() => eliminar(am.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-zinc-400 hover:text-red-500"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Formulario de nueva amenidad */}
      <div className="border border-zinc-200 dark:border-zinc-700 rounded-xl p-4 bg-zinc-50/50 dark:bg-zinc-800/30 space-y-3">
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Nueva amenidad</p>
        <div className="flex gap-2">
          {/* Selector de ícono */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowIconPicker(!showIconPicker)}
              className="w-10 h-10 rounded-lg border border-zinc-200 dark:border-zinc-600 bg-white dark:bg-zinc-800 flex items-center justify-center hover:border-indigo-400 transition-colors"
              title="Cambiar ícono"
            >
              <IconSel className="w-4 h-4 text-indigo-600" />
            </button>
            {showIconPicker && (
              <div className="absolute top-full left-0 mt-1 z-50 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-xl p-3 grid grid-cols-4 gap-1.5 w-52">
                {ICONOS_DISPONIBLES.map(({ id, icon: Ic, label }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => { setNuevoIcono(id); setShowIconPicker(false) }}
                    title={label}
                    className={`p-2 rounded-lg flex items-center justify-center transition-colors ${
                      nuevoIcono === id
                        ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600'
                        : 'hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-500'
                    }`}
                  >
                    <Ic className="w-4 h-4" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <Input
            placeholder="Ej. Piscina climatizada"
            value={nuevoNombre}
            onChange={(e) => setNuevoNombre(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && agregar()}
            className="flex-1"
          />

          <Button type="button" onClick={agregar} disabled={!nuevoNombre.trim()} size="icon" variant="default">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-xs text-zinc-400">Presiona Enter o el botón + para añadir</p>
      </div>
    </div>
  )
}

// ─── Componente Principal: LandingConfigurator ────────────────────────────────

interface LandingConfiguratorProps {
  initialData: PosadaLandingData
}

export default function LandingConfigurator({ initialData }: LandingConfiguratorProps) {
  const [isPending, startTransition] = useTransition()
  const [showPreview, setShowPreview] = useState(false)

  // Estado centralizado
  const [colores, setColores] = useState({
    primario: initialData.color_primario,
    secundario: initialData.color_secundario,
  })
  const [logoUrl, setLogoUrl] = useState(initialData.logo_url)
  const [heroImageUrl, setHeroImageUrl] = useState(initialData.hero_image_url)
  const [galeriaUrls, setGaleriaUrls] = useState(initialData.galeria_urls)
  const [settings, setSettings] = useState<LandingSettings>(initialData.landing_settings)

  const updateSettings = useCallback(<K extends keyof LandingSettings>(
    key: K,
    value: LandingSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }, [])

  const updateSeccion = (key: keyof LandingSettings['secciones'], value: boolean) => {
    setSettings((prev) => ({
      ...prev,
      secciones: { ...prev.secciones, [key]: value },
    }))
  }

  const updateHero = (key: keyof LandingSettings['hero'], value: string) => {
    setSettings((prev) => ({
      ...prev,
      hero: { ...prev.hero, [key]: value },
    }))
  }

  // Guardar todo
  function handleSave() {
    startTransition(async () => {
      const result = await saveLandingConfig({
        color_primario: colores.primario,
        color_secundario: colores.secundario,
        logo_url: logoUrl,
        hero_image_url: heroImageUrl,
        galeria_urls: galeriaUrls,
        landing_settings: settings,
      })
      if (result.success) {
        toast.success('¡Cambios guardados!', {
          description: 'Tu página pública se actualizará en segundos.',
        })
      } else {
        toast.error('Error al guardar', { description: result.error })
      }
    })
  }

  const previewUrl = initialData.slug ? `/booking/${initialData.slug}` : null

  return (
    <div className="relative pb-28">

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Personalizar Landing Page</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Diseña la página pública de <strong>{initialData.nombre}</strong> sin escribir código.
          </p>
        </div>
        {previewUrl && (
          <a
            href={previewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-xl transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Ver página pública
          </a>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="branding" orientation="horizontal">
        <TabsList className="w-full justify-start mb-6 h-auto p-1 flex-wrap gap-1">
          <TabsTrigger value="branding" className="gap-2 px-4 py-2.5">
            <Palette className="w-4 h-4" /> Identidad y Colores
          </TabsTrigger>
          <TabsTrigger value="hero" className="gap-2 px-4 py-2.5">
            <ImageIcon className="w-4 h-4" /> Sección Principal
          </TabsTrigger>
          <TabsTrigger value="secciones" className="gap-2 px-4 py-2.5">
            <LayoutTemplate className="w-4 h-4" /> Gestor de Secciones
          </TabsTrigger>
          <TabsTrigger value="galeria" className="gap-2 px-4 py-2.5">
            <GalleryHorizontal className="w-4 h-4" /> Galería y Contenido
          </TabsTrigger>
        </TabsList>

        {/* ── Tab 1: Identidad y Colores ── */}
        <TabsContent value="branding">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Logo */}
            <Card className="border-zinc-200/60 dark:border-zinc-800/60 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-base">Logo de la Posada</CardTitle>
                <CardDescription>
                  Aparecerá en la barra de navegación y el footer de tu página.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ImageUploader
                  label="Logo"
                  hint="Recomendado: fondo transparente (PNG), mínimo 200px de ancho"
                  currentUrl={logoUrl}
                  tipo="logo"
                  onUploaded={setLogoUrl}
                />
              </CardContent>
            </Card>

            {/* Colores de Marca */}
            <Card className="border-zinc-200/60 dark:border-zinc-800/60 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-base">Colores de Marca</CardTitle>
                <CardDescription>
                  Se aplicarán en botones, acentos y gradientes de tu página.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {[
                  { key: 'primario' as const, label: 'Color Primario', desc: 'Botones, enlaces y elementos principales' },
                  { key: 'secundario' as const, label: 'Color Secundario', desc: 'Gradientes y acentos decorativos' },
                ].map(({ key, label, desc }) => (
                  <div key={key} className="space-y-2">
                    <Label className="text-sm font-medium">{label}</Label>
                    <p className="text-xs text-zinc-500">{desc}</p>
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <input
                          type="color"
                          value={colores[key]}
                          onChange={(e) => setColores((prev) => ({ ...prev, [key]: e.target.value }))}
                          className="w-12 h-12 rounded-xl border border-zinc-200 cursor-pointer p-1 bg-white dark:bg-zinc-800"
                        />
                      </div>
                      <div className="flex-1 space-y-1">
                        <Input
                          value={colores[key]}
                          onChange={(e) => {
                            const v = e.target.value
                            if (/^#[0-9a-fA-F]{0,6}$/.test(v)) {
                              setColores((prev) => ({ ...prev, [key]: v }))
                            }
                          }}
                          className="font-mono text-sm"
                          placeholder="#000000"
                          maxLength={7}
                        />
                      </div>
                      {/* Muestra de color */}
                      <div
                        className="w-12 h-12 rounded-xl flex-shrink-0 border border-zinc-200 shadow-sm"
                        style={{ backgroundColor: colores[key] }}
                      />
                    </div>
                  </div>
                ))}

                {/* Preview live de colores */}
                <div className="mt-4 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
                  <p className="text-xs text-zinc-500 mb-3 font-medium">Vista previa</p>
                  <div
                    className="h-16 rounded-xl flex items-center justify-center text-white text-sm font-semibold shadow-inner"
                    style={{
                      background: `linear-gradient(135deg, ${colores.primario} 0%, ${colores.secundario} 100%)`,
                    }}
                  >
                    {initialData.nombre}
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button
                      type="button"
                      className="flex-1 py-2 rounded-lg text-white text-xs font-semibold"
                      style={{ backgroundColor: colores.primario }}
                    >
                      Botón Primario
                    </button>
                    <button
                      type="button"
                      className="flex-1 py-2 rounded-lg text-white text-xs font-semibold"
                      style={{ backgroundColor: colores.secundario }}
                    >
                      Botón Secundario
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Tab 2: Hero Section ── */}
        <TabsContent value="hero">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Imagen Hero */}
            <Card className="border-zinc-200/60 dark:border-zinc-800/60 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-base">Imagen de Fondo Principal</CardTitle>
                <CardDescription>
                  La imagen grande que cubre toda la pantalla al entrar a tu página.
                  Recomendado: horizontal, mínimo 1920×1080px.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ImageUploader
                  label="Hero Image"
                  hint="JPG o WEBP de alta calidad, formato horizontal (landscape)"
                  currentUrl={heroImageUrl}
                  tipo="hero"
                  onUploaded={setHeroImageUrl}
                />
              </CardContent>
            </Card>

            {/* Textos del Hero */}
            <Card className="border-zinc-200/60 dark:border-zinc-800/60 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-base">Textos del Hero</CardTitle>
                <CardDescription>
                  El mensaje que verán tus visitantes al llegar a tu página.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="hero-titulo">Título Principal</Label>
                  <Input
                    id="hero-titulo"
                    value={settings.hero.titulo}
                    onChange={(e) => updateHero('titulo', e.target.value)}
                    placeholder="¡Bienvenidos a nuestro paraíso!"
                    maxLength={80}
                  />
                  <p className="text-xs text-zinc-400 text-right">{settings.hero.titulo.length}/80</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="hero-subtitulo">Subtítulo</Label>
                  <Textarea
                    id="hero-subtitulo"
                    value={settings.hero.subtitulo}
                    onChange={(e) => updateHero('subtitulo', e.target.value)}
                    placeholder="Una experiencia única frente al mar, rodeada de naturaleza."
                    maxLength={160}
                    rows={3}
                  />
                  <p className="text-xs text-zinc-400 text-right">{settings.hero.subtitulo.length}/160</p>
                </div>

                {/* Preview del hero */}
                {(heroImageUrl || settings.hero.titulo) && (
                  <div
                    className="relative rounded-xl overflow-hidden h-36 mt-2"
                    style={{
                      background: heroImageUrl
                        ? `url(${heroImageUrl}) center/cover`
                        : `linear-gradient(135deg, ${colores.primario}, ${colores.secundario})`,
                    }}
                  >
                    <div className="absolute inset-0 bg-black/45" />
                    <div className="relative z-10 flex flex-col items-center justify-center h-full text-center px-4">
                      <p className="text-white font-black text-lg leading-tight">
                        {settings.hero.titulo || initialData.nombre}
                      </p>
                      {settings.hero.subtitulo && (
                        <p className="text-white/75 text-xs mt-1 leading-snug">
                          {settings.hero.subtitulo}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Tab 3: Gestor de Secciones ── */}
        <TabsContent value="secciones">
          <Card className="border-zinc-200/60 dark:border-zinc-800/60 shadow-sm max-w-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Visibilidad de Secciones</CardTitle>
              <CardDescription>
                Activa o desactiva bloques enteros de tu página con un clic.
                Los cambios se reflejan inmediatamente al guardar.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-1 pt-4">
              {[
                {
                  key: 'mostrar_amenidades' as const,
                  title: 'Sección de Amenidades',
                  desc: 'Muestra los servicios incluidos: WiFi, piscina, desayuno, etc.',
                  icon: Waves,
                },
                {
                  key: 'mostrar_galeria' as const,
                  title: 'Galería de Fotos',
                  desc: 'Carrusel de imágenes de tus espacios e instalaciones.',
                  icon: GalleryHorizontal,
                },
                {
                  key: 'mostrar_testimonios' as const,
                  title: 'Testimonios de Huéspedes',
                  desc: 'Reseñas y comentarios de huéspedes anteriores. (Próximamente)',
                  icon: Check,
                  disabled: true,
                },
                {
                  key: 'mostrar_mapa' as const,
                  title: 'Mapa de Ubicación',
                  desc: 'Mapa interactivo con la dirección exacta de tu posada. (Próximamente)',
                  icon: MapPin,
                  disabled: true,
                },
              ].map(({ key, title, desc, icon: Icon, disabled }) => (
                <div
                  key={key}
                  className={`flex items-center justify-between gap-4 p-4 rounded-xl border transition-colors ${
                    settings.secciones[key]
                      ? 'border-indigo-100 bg-indigo-50/50 dark:border-indigo-900/30 dark:bg-indigo-900/10'
                      : 'border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30'
                  } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      settings.secciones[key]
                        ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'
                    }`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{title}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">{desc}</p>
                    </div>
                  </div>
                  <Switch
                    checked={settings.secciones[key]}
                    onCheckedChange={(v) => !disabled && updateSeccion(key, v)}
                    disabled={disabled}
                    aria-label={`Activar ${title}`}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab 4: Galería y Contenido ── */}
        <TabsContent value="galeria">
          <div className="space-y-6">

            {/* Galería */}
            <Card className="border-zinc-200/60 dark:border-zinc-800/60 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-base">Galería de Fotos</CardTitle>
                <CardDescription>
                  Las fotos aparecerán en la sección Galería de tu landing page.
                  Puedes subir varias imágenes a la vez.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <GaleriaManager
                  urls={galeriaUrls}
                  onAdd={(url) => {
                    if (!galeriaUrls.includes(url)) {
                      setGaleriaUrls((prev) => [...prev, url])
                    }
                  }}
                  onRemove={(url) => setGaleriaUrls((prev) => prev.filter((u) => u !== url))}
                />
              </CardContent>
            </Card>

            {/* Amenidades personalizadas */}
            <Card className="border-zinc-200/60 dark:border-zinc-800/60 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-base">Amenidades Personalizadas</CardTitle>
                <CardDescription>
                  Lista de servicios que ofrece tu posada. Aparecen en la sección
                  "Lo que incluye tu estadía" de la landing page.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AmenidadesEditor
                  amenidades={settings.amenidades_custom}
                  onChange={(items) => updateSettings('amenidades_custom', items)}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* ── FAB flotante: Guardar + Preview ── */}
      <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3">
        {previewUrl && (
          <a
            href={previewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-3 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 text-sm font-medium rounded-xl shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5"
          >
            <Eye className="w-4 h-4" />
            <span className="hidden sm:inline">Previsualizar</span>
          </a>
        )}

        <Button
          onClick={handleSave}
          disabled={isPending}
          size="lg"
          className="gap-2 shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5 rounded-xl px-6"
        >
          {isPending ? (
            <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {isPending ? 'Guardando...' : 'Guardar Cambios'}
        </Button>
      </div>
    </div>
  )
}
