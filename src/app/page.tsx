import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <div className="max-w-4xl mx-auto bg-white p-6 rounded-lg shadow-md">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">Clínica Dental Ruzly</h1>
        <p className="text-slate-600 mb-6">Sistema de Gestión Médica y Control de Citas</p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/pacientes" className="p-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold text-center transition">
            Gestión de Pacientes
          </Link>
          <Link href="/citas" className="p-4 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-semibold text-center transition">
            Agendar Citas
          </Link>
          <Link href="/servicios" className="p-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold text-center transition">
            Servicios y Costos
          </Link>
        </div>
      </div>
    </main>
  );
}