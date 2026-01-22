/**
 * Validation des charges utiles entrantes.
 */
export class ValidationError extends Error {
  status = 400;
}

export function requireString(payload: Record<string, unknown>, field: string): string {
  const value = payload[field];
  if (typeof value !== "string" || value.trim() === "") {
    throw new ValidationError(`champ manquant ou vide : ${field}`);
  }
  return value;
}

export function requireDate(payload: Record<string, unknown>, field: string): string {
  const value = requireString(payload, field);
  if (Number.isNaN(Date.parse(value))) {
    throw new ValidationError(`date invalide : ${field}`);
  }
  return value;
}

export function requirePositiveInt(payload: Record<string, unknown>, field: string): number {
  const value = payload[field];
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new ValidationError(`entier positif attendu : ${field}`);
  }
  return value;
}
