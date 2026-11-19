import { startTransition, useState } from "react";
import { useTranslation } from "react-i18next";
import { Minus, Plus, Search, X } from "lucide-react";
import { useBuildStore, type SlotId } from "@/store/buildStore.ts";
import type { AppItem } from "@/data/loaders.ts";
import {
  STAT_META,
  runeIconFallback,
  runeIconUrl,
  runeKeyIconUrl,
  statIconUrl,
  transcendenceIconUrl,
} from "@/features/equipment/statDisplay.ts";
import { exoticOf, runeStat } from "@/engine/runes.ts";
import {
  FORGEABLE_SLOTS,
  TRANSCENDENCE,
  bestRank,
  lineWeight,
  rankOptions,
} from "@/features/equipment/transcendence.ts";
import {
  ALL_RUNES,
  DEFAULT_TRANSFORM_RATIO,
  RUNE_SECTIONS,
  TRANSFORM_ELEMENTS,
  TRANSFORM_RATIOS,
  canTransformWeapon,
  exoticFirst,
  quickValuesFor,
} from "@/features/equipment/runeRules.ts";
import { normalizeSearch } from "@/ui/normalize.ts";
import { Modal } from "@/ui";
import { playRune } from "@/lib/sound.ts";
import "./runes.css";

const ELEMENT_NAMES = {
  fire: "elem_fire",
  earth: "elem_earth",
  water: "elem_water",
  air: "elem_air",
} as const;
const EMPTY: Record<string, number> = {};

function RuneArt({
  stat,
  runeKey,
  exotic = false,
}: {
  stat: string;
  runeKey?: string;
  exotic?: boolean;
}) {
  const url = runeKey
    ? runeKeyIconUrl(runeKey)
    : (exotic && transcendenceIconUrl(stat)) || runeIconUrl(stat);
  if (url)
    return (
      <img
        className="rune-art"
        src={url}
        onError={runeIconFallback(runeKey ?? stat)}
        alt=""
      />
    );
  const icon = STAT_META[stat]?.icon;
  return icon ? (
    <img className="rune-art is-stat" src={statIconUrl(icon)} alt="" />
  ) : (
    <span className="rune-art" />
  );
}

/**
 * Magesmithing for one equipped piece: pick a rune on the left, set how much
 * and add it; what the piece carries is on the right, together with its
 * transcendence rune, the weapon transform and the smith's signature.
 */
export function RuneModal({
  slotId: slot,
  item,
  onClose,
}: {
  slotId: SlotId;
  item: AppItem;
  onClose: () => void;
}) {
  const { t } = useTranslation(),
    b = useBuildStore(),
    runes = b.runes[slot] ?? EMPTY,
    transform = b.weaponTransforms[slot] ?? null,
    signature = b.forjamagoNames[slot] ?? "";
  const forgeable = FORGEABLE_SLOTS.has(slot),
    exotic = exoticOf(runes),
    entries = Object.entries(runes)
      .filter(([, v]) => v > 0)
      .sort(exoticFirst),
    normal = entries.filter(([k]) => k !== exotic?.key),
    weapon = slot === "weapon",
    transformable = weapon && canTransformWeapon(item);
  const [mode, setMode] = useState<"normal" | "exotic">("normal"),
    [selected, setSelected] = useState(ALL_RUNES[0]),
    [amount, setAmount] = useState<number | "">(quickValuesFor(ALL_RUNES[0])[0]),
    [query, setQuery] = useState(""),
    [focus, setFocus] = useState<string | null>(exotic?.stat ?? null);
  const label = (stat: string) =>
    STAT_META[stat] ? t(STAT_META[stat].tKey) : stat;
  const n = amount === "" ? 0 : amount;
  function pick(stat: string) {
    setSelected(stat);
    setAmount(quickValuesFor(stat)[0]);
  }
  function add() {
    if (n <= 0) return;
    const value = (runes[selected] ?? 0) + n;
    startTransition(() => b.setRune(slot, selected, value));
    playRune();
  }
  function transcend(stat: string) {
    setFocus(stat);
    const best = bestRank(item, stat);
    if (best) { startTransition(() => b.setExotic(slot, stat, best.value)); playRune(true); }
  }
  const q = normalizeSearch(query.trim()),
    sections = RUNE_SECTIONS.map((section) => ({
      section,
      stats: q
        ? section.stats.filter(
            (stat) =>
              normalizeSearch(label(stat)).includes(q) ||
              normalizeSearch(stat).includes(q),
          )
        : section.stats,
    })).filter((s) => s.stats.length);
  const options = focus ? rankOptions(item, focus) : [];
  return (
    <Modal
      open
      onClose={onClose}
      title={t("magesmithy")}
      size="4xl"
      className="runes-dialog"
    >
      <div className="runes">
        <div className="runes-head">
          {item.image_url && <img src={item.image_url} alt="" />}
          <p>
            <b>{item.name}</b>
            <span>
              {t("runes_slot_level", { slot: t(`slot_${slot}`), level: item.level })}
            </span>
          </p>
          {forgeable && (
            <div className="view-switch-control" role="tablist" aria-label={t("runes_kind")}>
              <button
                role="tab"
                aria-selected={mode === "normal"}
                onClick={() => setMode("normal")}
              >
                {t("rune_tab_normal")} <span className="view-count">{normal.length}</span>
              </button>
              <button
                role="tab"
                aria-selected={mode === "exotic"}
                onClick={() => setMode("exotic")}
              >
                {t("runes_transcendence")}{" "}
                <span className="view-count">{exotic ? "1/1" : "0/1"}</span>
              </button>
            </div>
          )}
        </div>
        <div className="runes-layout">
          {mode === "normal" ? (
            <section className="runes-pick" aria-label={t("rune_picker")}>
              <label className="runes-search">
                <Search size={16} aria-hidden="true" />
                <input
                  type="search"
                  placeholder={t("runes_search_placeholder")}
                  aria-label={t("runes_search")}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
              {!sections.length && (
                <p className="runes-note">{t("runes_no_match", { query })}</p>
              )}
              {sections.map(({ section, stats }) => (
                <div key={section.labelKey} role="group" aria-label={t(section.labelKey)}>
                  <h3>{t(section.labelKey)}</h3>
                  <div className="runes-grid">
                    {stats.map((stat) => (
                      <button
                        key={stat}
                        aria-pressed={stat === selected}
                        className={(runes[stat] ?? 0) > 0 ? "has-rune" : ""}
                        onClick={() => pick(stat)}
                      >
                        <RuneArt stat={stat} />
                        <span>{label(stat)}</span>
                        {(runes[stat] ?? 0) > 0 && <b>+{runes[stat]}</b>}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </section>
          ) : (
            <section className="runes-pick" aria-label={t("runes_pick_transcendence")}>
              <p className="runes-note">{t("runes_transcendence_note")}</p>
              <div className="runes-grid">
                {TRANSCENDENCE.map(({ stat }) => {
                  const best = bestRank(item, stat);
                  return (
                    <button
                      key={stat}
                      aria-pressed={focus === stat}
                      className={
                        (exotic?.stat === stat ? "has-rune " : "") +
                        (best ? "" : "is-blocked")
                      }
                      onClick={() => transcend(stat)}
                    >
                      <RuneArt stat={stat} exotic />
                      <span>{label(stat)}</span>
                      <b>{best ? `+${best.value}` : "—"}</b>
                    </button>
                  );
                })}
              </div>
            </section>
          )}
          <section className="runes-piece" aria-label={t("runes_piece")}>
            {mode === "normal" ? (
              <div className="runes-add">
                <p>
                  <RuneArt stat={selected} />
                  <b>{label(selected)}</b>
                  {(runes[selected] ?? 0) > 0 && (
                    <span>{t("runes_carries", { value: runes[selected] })}</span>
                  )}
                </p>
                <div className="runes-amounts" role="group" aria-label={t("runes_amount")}>
                  {quickValuesFor(selected).map((v) => (
                    <button
                      key={v}
                      aria-pressed={amount === v}
                      onClick={() => setAmount(v)}
                    >
                      +{v}
                    </button>
                  ))}
                </div>
                <div className="runes-value">
                  <button
                    aria-label={t("runes_minus_one")}
                    onClick={() => setAmount((v) => Math.max(0, (v === "" ? 0 : v) - 1))}
                  >
                    <Minus size={15} />
                  </button>
                  <input
                    inputMode="numeric"
                    aria-label={t("runes_amount_input")}
                    value={amount}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, "").slice(0, 4);
                      setAmount(raw === "" ? "" : Number(raw));
                    }}
                  />
                  <button
                    aria-label={t("runes_plus_one")}
                    onClick={() => setAmount((v) => (v === "" ? 0 : v) + 1)}
                  >
                    <Plus size={15} />
                  </button>
                  <button className="site-primary" disabled={n <= 0} onClick={add}>
                    {t("runes_add", { n })}
                  </button>
                </div>
              </div>
            ) : (
              <div className="runes-add">
                {!focus ? (
                  <p className="runes-note">{t("runes_pick_hint")}</p>
                ) : (
                  <>
                    <p>
                      <RuneArt stat={focus} exotic />
                      <b>{label(focus)}</b>
                      <span>{t("runes_line_weight", { weight: lineWeight(item, focus) })}</span>
                    </p>
                    <div className="runes-ranks" role="group" aria-label={t("runes_rank_group")}>
                      {options.map((o) => (
                        <button
                          key={o.rank}
                          disabled={!o.allowed}
                          aria-pressed={exotic?.stat === focus && exotic.value === o.value}
                          title={
                            o.allowed
                              ? undefined
                              : t("runes_rank_blocked", {
                                  weight: lineWeight(item, focus),
                                  limit: o.limit,
                                })
                          }
                          onClick={() => {
                            startTransition(() => b.setExotic(slot, focus, o.value));
                            playRune(true);
                          }}
                        >
                          <b>+{o.value}</b>
                          <span>{t("rune_rank", { rank: o.rank })}</span>
                        </button>
                      ))}
                    </div>
                    {options.length > 0 && !options.some((o) => o.allowed) && (
                      <p className="runes-error">
                        {t("runes_no_rank", {
                          weight: lineWeight(item, focus),
                          limit: options[0].limit,
                        })}
                      </p>
                    )}
                  </>
                )}
              </div>
            )}
            <div className="runes-carried">
              <h3>
                {t("runes_on_piece")}
                {entries.length > 0 && (
                  <button
                    onClick={() => startTransition(() => b.clearAllRunes(slot))}
                  >
                    {t("runes_clear_all")}
                  </button>
                )}
              </h3>
              {forgeable && (
                <div className={"runes-exotic" + (exotic ? " is-set" : "")}>
                  {exotic ? (
                    <>
                      <RuneArt stat={exotic.stat} exotic />
                      <span>
                        <b>
                          +{exotic.value} {label(exotic.stat)}
                        </b>
                        <small>
                          {t("runes_transcendence")}
                          {(() => {
                            const rank = rankOptions(item, exotic.stat).find(
                              (o) => o.value === exotic.value,
                            )?.rank;
                            return rank ? " · " + t("runes_rank_lower", { rank }) : "";
                          })()}
                        </small>
                      </span>
                      <button
                        aria-label={t("runes_remove_transcendence")}
                        onClick={() => startTransition(() => b.clearExotic(slot))}
                      >
                        <X size={15} />
                      </button>
                    </>
                  ) : (
                    <small>{t("runes_no_transcendence")}</small>
                  )}
                </div>
              )}
              {normal.length ? (
                <ul>
                  {normal.map(([key, value]) => {
                    const stat = runeStat(key);
                    return (
                      <li key={key}>
                        <RuneArt stat={stat} runeKey={key} />
                        <span>{label(stat)}</span>
                        <b>+{value}</b>
                        <button
                          aria-label={t("runes_remove_rune", { stat: label(stat) })}
                          onClick={() => startTransition(() => b.clearRune(slot, key))}
                        >
                          <X size={15} />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="runes-note">{t("runes_no_normal")}</p>
              )}
            </div>
            {weapon && mode === "normal" && (
              <div className="runes-transform" role="group" aria-label={t("runes_transform")}>
                <h3>
                  {t("runes_transform")}
                  {transform && transformable && (
                    <button
                      aria-label={t("runes_remove_transform")}
                      onClick={() =>
                        startTransition(() => b.setWeaponTransform(slot, null))
                      }
                    >
                      {t("weapon_transform_clear")}
                    </button>
                  )}
                </h3>
                {!transformable ? (
                  <p className="runes-note">{t("runes_no_neutral")}</p>
                ) : (
                  <>
                    <div className="runes-elements">
                      {TRANSFORM_ELEMENTS.map((element) => (
                        <button
                          key={element}
                          className={element}
                          aria-label={t("runes_transform_to", { element: t(ELEMENT_NAMES[element]) })}
                          aria-pressed={transform?.element === element}
                          onClick={() =>
                            startTransition(() =>
                              b.setWeaponTransform(slot, {
                                element,
                                ratio: transform?.ratio ?? DEFAULT_TRANSFORM_RATIO,
                              }),
                            )
                          }
                        >
                          <img src={runeIconUrl(`transform_${element}`) ?? ""} alt="" />
                          {t(ELEMENT_NAMES[element])}
                        </button>
                      ))}
                    </div>
                    {transform && (
                      <div className="runes-ratios" role="group" aria-label={t("runes_ratio")}>
                        {TRANSFORM_RATIOS.map((ratio) => (
                          <button
                            key={ratio}
                            aria-label={t("runes_ratio_label", { ratio })}
                            aria-pressed={transform.ratio === ratio}
                            onClick={() =>
                              startTransition(() =>
                                b.setWeaponTransform(slot, {
                                  element: transform.element,
                                  ratio,
                                }),
                              )
                            }
                          >
                            {ratio} %
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
            <label className="runes-signature">
              {t("runes_signature")}
              <input
                value={signature}
                placeholder={t("forjamago_name_placeholder")}
                onChange={(e) => b.setForjamagoName(slot, e.target.value)}
              />
            </label>
          </section>
        </div>
      </div>
    </Modal>
  );
}
