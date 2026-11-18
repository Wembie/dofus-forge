import { useEffect, useState } from "react";
import i18n from "i18next";
import { useTranslation } from "react-i18next";
import {
  CharacterRenderer,
  type Entity,
} from "../../../src/lib/character/renderer";
import {
  loadAnimation,
  loadBone,
  loadLooks,
  loadMounts,
  loadPets,
  loadSkin,
  type BoneDef,
} from "../../../src/lib/character/assets";
import type { Animation } from "../../../src/lib/character/anim";
import { SlotIcon } from "../../../src/ui/SlotIcon";
import { recompute, type SlotId } from "../../../src/store/buildStore";
import { useBuildStore } from "../../../src/store/buildStore";
import { CLASS_DATA } from "../../../src/features/class-picker/classData";
import type { AppItem } from "../../../src/data/loaders";
import type { DofusClass } from "../../../src/engine/types";

/** Same positions as the workshop: a build card is the workshop in miniature. */
const LEFT: SlotId[] = ["hat", "cape", "weapon", "shield", "companion"];
const RIGHT: SlotId[] = ["amulet", "ring1", "ring2", "belt", "boots"];
const DOFUS: SlotId[] = [
  "dofus1",
  "dofus2",
  "dofus3",
  "dofus4",
  "dofus5",
  "dofus6",
];
/** Translation keys of the slot names in tile tooltips. */
const SLOT_NAMES: Record<string, string> = {
  hat: "slot_hat",
  cape: "slot_cape",
  weapon: "slot_weapon",
  shield: "slot_shield",
  companion: "cat_v4_slot_companion",
  amulet: "slot_amulet",
  ring1: "cat_v4_slot_ring1",
  ring2: "cat_v4_slot_ring2",
  belt: "slot_belt",
  boots: "slot_boots",
  sidekick: "cat_v4_slot_sidekick",
};

type Box = [number, number, number, number];
type Gender = "male" | "female";
interface Figure {
  def: BoneDef;
  anim: Animation;
  own?: Entity["own"];
}

/** World box of a standing character, shared with the animated stage. */
const FRAME_BOX: Box = [-64, -14, 128, 222];
const FIT_MARGIN = 0.14;
const STILL_PIXELS = 480;
/** Stage geometry in percent of its height, matching `.sheet-floor` and `.sheet-figure`. */
const FLOOR_LINE = 9.25;
const FIGURE_HEIGHT = 90;
const FACING = 1;

function pickAnim(def: BoneDef, anim: string) {
  if (def.anims[anim]) return anim;
  const [, motion, file] = /^(.*)_(\d)$/.exec(anim) ?? [anim, anim, "1"];
  const names = Object.keys(def.anims);
  const facing = (m: string) =>
    [`${m}_${file}`, `${m}_1`, `${m}_5`, `${m}_0`].find((n) => def.anims[n]) ??
    names.find((n) => n.startsWith(`${m}_`));
  return facing(motion) ?? facing("AnimStatique") ?? names[0] ?? anim;
}
async function loadFigure(bone: string, anim: string): Promise<Figure> {
  const def = await loadBone(bone);
  const [animation, own] = await Promise.all([
    loadAnimation(bone, pickAnim(def, anim)),
    def.graphics?.length ? loadSkin(`b${bone}`) : Promise.resolve(null),
  ]);
  return {
    def,
    anim: animation,
    own: own && def.graphics ? { layer: own, names: def.graphics } : undefined,
  };
}
function fitBox(measured: Box | null, mounted: boolean): Box {
  if (!measured) return FRAME_BOX;
  const [mx, my, mw, mh] = measured;
  const half = Math.max(Math.abs(mx), Math.abs(mx + mw)) * (1 + FIT_MARGIN);
  const bottom = Math.min(FRAME_BOX[1], my - (mh * FIT_MARGIN) / 2);
  const top = mounted
    ? my + mh * (1 + FIT_MARGIN / 2)
    : Math.max(FRAME_BOX[1] + FRAME_BOX[3], my + mh);
  const width = Math.max(FRAME_BOX[2], half * 2);
  return [-width / 2, bottom, width, top - bottom];
}

/**
 * Cards show the build's real character as a still image. One off-screen
 * canvas draws every figure in turn and is released once the queue drains, so
 * a list of builds never holds a WebGL context per card.
 */
let canvas: HTMLCanvasElement | null = null;
let renderer: CharacterRenderer | null = null;
let waiting = 0;
let chain: Promise<unknown> = Promise.resolve();
/** `ground`: how far up the image the floor line sits, as a fraction of its height. */
interface Still {
  url: string;
  ground: number;
}
const stills = new Map<string, Promise<Still>>();
const drawn = new Map<string, Still>();

function release() {
  renderer?.dispose();
  canvas
    ?.getContext("webgl")
    ?.getExtension("WEBGL_lose_context")
    ?.loseContext();
  canvas?.remove();
  renderer = null;
  canvas = null;
}
async function draw(
  breed: number,
  gender: Gender,
  companion: number,
): Promise<Still> {
  const [looks, player] = await Promise.all([
    loadLooks(),
    loadFigure("1-static", `AnimStatiqueExplo0_${FACING}`),
  ]);
  const look = looks[breed]?.[gender];
  if (!look) throw new Error(`no look for breed ${breed}`);
  const [body, head] = await Promise.all([
    loadSkin(look.body),
    loadSkin(look.head),
  ]);
  const lookScale = look.scale ?? 100;
  const entity = (f: Figure, rest: Partial<Entity>): Entity => ({
    frame: f.anim.frames[0] ?? [],
    nodes: f.def.nodes,
    skins: [],
    own: f.own,
    x: 0,
    y: 0,
    scale: 1,
    mirror: false,
    ...rest,
  });
  const dressed = { skins: [head, body], colors: look.colors };
  let scene = entity(player, dressed);
  let mounted = false;
  let accompanied = false;
  if (companion)
    try {
      const [pets, mounts] = await Promise.all([loadPets(), loadMounts()]);
      const mount = mounts[companion];
      const pet = pets[companion];
      if (mount) {
        const [figure, rider] = await Promise.all([
          loadFigure(mount.bone, `AnimStatique_${FACING}`),
          loadFigure("2", `AnimStatique_${FACING}`),
        ]);
        scene = entity(figure, {
          colors: mount.colors,
          scale: (mount.scale ?? 100) / lookScale,
          hooks: { carried_2_0: entity(rider, dressed) },
        });
        mounted = accompanied = true;
      } else if (pet) {
        const figure = await loadFigure(pet.bone, `AnimStatique_${FACING}`);
        scene.hooks = {
          carried_1_0: entity(figure, {
            scale: pet.scale / lookScale,
            colors: pet.colors,
          }),
        };
        accompanied = true;
      }
    } catch {
      /* The character is drawn alone when its companion has no model. */
    }
  if (!canvas || !renderer) {
    canvas = document.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");
    canvas.style.cssText =
      "position:fixed;left:-9999px;top:0;pointer-events:none";
    document.body.append(canvas);
    renderer = new CharacterRenderer(canvas);
  }
  const box = accompanied
    ? fitBox(renderer.measure([scene]), mounted)
    : FRAME_BOX;
  const height = STILL_PIXELS / (window.devicePixelRatio || 1);
  canvas.style.height = height + "px";
  canvas.style.width = (height * box[2]) / box[3] + "px";
  renderer.render([scene], box);
  return { url: canvas.toDataURL("image/png"), ground: -box[1] / box[3] };
}
function characterStill(breed: number, gender: Gender, companion: number) {
  const key = `${breed}:${gender}:${companion}`;
  let still = stills.get(key);
  if (!still) {
    waiting++;
    still = chain
      .then(() => draw(breed, gender, companion))
      .then((made) => {
        drawn.set(key, made);
        return made;
      })
      .finally(() => {
        if (!--waiting) release();
      });
    chain = still.catch(() => undefined);
    still.catch(() => stills.delete(key));
    stills.set(key, still);
  }
  return still;
}

export interface SheetBuild {
  name: string;
  classId: DofusClass;
  gender: Gender;
  level: number;
  tag: string;
  slots: Partial<Record<SlotId, number>>;
  /** Characteristic points spent, when the example needs them to read as its element. */
  allocated?: Partial<
    Record<(typeof ELEMENTS)[number][0] | "vitality", number>
  >;
}
const ELEMENTS = [
  ["strength", "earth", "elem_earth"],
  ["intelligence", "fire", "elem_fire"],
  ["chance", "water", "elem_water"],
  ["agility", "air", "elem_air"],
] as const;

/** PA, PM, range and leading element of an example, computed by the product's engine. */
export function sheetStats(build: SheetBuild) {
  const store = useBuildStore.getState();
  return recompute(
    build.classId,
    build.level,
    {
      vitality: 0,
      wisdom: 0,
      strength: 0,
      intelligence: 0,
      chance: 0,
      agility: 0,
      ...build.allocated,
    },
    {
      vitality: true,
      wisdom: true,
      strength: true,
      intelligence: true,
      chance: true,
      agility: true,
    },
    build.slots,
    store._equipment,
    store._sets,
    {},
  );
}
export function sheetVitals(build: SheetBuild) {
  const stats = sheetStats(build);
  if (!stats) return null;
  const [, element, labelKey] = ELEMENTS.reduce((best, next) =>
    stats[next[0]] > stats[best[0]] ? next : best,
  );
  return {
    ap: stats.ap,
    mp: stats.mp,
    range: stats.range,
    element,
    /** Read at render, so a stored result follows the page's language. */
    get label() {
      return i18n.t(labelKey);
    },
  };
}

export function BuildSheet({
  build,
  items,
}: {
  build: SheetBuild;
  items: Map<number, AppItem>;
}) {
  const { t } = useTranslation();
  const info = CLASS_DATA.find((c) => c.id === build.classId)!;
  const companion = build.slots.companion || 0;
  const key = `${info.breed}:${build.gender}:${companion}`;
  const [still, setStill] = useState(drawn.get(key));
  useEffect(() => {
    let live = true;
    setStill(drawn.get(key));
    characterStill(info.breed, build.gender, companion).then(
      (made) => live && setStill(made),
      () => undefined,
    );
    return () => {
      live = false;
    };
  }, [key]);
  const tile = (slot: SlotId, extra = "") => {
    const id = build.slots[slot];
    const item = id ? items.get(id) : undefined;
    const place = t(
      slot.startsWith("dofus") ? "cat_v4_slot_dofus" : SLOT_NAMES[slot],
    );
    return (
      <span
        key={slot}
        className={"sheet-tile" + (item ? "" : " is-empty") + extra}
        title={item ? item.name : t("cat_v4_tile_empty", { slot: place })}
      >
        {item?.image_url ? (
          <img src={item.image_url} alt="" loading="lazy" decoding="async" />
        ) : (
          <SlotIcon slot={slot} className="sheet-tile-icon" />
        )}
      </span>
    );
  };
  const worn = [...LEFT, ...RIGHT, ...DOFUS].filter((slot) =>
    items.has(build.slots[slot] || 0),
  ).length;
  return (
    <span className="build-sheet">
      <span className="sr-only">
        {t("cat_v4_slots_worn", { count: worn })}
      </span>
      <span className="sheet-column">{LEFT.map((slot) => tile(slot))}</span>
      <span className="sheet-stage">
        <span className="sheet-arch" />
        <span className="sheet-floor" />
        <img
          className={still ? "sheet-figure" : "sheet-figure is-portrait"}
          src={
            still?.url ||
            (build.gender === "female" ? info.imageFUrl : info.imageUrl)
          }
          style={
            still && {
              bottom: `${Math.max(0, FLOOR_LINE - still.ground * FIGURE_HEIGHT)}%`,
            }
          }
          alt=""
        />
        {items.has(build.slots.sidekick || 0) &&
          tile("sidekick", " sheet-sidekick")}
      </span>
      <span className="sheet-column">{RIGHT.map((slot) => tile(slot))}</span>
      <span className="sheet-dofus">{DOFUS.map((slot) => tile(slot))}</span>
    </span>
  );
}
