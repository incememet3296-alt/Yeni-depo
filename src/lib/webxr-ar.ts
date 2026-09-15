import { toLocalWorldPosition } from './world-position'
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
      // Try the next, less restrictive feature set. Some Android AR browsers
      // expose immersive-ar but reject local-floor or dom-overlay at startup.
    }
  }
  return null
}

export async function startWebXRAnimalSession(
  animals: Animal[],
  location: UserLocation,
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

    const layer = new (window as unknown as { XRWebGLLayer?: new (session: XRSessionLike, gl: WebGLRenderingContext) => XRWebGLLayerLike }).XRWebGLLayer?.(session, gl)
    if (!layer) {
      await session.end()
      return null
    }
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
        // WebXR exposes transform as view-to-world. The renderer needs the
        // inverse (world-to-view) matrix for the MVP calculation.
        const viewMatrix = view.transform.inverse?.matrix ?? view.transform.matrix
        for (const animal of animals) {
          const world = toLocalWorldPosition(location, animal)
          if (world.distance > 1000) continue
          const transform = modelMatrix(
            world.east,
            world.up + 1.2,
            -world.north,
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
