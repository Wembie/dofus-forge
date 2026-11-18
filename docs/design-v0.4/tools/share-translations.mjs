import fs from "node:fs";
// Copy for the share and export study, es / en / fr / pt.
const copy = {
  intro: [
    "El enlace conserva equipo, runas, características, nombre y pasivos. Abre la build en Dofus Forge.",
    "The link keeps gear, runes, characteristics, name and passives. It opens the build in Dofus Forge.",
    "Le lien conserve l’équipement, les runes, les caractéristiques, le nom et les passifs. Il ouvre l’équipement dans Dofus Forge.",
    "O link guarda equipamento, runas, características, nome e passivos. Abre o conjunto no Dofus Forge.",
  ],
  link_label: ["Enlace de tu build", "Your build’s link", "Lien de votre équipement", "Link do seu conjunto"],
  copy: ["Copiar enlace", "Copy link", "Copier le lien", "Copiar link"],
  copy_error: [
    "No se pudo copiar. Selecciona el enlace y cópialo a mano.",
    "Couldn’t copy. Select the link and copy it yourself.",
    "Impossible de copier. Sélectionnez le lien et copiez-le vous-même.",
    "Não foi possível copiar. Selecione o link e copie manualmente.",
  ],
  download: ["Descargar ficha", "Download sheet", "Télécharger la fiche", "Baixar ficha"],
  downloaded: ["Imagen preparada.", "Image ready.", "Image prête.", "Imagem pronta."],
  download_error: [
    "No se pudo generar la imagen. Puedes volver a intentarlo.",
    "The image couldn’t be made. You can try again.",
    "L’image n’a pas pu être générée. Vous pouvez réessayer.",
    "Não foi possível gerar a imagem. Você pode tentar de novo.",
  ],
  preview_show: ["Ver vista previa", "Show preview", "Afficher l’aperçu", "Ver prévia"],
  preview_hide: ["Ocultar vista previa", "Hide preview", "Masquer l’aperçu", "Ocultar prévia"],
  no_class: [
    "Elige una clase para compartir tu build.",
    "Pick a class to share your build.",
    "Choisissez une classe pour partager votre équipement.",
    "Escolha uma classe para compartilhar seu conjunto.",
  ],
  sheet_kicker: ["FICHA DE EQUIPO", "GEAR SHEET", "FICHE D’ÉQUIPEMENT", "FICHA DE EQUIPAMENTO"],
  empty_slot: ["Espacio vacío", "Empty slot", "Emplacement vide", "Espaço vazio"],
  none: ["Ninguno", "None", "Aucun", "Nenhum"],
  footer: [
    "Estadísticas de equipo · 73 campos · sin pasivos de combate activos",
    "Gear stats · 73 fields · no combat passives switched on",
    "Stats d’équipement · 73 champs · sans passifs de combat actifs",
    "Stats do equipamento · 73 campos · sem passivos de combate ativos",
  ],
};
for (const [index, lang] of ["es", "en", "fr", "pt"].entries()) {
  const file = `public/locales/${lang}/translation.json`,
    bundle = JSON.parse(fs.readFileSync(file, "utf8"));
  for (const [key, values] of Object.entries(copy)) bundle["share_v4_" + key] = values[index];
  fs.writeFileSync(file, JSON.stringify(bundle, null, 2) + "\n");
}
