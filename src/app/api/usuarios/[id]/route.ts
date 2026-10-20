import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { activo } = body;

    const usuarioActualizado = await prisma.usuario.update({
      where: { id },
      data: { activo: activo ?? false },
    });

    return NextResponse.json(usuarioActualizado);
  } catch {
    return NextResponse.json(
      { error: 'Error al actualizar el estado del usuario.' },
      { status: 500 }
    );
  }
}