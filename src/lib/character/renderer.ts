import type { Instance } from './anim'
import type { Part, Skin } from './skin'

/** a, b, c, d, tx, ty — x' = a·x + c·y + tx, y' = b·x + d·y + ty */
type Mat = [number, number, number, number, number, number]
type Rgb = [number, number, number]

export interface Layer {
  skin: Skin
  image: TexImageSource
}

/** One animated figure in the scene: the character, a pet, a mount… */
export interface Entity {
  frame: Instance[]
  nodes: string[]
  /** Searched in order when resolving a node name to a part. */
  skins: Layer[]
  /** Equipment layers (also in `skins`): the only ones a hat slot is drawn from on its own. */
  worn?: Layer[]
  /** The bone's own graphics, for records that reference one by index. */
  own?: { layer: Layer; names: string[] }
  /** Palette slot N (1-based) tints every ColorGray_N part. */
  colors?: number[]
  /**
   * Entities carried at a hook node of this one (`carried_<slot>_0`: 1 = pet,
   * 2 = rider). They are drawn where the hook sits in the draw order, offset
   * by the hook's position; their own x/y add to it.
   */
  hooks?: Record<string, Entity>
  x: number
  y: number
  scale: number
  mirror: boolean
}

const VERTEX = `
attribute vec2 aPos;
attribute vec2 aUv;
attribute vec4 aTint;
attribute vec4 aColor;
attribute vec4 aAdd;
uniform vec4 uView;
varying vec2 vUv;
varying vec4 vTint;
varying vec4 vColor;
varying vec4 vAdd;
void main() {
  vUv = aUv;
  vTint = aTint;
  vColor = aColor;
  vAdd = aAdd;
  gl_Position = vec4(aPos * uView.xy + uView.zw, 0.0, 1.0);
}`

const FRAGMENT = `
precision mediump float;
uniform sampler2D uTex;
varying vec2 vUv;
varying vec4 vTint;
varying vec4 vColor;
varying vec4 vAdd;
void main() {
  vec4 t = texture2D(uTex, vUv);
  if (t.a <= 0.0) discard;
  vec3 rgb = t.rgb / t.a;
  if (vTint.a > 0.5) {
    // Gray parts are shading at half intensity: 50% gray = the palette color.
    rgb = min(2.0 * rgb * vTint.rgb, 1.0);
  }
  float a = clamp(t.a * vColor.a + vAdd.a, 0.0, 1.0);
  gl_FragColor = vec4(clamp(rgb * vColor.rgb + vAdd.rgb, 0.0, 1.0) * a, a);
}`

const STRIDE = 16
const TINT_RE = /^ColorGray_(\d+)_/
/**
 * Hat slots: some timelines (the rider's) place them on their own, scaled for
 * a worn hat. Classes whose head skin keeps its hood or hat in that slot
 * (Sram, Xelor, Eliotrope…) must keep the copy embedded in the head instead,
 * or the enlarged hood covers the face.
 */
const HAT_SLOT = /^Chapeau(B)?_/

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!
  gl.shaderSource(s, src)
  gl.compileShader(s)
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? 'shader')
  return s
}

function mul(p: Mat, q: Mat): Mat {
  return [
    p[0] * q[0] + p[2] * q[1],
    p[1] * q[0] + p[3] * q[1],
    p[0] * q[2] + p[2] * q[3],
    p[1] * q[2] + p[3] * q[3],
    p[0] * q[4] + p[2] * q[5] + p[4],
    p[1] * q[4] + p[3] * q[5] + p[5],
  ]
}

function rgb(c: number): Rgb {
  return [((c >> 16) & 255) / 255, ((c >> 8) & 255) / 255, (c & 255) / 255]
}

export class CharacterRenderer {
  private gl: WebGLRenderingContext
  private program: WebGLProgram
  private buffer: WebGLBuffer
  private indexBuffer: WebGLBuffer
  private textures = new Map<Skin, WebGLTexture>()
  private verts = new Float32Array(STRIDE * 4096)
  private idx = new Uint16Array(8192)
  private vCount = 0
  private iCount = 0
  private batches: { texture: WebGLTexture; start: number; count: number }[] = []
  // per-entity state while building a frame
  private skins: Layer[] = []
  private palette: Rgb[] = []
  private animated = new Set<string>()

  constructor(private canvas: HTMLCanvasElement) {
    const gl = canvas.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: true })
    if (!gl) throw new Error('WebGL unavailable')
    this.gl = gl
    const program = gl.createProgram()!
    gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERTEX))
    gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAGMENT))
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) ?? 'link')
    this.program = program
    this.buffer = gl.createBuffer()!
    this.indexBuffer = gl.createBuffer()!
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
  }

  private texture({ skin, image }: Layer): WebGLTexture {
    let texture = this.textures.get(skin)
    if (texture) return texture
    const gl = this.gl
    texture = gl.createTexture()!
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    this.textures.set(skin, texture)
    return texture
  }

  private find(name: string): [Layer, Part] | null {
    for (const layer of this.skins) {
      const part = layer.skin.parts[name]
      if (part) return [layer, part]
    }
    return null
  }

  private grow(vNeed: number, iNeed: number) {
    if ((this.vCount + vNeed) * STRIDE > this.verts.length) {
      const next = new Float32Array(Math.max(this.verts.length * 2, (this.vCount + vNeed) * STRIDE))
      next.set(this.verts)
      this.verts = next
    }
    if (this.iCount + iNeed > this.idx.length) {
      const next = new Uint16Array(Math.max(this.idx.length * 2, this.iCount + iNeed))
      next.set(this.idx)
      this.idx = next
    }
  }

  private emit(layer: Layer, chunk: Part['c'][number], m: Mat, tint: number, inst: Instance) {
    const { skin } = layer
    const { color, add } = inst
    const [first, count, firstIndex, indexCount] = chunk
    if (this.vCount + count > 65535) return
    this.grow(count, indexCount)
    const base = this.vCount
    const pal = tint > 0 ? this.palette[tint - 1] : undefined
    const v = this.verts
    for (let j = 0; j < count; j++) {
      const s = (first + j) * 4
      const x = skin.vertices[s], y = skin.vertices[s + 1]
      const o = (base + j) * STRIDE
      v[o] = m[0] * x + m[2] * y + m[4]
      v[o + 1] = m[1] * x + m[3] * y + m[5]
      v[o + 2] = skin.vertices[s + 2]
      v[o + 3] = skin.vertices[s + 3]
      const vt = skin.tints[first + j]
      const p = vt > 0 ? this.palette[vt - 1] ?? pal : pal
      v[o + 4] = p ? p[0] : 0
      v[o + 5] = p ? p[1] : 0
      v[o + 6] = p ? p[2] : 0
      v[o + 7] = p ? 1 : 0
      v[o + 8] = color[0]
      v[o + 9] = color[1]
      v[o + 10] = color[2]
      v[o + 11] = color[3]
      v[o + 12] = add[0]
      v[o + 13] = add[1]
      v[o + 14] = add[2]
      v[o + 15] = add[3]
    }
    for (let k = 0; k < indexCount; k++) this.idx[this.iCount + k] = base + skin.indices[firstIndex + k]
    const texture = this.texture(layer)
    const last = this.batches[this.batches.length - 1]
    if (last && last.texture === texture && last.start + last.count === this.iCount) last.count += indexCount
    else this.batches.push({ texture, start: this.iCount, count: indexCount })
    this.vCount += count
    this.iCount += indexCount
  }

  private drawPart(layer: Layer, part: Part, m: Mat, tint: number, inst: Instance, depth: number) {
    if (depth > 12) return
    const d = part.d
    const stack: { end: number; m: Mat; tint: number }[] = [{ end: d.length, m, tint }]
    let chunk = 0
    let i = 0
    while (i < d.length) {
      while (stack.length > 1 && stack[stack.length - 1].end <= i) stack.pop()
      const top = stack[stack.length - 1]
      const [symbol, descendants, rX, rY, uX, uY, tX, tY] = d[i]
      // Skin transforms are authored y-down; vertices and timelines are y-up.
      const local = mul(top.m, [rX, -rY, -uX, uY, tX, -tY])
      if (symbol === null) {
        // Chunk vertices are already baked into the part's own space.
        const c = part.c[chunk++]
        if (c) this.emit(layer, c, m, top.tint, inst)
        i++
        continue
      }
      // The timeline places this node itself this frame: skip the embedded copy.
      if (this.animated.has(symbol)) {
        for (let k = i + 1; k <= i + descendants && k < d.length; k++) if (d[k][0] === null) chunk++
        i += 1 + descendants
        continue
      }
      const match = TINT_RE.exec(symbol)
      const t = match ? Number(match[1]) : top.tint
      if (descendants > 0) {
        stack.push({ end: i + 1 + descendants, m: local, tint: t })
      } else {
        const found = this.find(symbol)
        if (found) this.drawPart(found[0], found[1], local, t, inst, depth + 1)
      }
      i++
    }
  }

  private build(e: Entity, ox = 0, oy = 0) {
    // A bone's own sprites can also be referenced by name (e.g. a creature
    // drawn as a single "AnimStatique_0" composite), after any skin layer.
    this.skins = e.own ? [...e.skins, e.own.layer] : e.skins
    this.palette = (e.colors ?? []).map(rgb)
    const standalone = (name: string) => !HAT_SLOT.test(name) || !!e.worn?.some(l => l.skin.parts[name])
    this.animated.clear()
    for (const inst of e.frame) {
      const name = inst.node !== 0xffff ? e.nodes[inst.node] : undefined
      if (name && standalone(name)) this.animated.add(name)
    }
    const sx = e.mirror ? -e.scale : e.scale
    for (const inst of e.frame) {
      const m = inst.m
      const carried = inst.node !== 0xffff ? e.hooks?.[e.nodes[inst.node]] : undefined
      if (carried) {
        const state = [this.skins, this.palette, new Set(this.animated)] as const
        this.build(carried, sx * m[2] + e.x + ox, e.scale * m[5] + e.y + oy)
        ;[this.skins, this.palette] = state
        this.animated = state[2]
        continue
      }
      let found: [Layer, Part] | null = null
      if (inst.graphic >= 0 && e.own) {
        const part = e.own.layer.skin.parts[e.own.names[inst.graphic]]
        if (part) found = [e.own.layer, part]
      } else if (inst.node !== 0xffff) {
        const name = e.nodes[inst.node]
        if (name && standalone(name)) found = this.find(name)
      }
      if (!found) continue
      const root: Mat = [sx * m[0], e.scale * m[3], sx * m[1], e.scale * m[4], sx * m[2] + e.x + ox, e.scale * m[5] + e.y + oy]
      this.drawPart(found[0], found[1], root, 0, inst, 0)
    }
  }

  /** World-space box [x, y, width, height] covering what `render` would draw, or null if nothing. */
  measure(entities: Entity[]): [number, number, number, number] | null {
    this.vCount = 0
    this.iCount = 0
    this.batches = []
    for (const e of entities) this.build(e)
    if (!this.vCount) return null
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
    for (let i = 0; i < this.vCount; i++) {
      const x = this.verts[i * STRIDE], y = this.verts[i * STRIDE + 1]
      if (x < x0) x0 = x
      if (x > x1) x1 = x
      if (y < y0) y0 = y
      if (y > y1) y1 = y
    }
    return [x0, y0, x1 - x0, y1 - y0]
  }

  /**
   * Draws entities back to front.
   * @param bounds world box to fit: x, y (bottom), width, height
   */
  render(entities: Entity[], bounds: [number, number, number, number]) {
    const gl = this.gl
    const dpr = window.devicePixelRatio || 1
    const w = Math.round(this.canvas.clientWidth * dpr)
    const h = Math.round(this.canvas.clientHeight * dpr)
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w
      this.canvas.height = h
    }
    gl.viewport(0, 0, w, h)
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    if (!w || !h) return

    this.vCount = 0
    this.iCount = 0
    this.batches = []
    for (const e of entities) this.build(e)
    if (!this.batches.length) return

    const [bx, by, bw, bh] = bounds
    const scale = Math.min(w / bw, h / bh)
    const sx = (2 * scale) / w
    const sy = (2 * scale) / h

    gl.useProgram(this.program)
    gl.uniform4f(gl.getUniformLocation(this.program, 'uView'), sx, sy, -sx * (bx + bw / 2), -sy * (by + bh / 2))
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer)
    gl.bufferData(gl.ARRAY_BUFFER, this.verts.subarray(0, this.vCount * STRIDE), gl.DYNAMIC_DRAW)
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer)
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.idx.subarray(0, this.iCount), gl.DYNAMIC_DRAW)
    const attr = (name: string, size: number, offset: number) => {
      const loc = gl.getAttribLocation(this.program, name)
      gl.enableVertexAttribArray(loc)
      gl.vertexAttribPointer(loc, size, gl.FLOAT, false, STRIDE * 4, offset * 4)
    }
    attr('aPos', 2, 0)
    attr('aUv', 2, 2)
    attr('aTint', 4, 4)
    attr('aColor', 4, 8)
    attr('aAdd', 4, 12)
    gl.activeTexture(gl.TEXTURE0)
    gl.uniform1i(gl.getUniformLocation(this.program, 'uTex'), 0)
    for (const b of this.batches) {
      gl.bindTexture(gl.TEXTURE_2D, b.texture)
      gl.drawElements(gl.TRIANGLES, b.count, gl.UNSIGNED_SHORT, b.start * 2)
    }
  }

  dispose() {
    const gl = this.gl
    for (const t of this.textures.values()) gl.deleteTexture(t)
    this.textures.clear()
    gl.deleteBuffer(this.buffer)
    gl.deleteBuffer(this.indexBuffer)
    gl.deleteProgram(this.program)
  }
}
