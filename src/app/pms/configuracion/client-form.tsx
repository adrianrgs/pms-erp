'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Save, Building2 } from "lucide-react"
import { savePosadaConfig } from "./actions"
import { toast } from "sonner"

export default function ConfigForm({ defaultValues }: { defaultValues: any }) {
  const [loading, setLoading] = useState(false)

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
