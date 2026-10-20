import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { writeFile } from 'fs/promises';
import path from 'path';
import fs from 'fs';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const pacienteId = searchParams.get('pacienteId');

    const fotos = await prisma.fotoClinica.findMany({
      where: pacienteId ? { pacienteId } : undefined,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(fotos);
  } catch {
    return NextResponse.json(
      { error: 'Error al obtener las fotografías clínicas.' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const descripcion = formData.get('descripcion') as string | null;
    const tipo = formData.get('tipo') as string | null;
    const pacienteId = formData.get('pacienteId') as string | null;

    if (!file || !pacienteId) {
      return NextResponse.json(
        { error: 'Debe seleccionar un archivo y un paciente.' },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Asegurar que exista la carpeta public/uploads
    const uploadDir = path.join(process.cwd(), 'public/uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `${uniqueSuffix}-${cleanFileName}`;
    const filePath = path.join(uploadDir, filename);

    await writeFile(filePath, buffer);

    const url = `/uploads/${filename}`;
    const prefijoTipo = tipo ? `${tipo}: ` : '';
    const descFinal = descripcion
      ? `${prefijoTipo}${descripcion}`.trim().toUpperCase()
      : prefijoTipo.trim().toUpperCase();

    const nuevaFoto = await prisma.fotoClinica.create({
      data: {
        url,
        descripcion: descFinal || null,
        pacienteId,
      },
    });

    return NextResponse.json(nuevaFoto, { status: 201 });
  } catch (err: unknown) {
    const error = err as Error;
    console.error('Error al subir foto:', error.message);
    return NextResponse.json(
      { error: 'No se pudo subir la fotografía clínica.' },
      { status: 500 }
    );
  }
}