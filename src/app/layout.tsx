import './globals.css';
import Navbar from '@/components/Navbar';

export const metadata = {
  title: 'DENTAL RUZLY - Gestión Clínica',
  description: 'Sistema Integral de Gestión Clínica y Control Odontológico',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="dark">
      <body className="bg-slate-950 text-slate-100 min-h-screen flex flex-col antialiased selection:bg-blue-500 selection:text-white">
        <Navbar />
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}