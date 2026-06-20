import Link from "next/link"
import { Building2, ArrowRight } from "lucide-react"

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4">
      <div className="max-w-2xl text-center space-y-8">
        <div className="flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-indigo-600 text-white shadow-xl shadow-indigo-600/20">
            <Building2 className="h-10 w-10" />
          </div>
        </div>
        
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
          Ecosistema B2B Turismo
        </h1>
        
        <p className="text-lg text-zinc-500 dark:text-zinc-400">
          La plataforma dual definitiva. Un PMS robusto para posadas y un motor de reservas en tiempo real para agencias mayoristas, conectados sin latencia.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link href="/auth/login" className="flex h-12 w-full sm:w-auto items-center justify-center gap-2 rounded-lg bg-zinc-900 px-8 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200">
            Iniciar Sesión
          </Link>
          <Link href="/pms/dashboard" className="flex h-12 w-full sm:w-auto items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-8 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-800">
            Ver Demo de PMS <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}
