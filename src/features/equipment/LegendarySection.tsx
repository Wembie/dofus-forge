import { useTranslation } from "react-i18next";
import { useBuildStore } from "@/store/buildStore.ts";
import {
  LEGENDARY_BONUSES, LEGENDARY_POOLS,
  type LegendaryBonus, type LegendaryPool,
} from "@/engine/petLegendary.ts";
import { controlMax, type PassiveBonus } from "@/engine/passives.ts";
import { CROQUETTE_ICON, STAT_FIELDS, statIconUrl } from "@/features/equipment/statDisplay.ts";
import { ControlRow } from "@/features/passives/PassivesPanel.tsx";

const BASE = import.meta.env.BASE_URL;

const POOL_NAME_KEY: Record<LegendaryPool, string> = {
  bakushana:   "legendary_pool_bakushana",
  poukachi:    "legendary_pool_poukachi",
  kwakarticho: "legendary_pool_kwakarticho",
  magicrabe:   "legendary_pool_magicrabe",
};

// The "Légende animale" ingredient, one real icon per family.
const POOL_ICON: Record<LegendaryPool, string> = {
  bakushana:   `${BASE}data/pets-legendary/bakushana.webp`,
  poukachi:    `${BASE}data/pets-legendary/poukachi.webp`,
  kwakarticho: `${BASE}data/pets-legendary/kwakarticho.webp`,
  magicrabe:   `${BASE}data/pets-legendary/magicrabe.webp`,
};

function sampleBonus(bonus: LegendaryBonus): PassiveBonus | null {
  if (!bonus.control) return null
  return bonus.control.kind === "stacks" ? bonus.control.perStack : bonus.control.options[0].bonus
}

/** The stat it actually modifies for a modeled bonus, or the croquette's own
 * icon (same art for every flavor in-game) for a text-only one. */
function BonusIcon({ bonus }: { bonus: LegendaryBonus }) {
  const stat = sampleBonus(bonus);
  const statKey = stat && (Object.keys(stat)[0] as keyof typeof STAT_FIELDS);
  const icon = statKey && STAT_FIELDS[statKey]?.icon;
  return <img className="rune-art is-stat" src={icon ? statIconUrl(icon) : CROQUETTE_ICON} alt="" />;
}

/**
 * Once a pet/mount is legendary, the player crafts one of the 32 "Croquette
 * infusée" and feeds it — any of them, not just its own namesake — which
 * always grants that croquette's fixed bonus; a later one replaces it. This
 * is the planner picking the same thing, same as picking a rune the piece
 * already carries.
 */
export function LegendarySection() {
  const { t } = useTranslation();
  const picked = useBuildStore((s) => s.legendaryBonus);
  const setLegendaryBonus = useBuildStore((s) => s.setLegendaryBonus);
  const clearLegendaryBonus = useBuildStore((s) => s.clearLegendaryBonus);
  const bonus = picked ? LEGENDARY_BONUSES.find((b) => b.id === picked.id) : undefined;

  return (
    <div className="runes-layout">
      <section className="runes-pick" aria-label={t("legendary_pick")}>
        <p className="runes-note">{t("legendary_note")}</p>
        {LEGENDARY_POOLS.map((pool) => (
          <div key={pool} role="group" aria-label={t(POOL_NAME_KEY[pool])}>
            <h3>
              <span className="legendary-pool-name">
                <img className="rune-art" src={POOL_ICON[pool]} alt="" />
                {t(POOL_NAME_KEY[pool])}
              </span>
            </h3>
            <div className="runes-grid">
              {LEGENDARY_BONUSES.filter((b) => b.pool === pool).map((b: LegendaryBonus) => (
                <button
                  key={b.id}
                  aria-pressed={picked?.id === b.id}
                  onClick={() => setLegendaryBonus(b.id, b.control ? 0 : 1)}
                >
                  <BonusIcon bonus={b} />
                  <span>{t(b.nameKey)}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </section>
      <section className="runes-piece" aria-label={t("legendary_detail")}>
        <div className="runes-add">
          {!bonus ? (
            <p className="runes-note">{t("legendary_pick_hint")}</p>
          ) : (
            <>
              <p>
                <BonusIcon bonus={bonus} />
                <b>{t(bonus.nameKey)}</b>
              </p>
              <p className="passive-plain">{t(bonus.textKey)}</p>
              {bonus.control && (
                <ControlRow
                  control={bonus.control}
                  value={picked!.value}
                  room={controlMax(bonus.control)}
                  onChange={(_, v) => setLegendaryBonus(bonus.id, v)}
                />
              )}
              <div className="legendary-actions">
                <button type="button" className="site-primary" onClick={clearLegendaryBonus}>
                  {t("legendary_clear")}
                </button>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
