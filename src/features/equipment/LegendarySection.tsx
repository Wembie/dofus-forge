import { useTranslation } from "react-i18next";
import { useBuildStore } from "@/store/buildStore.ts";
import {
  LEGENDARY_BONUSES, LEGENDARY_POOLS, POOL_ODDS,
  type LegendaryBonus, type LegendaryPool,
} from "@/engine/petLegendary.ts";
import { controlMax } from "@/engine/passives.ts";
import { ControlRow } from "@/features/passives/PassivesPanel.tsx";

const POOL_NAME_KEY: Record<LegendaryPool, string> = {
  bakushana:   "legendary_pool_bakushana",
  poukachi:    "legendary_pool_poukachi",
  kwakarticho: "legendary_pool_kwakarticho",
  magicrabe:   "legendary_pool_magicrabe",
};

/**
 * A pet/mount's legendary bonus is random (a Quintessence rolls one of 31
 * possible effects, four pools of fixed odds) — the player can't pick which
 * one their companion gets in-game, only tell the planner which it landed
 * on, same as picking a rune the piece already carries.
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
              {t(POOL_NAME_KEY[pool])}
              <span className="view-count">{Math.round(POOL_ODDS[pool] * 1000) / 10}%</span>
            </h3>
            <div className="runes-grid">
              {LEGENDARY_BONUSES.filter((b) => b.pool === pool).map((b: LegendaryBonus) => (
                <button
                  key={b.id}
                  aria-pressed={picked?.id === b.id}
                  onClick={() => setLegendaryBonus(b.id, b.control ? 0 : 1)}
                >
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
              <div className="runes-value">
                <button className="site-primary" onClick={clearLegendaryBonus}>
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
