import { type ComponentType } from "react";
import { useTranslation } from "react-i18next";
import { Heart, Repeat2, Shield, Sparkles, Users } from "lucide-react";
import { useBuildStore } from "@/store/buildStore.ts";
import {
  LEGENDARY_BONUSES, LEGENDARY_POOLS,
  type LegendaryBonus, type LegendaryPool,
} from "@/engine/petLegendary.ts";
import { controlMax, type PassiveBonus } from "@/engine/passives.ts";
import { STAT_FIELDS, statIconUrl } from "@/features/equipment/statDisplay.ts";
import { ControlRow } from "@/features/passives/PassivesPanel.tsx";

const POOL_NAME_KEY: Record<LegendaryPool, string> = {
  bakushana:   "legendary_pool_bakushana",
  poukachi:    "legendary_pool_poukachi",
  kwakarticho: "legendary_pool_kwakarticho",
  magicrabe:   "legendary_pool_magicrabe",
};

// Text-only bonuses (no modeled stat) grouped by what they actually do in-game,
// so the picker still reads at a glance instead of every row looking the same.
const TEXT_ICON: Record<string, ComponentType<{ size?: number; className?: string; "aria-hidden"?: boolean }>> = {
  "bakushana.prespic":    Repeat2,  // reflects a hit back at the attacker
  "bakushana.dragoeuf":   Shield,
  "bakushana.tofoune":    Users,    // MP to nearby allies
  "bakushana.boursoin":   Heart,    // final-heal boost
  "bakushana.champa":     Users,    // AP to nearby allies
  "bakushana.pandore":    Users,    // MP to summons
  "bakushana.scorbute":   Repeat2,  // self damage, then shared with neighbors
  "poukachi.moskito":     Heart,    // lifesteal
  "poukachi.trool":       Sparkles,
  "poukachi.wabbit":      Sparkles,
  "magicrabe.abraknyde":  Shield,
  "magicrabe.craqueleur": Users,    // resistance to allies
  "magicrabe.krokille":   Shield,
  "magicrabe.bwak":       Users,    // ranged damage to allies
  "magicrabe.gloutoblop": Heart,
  "magicrabe.boufette":   Users,    // melee damage to allies
  "magicrabe.chafer":     Shield,
  "magicrabe.scarafeuille": Shield,
  "magicrabe.timansot":   Heart,
  "magicrabe.domoizelle": Users,    // life transfer to allies
};

function sampleBonus(bonus: LegendaryBonus): PassiveBonus | null {
  if (!bonus.control) return null
  return bonus.control.kind === "stacks" ? bonus.control.perStack : bonus.control.options[0].bonus
}

/** A plain icon per bonus: the stat it actually modifies, or a themed one for
 * the text-only effects (shields, heals, ally buffs) — never a per-species
 * photo, since the game data has no reliable art for these 33 by name. */
function BonusIcon({ bonus }: { bonus: LegendaryBonus }) {
  const stat = sampleBonus(bonus);
  const statKey = stat && (Object.keys(stat)[0] as keyof typeof STAT_FIELDS);
  const icon = statKey && STAT_FIELDS[statKey]?.icon;
  if (icon) return <img className="rune-art is-stat" src={statIconUrl(icon)} alt="" />;
  const Icon = TEXT_ICON[bonus.id] ?? Sparkles;
  return <Icon size={18} className="rune-art is-stat" aria-hidden />;
}

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
            <h3>{t(POOL_NAME_KEY[pool])}</h3>
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
