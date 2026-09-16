import { toLocalWorldPosition } from './world-position'
import { normalizeHeading } from './compass'
import type { Animal, UserLocation } from '../types/animal'

interface XRReferenceSpaceLike {}
interface XRPoseLike { views: XRViewLike[] }
interface XRViewLike {
  projectionMatrix: Float32Array
  transform: { matrix: Float32Array; inverse?: { matrix: Float32Array } }
}
interface XRFrameLike { getViewerPose(referenceSpace: XRReferenceSpaceLike): XRPoseLike | null }
interface XRWebGLLayerLike {
  framebuffer: WebGLFramebuffer | null
  framebufferWidth: number
  framebufferHeight: number
  getViewport(view: XRViewLike): { x: number; y: number; width: number; height: number }
}
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

type AnimalTexture = { texture: WebGLTexture; image: HTMLImageElement }

function matrixMultiply(a: Float32Array, b: Float32Array): Float32Array {
  const out = new Float32Array(16)
  for (let column = 0; column < 4; column += 1) {
    for (let row = 0; row < 4; row += 1) {
      out[column * 4 + row] =
        a[row] * b[column * 4] + a[4 + row] * b[column * 4 + 1] +
        a[8 + row] * b[column * 4 + 2] + a[12 + row] * b[column * 4 + 3]
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
  const b08 = m20 * m33 - m23 * m30
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
  const vertexSource = `attribute vec2 position; attribute vec2 uv; uniform mat4 matrix; uniform vec3 center; uniform vec3 cameraRight; uniform vec3 cameraUp; uniform float size; varying vec2 vUv; void main(){ vec3 world = center + cameraRight * position.x * size + cameraUp * position.y * size; gl_Position = matrix * vec4(world,1.0); vUv = uv; }`
  const fragmentSource = `precision mediump float; uniform sampler2D image; uniform vec4 fallbackColor; uniform float useImage; varying vec2 vUv; void main(){ vec4 tex = texture2D(image, vUv); gl_FragColor = mix(fallbackColor, tex, useImage); if(gl_FragColor.a < 0.03) discard; }`
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

function geoToXrPosition(east: number, north: number, up: number, heading: number, calibrationYaw = 0) {
  const radians = normalizeHeading(heading) * Math.PI / 180
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)
  const localX = east * cos - north * sin
  const localZ = -(east * sin + north * cos)
  const calibrationCos = Math.cos(calibrationYaw)
  const calibrationSin = Math.sin(calibrationYaw)
  return {
    x: calibrationCos * localX + calibrationSin * localZ,
    y: up,
    z: -calibrationSin * localX + calibrationCos * localZ,
  }
}

function getInitialCalibrationYaw(viewMatrix: Float32Array, heading: number): number | null {
  const forwardX = -viewMatrix[8]
  const forwardZ = -viewMatrix[10]
  const horizontalLength = Math.hypot(forwardX, forwardZ)
  if (horizontalLength < 0.25) return null
  const normalizedX = forwardX / horizontalLength
  const normalizedZ = forwardZ / horizontalLength
  const expectedHeadingRadians = normalizeHeading(heading) * Math.PI / 180
  const expectedX = Math.sin(expectedHeadingRadians)
  const expectedZ = -Math.cos(expectedHeadingRadians)
  const cross = expectedZ * normalizedX - expectedX * normalizedZ
  const dot = expectedX * normalizedX + expectedZ * normalizedZ
  return Math.atan2(cross, dot)
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
      // Try a less restrictive feature set.
    }
  }
  return null
}

function loadAnimalTexture(gl: WebGLRenderingContext, imageUrl: string): Promise<AnimalTexture | null> {
  return new Promise((resolve) => {
    const image = new Image()
    image.onload = () => {
      const texture = gl.createTexture()
      if (!texture) { resolve(null); return }
      gl.bindTexture(gl.TEXTURE_2D, texture)
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 1)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image)
      resolve({ texture, image })
    }
    image.onerror = () => resolve(null)
    image.src = imageUrl
  })
}

export async function startWebXRAnimalSession(
  animals: Animal[],
  location: UserLocation,
  headingOrOnEnd?: number | (() => void),
  onEnd?: () => void,
): Promise<XRSessionLike | null> {
  const xr = (typeof navigator !== 'undefined' ? navigator : null) as XRNavigator | null
  if (!xr?.xr) return null
  const heading = typeof headingOrOnEnd === 'number' ? headingOrOnEnd : location.heading ?? 0
  const endHandler = typeof headingOrOnEnd === 'function' ? headingOrOnEnd : onEnd
  const session = await requestCompatibleSession(xr.xr)
  if (!session) return null

  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl', { xrCompatible: true })
    if (!gl) { await session.end(); return null }
    const XRWebGLLayer = (window as unknown as { XRWebGLLayer?: XRWebGLLayerConstructor }).XRWebGLLayer
    if (!XRWebGLLayer) { await session.end(); return null }
    const layer = new XRWebGLLayer(session, gl)
    session.updateRenderState({ baseLayer: layer })

    let referenceSpace: XRReferenceSpaceLike
    try { referenceSpace = await session.requestReferenceSpace('local-floor') }
    catch { referenceSpace = await session.requestReferenceSpace('local') }

    const program = createProgram(gl)
    if (!program) { await session.end(); return null }

    const position = gl.getAttribLocation(program, 'position')
    const uv = gl.getAttribLocation(program, 'uv')
    const matrix = gl.getUniformLocation(program, 'matrix')
    const center = gl.getUniformLocation(program, 'center')
    const cameraRight = gl.getUniformLocation(program, 'cameraRight')
    const cameraUp = gl.getUniformLocation(program, 'cameraUp')
    const size = gl.getUniformLocation(program, 'size')
    const image = gl.getUniformLocation(program, 'image')
    const fallbackColor = gl.getUniformLocation(program, 'fallbackColor')
    const useImage = gl.getUniformLocation(program, 'useImage')
    const buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -0.5, 1, 0, 0,  0.5, 1, 1, 0,  -0.5, 0, 0, 1,
      -0.5, 0, 0, 1,  0.5, 1, 1, 0,   0.5, 0, 1, 1,
    ]), gl.STATIC_DRAW)

    const textures = new Map<string, AnimalTexture>()
    const textureResults = await Promise.all(animals.map(async (animal) => [animal.id, await loadAnimalTexture(gl, animal.image)] as const))
    for (const [id, loaded] of textureResults) if (loaded) textures.set(id, loaded)

    let calibrationYaw: number | null = null
    session.addEventListener('end', () => endHandler?.())
    const render = (_time: number, frame: XRFrameLike) => {
      const pose = frame.getViewerPose(referenceSpace)
      if (!pose || !layer.framebuffer) { session.requestAnimationFrame(render); return }
      gl.bindFramebuffer(gl.FRAMEBUFFER, layer.framebuffer)
      gl.enable(gl.DEPTH_TEST)
      gl.enable(gl.BLEND)
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
      gl.useProgram(program)
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
      gl.enableVertexAttribArray(position)
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 16, 0)
      gl.enableVertexAttribArray(uv)
      gl.vertexAttribPointer(uv, 2, gl.FLOAT, false, 16, 8)

      for (const view of pose.views) {
        const viewport = layer.getViewport(view)
        gl.viewport(viewport.x, viewport.y, viewport.width, viewport.height)
        const viewMatrix = view.transform.inverse?.matrix ?? invertMatrix(view.transform.matrix)
        if (!viewMatrix) continue
        if (calibrationYaw == null) calibrationYaw = getInitialCalibrationYaw(view.transform.matrix, heading)
        const yawOffset = calibrationYaw ?? 0
        const cameraWorld = view.transform.matrix
        gl.uniform3f(cameraRight, cameraWorld[0], cameraWorld[1], cameraWorld[2])
        gl.uniform3f(cameraUp, cameraWorld[4], cameraWorld[5], cameraWorld[6])

        for (const animal of animals) {
          const world = toLocalWorldPosition(location, animal)
          if (world.distance > 1000) continue
          const xrPosition = geoToXrPosition(world.east, world.north, world.up, heading, yawOffset)
          const distanceScale = Math.max(0.7, Math.min(5, 10 / Math.max(4, world.distance)))
          gl.uniformMatrix4fv(matrix, false, matrixMultiply(view.projectionMatrix, viewMatrix))
          gl.uniform3f(center, xrPosition.x, xrPosition.y + Math.max(0.8, Math.min(3, world.distance * 0.04)), xrPosition.z)
          gl.uniform1f(size, distanceScale)
          gl.uniform1i(image, 0)
          const texture = textures.get(animal.id)
          if (texture) {
            gl.activeTexture(gl.TEXTURE0)
            gl.bindTexture(gl.TEXTURE_2D, texture.texture)
            gl.uniform1f(useImage, 1)
          } else {
            gl.uniform1f(useImage, 0)
          }
          gl.uniform4f(fallbackColor, 0.2, 0.8, 1.0, 1.0)
          gl.drawArrays(gl.TRIANGLES, 0, 6)
        }
      }
      session.requestAnimationFrame(render)
    }
    session.requestAnimationFrame(render)
    return session
  } catch {
    try { await session.end() } catch { /* ignore cleanup failures */ }
    return null
  }
}
