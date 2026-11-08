# Clínica Dental Ruzly — Sistema Web y Móvil de Gestión Integral

Sistema para la gestión de pacientes, citas médicas, tratamientos, cobros, recetas,
odontograma y reportes de la Clínica Dental Ruzly (Cochabamba, Bolivia).

## Tecnologías

- Next.js 16 (App Router, Turbopack) + React 19
- TypeScript
- Tailwind CSS 4
- PostgreSQL + Prisma 5
- Autenticación con cookie firmada (HMAC), bcrypt para contraseñas

## Puesta en marcha

1. Instale dependencias:

   ```bash
   npm install
   ```

2. Cree el archivo `.env` a partir de `.env.example` y complete:

   ```env
   DATABASE_URL="postgresql://usuario:password@localhost:5432/clinica_dental_ruzly?schema=public"
   AUTH_SECRET="un-secreto-aleatorio-de-32-o-mas-caracteres"
   APP_URL="http://localhost:3000"
   SMTP_USER=""
   SMTP_PASS=""
   SEED_ADMIN_USER="admin"
   SEED_ADMIN_PASSWORD="Ruzly2026"
   ```

3. Sincronice la base de datos y cree el primer administrador:

   ```bash
   npm run db:push
   npm run db:seed
   ```

4. Inicie el sistema:

   ```bash
   npm run dev
   ```

   Abra `http://localhost:3000`.

## Cuenta inicial

El seed crea el administrador definido en `.env`:

- Usuario: `admin`
- Contraseña: `Ruzly2026`

> Cambie la contraseña después del primer ingreso desde **Usuarios**.

## Roles

| Rol | Acceso |
| --- | --- |
| ADMINISTRADOR | Todos los módulos, usuarios y reportes |
| ODONTOLOGO | Pacientes, citas, odontograma, cuaderno, fotos, tratamientos y recetas |
| RECEPCIONISTA | Pacientes, citas, tratamientos, caja y cobros |
| PACIENTE | Solo su portal: citas, tratamientos, recetas y su expediente |

Las cuentas son creadas por el administrador; no existe auto-registro público.

## Scripts

| Comando | Descripción |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Sincroniza Prisma y genera la compilación de producción |
| `npm run start` | Sirve la compilación de producción |
| `npm run lint` | Análisis estático con ESLint |
| `npm run db:push` | Aplica el esquema Prisma |
| `npm run db:seed` | Crea el administrador inicial |
| `npm run db:studio` | Abre Prisma Studio |

## Validación y seguridad

- Validación compartida cliente/servidor en `src/lib/validar-*.ts`.
- Todos los formularios bloquean el envío si hay errores y muestran el detalle por campo.
- Sanitización de texto, límites de longitud y filtros de entrada.
- Contraseñas con bcrypt (costo 12) y política mínima de 8 caracteres.
- Sesión con cookie `httpOnly`, `SameSite=Lax` y caducidad de 8 horas.
- Protección de páginas y API por rol en `src/proxy.ts`.
- Verificación de origen para peticiones mutantes (CSRF).
- Límite de intentos de login y recuperación de contraseña.
- Recuperación con token firmado, caducidad de 30 minutos y un solo uso.
- Fotos clínicas: solo JPG/PNG/WEBP, máximo 5 MB y verificación de firma real.

## Estructura principal

```
src/app/            Páginas y rutas API
src/components/     Sidebar, campos de formulario y notificaciones
src/lib/            Sesión, validadores, Prisma, formato y utilidades
prisma/             Esquema y seed
public/uploads/     Fotos clínicas subidas en ejecución (no versionar)
```

## Notas

- Las fotos clínicas se guardan en `public/uploads`; en producción conviene
  moverlas a un almacenamiento privado y servirlas mediante una ruta autenticada.
- El límite de intentos es en memoria; para varias instancias use Redis.
- No suba `.env`, `.env.local` ni las fotos de pacientes al repositorio.
