import fs from "node:fs";
const copy = {
  label: [
    "Actividad de la build",
    "Build activity",
    "Activité de l’équipement",
    "Atividade do conjunto",
  ],
  rating: [
    "Valoración: {{rating}} de 5.",
    "Rating: {{rating}} out of 5.",
    "Note : {{rating}} sur 5.",
    "Avaliação: {{rating}} de 5.",
  ],
  votes_one: [
    "{{formatted}} valoración",
    "{{formatted}} rating",
    "{{formatted}} évaluation",
    "{{formatted}} avaliação",
  ],
  votes_other: [
    "{{formatted}} valoraciones",
    "{{formatted}} ratings",
    "{{formatted}} évaluations",
    "{{formatted}} avaliações",
  ],
  unrated: [
    "Sin valoraciones",
    "No ratings yet",
    "Pas encore de note",
    "Sem avaliações",
  ],
  published: ["Publicada el", "Published on", "Publié le", "Publicado em"],
  likes: ["Me gusta", "Likes", "J’aime", "Curtidas"],
  views: ["Vistas", "Views", "Vues", "Visualizações"],
  comments: ["Comentarios", "Comments", "Commentaires", "Comentários"],
  exact: [
    "{{label}}: {{value}}",
    "{{label}}: {{value}}",
    "{{label}} : {{value}}",
    "{{label}}: {{value}}",
  ],
};
for (const [index, lang] of ["es", "en", "fr", "pt"].entries()) {
  const file = `public/locales/${lang}/translation.json`,
    bundle = JSON.parse(fs.readFileSync(file, "utf8"));
  for (const [key, values] of Object.entries(copy))
    bundle["build_activity_" + key] = values[index];
  fs.writeFileSync(file, JSON.stringify(bundle, null, 2) + "\n");
}
