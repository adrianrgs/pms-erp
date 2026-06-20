'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Search, FileText, Globe2, Menu } from "lucide-react"
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Button } from '@/components/ui/button'

const navItems = [
  { name: "Dashboard", href: "/erp/dashboard", icon: LayoutDashboard },
  { name: "Buscador Global", href: "/erp/buscador", icon: Search },
  { name: "Mis Reservas", href: "/erp/reservas", icon: FileText },
]

function NavLinks({ onClick }: { onClick?: () => void }) {
  const pathname = usePathname()
  return (
    <nav className="space-y-1.5">
      <div className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">Agencia B2B</div>
      {navItems.map((item) => {
        const isActive = pathname.startsWith(item.href)
        return (
          <Link
            key={item.name}
            href={item.href}
            onClick={onClick}
            className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all
              ${isActive 
                ? 'bg-teal-50 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300' 
                : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50'
              }`}
          >
            <item.icon className={`h-4 w-4 transition-colors ${isActive ? 'text-teal-600 dark:text-teal-400' : 'text-zinc-400 group-hover:text-teal-600 dark:group-hover:text-teal-400'}`} />
            {item.name}
          </Link>
        )
      })}
    </nav>
  )
}

function UserProfile() {
  return (
    <div className="rounded-xl bg-zinc-50 p-4 border border-zinc-100 dark:bg-zinc-800/50 dark:border-zinc-800">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold dark:bg-teal-900/50 dark:text-teal-400">
          M
        </div>
        <div>
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Agente</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Agencia Mayorista</p>
        </div>
      </div>
    </div>
  )
}

export function ERPSidebar() {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Mobile Header & Trigger */}
      <div className="lg:hidden sticky top-0 z-50 flex h-16 items-center justify-between border-b border-zinc-200 bg-white/80 px-4 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="flex items-center gap-2 font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600 text-white shadow-md">
            <Globe2 className="h-5 w-5" />
          </div>
          <span className="text-xl">ERP B2B</span>
        </div>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[280px] sm:w-[320px] p-0 flex flex-col">
            <div className="sr-only">
              <SheetTitle>Menú del ERP</SheetTitle>
              <SheetDescription>Accede a las distintas áreas de la agencia mayorista.</SheetDescription>
            </div>
            <div className="flex h-16 items-center border-b border-zinc-200 px-6 dark:border-zinc-800">
              <div className="flex items-center gap-2 font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600 text-white shadow-md">
                  <Globe2 className="h-5 w-5" />
                </div>
                <span className="text-xl">ERP B2B</span>
              </div>
            </div>
            <div className="flex flex-1 flex-col justify-between p-4 overflow-y-auto">
              <NavLinks onClick={() => setOpen(false)} />
              <UserProfile />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 z-50 w-64 flex-col border-r border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex h-16 items-center border-b border-zinc-200 px-6 dark:border-zinc-800">
          <div className="flex items-center gap-2 font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600 text-white shadow-md">
              <Globe2 className="h-5 w-5" />
            </div>
            <span className="text-xl">ERP Mayorista</span>
          </div>
        </div>

        <div className="flex flex-1 flex-col justify-between p-4 overflow-y-auto">
          <NavLinks />
          <UserProfile />
        </div>
      </aside>
    </>
  )
}
