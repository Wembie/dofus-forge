import { CharacterRenderer, type Entity } from '@/lib/character/renderer'
import { loadAnimation, loadBone, loadLooks, loadMounts, loadPets, loadSkin, type BoneDef } from '@/lib/character/assets'
import type { Animation } from '@/lib/character/anim'

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
export const drawn = new Map<string, Still>();

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
export function characterStill(breed: number, gender: Gender, companion: number) {
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

