import fs from "node:fs";
// Copy for the publish / update study, in es / en / fr / pt order.
const copy = {
  review: ["Revisión local de publicar", "Local publish review", "Revue locale de la publication", "Revisão local da publicação"],
  review_link: ["Build en el taller", "Build in the workshop", "Équipement dans l’atelier", "Conjunto na oficina"],
  review_response: ["Respuesta", "Response", "Réponse", "Resposta"],
  link_new: ["Nueva, sin publicar", "New, not published", "Nouveau, non publié", "Novo, não publicado"],
  link_update: ["Tuya, ya publicada", "Yours, already published", "Le vôtre, déjà publié", "Seu, já publicado"],
  link_remix: ["Remix de otra build", "Remix of another build", "Remix d’un autre équipement", "Remix de outro conjunto"],
  "link_foreign-edit": [
    "Enlace de edición de otra persona",
    "Someone else’s edit link",
    "Lien de modification d’une autre personne",
    "Link de edição de outra pessoa",
  ],
  response_normal: ["Funciona", "Works", "Fonctionne", "Funciona"],
  response_slow: ["Lenta", "Slow", "Lente", "Lenta"],
  response_error: ["Falla", "Fails", "Échoue", "Falha"],
  response_limit: ["Límite de builds", "Build limit reached", "Limite d’équipements", "Limite de conjuntos"],
  "response_tags-error": ["Etiquetas no disponibles", "Tags unavailable", "Étiquettes indisponibles", "Etiquetas indisponíveis"],
  signin_hint: [
    "Tu build sigue en el taller; no se pierde nada al iniciar sesión.",
    "Your build stays in the workshop; nothing is lost when you sign in.",
    "Votre équipement reste dans l’atelier ; rien n’est perdu en vous connectant.",
    "Seu conjunto continua na oficina; nada se perde ao entrar.",
  ],
  history_hint: [
    "La versión publicada ahora pasa a sus versiones anteriores.",
    "The version published now moves to its previous versions.",
    "La version publiée actuellement passe dans ses versions précédentes.",
    "A versão publicada agora vai para as versões anteriores.",
  ],
  prefill: [
    "Cargando el nombre, la visibilidad y las etiquetas publicadas…",
    "Loading the published name, visibility and tags…",
    "Chargement du nom, de la visibilité et des étiquettes publiés…",
    "Carregando o nome, a visibilidade e as etiquetas publicados…",
  ],
  tags_hint: [
    "Elige hasta {{max}}. Ayudan a encontrarla en Explorar.",
    "Pick up to {{max}}. They help people find it in Explore.",
    "Choisissez-en jusqu’à {{max}}. Elles aident à le trouver dans Explorer.",
    "Escolha até {{max}}. Elas ajudam a encontrá-lo em Explorar.",
  ],
  tags_full: [
    "Ya elegiste {{max}}: quita una para elegir otra.",
    "You picked {{max}}: remove one to choose another.",
    "Vous en avez choisi {{max}} : retirez-en une pour en choisir une autre.",
    "Você escolheu {{max}}: tire uma para escolher outra.",
  ],
  tags_error: [
    "No pudimos cargar las etiquetas. Puedes publicar sin ellas o reintentar.",
    "We couldn’t load the tags. You can publish without them or try again.",
    "Impossible de charger les étiquettes. Vous pouvez publier sans elles ou réessayer.",
    "Não foi possível carregar as etiquetas. Você pode publicar sem elas ou tentar de novo.",
  ],
  limit: [
    "Llegaste al límite de 50 builds por cuenta. Elimina una desde Mis builds para publicar otra.",
    "You’ve reached the limit of 50 builds per account. Delete one from My builds to publish another.",
    "Vous avez atteint la limite de 50 équipements par compte. Supprimez-en un depuis Mes équipements pour en publier un autre.",
    "Você atingiu o limite de 50 conjuntos por conta. Exclua um em Meus conjuntos para publicar outro.",
  ],
  go_library: ["Ir a Mis builds", "Go to My builds", "Aller à Mes équipements", "Ir para Meus conjuntos"],
  publishing: ["Publicando…", "Publishing…", "Publication…", "Publicando…"],
  updating: ["Actualizando…", "Updating…", "Mise à jour…", "Atualizando…"],
};
for (const [index, lang] of ["es", "en", "fr", "pt"].entries()) {
  const file = `public/locales/${lang}/translation.json`,
    bundle = JSON.parse(fs.readFileSync(file, "utf8"));
  for (const [key, values] of Object.entries(copy))
    bundle["publish_v4_" + key] = values[index];
  fs.writeFileSync(file, JSON.stringify(bundle, null, 2) + "\n");
}
