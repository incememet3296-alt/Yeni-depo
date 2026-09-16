import { toLocalWorldPosition } from './world-position'
import { normalizeHeading } from './compass'
import { getArPerformanceProfile } from './ar-performance'
import { getFollowingPetLocation } from './animal-position'
import type { Animal, UserLocation } from '../types/animal'

interface XRReferenceSpaceLike {}
interface XRPoseLike { views: XRViewLike[] }
interface XRViewLike { projectionMatrix: Float32Array; transform: { matrix: Float32Array; inverse?: { matrix: Float32Array } } }
interface XRFrameLike { getViewerPose(referenceSpace: XRReferenceSpaceLike): XRPoseLike | null }
interface XRWebGLLayerLike { framebuffer: WebGLFramebuffer | null; getViewport(view: XRViewLike): { x: number; y: number; width: number; height: number } }
interface XRSessionLike { updateRenderState(state: { baseLayer: XRWebGLLayerLike }): void; requestReferenceSpace(type: string): Promise<XRReferenceSpaceLike>; requestAnimationFrame(callback: (time: number, frame: XRFrameLike) => void): number; end(): Promise<void>; addEventListener(type: string, listener: EventListener): void }
type XRNavigator = Navigator & { xr?: { requestSession: (mode: 'immersive-ar', options?: { requiredFeatures?: string[]; optionalFeatures?: string[] }) => Promise<XRSessionLike> } }
type XRWebGLLayerConstructor = new (session: XRSessionLike, gl: WebGLRenderingContext) => XRWebGLLayerLike
type Mesh = { vertices: Float32Array; normals: Float32Array; indices: Uint16Array }
type Part = { mesh: Mesh; model: Float32Array }

const COLORS: Record<Animal['rarity'], [number, number, number]> = { common: [0.58,0.68,0.78], uncommon: [0.25,0.78,0.58], rare: [0.30,0.52,0.95], legendary: [0.95,0.64,0.20] }
function multiply(a: Float32Array, b: Float32Array): Float32Array { const o=new Float32Array(16); for(let c=0;c<4;c+=1) for(let r=0;r<4;r+=1) o[c*4+r]=a[r]*b[c*4]+a[4+r]*b[c*4+1]+a[8+r]*b[c*4+2]+a[12+r]*b[c*4+3]; return o }
function translation(x:number,y:number,z:number):Float32Array { const m=new Float32Array(16);m[0]=m[5]=m[10]=m[15]=1;m[12]=x;m[13]=y;m[14]=z;return m }
function scale(x:number,y:number,z:number):Float32Array { const m=new Float32Array(16);m[0]=x;m[5]=y;m[10]=z;m[15]=1;return m }
function rotationY(a:number):Float32Array { const c=Math.cos(a),s=Math.sin(a),m=new Float32Array(16);m[0]=c;m[2]=-s;m[5]=1;m[8]=s;m[10]=c;m[15]=1;return m }
function sphere(rx:number,ry:number,rz:number,cx:number,cy:number,cz:number,segments=12,rings=8):Mesh { const v:number[]=[],n:number[]=[],i:number[]=[];for(let y=0;y<=rings;y+=1){const f=y/rings,p=f*Math.PI,sp=Math.sin(p),cp=Math.cos(p);for(let x=0;x<=segments;x+=1){const t=x/segments*Math.PI*2,st=Math.sin(t),ct=Math.cos(t);v.push(cx+rx*sp*ct,cy+ry*cp,cz+rz*sp*st);n.push(sp*ct,cp,sp*st)}}const row=segments+1;for(let y=0;y<rings;y+=1)for(let x=0;x<segments;x+=1){const a=y*row+x,b=a+row;i.push(a,b,a+1,a+1,b,b+1)}return{vertices:new Float32Array(v),normals:new Float32Array(n),indices:new Uint16Array(i)} }
function cone(rx:number,ry:number,rz:number,cx:number,cy:number,cz:number,segments=10):Mesh { const v:number[]=[cx,cy+ry,cz,cx,cy-ry,cz],n:number[]=[0,1,0,0,-1,0],i:number[]=[];for(let k=0;k<=segments;k+=1){const t=k/segments*Math.PI*2;v.push(cx+rx*Math.cos(t),cy,cz+rz*Math.sin(t));n.push(Math.cos(t),0.45,Math.sin(t))}for(let k=0;k<segments;k+=1){const a=2+k,b=a+1;i.push(0,a,b,1,b,a)}return{vertices:new Float32Array(v),normals:new Float32Array(n),indices:new Uint16Array(i)} }
function invertMatrix(m:Float32Array):Float32Array|null { const o=new Float32Array(16),a00=m[0],a01=m[1],a02=m[2],a03=m[3],a10=m[4],a11=m[5],a12=m[6],a13=m[7],a20=m[8],a21=m[9],a22=m[10],a23=m[11],a30=m[12],a31=m[13],a32=m[14],a33=m[15],b00=a00*a11-a01*a10,b01=a00*a12-a02*a10,b02=a00*a13-a03*a10,b03=a01*a12-a03*a11,b04=a01*a13-a03*a11,b05=a02*a13-a03*a12,b06=a20*a31-a21*a30,b07=a20*a32-a22*a30,b08=a20*a33-a23*a30,b09=a21*a32-a22*a31,b10=a21*a33-a23*a31,b11=a22*a33-a23*a32,d=b00*b11-b01*b10+b02*b09+b03*b08-b04*b07+b05*b06;if(Math.abs(d)<1e-8)return null;const q=1/d;o[0]=(a11*b11-a12*b10+a13*b09)*q;o[1]=(a02*b10-a01*b11-a03*b09)*q;o[2]=(a31*b05-a32*b04+a33*b03)*q;o[3]=(a22*b04-a21*b05-a23*b03)*q;o[4]=(a12*b08-a10*b11-a13*b07)*q;o[5]=(a00*b11-a02*b08+a03*b07)*q;o[6]=(a32*b02-a30*b05-a33*b01)*q;o[7]=(a20*b05-a22*b02+a23*b01)*q;o[8]=(a10*b10-a11*b08+a13*b06)*q;o[9]=(a01*b08-a00*b10-a03*b06)*q;o[10]=(a30*b04-a31*b02+a33*b00)*q;o[11]=(a21*b02-a20*b04-a23*b00)*q;o[12]=(a11*b07-a10*b09-a12*b06)*q;o[13]=(a00*b09-a01*b07+a02*b06)*q;o[14]=(a31*b01-a30*b03-a32*b00)*q;o[15]=(a20*b03-a21*b01+a22*b00)*q;return o }
function geoToXrPosition(east:number,north:number,up:number,heading:number,calibrationYaw=0){const r=normalizeHeading(heading)*Math.PI/180,c=Math.cos(r),s=Math.sin(r),localX=east*c-north*s,localZ=-(east*s+north*c),cc=Math.cos(calibrationYaw),cs=Math.sin(calibrationYaw);return{x:cc*localX+cs*localZ,y:up,z:-cs*localX+cc*localZ}}
function getCalibrationYaw(viewMatrix:Float32Array,heading:number):number|null{const fx=-viewMatrix[8],fz=-viewMatrix[10],len=Math.hypot(fx,fz);if(len<.25)return null;const x=fx/len,z=fz/len,r=normalizeHeading(heading)*Math.PI/180,ex=Math.sin(r),ez=-Math.cos(r);return Math.atan2(ez*x-ex*z,ex*x+ez*z)}
function createProgram(gl:WebGLRenderingContext):WebGLProgram|null{const vs=`attribute vec3 aPosition;attribute vec3 aNormal;uniform mat4 uMvp;uniform mat4 uModel;varying vec3 vNormal;void main(){vNormal=mat3(uModel)*aNormal;gl_Position=uMvp*vec4(aPosition,1.0);}`,fs=`precision mediump float;varying vec3 vNormal;uniform vec3 uColor;void main(){vec3 n=normalize(vNormal);vec3 l=normalize(vec3(-.45,.85,.65));float d=max(dot(n,l),0.0);gl_FragColor=vec4(uColor*(.3+d*.7),1.0);}`;const compile=(t:number,s:string)=>{const sh=gl.createShader(t);if(!sh)return null;gl.shaderSource(sh,s);gl.compileShader(sh);return gl.getShaderParameter(sh,gl.COMPILE_STATUS)?sh:null};const v=compile(gl.VERTEX_SHADER,vs),f=compile(gl.FRAGMENT_SHADER,fs);if(!v||!f)return null;const p=gl.createProgram();if(!p)return null;gl.attachShader(p,v);gl.attachShader(p,f);gl.linkProgram(p);return gl.getProgramParameter(p,gl.LINK_STATUS)?p:null}
function buildAnimalParts(segments:number,rings:number):Part[]{const meshes=[sphere(.62,.38,.42,0,0,0,segments,rings),sphere(.38,.34,.34,0,.42,-.04,segments,rings),sphere(.20,.15,.18,0,.34,-.31,Math.max(6,segments-2),Math.max(4,rings-2)),sphere(.13,.32,.14,-.34,-.40,-.20,Math.max(6,segments-2),Math.max(4,rings-2)),sphere(.13,.32,.14,.34,-.40,-.20,Math.max(6,segments-2),Math.max(4,rings-2)),cone(.16,.28,.16,-.24,.78,-.02,Math.max(6,segments-2)),cone(.16,.28,.16,.24,.78,-.02,Math.max(6,segments-2)),sphere(.14,.14,.42,0,.18,.46,Math.max(6,segments-2),Math.max(4,rings-2))];return meshes.map(mesh=>({mesh,model:new Float32Array(16)}))}
async function requestCompatibleSession(xr:NonNullable<XRNavigator['xr']>):Promise<XRSessionLike|null>{const attempts=[{requiredFeatures:['local-floor'],optionalFeatures:['dom-overlay']},{requiredFeatures:[],optionalFeatures:['local-floor','dom-overlay']},{requiredFeatures:[],optionalFeatures:[]}];for(const options of attempts){try{return await xr.requestSession('immersive-ar',options)}catch{}}return null}

export async function startWebXRAnimalSession(animals:Animal[],location:UserLocation,headingOrOnEnd?:number|(()=>void),onEnd?:()=>void,getCurrentLocation?:()=>UserLocation):Promise<XRSessionLike|null>{
  const xr=(typeof navigator!=='undefined'?navigator:null) as XRNavigator|null
  if(!xr?.xr)return null
  const heading=typeof headingOrOnEnd==='number'?headingOrOnEnd:location.heading??0
  const endHandler=typeof headingOrOnEnd==='function'?headingOrOnEnd:onEnd
  const session=await requestCompatibleSession(xr.xr)
  if(!session)return null
  try{
    const profile=getArPerformanceProfile(),canvas=document.createElement('canvas'),gl=canvas.getContext('webgl',{xrCompatible:true,antialias:profile.targetFps>=30})
    if(!gl){await session.end();return null}
    const C=(window as unknown as{XRWebGLLayer?:XRWebGLLayerConstructor}).XRWebGLLayer
    if(!C){await session.end();return null}
    const layer=new C(session,gl);session.updateRenderState({baseLayer:layer})
    let referenceSpace:XRReferenceSpaceLike
    try{referenceSpace=await session.requestReferenceSpace('local-floor')}catch{referenceSpace=await session.requestReferenceSpace('local')}
    const program=createProgram(gl);if(!program){await session.end();return null}
    const aPosition=gl.getAttribLocation(program,'aPosition'),aNormal=gl.getAttribLocation(program,'aNormal'),uMvp=gl.getUniformLocation(program,'uMvp'),uModel=gl.getUniformLocation(program,'uModel'),uColor=gl.getUniformLocation(program,'uColor'),parts=buildAnimalParts(profile.meshSegments,profile.meshRings),visibleAnimals=animals.slice(0,profile.maxAnimals),buffers=parts.map(({mesh})=>{const p=gl.createBuffer(),n=gl.createBuffer(),i=gl.createBuffer();if(!p||!n||!i)throw new Error('WebGL buffer');gl.bindBuffer(gl.ARRAY_BUFFER,p);gl.bufferData(gl.ARRAY_BUFFER,mesh.vertices,gl.STATIC_DRAW);gl.bindBuffer(gl.ARRAY_BUFFER,n);gl.bufferData(gl.ARRAY_BUFFER,mesh.normals,gl.STATIC_DRAW);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,i);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,mesh.indices,gl.STATIC_DRAW);return{p,n,i,count:mesh.indices.length}})
    let yaw:number|null=null,lastRender=0
    session.addEventListener('end',()=>endHandler?.())
    const frameInterval=1000/profile.targetFps
    const render=(time:number,frame:XRFrameLike)=>{
      if(time-lastRender<frameInterval){session.requestAnimationFrame(render);return}
      lastRender=time
      const pose=frame.getViewerPose(referenceSpace)
      if(!pose||!layer.framebuffer){session.requestAnimationFrame(render);return}
      const currentLocation=getCurrentLocation?.() ?? location
      const currentHeading=currentLocation.heading ?? heading
      gl.bindFramebuffer(gl.FRAMEBUFFER,layer.framebuffer);gl.enable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(program)
      for(const view of pose.views){
        const vp=layer.getViewport(view);gl.viewport(vp.x,vp.y,vp.width,vp.height)
        const viewMatrix=view.transform.inverse?.matrix??invertMatrix(view.transform.matrix);if(!viewMatrix)continue
        if(yaw==null)yaw=getCalibrationYaw(view.transform.matrix,currentHeading)
        for(const animal of visibleAnimals){
          const petLocation=animal.isOwned?getFollowingPetLocation(currentLocation,animal,currentHeading):{latitude:animal.latitude,longitude:animal.longitude,altitude:animal.altitude}
          const world=toLocalWorldPosition(currentLocation,petLocation);if(world.distance>1000)continue
          const pos=geoToXrPosition(world.east,world.north,world.up,currentHeading,yaw??0),s=Math.max(.35,Math.min(2.8,7/Math.max(3,world.distance))),base=multiply(translation(pos.x,pos.y+Math.max(.7,Math.min(2.5,world.distance*.04)),pos.z),multiply(rotationY((animal.id.length*37)%360*Math.PI/180),scale(s,s,s)))
          gl.uniform3fv(uColor,COLORS[animal.rarity])
          for(let i=0;i<parts.length;i+=1){const model=multiply(base,parts[i].model);gl.uniformMatrix4fv(uModel,false,model);gl.uniformMatrix4fv(uMvp,false,multiply(view.projectionMatrix,multiply(viewMatrix,model)));gl.bindBuffer(gl.ARRAY_BUFFER,buffers[i].p);gl.enableVertexAttribArray(aPosition);gl.vertexAttribPointer(aPosition,3,gl.FLOAT,false,0,0);gl.bindBuffer(gl.ARRAY_BUFFER,buffers[i].n);gl.enableVertexAttribArray(aNormal);gl.vertexAttribPointer(aNormal,3,gl.FLOAT,false,0,0);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,buffers[i].i);gl.drawElements(gl.TRIANGLES,buffers[i].count,gl.UNSIGNED_SHORT,0)}
        }
      }
      session.requestAnimationFrame(render)
    }
    session.requestAnimationFrame(render)
    return session
  }catch{try{await session.end()}catch{}return null}
}
