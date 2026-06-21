'use client'

import React, { createContext, useContext, useEffect } from 'react'
import type { PosadaTheme, PosadaPublica } from '../types'

// ─── Context ────────────────────────────────────────────────────────────────

interface BookingThemeContextValue {
  posada: PosadaPublica
  theme: PosadaTheme
}

const BookingThemeContext = createContext<BookingThemeContextValue | null>(null)

export function useBookingTheme(): BookingThemeContextValue {
  const ctx = useContext(BookingThemeContext)
  if (!ctx) throw new Error('useBookingTheme must be used within a BookingThemeProvider')
  return ctx
}

// ─── Provider ───────────────────────────────────────────────────────────────

interface BookingThemeProviderProps {
  posada: PosadaPublica
  children: React.ReactNode
}

/**
 * Inyecta las variables CSS de marca de la posada en el DOM y provee
 * el contexto de tema a todos los componentes hijos del motor de reservas.
 *
 * Variables CSS inyectadas:
 *   --brand-primary        → color principal de la posada
 *   --brand-secondary      → color secundario / acento
 *   --brand-primary-light  → versión suave del primario (10% opacidad)
 */
export function BookingThemeProvider({ posada, children }: BookingThemeProviderProps) {
  const { theme } = posada

  useEffect(() => {
    const root = document.documentElement

    root.style.setProperty('--brand-primary', theme.colorPrimario)
    root.style.setProperty('--brand-secondary', theme.colorSecundario)

    // Derivar versión RGB para opacidades en Tailwind
    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
      return result
        ? `${parseInt(result[1], 16)} ${parseInt(result[2], 16)} ${parseInt(result[3], 16)}`
        : '37 99 235'
    }

    root.style.setProperty('--brand-primary-rgb', hexToRgb(theme.colorPrimario))
    root.style.setProperty('--brand-secondary-rgb', hexToRgb(theme.colorSecundario))

    return () => {
      // Limpiar al desmontar (por si se navega fuera del motor)
      root.style.removeProperty('--brand-primary')
      root.style.removeProperty('--brand-secondary')
      root.style.removeProperty('--brand-primary-rgb')
      root.style.removeProperty('--brand-secondary-rgb')
    }
  }, [theme.colorPrimario, theme.colorSecundario])

  return (
    <BookingThemeContext.Provider value={{ posada, theme }}>
      {children}
    </BookingThemeContext.Provider>
  )
}
