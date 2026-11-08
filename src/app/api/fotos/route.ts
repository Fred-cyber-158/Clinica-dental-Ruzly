import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { mkdir, unlink, writeFile } from 'fs/promises';
import path from 'path';
import { prisma } from '@/lib/prisma';
import { noAutorizado, prohibido, usuarioAutenticado } from '@/lib/sesion';
import { limpiarTexto } from '@/lib/validar-usuario';

// ✅ CRÍTICO: Este endpoint usa operaciones del sistema de archivos, por lo que requiere el runtime de Node.js
export const runtime = 'nodejs';

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const TIPOS_IMAGEN: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};
const DESCRIPCION_MAX = 300;
const URL_MAX = 500;

/**
 * Verifica la firma mágica (magic numbers) del archivo para prevenir
 * que archivos maliciosos (ej: .exe renombrado a .jpg) sean subidos.
 */
function firmaValida(buffer: Buffer, mime: string): boolean {
  if (mime === 'image/jpeg') {
    return buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (mime === 'image/png') {
    return (
      buffer.length > 8 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    );
  }
  if (mime === 'image/webp') {
    return (
      buffer.length > 12 &&
      buffer.toString('ascii', 0, 4) === 'RIFF' &&
      buffer.toString('ascii', 8, 12) === 'WEBP'
    );
  }
  return false;
}

/**
 * Valida que la URL sea segura (solo rutas locales de /uploads/ o https/http válidos)
 * y previene ataques de Path Traversal (../).
 */
function urlPermitida(valor: string): string | null {
  const url = valor.trim();
  if (!url || url.length > URL_MAX) return null;
  
  if (url.startsWith('/uploads/')) {
    if (url.includes('..') || url.includes('\\')) return null;
    return url;
  }
  
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  try {
    const user = await usuarioAutenticado();
    if (!user) return noAutorizado();
    if (user.rol === 'RECEPCIONISTA') return prohibido();

    const pedido = new URL(request.url).searchParams.get('pacienteId');
    let pacienteId: string | undefined = pedido ?? undefined;

    // El paciente solo puede ver sus propias fotografías.
    if (user.rol === 'PACIENTE') {
      if (!user.pacienteId) return NextResponse.json([]);
      pacienteId = user.pacienteId;
    }

    // ✅ OPTIMIZACIÓN: Select explícito para minimizar el payload
    const fotos = await prisma.fotoClinica.findMany({
      where: pacienteId ? { pacienteId } : undefined,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        url: true,
        descripcion: true,
        createdAt: true,
        paciente: { select: { id: true, nombre: true } },
      },
    });

    return NextResponse.json(fotos);
  } catch (error) {
    console.error('[FOTOS][GET] Error:', error);
    return NextResponse.json({ error: 'Error al obtener las fotografías clínicas.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let archivoGuardado: string | null = null;

  try {
    const user = await usuarioAutenticado();
    if (!user) return noAutorizado();
    if (user.rol !== 'ADMINISTRADOR' && user.rol !== 'ODONTOLOGO') return prohibido();

    const tipoContenido = request.headers.get('content-type') ?? '';
    let url: string | null = null;
    let descripcionCruda = '';
    let tipoCrudo = '';
    let pacienteId = '';

    if (tipoContenido.includes('multipart/form-data')) {
      const formData = await request.formData().catch(() => null);
      if (!formData) {
        return NextResponse.json({ error: 'No se pudo leer el archivo enviado.' }, { status: 400 });
      }

      const file = formData.get('file');
      if (!(file instanceof File) || file.size === 0) {
        return NextResponse.json({ error: 'Seleccione una imagen válida.' }, { status: 400 });
      }
      if (file.size > MAX_BYTES) {
        return NextResponse.json({ error: 'La imagen no puede superar los 5 MB.' }, { status: 413 });
      }

      const mime = file.type.toLowerCase();
      const extension = TIPOS_IMAGEN[mime];
      if (!extension) {
        return NextResponse.json(
          { error: 'Formato no permitido. Use JPG, PNG o WEBP.' },
          { status: 415 }
        );
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      if (!firmaValida(buffer, mime)) {
        return NextResponse.json(
          { error: 'El archivo no parece ser una imagen real del formato indicado.' },
          { status: 415 }
        );
      }

      const uploadDir = path.join(process.cwd(), 'public', 'uploads');
      await mkdir(uploadDir, { recursive: true });

      const nombreArchivo = `${Date.now()}-${randomUUID()}${extension}`;
      const rutaArchivo = path.join(uploadDir, nombreArchivo);
      
      // 'wx' garantiza que no se sobrescriba un archivo existente (aunque el UUID lo hace improbable)
      await writeFile(rutaArchivo, buffer, { flag: 'wx' });

      archivoGuardado = rutaArchivo;
      url = `/uploads/${nombreArchivo}`;
      descripcionCruda = (formData.get('descripcion') ?? formData.get('detalle') ?? '').toString();
      tipoCrudo = (formData.get('tipo') ?? '').toString();
      pacienteId = (formData.get('pacienteId') ?? '').toString().trim();
    } else {
      const cuerpo: unknown = await request.json().catch(() => null);
      if (!cuerpo || typeof cuerpo !== 'object' || Array.isArray(cuerpo)) {
        return NextResponse.json({ error: 'Los datos enviados no son válidos.' }, { status: 400 });
      }
      const c = cuerpo as Record<string, unknown>;
      url = urlPermitida(typeof c.url === 'string' ? c.url : '');
      if (!url) {
        return NextResponse.json(
          { error: 'La URL de la imagen no es válida (use https:// o /uploads/...).' },
          { status: 400 }
        );
      }
      descripcionCruda = typeof c.descripcion === 'string' ? c.descripcion : '';
      tipoCrudo = typeof c.tipo === 'string' ? c.tipo : '';
      pacienteId = typeof c.pacienteId === 'string' ? c.pacienteId.trim() : '';
    }

    if (!pacienteId) {
      if (archivoGuardado) await unlink(archivoGuardado).catch(() => {});
      return NextResponse.json({ error: 'Debe seleccionar un paciente.' }, { status: 400 });
    }

    const paciente = await prisma.paciente.findUnique({
      where: { id: pacienteId },
      select: { id: true, activo: true },
    });
    
    if (!paciente || !paciente.activo) {
      if (archivoGuardado) await unlink(archivoGuardado).catch(() => {});
      return NextResponse.json({ error: 'El paciente no existe o está dado de baja.' }, { status: 400 });
    }

    // ✅ CORRECCIÓN: limpiarTexto no acepta un segundo argumento de longitud en su definición actual,
    // por lo que aplicamos .slice() para garantizar el límite de caracteres de forma segura.
    const tipoLimpio = limpiarTexto(tipoCrudo).toUpperCase().slice(0, 20);
    const prefijo = ['ANTES', 'DESPUES', 'RX', 'RADIOGRAFIA', 'OTRO'].includes(tipoLimpio) ? `${tipoLimpio}: ` : '';
    
    const descripcionLimpia = limpiarTexto(descripcionCruda).toUpperCase().slice(0, DESCRIPCION_MAX);
    const descripcionFinal = `${prefijo}${descripcionLimpia}`.trim() || null;

    const nuevaFoto = await prisma.fotoClinica.create({
      data: {
        url: url as string,
        descripcion: descripcionFinal,
        pacienteId: paciente.id,
      },
      select: {
        id: true,
        url: true,
        descripcion: true,
        createdAt: true,
        paciente: { select: { id: true, nombre: true } },
      },
    });

    return NextResponse.json(nuevaFoto, { status: 201 });
  } catch (error) {
    // 🛡️ ROLLBACK DEL SISTEMA DE ARCHIVOS: Si falla la BD, eliminamos el archivo subido para no dejar basura.
    if (archivoGuardado) {
      await unlink(archivoGuardado).catch(() => {});
    }
    console.error('[FOTOS][POST] Error crítico:', error);
    return NextResponse.json({ error: 'No se pudo registrar la fotografía clínica.' }, { status: 500 });
  }
}