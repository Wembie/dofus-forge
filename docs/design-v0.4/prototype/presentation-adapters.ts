/** Study-only semantic corrections. These must become explicit component edits in the production migration. */
export function adaptPresentation(code: string, id: string) {
  const file = id.replaceAll("\\", "/");
  if (file.endsWith("/features/passives/PassivesPanel.tsx"))
    return code.replace(
      "aria-label={active ? t('passives_on')",
      "role=\"img\" aria-label={active ? t('passives_on')",
    );
  // The study has its own damage table ("Simular un combate"); the embedded simulator would duplicate it.
  if (file.endsWith("/features/spells/SpellsPanel.tsx"))
    return code.replace("<PvpArena />", "");
  return null;
}
