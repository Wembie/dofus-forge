import fs from "node:fs";
// Copy for the set pages study, in es / en / fr / pt order.
const copy = {
  eyebrow: ["ENCICLOPEDIA", "ENCYCLOPEDIA", "ENCYCLOPÉDIE", "ENCICLOPÉDIA"],
  controls: ["Buscar y filtrar sets", "Search and filter sets", "Rechercher et filtrer les panoplies", "Buscar e filtrar conjuntos"],
  full_set: ["Set completo", "Full set", "Panoplie complète", "Conjunto completo"],
  missing_title: ["No encontramos este set", "We couldn’t find this set", "Panoplie introuvable", "Não encontramos este conjunto"],
  try: ["Probar en el taller", "Try it in the workshop", "Essayer dans l’atelier", "Testar na oficina"],
  description: ["Descripción", "Description", "Description", "Descrição"],
  review: ["Revisión local de sets", "Local sets review", "Revue locale des panoplies", "Revisão local dos conjuntos"],
  scene_normal: ["Con builds que lo usan", "With builds using it", "Avec des équipements qui l’utilisent", "Com conjuntos que o usam"],
  "scene_no-builds": ["Sin builds que lo usen", "No builds use it", "Aucun équipement ne l’utilise", "Nenhum conjunto o usa"],
};
for (const [index, lang] of ["es", "en", "fr", "pt"].entries()) {
  const file = `public/locales/${lang}/translation.json`,
    bundle = JSON.parse(fs.readFileSync(file, "utf8"));
  for (const [key, values] of Object.entries(copy)) bundle["sets_v4_" + key] = values[index];
  fs.writeFileSync(file, JSON.stringify(bundle, null, 2) + "\n");
}
