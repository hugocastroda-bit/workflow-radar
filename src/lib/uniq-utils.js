/** Deduplica un array de strings insensible a mayúsculas, acentos y espacios extra */
export function uniqNorm(arr) {
  const seen = new Set();
  const result = [];
  for (const v of arr) {
    if (!v || typeof v !== "string") continue;
    const clean = v.trim().split(" — ")[0].trim(); // quitar "— email" si existe
    const key = clean.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ");
    if (!seen.has(key)) { seen.add(key); result.push(clean); }
  }
  return result.sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
}