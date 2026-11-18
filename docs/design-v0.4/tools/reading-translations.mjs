import fs from "node:fs";
// Copy for the reading pages study (the long texts reuse production keys), es / en / fr / pt.
const copy = {
  kicker_guide: ["CUADERNO DEL TALLER", "WORKSHOP NOTEBOOK", "CARNET DE L’ATELIER", "CADERNO DA OFICINA"],
  kicker_about: ["EL PROYECTO", "THE PROJECT", "LE PROJET", "O PROJETO"],
  kicker_legal: ["INFORMACIÓN LEGAL", "LEGAL INFORMATION", "INFORMATIONS LÉGALES", "INFORMAÇÕES LEGAIS"],
  kicker_class: ["GUÍA DE CLASE", "CLASS GUIDE", "GUIDE DE CLASSE", "GUIA DE CLASSE"],
  about_project: ["El proyecto", "The project", "Le projet", "O projeto"],
  other_classes: ["Otras clases", "Other classes", "Autres classes", "Outras classes"],
};
for (const [index, lang] of ["es", "en", "fr", "pt"].entries()) {
  const file = `public/locales/${lang}/translation.json`,
    bundle = JSON.parse(fs.readFileSync(file, "utf8"));
  for (const [key, values] of Object.entries(copy)) bundle["rd_v4_" + key] = values[index];
  fs.writeFileSync(file, JSON.stringify(bundle, null, 2) + "\n");
}
