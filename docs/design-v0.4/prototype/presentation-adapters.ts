/** Study-only semantic corrections. These must become explicit component edits in the production migration. */
export function adaptPresentation(code: string, id: string) {
  const file = id.replaceAll("\\", "/");
  if (file.endsWith("/features/passives/PassivesPanel.tsx"))
    return code.replace(
      "aria-label={active ? t('passives_on')",
      "role=\"img\" aria-label={active ? t('passives_on')",
    );
  if (file.endsWith("/features/equipment/SetsCatalog.tsx"))
    return code
      .replace(/role="button"\s+tabIndex=\{0\}/, 'role="group"')
      .replace("onClick={() => onEquipAll(entry)}", "")
      .replace(
        "onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onEquipAll(entry) } }}",
        "",
      )
      .replace(
        "{hovered && <ItemHoverTooltip",
        "<button className=\"set-equip-action\" onClick={() => onEquipAll(entry)}>{t('equip_all')}</button>\n      {hovered && <ItemHoverTooltip",
      );
  return null;
}
