import { PrismaClient } from '@prisma/client';

// Previene múltiples instancias de Prisma Client en desarrollo (Hot Reloading)
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['warn', 'error'] // ✅ En desarrollo: solo advertencias y errores (evita saturar la terminal)
        : ['error'],        // ✅ En producción: solo errores críticos para máximo rendimiento
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}