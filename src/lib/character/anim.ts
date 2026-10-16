/**
 * Animation timeline decoder.
 *
 * Layout (little endian):
 *   u16 frameCount, u16 maxNodes, u16 labelCount, u16 version
 *   labels: u16 frame, u8 length, chars  — then padded to 4 bytes
 *   u32 frameOffset[frameCount]
 *   frame: records until the next offset, listed in draw order
 *     u16 slot, u16 flags
 *     flags & 0x21 → i16 clipDepth, u16 node, u16, u16
 *     flags & 0x04 → u8 r, g, b, a multiplier (127 = 1.0)
 *     flags & 0x08 → u8 r, g, b, a offset (255 = 1.0)
 *     flags & 0x10 → f32 a, b, tx, c, d, ty
 *   Fields a record omits keep the value its slot had in the previous frame.
 */

export interface Instance {
  node: number
  /** x' = m[0]x + m[1]y + m[2], y' = m[3]x + m[4]y + m[5] */
  m: Float32Array
  /** RGBA multiplier */
  color: [number, number, number, number]
  /** RGBA offset added after the multiplier */
  add: [number, number, number, number]
}

export interface Animation {
  frames: Instance[][]
  labels: { frame: number; name: string }[]
}

const WHITE: [number, number, number, number] = [1, 1, 1, 1]
const NONE: [number, number, number, number] = [0, 0, 0, 0]

export function decodeAnimation(buf: ArrayBuffer): Animation {
  const view = new DataView(buf)
  const frameCount = view.getUint16(0, true)
  const labelCount = view.getUint16(4, true)

  let p = 8
  const labels: Animation['labels'] = []
  for (let i = 0; i < labelCount; i++) {
    const frame = view.getUint16(p, true)
    const len = view.getUint8(p + 2)
    const name = String.fromCharCode(...new Uint8Array(buf, p + 3, len))
    labels.push({ frame, name })
    p += 3 + len
  }
  p = (p + 3) & ~3

  const offsets: number[] = []
  for (let i = 0; i < frameCount; i++) offsets.push(view.getUint32(p + i * 4, true))
  offsets.push(buf.byteLength)

  const slots = new Map<number, Instance>()
  const frames: Instance[][] = []
  for (let f = 0; f < frameCount; f++) {
    let q = offsets[f]
    const end = offsets[f + 1]
    const frame: Instance[] = []
    while (q < end) {
      const slot = view.getUint16(q, true)
      const flags = view.getUint16(q + 2, true)
      q += 4
      const prev = slots.get(slot)
      let node = prev?.node ?? 0xffff
      let m = prev?.m ?? new Float32Array([1, 0, 0, 0, 1, 0])
      let color = prev?.color ?? WHITE
      let add = prev?.add ?? NONE
      if (flags & 0x21) {
        node = view.getUint16(q + 2, true)
        q += 8
      }
      if (flags & 0x04) {
        color = [view.getUint8(q) / 127, view.getUint8(q + 1) / 127, view.getUint8(q + 2) / 127, view.getUint8(q + 3) / 127]
        q += 4
      }
      if (flags & 0x08) {
        add = [view.getUint8(q) / 255, view.getUint8(q + 1) / 255, view.getUint8(q + 2) / 255, view.getUint8(q + 3) / 255]
        q += 4
      }
      if (flags & 0x10) {
        m = new Float32Array(6)
        for (let k = 0; k < 6; k++) m[k] = view.getFloat32(q + k * 4, true)
        q += 24
      }
      const inst: Instance = { node, m, color, add }
      slots.set(slot, inst)
      if (node !== 0xffff) frame.push(inst)
    }
    frames.push(frame)
  }
  return { frames, labels }
}
