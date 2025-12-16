import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="mx-auto max-w-xl space-y-3 rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
      <h1 className="text-xl font-semibold tracking-tight">Página no encontrada</h1>
      <p className="text-sm text-slate-600">
        La ruta que abriste no existe o aún no está disponible.
      </p>
      <Link
        to="/dashboard"
        className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
      >
        Volver al dashboard
      </Link>
    </div>
  )
}
