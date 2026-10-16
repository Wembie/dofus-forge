/**
 * Skin geometry decoder (written by scripts/extract-characters.py).
 *
 *   "DFSK", u32 version, u32 headerLength, JSON header (space padded to 4)
 *   f32 x, y, u, v per vertex
 *   u8 palette slot per vertex (0 = untinted), padded to 4
 *   u16 indices, relative to each chunk's first vertex
 */

/** [symbol | null, childCount, rX, rY, uX, uY, tX, tY] — preorder tree; null draws the part's next chunk */
export type DisplayEntry = [string | null, number, number, number, number, number, number, number]
/** [firstVertex, vertexCount, firstIndex, indexCount] */
export type Chunk = [number, number, number, number]

export interface Part {
  d: DisplayEntry[]
  c: Chunk[]
}

export interface Skin {
  parts: Record<string, Part>
  vertices: Float32Array
  tints: Uint8Array
  indices: Uint16Array
  width: number
  height: number
}

export function decodeSkin(buf: ArrayBuffer): Skin {
  const view = new DataView(buf)
  const magic = String.fromCharCode(...new Uint8Array(buf, 0, 4))
  if (magic !== 'DFSK') throw new Error('invalid skin file')
  const headerLength = view.getUint32(8, true)
  const header = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 12, headerLength))) as {
    parts: Record<string, Part>
    vertexCount: number
    indexCount: number
    size: [number, number]
  }
  let p = 12 + headerLength
  const vertices = new Float32Array(buf, p, header.vertexCount * 4)
  p += header.vertexCount * 16
  const tints = new Uint8Array(buf, p, header.vertexCount)
  p += (header.vertexCount + 3) & ~3
  const indices = new Uint16Array(buf, p, header.indexCount)
  return {
    parts: header.parts,
    vertices,
    tints,
    indices,
    width: header.size[0],
    height: header.size[1],
  }
}
