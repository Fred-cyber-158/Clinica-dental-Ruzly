// src/lib/alergias.ts
// Ayuda de seguridad: detecta cuando un medicamento coincide con la alergia registrada.
// ⚠️ NOTA: Es un apoyo a la decisión clínica, no reemplaza el criterio profesional del odontólogo.

const normalizar = (t: string) =>
  t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();

const FAMILIAS: { alergia: string[]; medicamentos: string[]; nombre: string }[] = [
  {
    nombre: 'penicilinas y betalactámicos',
    alergia: ['PENICILINA', 'AMOXICILINA', 'AMPICILINA', 'BETALACTAMICO', 'BETA LACTAMICO'],
    medicamentos: ['PENICILINA', 'AMOXICILINA', 'AMPICILINA', 'CLOXACILINA', 'AMOXIL', 'AUGMENTIN', 'CLAVULAN', 'PIPERACILINA'],
  },
  {
    nombre: 'antiinflamatorios no esteroideos (AINE)',
    alergia: ['AINE', 'ASPIRINA', 'IBUPROFENO', 'DICLOFENACO', 'KETOROLACO', 'NAPROXENO', 'ANTIINFLAMATORIO'],
    medicamentos: ['IBUPROFENO', 'DICLOFENACO', 'KETOROLACO', 'NAPROXENO', 'ASPIRINA', 'ACIDO ACETILSALICILICO', 'NIMESULIDA', 'MELOXICAM', 'ETORICOXIB', 'KETOPROFENO'],
  },
  {
    nombre: 'sulfamidas',
    alergia: ['SULFA', 'SULFAMETOXAZOL', 'TRIMETOPRIM'],
    medicamentos: ['SULFA', 'SULFAMETOXAZOL', 'TRIMETOPRIM', 'COTRIMOXAZOL', 'BACTRIM'],
  },
  {
    nombre: 'anestésicos locales tipo amida',
    alergia: ['LIDOCAINA', 'ARTICAINA', 'MEPIVACAINA', 'BUPIVACAINA', 'ANESTESIA', 'ANESTESICO'],
    medicamentos: ['LIDOCAINA', 'ARTICAINA', 'MEPIVACAINA', 'BUPIVACAINA'],
  },
  {
    nombre: 'macrólidos',
    alergia: ['ERITROMICINA', 'AZITROMICINA', 'CLARITROMICINA', 'MACROLIDO'],
    medicamentos: ['ERITROMICINA', 'AZITROMICINA', 'CLARITROMICINA'],
  },
  {
    nombre: 'lincosamidas',
    alergia: ['CLINDAMICINA', 'LINCOSAMIDA'],
    medicamentos: ['CLINDAMICINA'],
  },
  {
    nombre: 'nitroimidazoles y antisépticos',
    alergia: ['METRONIDAZOL', 'CLORHEXIDINA', 'YODO'],
    medicamentos: ['METRONIDAZOL', 'CLORHEXIDINA', 'PERIOGARD', 'ELUDRIL'],
  },
];

/** 
 * Devuelve un texto de advertencia si el medicamento choca con las alergias, o null. 
 */
export function detectarConflictoAlergia(alergias: string | null | undefined, medicamento: string): string | null {
  const a = normalizar(alergias ?? '');
  const m = normalizar(medicamento);
  
  if (!a.trim() || !m.trim()) return null;

  // 1. Verificación por familias farmacológicas (Detección inteligente)
  for (const f of FAMILIAS) {
    const tieneAlergia = f.alergia.some((k) => a.includes(k));
    const esMedicamentoDeFamilia = f.medicamentos.some((k) => m.includes(k));
    
    if (tieneAlergia && esMedicamentoDeFamilia) {
      return `El paciente registra alergia relacionada con ${f.nombre} y este medicamento pertenece a ese grupo.`;
    }
  }

  // 2. Verificación por coincidencia directa de palabras (Fallback de seguridad)
  // Busca palabras de 5 o más letras que aparezcan tanto en la alergia como en el medicamento
  const palabras = a.split(/[^A-Z0-9]+/).filter((w) => w.length >= 5);
  const palabrasIgnoradas = ['ALERGIA', 'ALERGICO', 'ALERGICA', 'ANTECEDENTE', 'ANTECEDENTES', 'NINGUNA', 'NEGATIVO'];
  
  const coincide = palabras.find(
    (w) => !palabrasIgnoradas.includes(w) && m.includes(w)
  );
  
  return coincide 
    ? `La alergia registrada menciona "${coincide}", que aparece en el nombre del medicamento.` 
    : null;
}