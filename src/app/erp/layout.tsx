import { ERPSidebar } from "./erp-sidebar"
import { Settings } from "lucide-react"

export const metadata = {
  title: 'ERP Mayorista - Ecosistema B2B',
  description: 'Portal para Agencias de Viaje',
}

export default function ERPLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-950 flex-col lg:flex-row">
      <ERPSidebar />

      {/* Main Content Area */}
      <main className="lg:ml-64 flex-1 min-w-0 flex flex-col h-screen">
        {/* Top Header - hidden on mobile since ERPSidebar has its own top header on mobile */}
        <header className="hidden lg:flex sticky top-0 z-40 h-16 items-center justify-between border-b border-zinc-200 bg-white/80 px-8 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/80">
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Portal B2B</h1>
          <div className="flex items-center gap-4">
            <button className="rounded-full bg-zinc-100 p-2 text-zinc-500 hover:text-zinc-900 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-50 transition">
              <Settings className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
