'use client';

import Link from 'next/link';

export default function ContactoPage() {
  const whatsappUrl = `https://wa.me/59174337916?text=${encodeURIComponent(
    'Hola, deseo solicitar una consulta odontológica en la Clínica Dental Ruzly.'
  )}`;

  const equipoOdontologos = [
    {
      nombre: 'Dr. Ruzlan Torres Rosas',
      cargo: 'Propietario / Director Odontológico',
      especialidad: 'Cirugía Oral y Implantología',
      foto: '/equipo/dr-ruzlan.jpg',
    },
    {
      nombre: 'Dra. Claudia Flores Rojas',
      cargo: 'Odontólogo Especialista',
      especialidad: 'Ortodoncia y Estética Dental',
      foto: '/equipo/dr-claudia.jpg',
    },
    {
      nombre: 'Dr. Oscar Puma Uribe',
      cargo: 'Odontólogo Especialista',
      especialidad: 'Endodoncia y Odontopediatría',
      foto: '/equipo/dr-oscar.jpg',
    },
    {
      nombre: 'Dra. Rocio Fernandez Montes',
      cargo: 'Odontólogo Especialista',
      especialidad: 'Rehabilitación Oral y Prótesis',
      foto: '/equipo/dr-rocio.jpg',
    },
  ];

  return (
    <div className="space-y-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
      
      {/* Banner de Encabezado Institucional */}
      <section className="bg-[#0d1527] border border-slate-800 p-8 sm:p-10 rounded-3xl shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <span className="text-xs bg-blue-600/20 text-blue-400 border border-blue-500/30 px-3 py-1 rounded-full font-bold uppercase tracking-widest">
            Identidad Institucional
          </span>
          <h1 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-tight mt-3">
            CLÍNICA DENTAL RUZLY
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1 uppercase font-medium">
            Atención Odontológica Especializada • Cochabamba, Bolivia
          </p>
        </div>

        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Contactar a la clínica por WhatsApp"
          className="bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-bold px-6 py-3 rounded-2xl text-xs uppercase transition-all duration-200 shadow-xl shadow-emerald-600/20 flex items-center gap-2 cursor-pointer shrink-0"
        >
          <span></span> Contactar por WhatsApp
        </a>
      </section>

      {/* Misión y Visión */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6" aria-labelledby="mision-vision-title">
        <h2 id="mision-vision-title" className="sr-only">Misión y Visión de la Clínica</h2>
        
        <article className="bg-[#0d1527] border border-slate-800 p-6 rounded-2xl space-y-3 shadow-xl hover:border-slate-700 transition-colors duration-300">
          <div className="flex items-center gap-3">
            <span className="text-2xl" aria-hidden="true">🎯</span>
            <h3 className="text-lg font-extrabold text-white uppercase tracking-wide">
              Misión
            </h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed font-normal">
            Brindar atención odontológica integral de máxima calidad y calidez humana, utilizando tecnología diagnóstica avanzada, bioseguridad estricta y tratamientos personalizados que garanticen la salud bucodental y la plena satisfacción de nuestros pacientes.
          </p>
        </article>

        <article className="bg-[#0d1527] border border-slate-800 p-6 rounded-2xl space-y-3 shadow-xl hover:border-slate-700 transition-colors duration-300">
          <div className="flex items-center gap-3">
            <span className="text-2xl" aria-hidden="true">️</span>
            <h3 className="text-lg font-extrabold text-white uppercase tracking-wide">
              Visión
            </h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed font-normal">
            Consolidarse como la clínica dental líder de referencia en Cochabamba y Bolivia, reconocida por su excelencia clínica, vanguardia tecnológica en odontología digital e innovación continua en el bienestar y sonrisa de la comunidad.
          </p>
        </article>
      </section>

      {/* Información de Contacto y Ubicación */}
      <section className="bg-[#0d1527] border border-slate-800 p-6 sm:p-8 rounded-3xl space-y-6 shadow-xl" aria-labelledby="contacto-title">
        <h2 id="contacto-title" className="text-sm font-bold text-white uppercase border-b border-slate-800 pb-3 tracking-wider flex items-center gap-2">
          <span aria-hidden="true">📍</span> Canales Directos y Ubicación
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
          <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl space-y-2 hover:border-blue-500/30 transition-colors">
            <p className="text-blue-400 font-bold uppercase">Propietario / Dirección Médica</p>
            <p className="text-white font-black text-sm uppercase">Dr. Ruzlan Torres Rosas</p>
            <p className="text-slate-400">Odontólogo Cirujano General</p>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl space-y-2 hover:border-emerald-500/30 transition-colors">
            <p className="text-emerald-400 font-bold uppercase">Teléfono / WhatsApp</p>
            <p className="text-white font-mono font-bold text-sm">+591 74337916</p>
            <p className="text-slate-400">Atención de consultas y reservas directas</p>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl space-y-2 hover:border-purple-500/30 transition-colors">
            <p className="text-purple-400 font-bold uppercase">Ubicación de la Clínica</p>
            <p className="text-white font-bold uppercase">Cochabamba, Bolivia</p>
            <p className="text-slate-400">Atención con citas programadas</p>
          </div>
        </div>
      </section>

      {/* Staff Médico de Odontólogos */}
      <section className="space-y-6" aria-labelledby="equipo-title">
        <div className="border-b border-slate-800 pb-3">
          <h2 id="equipo-title" className="text-xl sm:text-2xl font-extrabold text-white uppercase tracking-tight">
            Nuestro Equipo Odontológico Especializado
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Profesionales altamente capacitados comprometidos con la salud oral.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {equipoOdontologos.map((doc, idx) => (
            <article
              key={idx}
              className="bg-[#0d1527] border border-slate-800 p-5 rounded-2xl space-y-4 text-center shadow-xl hover:border-blue-500/40 hover:-translate-y-1 transition-all duration-300"
            >
              {/* ✅ MEJORA: Fallback de imagen más limpio y reactivo */}
              <div className="relative w-24 h-24 rounded-full mx-auto bg-slate-900 border-2 border-blue-500/30 flex items-center justify-center text-3xl overflow-hidden">
                <span className="absolute inset-0 flex items-center justify-center" aria-hidden="true">🩺</span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={doc.foto}
                  alt={`Fotografía del ${doc.nombre}`}
                  className="relative w-full h-full object-cover z-10"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>

              <div>
                <h3 className="text-xs font-black text-white uppercase">{doc.nombre}</h3>
                <p className="text-[11px] text-blue-400 font-bold uppercase mt-0.5">{doc.cargo}</p>
                <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">{doc.especialidad}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Enlace de retorno */}
      <div className="text-center pt-4 border-t border-slate-800/50">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white uppercase font-bold transition-colors hover:underline"
        >
          <span aria-hidden="true">←</span> Volver al Panel Principal
        </Link>
      </div>
    </div>
  );
}