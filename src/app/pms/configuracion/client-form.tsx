'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Save, Building2, Globe, Palette, ExternalLink } from "lucide-react"
import { savePosadaConfig } from "./actions"
import { toast } from "sonner"

export default function ConfigForm({ defaultValues }: { defaultValues: any }) {
  const [loading, setLoading] = useState(false)
  const [tieneLanding, setTieneLanding] = useState<boolean>(defaultValues?.tiene_landing_propia ?? false)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    try {
      await savePosadaConfig(formData)
      toast.success('Configuración guardada', {
        description: 'Los datos de la posada se han actualizado correctamente.'
      })
    } catch (error: any) {
      toast.error('Error al guardar', {
        description: error.message
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form action={handleSubmit}>
      <Card className="shadow-sm border-zinc-200/60 dark:border-zinc-800/60">
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg dark:bg-indigo-900/50 dark:text-indigo-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <CardTitle>Datos Maestros de la Posada</CardTitle>
              <CardDescription>
                Información general, políticas y moneda base para la facturación.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="nombre">Nombre de la Posada</Label>
              <Input 
                id="nombre" 
                name="nombre" 
                defaultValue={defaultValues?.nombre || ''} 
                required 
                placeholder="Ej. Posada El Faro"
              />
            </div>
            
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="descripcion">Descripción Breve</Label>
              <Textarea 
                id="descripcion" 
                name="descripcion" 
                defaultValue={defaultValues?.descripcion || ''} 
                placeholder="Describe tu posada..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="moneda_base">Moneda Base (Tarifas)</Label>
              <Select name="moneda_base" defaultValue={defaultValues?.moneda_base || 'USD'}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona moneda" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD ($) Dólar</SelectItem>
                  <SelectItem value="EUR">EUR (€) Euro</SelectItem>
                  <SelectItem value="VES">VES (Bs) Bolívar</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[10px] text-zinc-500">Todas tus tarifas base se cargarán en esta divisa.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edad_max_infantes">Edad Máx. Infantes (Gratis)</Label>
                <Input 
                  id="edad_max_infantes" 
                  name="edad_max_infantes" 
                  type="number"
                  min="0"
                  max="17"
                  defaultValue={defaultValues?.edad_max_infantes ?? 3} 
                  required 
                />
                <p className="text-[10px] text-zinc-500">Hasta esta edad, no pagan tarifa alguna.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edad_max_ninos">Edad Máxima de Niños</Label>
                <Input 
                  id="edad_max_ninos" 
                  name="edad_max_ninos" 
                  type="number"
                  min="0"
                  max="17"
                  defaultValue={defaultValues?.edad_max_ninos ?? 12} 
                  required 
                />
                <p className="text-[10px] text-zinc-500">Mayores a esta edad pagan tarifa de adulto.</p>
              </div>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="politicas">Políticas de Reserva y Cancelación</Label>
              <Textarea 
                id="politicas" 
                name="politicas" 
                defaultValue={defaultValues?.politicas || ''} 
                placeholder="Ej. Check-in 3PM, Check-out 12PM. No se aceptan mascotas..."
                rows={4}
              />
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <Label>Amenidades Incluidas</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="wifi" defaultChecked={defaultValues?.amenidades?.wifi} className="rounded border-zinc-300 text-indigo-600 focus:ring-indigo-600" />
                <span className="text-sm">Wi-Fi Gratis</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="desayuno" defaultChecked={defaultValues?.amenidades?.desayuno} className="rounded border-zinc-300 text-indigo-600 focus:ring-indigo-600" />
                <span className="text-sm">Desayuno</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="piscina" defaultChecked={defaultValues?.amenidades?.piscina} className="rounded border-zinc-300 text-indigo-600 focus:ring-indigo-600" />
                <span className="text-sm">Piscina</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="parking" defaultChecked={defaultValues?.amenidades?.parking} className="rounded border-zinc-300 text-indigo-600 focus:ring-indigo-600" />
                <span className="text-sm">Estacionamiento</span>
              </label>
            </div>
          </div>

          {/* ── Sección: Presencia Digital (Motor de Reservas Público) ── */}
          <div className="space-y-5 pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-violet-100 text-violet-700 rounded-lg dark:bg-violet-900/50 dark:text-violet-400">
                <Globe className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Presencia Digital</p>
                <p className="text-xs text-zinc-500">Configura el motor de reservas público de tu posada.</p>
              </div>
            </div>

            {/* Slug de URL */}
            <div className="space-y-2">
              <Label htmlFor="slug">Identificador de URL Pública</Label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-400 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 px-2.5 py-2 rounded-l-md font-mono whitespace-nowrap">tudominio.com/booking/</span>
                <Input
                  id="slug"
                  name="slug"
                  defaultValue={defaultValues?.slug || ''}
                  placeholder="posada-el-faro"
                  pattern="[a-z0-9\-]+"
                  className="rounded-l-none font-mono"
                />
              </div>
              <p className="text-[10px] text-zinc-500">Solo minúsculas, números y guiones. Ej: <code>posada-el-faro</code></p>
              {defaultValues?.slug && (
                <a
                  href={`/booking/${defaultValues.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline"
                >
                  <ExternalLink className="w-3 h-3" />
                  Ver motor de reservas
                </a>
              )}
            </div>

            {/* Toggle: tiene landing propia */}
            <div className="flex items-start justify-between gap-4 p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-zinc-100 dark:border-zinc-800">
              <div className="flex-1">
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">La posada tiene página web propia</p>
                <p className="text-xs text-zinc-500 mt-0.5">Si está activo, la URL pública solo mostrará el motor de reservas. Si está inactivo, se mostrará la landing page completa.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 mt-0.5">
                <input
                  type="checkbox"
                  name="tiene_landing_propia"
                  checked={tieneLanding}
                  onChange={(e) => setTieneLanding(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500/30 rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-zinc-600 peer-checked:bg-indigo-600" />
              </label>
            </div>

            {/* Color Pickers */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="color_primario" className="flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5" /> Color Primario
                </Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    id="color_primario"
                    name="color_primario"
                    defaultValue={defaultValues?.color_primario || '#2563eb'}
                    className="w-10 h-10 rounded-lg border border-zinc-200 dark:border-zinc-700 cursor-pointer p-0.5 bg-white"
                  />
                  <Input
                    readOnly
                    defaultValue={defaultValues?.color_primario || '#2563eb'}
                    className="font-mono text-xs"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="color_secundario" className="flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5" /> Color Secundario
                </Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    id="color_secundario"
                    name="color_secundario"
                    defaultValue={defaultValues?.color_secundario || '#7c3aed'}
                    className="w-10 h-10 rounded-lg border border-zinc-200 dark:border-zinc-700 cursor-pointer p-0.5 bg-white"
                  />
                  <Input
                    readOnly
                    defaultValue={defaultValues?.color_secundario || '#7c3aed'}
                    className="font-mono text-xs"
                  />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="bg-zinc-50 border-t border-zinc-100 p-4 dark:bg-zinc-900/50 dark:border-zinc-800 flex justify-end">
          <Button type="submit" disabled={loading} className="min-w-[120px]">
            {loading ? 'Guardando...' : <><Save className="w-4 h-4 mr-2" /> Guardar Cambios</>}
          </Button>
        </CardFooter>
      </Card>
    </form>
  )
}
