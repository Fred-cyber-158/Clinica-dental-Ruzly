import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de la base de datos...');

  // 1. Crear o actualizar el Usuario Administrador
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'Ruzly2026';
  const hashedPassword = await bcrypt.hash(adminPassword, 12);

  const admin = await prisma.usuario.upsert({
    where: { username: process.env.SEED_ADMIN_USER || 'admin' },
    update: {},
    create: {
      username: process.env.SEED_ADMIN_USER || 'admin',
      nombre: 'ADMINISTRADOR GENERAL',
      email: 'admin@ruzly.com',
      password: hashedPassword,
      rol: 'ADMINISTRADOR',
      activo: true,
      pendienteAprobacion: false,
    },
  });
  console.log(`✅ Administrador creado/actualizado: ${admin.username}`);

  // 2. Crear o actualizar Pacientes de Prueba
  const paciente1 = await prisma.paciente.upsert({
    where: { ci: '8392104' },
    update: {},
    create: {
      nombre: 'MARÍA FERNANDA LÓPEZ',
      ci: '8392104',
      edad: 28,
      telefono: '+591 70012345',
      email: 'maria.lopez@email.com',
      alergias: 'PENICILINA, IBUPROFENO',
      activo: true,
    },
  });
  console.log(`✅ Paciente 1 creado/actualizado: ${paciente1.nombre}`);

  const paciente2 = await prisma.paciente.upsert({
    where: { ci: '5678901' },
    update: {},
    create: {
      nombre: 'CARLOS ALBERTO PÉREZ',
      ci: '5678901',
      edad: 45,
      telefono: '71234567',
      email: null,
      alergias: null,
      activo: true,
    },
  });
  console.log(`✅ Paciente 2 creado/actualizado: ${paciente2.nombre}`);

  // 3. Crear Tratamientos de Prueba (solo si no existen para estos pacientes)
  const tratamiento1 = await prisma.tratamiento.upsert({
    where: { id: 'tratamiento-demo-1' }, // ID fijo para idempotencia
    update: {},
    create: {
      id: 'tratamiento-demo-1',
      nombre: 'ENDODONCIA PIEZA 16',
      descripcion: 'Tratamiento de conductos en primer molar superior derecho',
      costo: 1500.00,
      pagado: 500.00,
      activo: true,
      pacienteId: paciente1.id,
    },
  });

  const tratamiento2 = await prisma.tratamiento.upsert({
    where: { id: 'tratamiento-demo-2' },
    update: {},
    create: {
      id: 'tratamiento-demo-2',
      nombre: 'LIMPIEZA DENTAL PROFUNDA',
      descripcion: 'Profilaxis completa con ultrasonido',
      costo: 350.00,
      pagado: 350.00,
      activo: true,
      pacienteId: paciente2.id,
    },
  });
  
  // ✅ CORRECCIÓN: Usar las variables en el console.log
  console.log(`✅ Tratamientos creados: ${tratamiento1.nombre} y ${tratamiento2.nombre}`);

  // 4. Crear una Cita de Prueba (para mañana)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const fechaStr = tomorrow.toISOString().split('T')[0];

  await prisma.cita.upsert({
    where: { id: 'cita-demo-1' },
    update: {},
    create: {
      id: 'cita-demo-1',
      fecha: fechaStr,
      hora: '10:00',
      motivo: 'CONTROL POST-ENDODONCIA',
      estado: 'CONFIRMADA',
      pacienteId: paciente1.id,
    },
  });
  console.log(`✅ Cita de prueba creada para el ${fechaStr}`);

  console.log('🎉 ¡Seed completado exitosamente!');
}

main()
  .catch((e) => {
    console.error('❌ Error durante el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });