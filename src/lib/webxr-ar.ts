import { toLocalWorldPosition } from './world-position'
import { normalizeHeading } from './compass'
import type { Animal, UserLocation } from '../types/animal'

interface XRReferenceSpaceLike {}
interface XRPoseLike { views: XRViewLike[] }
interface XRViewLike { projectionMatrix: Float32Array; transform: { matrix: Float32Array; inverse?: { matrix: Float32Array } } }
interface XRFrameLike { getViewerPose(referenceSpace: XRReferenceSpaceLike): XRPoseLike | null }
interface XRWebGLLayerLike { framebuffer: WebGLFramebuffer | null; framebufferWidth: number; framebufferHeight: number; getViewport(view: XRViewLike): { x: number; y: number; width: number; height: number } }
interface XRSessionLike {
  updateRenderState(state: { baseLayer: XRWebGLLayerLike }): void
  requestReferenceSpace(type: string): Promise<XRReferenceSpaceLike>
  requestAnimationFrame(callback: (time: number, frame: XRFrameLike) => void): number
  end(): Promise<void>
  addEventListener(type: string, listener: EventListener): void
}

type XRNavigator = Navigator & {
  xr?: {
    requestSession: (mode: 'immersive-ar', options?: { requiredFeatures?: string[]; optionalFeatures?: string[] }) => Promise<XRSessionLike>
  }
}

type XRWebGLLayerConstructor = new (session: XRSessionLike, gl: WebGLRenderingContext) => XRWebGLLayerLike

function matrixMultiply(a: Float32Array, b: Float32Array): Float32Array {
  const out = new Float32Array(16)
  for (let column = 0; column < 4; column += 1) {
    for (let row = 0; row < 4; row += 1) {
      out[column * 4 + row] =
        a[row] * b[column * 4] +
        a[4 + row] * b[column * 4 + 1] +
        a[8 + row] * b[column * 4 + 2] +
        a[12 + row] * b[column * 4 + 3]
    }
  }
  return out
}

function invertMatrix(matrix: Float32Array): Float32Array | null {
  const out = new Float32Array(16)
  const m00 = matrix[0], m01 = matrix[1], m02 = matrix[2], m03 = matrix[3]
  const m10 = matrix[4], m11 = matrix[5], m12 = matrix[6], m13 = matrix[7]
  const m20 = matrix[8], m21 = matrix[9], m22 = matrix[10], m23 = matrix[11]
  const m30 = matrix[12], m31 = matrix[13], m32 = matrix[14], m33 = matrix[15]
  const b00 = m00 * m11 - m01 * m10
  const b01 = m00 * m12 - m02 * m10
  const b02 = m00 * m13 - m03 * m10
  const b03 = m01 * m12 - m02 * m11
  const b04 = m01 * m13 - m03 * m11
  const b05 = m02 * m13 - m03 * m12
  const b06 = m20 * m31 - m21 * m30
  const b07 = m20 * m32 - m22 * m30
  const b08 = m20 * m33 - m22 * m30
  const b09 = m21 * m32 - m22 * m31
  const b10 = m21 * m33 - m23 * m31
  const b11 = m22 * m33 - m23 * m32
  const determinant = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06
  if (Math.abs(determinant) < 1e-8) return null
  const inverseDet = 1 / determinant

  out[0] = (m11 * b11 - m12 * b10 + m13 * b09) * inverseDet
  out[1] = (m02 * b10 - m01 * b11 - m03 * b09) * inverseDet
  out[2] = (m31 * b05 - m32 * b04 + m33 * b03) * inverseDet
  out[3] = (m22 * b04 - m21 * b05 - m23 * b03) * inverseDet
  out[4] = (m12 * b08 - m10 * b11 - m13 * b07) * inverseDet
  out[5] = (m00 * b11 - m02 * b08 + m03 * b07) * inverseDet
  out[6] = (m32 * b02 - m30 * b05 - m33 * b01) * inverseDet
  out[7] = (m20 * b05 - m22 * b02 + m23 * b01) * inverseDet
  out[8] = (m10 * b10 - m11 * b08 + m13 * b06) * inverseDet
  out[9] = (m01 * b08 - m00 * b10 - m03 * b06) * inverseDet
  out[10] = (m30 * b04 - m31 * b02 + m33 * b00) * inverseDet
  out[11] = (m21 * b02 - m20 * b04 - m23 * b00) * inverseDet
  out[12] = (m11 * b07 - m10 * b09 - m12 * b06) * inverseDet
  out[13] = (m00 * b09 - m01 * b07 + m02 * b06) * inverseDet
  out[14] = (m31 * b01 - m30 * b03 - m32 * b00) * inverseDet
  out[15] = (m20 * b03 - m21 * b01 + m22 * b00) * inverseDet
  return out
}

function createProgram(gl: WebGLRenderingContext): WebGLProgram | null {
  const vertexSource = `attribute vec3 position; uniform mat4 matrix; void main(){ gl_Position = matrix * vec4(position,1.0); }`
  const fragmentSource = `precision mediump float; uniform vec4 color; void main(){ gl_FragColor = color; }`
  const compile = (type: number, source: string) => {
    const shader = gl.createShader(type)
    if (!shader) return null
    gl.shaderSource(shader, source)
    gl.compileShader(shader)
    return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null
  }
  const vertex = compile(gl.VERTEX_SHADER, vertexSource)
  const fragment = compile(gl.FRAGMENT_SHADER, fragmentSource)
  if (!vertex || !fragment) return null
  const program = gl.createProgram()
  if (!program) return null
  gl.attachShader(program, vertex)
  gl.attachShader(program, fragment)
  gl.linkProgram(program)
  return gl.getProgramParameter(program, gl.LINK_STATUS) ? program : null
}

function modelMatrix(x: number, y: number, z: number, scale: number): Float32Array {
  return new Float32Array([
    scale, 0, 0, 0,
    0, scale, 0, 0,
    0, 0, scale, 0,
    x, y, z, 1,
  ])
}

function geoToXrPosition(east: number, north: number, up: number, heading: number) {
  const radians = normalizeHeading(heading) * Math.PI / 180
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)
  const right = east * cos - north * sin
  const forward = east * sin + north * cos
  return { x: right, y: up, z: -forward }
}

async function requestCompatibleSession(xr: NonNullable<XRNavigator['xr']>): Promise<XRSessionLike | null> {
  const attempts = [
    { requiredFeatures: ['local-floor'], optionalFeatures: ['dom-overlay'] },
    { requiredFeatures: [], optionalFeatures: ['local-floor', 'dom-overlay'] },
    { requiredFeatures: [], optionalFeatures: [] },
  ]

  for (const options of attempts) {
    try {
      return await xr.requestSession('immersive-ar', options)
    } catch {
      // Try the next, less restrictive feature set.
    }
  }
  return null
}

export async function startWebXRAnimalSession(
  animals: Animal[],
  location: UserLocation,
  heading: number,
  onEnd?: () => void,
): Promise<XRSessionLike | null> {
  const xr = (typeof navigator !== 'undefined' ? navigator : null) as XRNavigator | null
  if (!xr?.xr) return null

  const session = await requestCompatibleSession(xr.xr)
  if (!session) return null

  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl', { xrCompatible: true })
    if (!gl) {
      await session.end()
      return null
    }

    const XRWebGLLayer = (window as unknown as { XRWebGLLayer?: XRWebGLLayerConstructor }).XRWebGLLayer
    if (!XRWebGLLayer) {
      await session.end()
      return null
    }
    const layer = new XRWebGLLayer(session, gl)
    session.updateRenderState({ baseLayer: layer })

    let referenceSpace: XRReferenceSpaceLike
    try {
      referenceSpace = await session.requestReferenceSpace('local-floor')
    } catch {
      referenceSpace = await session.requestReferenceSpace('local')
    }

    const program = createProgram(gl)
    if (!program) {
      await session.end()
      return null
    }

    const position = gl.getAttribLocation(program, 'position')
    const matrix = gl.getUniformLocation(program, 'matrix')
    const color = gl.getUniformLocation(program, 'color')
    const buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      0, 0.7, 0, -0.55, -0.45, 0, 0.55, -0.45, 0,
      0, 0.15, 0.2, -0.35, -0.2, 0.2, 0.35, -0.2, 0.2,
    ]), gl.STATIC_DRAW)

    session.addEventListener('end', () => onEnd?.())
    const render = (_time: number, frame: XRFrameLike) => {
      const pose = frame.getViewerPose(referenceSpace)
      if (!pose || !layer.framebuffer) {
        session.requestAnimationFrame(render)
        return
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, layer.framebuffer)
      gl.enable(gl.DEPTH_TEST)
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
      gl.useProgram(program)
      gl.enableVertexAttribArray(position)
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
      gl.vertexAttribPointer(position, 3, gl.FLOAT, false, 0, 0)

      for (const view of pose.views) {
        const viewport = layer.getViewport(view)
        gl.viewport(viewport.x, viewport.y, viewport.width, viewport.height)
        const viewMatrix = view.transform.inverse?.matrix ?? invertMatrix(view.transform.matrix)
        if (!viewMatrix) continue
        for (const animal of animals) {
          const world = toLocalWorldPosition(location, animal)
          if (world.distance > 1000) continue
          const xrPosition = geoToXrPosition(world.east, world.north, world.up, heading)
          const transform = modelMatrix(
            xrPosition.x,
            xrPosition.y + 1.2,
            xrPosition.z,
            Math.max(0.25, Math.min(2.5, 8 / Math.max(3, world.distance))),
          )
          const mvp = matrixMultiply(view.projectionMatrix, matrixMultiply(viewMatrix, transform))
          gl.uniformMatrix4fv(matrix, false, mvp)
          gl.uniform4f(color, 0.2, 0.8, 1.0, 1.0)
          gl.drawArrays(gl.TRIANGLES, 0, 3)
          gl.uniform4f(color, 0.95, 0.65, 0.15, 1.0)
          gl.drawArrays(gl.TRIANGLES, 3, 3)
        }
      }
      session.requestAnimationFrame(render)
    }

    session.requestAnimationFrame(render)
    return session
  } catch {
    try {
      await session.end()
    } catch {
      // Ignore cleanup failures.
    }
    return null
  }
}
