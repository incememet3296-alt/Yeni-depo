import { useEffect, useRef } from 'react'

interface Animal3DProps {
  rarity?: 'common' | 'uncommon' | 'rare' | 'legendary'
  size?: number
}

type Vec3 = [number, number, number]

type Mesh = {
  vertices: Float32Array
  normals: Float32Array
  indices: Uint16Array
}

const COLORS: Record<NonNullable<Animal3DProps['rarity']>, Vec3> = {
  common: [0.58, 0.68, 0.78],
  uncommon: [0.25, 0.78, 0.58],
  rare: [0.30, 0.52, 0.95],
  legendary: [0.95, 0.64, 0.20],
}

function sphere(rx: number, ry: number, rz: number, cx: number, cy: number, cz: number, segments = 12, rings = 8): Mesh {
  const vertices: number[] = []
  const normals: number[] = []
  const indices: number[] = []
  for (let y = 0; y <= rings; y += 1) {
    const v = y / rings
    const phi = v * Math.PI
    const sp = Math.sin(phi)
    const cp = Math.cos(phi)
    for (let x = 0; x <= segments; x += 1) {
      const u = x / segments
      const theta = u * Math.PI * 2
      const st = Math.sin(theta)
      const ct = Math.cos(theta)
      vertices.push(cx + rx * sp * ct, cy + ry * cp, cz + rz * sp * st)
      normals.push(sp * ct, cp, sp * st)
    }
  }
  const row = segments + 1
  for (let y = 0; y < rings; y += 1) {
    for (let x = 0; x < segments; x += 1) {
      const a = y * row + x
      const b = a + row
      indices.push(a, b, a + 1, a + 1, b, b + 1)
    }
  }
  return { vertices: new Float32Array(vertices), normals: new Float32Array(normals), indices: new Uint16Array(indices) }
}

function cone(rx: number, ry: number, rz: number, cx: number, cy: number, cz: number): Mesh {
  const vertices: number[] = [cx, cy + ry, cz, cx, cy - ry, cz]
  const normals: number[] = [0, 1, 0, 0, -1, 0]
  const indices: number[] = []
  const segments = 10
  for (let i = 0; i <= segments; i += 1) {
    const t = (i / segments) * Math.PI * 2
    const x = cx + rx * Math.cos(t)
    const z = cz + rz * Math.sin(t)
    vertices.push(x, cy, z)
    normals.push(Math.cos(t), 0.45, Math.sin(t))
  }
  for (let i = 0; i < segments; i += 1) {
    const a = 2 + i
    const b = a + 1
    indices.push(0, a, b, 1, b, a)
  }
  return { vertices: new Float32Array(vertices), normals: new Float32Array(normals), indices: new Uint16Array(indices) }
}

function multiply(a: number[], b: number[]): number[] {
  const out = new Array(16).fill(0)
  for (let r = 0; r < 4; r += 1) for (let c = 0; c < 4; c += 1) for (let k = 0; k < 4; k += 1) out[r * 4 + c] += a[r * 4 + k] * b[k * 4 + c]
  return out
}

function perspective(fov: number, aspect: number, near: number, far: number): number[] {
  const f = 1 / Math.tan(fov / 2)
  const nf = 1 / (near - far)
  return [f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0]
}

function translation(x: number, y: number, z: number): number[] {
  return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1]
}

function rotationY(angle: number): number[] {
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  return [c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]
}

function rotationX(angle: number): number[] {
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  return [1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1]
}

export function Animal3D({ rarity = 'common', size = 96 }: Animal3DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const gl = canvas.getContext('webgl', { alpha: true, antialias: true })
    if (!gl) return

    const vertexSource = `attribute vec3 aPosition; attribute vec3 aNormal; uniform mat4 uMvp; uniform mat4 uModel; varying vec3 vNormal; void main(){ vNormal=mat3(uModel)*aNormal; gl_Position=uMvp*vec4(aPosition,1.0); }`
    const fragmentSource = `precision mediump float; varying vec3 vNormal; uniform vec3 uColor; void main(){ vec3 n=normalize(vNormal); vec3 light=normalize(vec3(-0.4,0.8,0.7)); float d=max(dot(n,light),0.0); float shade=0.35+d*0.65; gl_FragColor=vec4(uColor*shade,1.0); }`

    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type)
      if (!shader) throw new Error('WebGL shader oluşturulamadı')
      gl.shaderSource(shader, source)
      gl.compileShader(shader)
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const message = gl.getShaderInfoLog(shader) || 'Shader hatası'
        gl.deleteShader(shader)
        throw new Error(message)
      }
      return shader
    }

    const program = gl.createProgram()
    if (!program) return
    const vs = compile(gl.VERTEX_SHADER, vertexSource)
    const fs = compile(gl.FRAGMENT_SHADER, fragmentSource)
    gl.attachShader(program, vs)
    gl.attachShader(program, fs)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return
    gl.useProgram(program)

    const positionLocation = gl.getAttribLocation(program, 'aPosition')
    const normalLocation = gl.getAttribLocation(program, 'aNormal')
    const mvpLocation = gl.getUniformLocation(program, 'uMvp')
    const modelLocation = gl.getUniformLocation(program, 'uModel')
    const colorLocation = gl.getUniformLocation(program, 'uColor')

    const body = sphere(0.62, 0.38, 0.42, 0, 0, 0)
    const head = sphere(0.38, 0.34, 0.34, 0, 0.40, -0.04)
    const muzzle = sphere(0.20, 0.15, 0.18, 0, 0.34, -0.31, 10, 6)
    const legA = sphere(0.13, 0.32, 0.14, -0.34, -0.40, -0.20, 10, 6)
    const legB = sphere(0.13, 0.32, 0.14, 0.34, -0.40, -0.20, 10, 6)
    const earA = cone(0.16, 0.28, 0.16, -0.24, 0.78, -0.02)
    const earB = cone(0.16, 0.28, 0.16, 0.24, 0.78, -0.02)
    const tail = sphere(0.14, 0.14, 0.42, 0, 0.18, 0.46, 10, 6)
    const parts: Array<{ mesh: Mesh; transform: number[] }> = [
      { mesh: body, transform: translation(0, 0, 0) },
      { mesh: head, transform: translation(0, 0, 0) },
      { mesh: muzzle, transform: translation(0, 0, 0) },
      { mesh: legA, transform: translation(0, 0, 0) },
      { mesh: legB, transform: translation(0, 0, 0) },
      { mesh: earA, transform: translation(0, 0, 0) },
      { mesh: earB, transform: translation(0, 0, 0) },
      { mesh: tail, transform: rotationX(0.35) },
    ]

    const buffers = parts.map(({ mesh }) => {
      const position = gl.createBuffer()
      const normal = gl.createBuffer()
      const index = gl.createBuffer()
      if (!position || !normal || !index) throw new Error('WebGL buffer oluşturulamadı')
      gl.bindBuffer(gl.ARRAY_BUFFER, position)
      gl.bufferData(gl.ARRAY_BUFFER, mesh.vertices, gl.STATIC_DRAW)
      gl.bindBuffer(gl.ARRAY_BUFFER, normal)
      gl.bufferData(gl.ARRAY_BUFFER, mesh.normals, gl.STATIC_DRAW)
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, index)
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.indices, gl.STATIC_DRAW)
      return { position, normal, index, count: mesh.indices.length }
    })

    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = Math.max(1, Math.round(size * pixelRatio))
    canvas.height = Math.max(1, Math.round(size * pixelRatio))
    gl.viewport(0, 0, canvas.width, canvas.height)
    gl.enable(gl.DEPTH_TEST)
    gl.enable(gl.CULL_FACE)
    gl.clearColor(0, 0, 0, 0)
    gl.uniform3fv(colorLocation, COLORS[rarity])

    let frame = 0
    const started = performance.now()
    const render = (now: number) => {
      const elapsed = (now - started) / 1000
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
      const projection = perspective(Math.PI / 3, 1, 0.1, 20)
      const view = translation(0, -0.05, -3.0)
      const base = multiply(projection, view)
      for (let i = 0; i < parts.length; i += 1) {
        const animated = multiply(parts[i].transform, rotationY(elapsed * 0.9))
        const model = animated
        gl.uniformMatrix4fv(modelLocation, false, new Float32Array(model))
        gl.uniformMatrix4fv(mvpLocation, false, new Float32Array(multiply(base, model)))
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers[i].position)
        gl.enableVertexAttribArray(positionLocation)
        gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0)
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers[i].normal)
        gl.enableVertexAttribArray(normalLocation)
        gl.vertexAttribPointer(normalLocation, 3, gl.FLOAT, false, 0, 0)
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers[i].index)
        gl.drawElements(gl.TRIANGLES, buffers[i].count, gl.UNSIGNED_SHORT, 0)
      }
      frame = requestAnimationFrame(render)
    }
    frame = requestAnimationFrame(render)

    return () => {
      cancelAnimationFrame(frame)
      gl.deleteProgram(program)
      gl.deleteShader(vs)
      gl.deleteShader(fs)
      buffers.forEach((buffer) => {
        gl.deleteBuffer(buffer.position)
        gl.deleteBuffer(buffer.normal)
        gl.deleteBuffer(buffer.index)
      })
    }
  }, [rarity, size])

  return <canvas ref={canvasRef} width={size} height={size} aria-label="3D sanal hayvan" role="img" style={{ width: size, height: size, display: 'block' }} />
}
