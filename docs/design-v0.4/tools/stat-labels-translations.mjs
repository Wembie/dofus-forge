import fs from "node:fs";
// The 73 sheet labels (stat_v4_<StatBlock key>). Spanish comes verbatim from prototype/stat-labels.json.
const es = JSON.parse(fs.readFileSync("docs/design-v0.4/prototype/stat-labels.json", "utf8"));
const EL = {
  en: { neutral: "neutral", earth: "earth", fire: "fire", water: "water", air: "air" },
  fr: { neutral: "Neutre", earth: "Terre", fire: "Feu", water: "Eau", air: "Air" },
  pt: { neutral: "neutro", earth: "terra", fire: "fogo", water: "água", air: "ar" },
};
const ELEMENTS = ["neutral", "earth", "fire", "water", "air"];
const fixed = {
  en: { ap: "AP", mp: "MP", range: "Range", vitality: "Vitality", wisdom: "Wisdom", strength: "Strength", intelligence: "Intelligence", chance: "Chance", agility: "Agility", maxHp: "Health points", power: "Power", damage: "Damage", bestElemSteal: "Best element steal", bestElemDamage: "Best element damage", apRaw: "Raw AP", mpRaw: "Raw MP", rangeRaw: "Raw range", critChance: "Critical %", critDamage: "Critical damage", critResistance: "Critical resistance", meleeDamagePercent: "Melee damage %", rangedDamagePercent: "Ranged damage %", spellDamagePercent: "Spell damage %", weaponDamagePercent: "Weapon damage %", finalDamagePercent: "Final damage %", targetVulnerabilityPercent: "Vulnerability %", meleeResistPercent: "Melee res. %", rangedResistPercent: "Ranged res. %", trapDamage: "Trap damage", trapPower: "Trap power", pushbackDamage: "Pushback damage", pushbackResist: "Pushback resistance", reflectedDamage: "Reflected damage", heals: "Heals", initiative: "Initiative", lock: "Lock", dodge: "Dodge", prospecting: "Prospecting", summons: "Summons", pods: "Pods", apReduction: "AP reduction", mpReduction: "MP reduction", apParry: "AP parry", mpParry: "MP parry", mpSteal: "MP steal", unknownStats: "Other effects", pointsBudget: "Points budget", pointsSpent: "Points spent" },
  fr: { ap: "PA", mp: "PM", range: "Portée", vitality: "Vitalité", wisdom: "Sagesse", strength: "Force", intelligence: "Intelligence", chance: "Chance", agility: "Agilité", maxHp: "Points de vie", power: "Puissance", damage: "Dommages", bestElemSteal: "Vol meilleur élément", bestElemDamage: "Dommages meilleur élément", apRaw: "PA brut", mpRaw: "PM brut", rangeRaw: "Portée brute", critChance: "Critique %", critDamage: "Dommages critiques", critResistance: "Résistance critique", meleeDamagePercent: "Dommages mêlée %", rangedDamagePercent: "Dommages distance %", spellDamagePercent: "Dommages sorts %", weaponDamagePercent: "Dommages armes %", finalDamagePercent: "Dommages finaux %", targetVulnerabilityPercent: "Vulnérabilité %", meleeResistPercent: "Rés. mêlée %", rangedResistPercent: "Rés. distance %", trapDamage: "Dommages pièges", trapPower: "Puissance pièges", pushbackDamage: "Dommages de poussée", pushbackResist: "Résistance poussée", reflectedDamage: "Dommages renvoyés", heals: "Soins", initiative: "Initiative", lock: "Tacle", dodge: "Fuite", prospecting: "Prospection", summons: "Invocations", pods: "Pods", apReduction: "Retrait PA", mpReduction: "Retrait PM", apParry: "Esquive PA", mpParry: "Esquive PM", mpSteal: "Vol de PM", unknownStats: "Autres effets", pointsBudget: "Budget de points", pointsSpent: "Points dépensés" },
  pt: { ap: "PA", mp: "PM", range: "Alcance", vitality: "Vitalidade", wisdom: "Sabedoria", strength: "Força", intelligence: "Inteligência", chance: "Sorte", agility: "Agilidade", maxHp: "Pontos de vida", power: "Potência", damage: "Dano", bestElemSteal: "Roubo do melhor elemento", bestElemDamage: "Dano do melhor elemento", apRaw: "PA bruto", mpRaw: "PM bruto", rangeRaw: "Alcance bruto", critChance: "Crítico %", critDamage: "Dano crítico", critResistance: "Resistência crítica", meleeDamagePercent: "Dano corpo a corpo %", rangedDamagePercent: "Dano à distância %", spellDamagePercent: "Dano de feitiços %", weaponDamagePercent: "Dano de armas %", finalDamagePercent: "Dano final %", targetVulnerabilityPercent: "Vulnerabilidade %", meleeResistPercent: "Res. corpo a corpo %", rangedResistPercent: "Res. à distância %", trapDamage: "Dano de armadilhas", trapPower: "Potência de armadilhas", pushbackDamage: "Dano de empurrão", pushbackResist: "Resistência a empurrão", reflectedDamage: "Dano refletido", heals: "Curas", initiative: "Iniciativa", lock: "Bloqueio", dodge: "Esquiva", prospecting: "Prospecção", summons: "Invocações", pods: "Pods", apReduction: "Remoção de PA", mpReduction: "Remoção de PM", apParry: "Esquiva de PA", mpParry: "Esquiva de PM", mpSteal: "Roubo de PM", unknownStats: "Outros efeitos", pointsBudget: "Orçamento de pontos", pointsSpent: "Pontos usados" },
};
const pattern = {
  en: { Damage: (e) => `${cap(e)} damage`, Steal: (e) => `${cap(e)} steal`, ResFixed: (e) => `${cap(e)} fixed res.`, ResPercent: (e) => `${cap(e)} res. %`, ResPercentRaw: (e) => `Raw ${e} res. %` },
  fr: { Damage: (e) => `Dommages ${e}`, Steal: (e) => `Vol ${e}`, ResFixed: (e) => `Rés. fixe ${e}`, ResPercent: (e) => `Rés. % ${e}`, ResPercentRaw: (e) => `Rés. % ${e} brute` },
  pt: { Damage: (e) => `Dano ${e}`, Steal: (e) => `Roubo ${e}`, ResFixed: (e) => `Res. fixa ${e}`, ResPercent: (e) => `Res. % ${e}`, ResPercentRaw: (e) => `Res. % ${e} bruta` },
};
function cap(s) { return s[0].toUpperCase() + s.slice(1); }
function label(lang, key) {
  if (fixed[lang][key]) return fixed[lang][key];
  for (const el of ELEMENTS)
    for (const suffix of ["ResPercentRaw", "ResPercent", "ResFixed", "Damage", "Steal"])
      if (key === el + suffix) return pattern[lang][suffix](EL[lang][el]);
  throw new Error(`No ${lang} label for ${key}`);
}
for (const lang of ["es", "en", "fr", "pt"]) {
  const file = `public/locales/${lang}/translation.json`,
    bundle = JSON.parse(fs.readFileSync(file, "utf8"));
  for (const key of Object.keys(es)) bundle["stat_v4_" + key] = lang === "es" ? es[key] : label(lang, key);
  fs.writeFileSync(file, JSON.stringify(bundle, null, 2) + "\n");
}
console.log(Object.keys(es).length, "labels");
