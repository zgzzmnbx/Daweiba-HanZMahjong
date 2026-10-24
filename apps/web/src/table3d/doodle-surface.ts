import * as T from 'three';
import type {DoodlePoint,DoodleStroke} from '../../../../packages/contracts/doodle';
import type {MainView} from './main-view';
/** Render ink below every tile. Camera ray intersection keeps the ink on the felt after resize. */
export class DoodleSurface{
 readonly canvas=document.createElement('canvas');
 private texture:T.CanvasTexture;
 private mesh:T.Mesh<T.PlaneGeometry,T.MeshBasicMaterial>;
 constructor(readonly view:MainView){this.canvas.width=this.canvas.height=1024;this.texture=new T.CanvasTexture(this.canvas);this.texture.colorSpace=T.SRGBColorSpace;
  this.mesh=new T.Mesh(new T.PlaneGeometry(222,222),new T.MeshBasicMaterial({map:this.texture,transparent:true,depthWrite:false,opacity:.82}));this.mesh.position.set(111,111,.12);view.mainGroup.add(this.mesh);
 }
 paint(strokes:DoodleStroke[]){const ctx=this.canvas.getContext('2d')!;ctx.clearRect(0,0,1024,1024);ctx.lineCap=ctx.lineJoin='round';for(const s of strokes){ctx.strokeStyle=ctx.fillStyle=s.color;ctx.lineWidth=s.width*3;ctx.beginPath();s.points.forEach(([x,y],i)=>i?ctx.lineTo(x*1024,(1-y)*1024):ctx.moveTo(x*1024,(1-y)*1024));if(s.points.length===1){ctx.arc(s.points[0][0]*1024,(1-s.points[0][1])*1024,ctx.lineWidth/2,0,Math.PI*2);ctx.fill();}else ctx.stroke();}this.texture.needsUpdate=true;this.view.refresh();}
 point(clientX:number,clientY:number):DoodlePoint|null{const r=this.view.host.getBoundingClientRect();this.view.scene.updateMatrixWorld(true);this.view.camera.updateMatrixWorld(true);const ray=new T.Raycaster();ray.setFromCamera(new T.Vector2((clientX-r.left)/r.width*2-1,1-(clientY-r.top)/r.height*2),this.view.camera);const p=ray.ray.intersectPlane(new T.Plane(new T.Vector3(0,0,1),-.12),new T.Vector3());if(!p||p.x<0||p.x>222||p.y<0||p.y>222)return null;return[Math.round(p.x/222*10000)/10000,Math.round(p.y/222*10000)/10000];}
 polygon(){const r=this.view.host.getBoundingClientRect();this.view.scene.updateMatrixWorld(true);return[[0,0],[222,0],[222,222],[0,222]].map(([x,y])=>{const p=new T.Vector3(x,y,.12).project(this.view.camera);return`${(p.x+1)*r.width/2}px ${(1-p.y)*r.height/2}px`;}).join(',');}
 dispose(){this.view.mainGroup.remove(this.mesh);this.mesh.geometry.dispose();this.mesh.material.dispose();this.texture.dispose();this.view.refresh();}
}
