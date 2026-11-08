import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Sidebar from '@/components/Sidebar';
import { ToastProvider } from '@/components/Toast';

// ✅ MEJORA: Importación de fuente Inter (Estándar de la industria para UI limpia y moderna)
// Esto mejora el rendimiento y evita el desplazamiento de diseño (CLS)
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Dental Ruzly - Gestión Clínica',
    template: '%s | Dental Ruzly',
  },
  description: 'Sistema Integral de Gestión Clínica, Odontológica y Financiera para la Clínica Dental Ruzly. Optimizado para un flujo de trabajo moderno y seguro.',
  keywords: ['odontología', 'clínica dental', 'gestión médica', 'bolivia', 'ruzly', 'odontograma', 'software clínico'],
  authors: [{ name: 'Clínica Dental Ruzly', url: 'https://ruzly.com' }],
  openGraph: {
    title: 'Dental Ruzly - Gestión Clínica',
    description: 'Sistema Integral de Gestión Clínica y Financiera.',
    type: 'website',
    locale: 'es_BO',
  },
};

// ✅ MEJORA CRÍTICA DE ACCESIBILIDAD: Se elimina maximumScale: 1 para permitir zoom a usuarios con baja visión.
export const viewport: Viewport = {
  themeColor: '#020617', // Color de la barra de estado en móviles (Slate 950)
  width: 'device-width',
  initialScale: 1,
  // maximumScale se omite intencionalmente para cumplir con las pautas de accesibilidad WCAG (1.4.4)
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html 
      lang="es" 
      className={`dark ${inter.variable}`} 
      suppressHydrationWarning // Previene errores de hidratación por el modo oscuro forzado
    >
      <body className={`${inter.className} bg-slate-950 text-slate-100 min-h-screen flex antialiased scroll-smooth selection:bg-blue-500/30 selection:text-blue-100`}>
        <ToastProvider>
          <Sidebar />
          <main className="flex-1 min-w-0 w-full px-4 sm:px-6 lg:px-8 py-8 pt-20 md:pt-8 transition-all duration-300 ease-in-out">
            {children}
          </main>
        </ToastProvider>
      </body>
    </html>
  );
}