export const RESOURCE_TYPE_FR_LABELS: Record<string, string> = {
  LABOR: "Main-d'oeuvre",
  EQUIPMENT: "Equipement",
  SUBCONTRACTOR: "Sous-traitant",
};

export function getResourceTypeLabel(code?: string): string {
  if (!code) return "Type inconnu";
  return RESOURCE_TYPE_FR_LABELS[code] ?? code;
}
