import fs from "node:fs";
// Copy for the shared shell study (header, notifications, settings, menu, footer), es / en / fr / pt.
const copy = {
  workshop: ["Taller", "Workshop", "Atelier", "Oficina"],
  more: ["Más", "More", "Plus", "Mais"],
  mobile_nav: ["Navegación móvil", "Mobile navigation", "Navigation mobile", "Navegação móvel"],
  notif_empty_hint: [
    "Te avisaremos cuando alguien valore, comente, haga un remix de tus builds o empiece a seguirte.",
    "We’ll let you know when someone rates, comments on or remixes your builds, or follows you.",
    "Nous vous préviendrons quand quelqu’un notera, commentera ou remixera vos équipements, ou vous suivra.",
    "Avisaremos quando alguém avaliar, comentar ou fizer remix dos seus conjuntos, ou começar a seguir você.",
  ],
  unread_item: ["sin leer", "unread", "non lu", "não lida"],
  account_menu: ["Cuenta de {{name}}", "{{name}}’s account", "Compte de {{name}}", "Conta de {{name}}"],
  signed_in_as: ["Sesión iniciada", "Signed in", "Connecté", "Sessão iniciada"],
  public_profile: ["Perfil público", "Public profile", "Profil public", "Perfil público"],
  settings_general: ["General", "General", "Général", "Geral"],
  settings_motion: ["Movimiento y efectos", "Motion and effects", "Mouvement et effets", "Movimento e efeitos"],
  settings_layout: ["Taller", "Workshop", "Atelier", "Oficina"],
  theme_dark: ["Tinta", "Ink", "Encre", "Tinta"],
  theme_light: ["Mineral", "Mineral", "Minéral", "Mineral"],
  sound_on: ["Sonidos del taller activados", "Workshop sounds on", "Sons de l’atelier activés", "Sons da oficina ativados"],
  sound_off: ["Sonidos del taller silenciados", "Workshop sounds muted", "Sons de l’atelier coupés", "Sons da oficina silenciados"],
  settings_saved: [
    "Se guardan en este dispositivo y se aplican al momento.",
    "Saved on this device and applied right away.",
    "Enregistrées sur cet appareil et appliquées immédiatement.",
    "Salvas neste dispositivo e aplicadas na hora.",
  ],
  nav_title: ["Ir a", "Go to", "Aller à", "Ir para"],
  nav_build: ["Construir y explorar", "Build and explore", "Construire et explorer", "Construir e explorar"],
  nav_learn: ["Aprender", "Learn", "Apprendre", "Aprender"],
  nav_admin: ["Administración", "Administration", "Administration", "Administração"],
  update_hint: [
    "Recarga para usarla; tu build del taller se conserva.",
    "Reload to use it; your workshop build is kept.",
    "Rechargez pour l’utiliser ; votre équipement de l’atelier est conservé.",
    "Recarregue para usá-la; seu conjunto da oficina é mantido.",
  ],
  review_notifications: ["Notificaciones", "Notifications", "Notifications", "Notificações"],
  review_update: ["Hay una versión nueva", "A new version is out", "Une nouvelle version est disponible", "Há uma versão nova"],
  scene_normal: ["Con actividad", "With activity", "Avec activité", "Com atividade"],
  scene_empty: ["Sin notificaciones", "No notifications", "Aucune notification", "Sem notificações"],
  scene_slow: ["Cargando", "Loading", "Chargement", "Carregando"],
  scene_many: ["Muchas sin leer", "Many unread", "Beaucoup non lues", "Muitas não lidas"],
  footer_tagline: [
    "Planifica, optimiza y comparte builds de Dofus 3.",
    "Plan, optimise and share Dofus 3 builds.",
    "Planifiez, optimisez et partagez des équipements Dofus 3.",
    "Planeje, otimize e compartilhe conjuntos de Dofus 3.",
  ],
  footer_product: ["Dofus Forge", "Dofus Forge", "Dofus Forge", "Dofus Forge"],
  footer_learn: ["Aprender", "Learn", "Apprendre", "Aprender"],
  footer_credits: ["Créditos", "Credits", "Crédits", "Créditos"],
};
for (const [index, lang] of ["es", "en", "fr", "pt"].entries()) {
  const file = `public/locales/${lang}/translation.json`,
    bundle = JSON.parse(fs.readFileSync(file, "utf8"));
  for (const [key, values] of Object.entries(copy)) bundle["shell_v4_" + key] = values[index];
  fs.writeFileSync(file, JSON.stringify(bundle, null, 2) + "\n");
}
