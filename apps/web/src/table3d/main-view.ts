/** Derived from EnglishMahjong-web src/table3d/main-view.ts and Table3D.tsx,
 * commit 6830301df3061cdd25350cf56807473e5505b311. MIT; see THIRD_PARTY_NOTICES.md.
 * Retains actual scene/viewGroup, perspective camera, four lights, felt and rim construction.
 * Replaces English game protocol, fixed seats/pool, models, picking and postprocessing. */
import {rackPhaseKey} from '../table-ui/rack-interaction';
import * as T from 'three';
import {tileCanvasFont,ensureTileGlyph,uiCanvasFont,ensureUiGlyphs} from '../tile-font';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type {Draft} from '../../../../packages/contracts/types';
import {COMMA_WIDTH_RATIO,rackLayout} from '../table-ui/rack-layout';
import type {MotionAnchors,MotionRect} from '../table-ui/table-motion';
import type { TableView } from '../../../../packages/contracts/table-view';

export type Hit = { tileId: string; x:number; y:number; width:number; height:number; comma:boolean; kind:'tile'|'comma'|'period' };
export type RackDrag3D={key:string;x:number;y:number;external?:boolean};
type OwnNode={mesh:T.Group;tileId:string;kind:'tile'|'comma'|'period';target:T.Vector3;from:T.Vector3;started:number;duration:number};
export type Label = { seat:number; x:number; y:number };
export class MainView {
  readonly scene = new T.Scene();
  readonly mainGroup = new T.Group();
  readonly viewGroup = new T.Group();
  readonly camera = new T.PerspectiveCamera(30, 1.5, .1, 1000);
  readonly renderer: T.WebGLRenderer;
  private tiles = new T.Group();
  private motionHidden=new Set<string>();
  private own = new Map<string,OwnNode>();
  private ownTiles=new T.Group();
  private preview:Draft|null=null;
  private drag:RackDrag3D|null=null;
  private gap:T.Mesh;
  private reduced=matchMedia('(prefers-reduced-motion: reduce)');
  private faces = new Map<string,T.CanvasTexture>();
  private body = new RoundedBoxGeometry(6,9,4,3,.42);
  private face = new T.PlaneGeometry(5.6,8.5);
  private ivory = new T.MeshLambertMaterial({color:0xf1e8cf});
  private back = new T.MeshLambertMaterial({color:0xd9aa39});
  private shadow = new T.MeshBasicMaterial({color:0x151207,transparent:true,opacity:.2,depthWrite:false});
  private observer: ResizeObserver;
  private disposed = false;
  private last: { view:TableView; showOwn:boolean; selected:string|null;acquired:string|null;urgent:boolean } | null = null;
  private frame = 0;
  private centerTexture: T.CanvasTexture;
  private centerCanvas = document.createElement('canvas');
  private size={width:1,height:1};
  readonly stats={renders:0,capacity:0,fontRebuilds:0};
  constructor(readonly host:HTMLElement, private projected:(hits:Hit[], labels:Label[], center?:{x:number;y:number;width:number})=>void, private lost:()=>void, low=false) {
    this.renderer = new T.WebGLRenderer({alpha:true,antialias:true});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,low?1:innerWidth<600?1.5:2));
    this.renderer.domElement.setAttribute('aria-hidden','true');
    host.appendChild(this.renderer.domElement);
    this.viewGroup.position.set(111,111,0);
    this.scene.add(this.mainGroup,this.viewGroup);
    this.viewGroup.add(this.camera,new T.AmbientLight(0xffffff,1.45));
    for (const [intensity,x,y,z] of [[1.45,0,0,10000],[.45,0,-10000,0],[.45,-10000,-10000,0]]) {
      const light=new T.DirectionalLight(0xffffff,intensity);light.position.set(x,y,z);this.viewGroup.add(light);
    }
    const table=new T.Mesh(new T.PlaneGeometry(231,231),new T.MeshLambertMaterial({color:0x1d6b4a}));
    table.position.set(111,111,0);this.mainGroup.add(table);
    // Adopted lightweight contact shadows: no shadow-map allocation.
    for(const [x,y,w,h] of [[111,13,178,12],[111,194,100,8],[28,111,8,100],[194,111,8,100]]){const shade=new T.Mesh(new T.PlaneGeometry(w,h),this.shadow);shade.position.set(x,y,.03);this.mainGroup.add(shade);}
    const side=new T.MeshLambertMaterial({color:0x6b4226}),top=new T.MeshLambertMaterial({color:0x8a5a36});
    const mats=[side,side,side,side,top,side];
    for (const [w,h,x,y] of [[245,7,111,-8],[245,7,111,230],[7,231,-8,111],[7,231,230,111]]) {
      const bar=new T.Mesh(new T.BoxGeometry(w,h,3),mats);bar.position.set(x,y,1);this.mainGroup.add(bar);
    }
    this.centerCanvas.width=512;this.centerCanvas.height=256;
    this.centerTexture=new T.CanvasTexture(this.centerCanvas);this.centerTexture.colorSpace=T.SRGBColorSpace;
    const center=new T.Mesh(new T.BoxGeometry(40,27,2),new T.MeshLambertMaterial({color:0x202821}));center.position.set(111,111,1);this.mainGroup.add(center);
    const panel=new T.Mesh(new T.PlaneGeometry(38,25),new T.MeshBasicMaterial({map:this.centerTexture}));panel.position.set(111,111,2.1);this.mainGroup.add(panel,this.tiles,this.ownTiles);
    this.gap=new T.Mesh(this.body,new T.MeshBasicMaterial({color:0xf4ce7a,transparent:true,opacity:.22,depthWrite:false}));this.gap.visible=false;this.gap.rotation.x=1.02;this.mainGroup.add(this.gap);
    this.reduced.addEventListener('change',this.onMotion);
    this.renderer.domElement.addEventListener('webglcontextlost',this.onLost);
    this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(host);
    document.fonts.ready.then(()=>{if(!this.disposed){this.clearFaces();this.stats.fontRebuilds++;if(this.last)this.replace(this.last.view,this.last.showOwn,this.last.selected,this.last.acquired,this.last.urgent);}});
    document.fonts.addEventListener('loadingdone',this.onFonts);document.addEventListener('hanz-font-ready',this.onFonts);
    this.resize();
  }
  private onMotion=()=>{if(this.reduced.matches)for(const node of this.own.values()){node.mesh.position.copy(node.target);node.duration=0;}this.render();};
  private onLost=(event:Event)=>{event.preventDefault();cancelAnimationFrame(this.frame);this.projected([],[]);this.lost();};
  private onFonts=()=>{if(!this.disposed){this.clearFaces();this.stats.fontRebuilds++;if(this.last)this.replace(this.last.view,this.last.showOwn,this.last.selected,this.last.acquired,this.last.urgent);}};
  private clearFaces(){this.clearOwn();for(const t of this.faces.values())t.dispose();this.faces.clear();}
  private glyph(char:string,transparent=false){
    ensureTileGlyph(char);
    const key=transparent?'punctuation:'+char:char;let texture=this.faces.get(key);if(texture)return texture;
    const canvas=document.createElement('canvas');canvas.width=384;canvas.height=576;
    const ctx=canvas.getContext('2d')!;ctx.scale(2,2);if(!transparent){ctx.fillStyle='#f7efdb';ctx.fillRect(0,0,192,288);}
    ctx.fillStyle=transparent?'#ffe5a2':'#173b2b';ctx.font=tileCanvasFont(transparent?192*(char==='，'?2.8:1.8):148);
    if(transparent){
      // Center the actual ink, not the full-width punctuation advance box.
      ctx.textAlign='left';ctx.textBaseline='alphabetic';const m=ctx.measureText(char),w=m.actualBoundingBoxLeft+m.actualBoundingBoxRight,h=m.actualBoundingBoxAscent+m.actualBoundingBoxDescent;
      ctx.fillText(char,(192-w)/2+m.actualBoundingBoxLeft,(288-h)/2+m.actualBoundingBoxAscent);
      ctx.strokeStyle='rgba(255,225,162,.55)';ctx.lineWidth=3;ctx.strokeRect(7,7,178,274);
    }else{ctx.textAlign='center';ctx.textBaseline='alphabetic';ctx.fillText(char,96,196); /* shared CJK baseline, no per-character stretching */}
    texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=Math.min(8,this.renderer.capabilities.getMaxAnisotropy());this.faces.set(key,texture);return texture;
  }
  private tile(char:string|null){
    const group=new T.Group();const mesh=new T.Mesh(this.body,this.ivory);group.add(mesh);
    if(char){const face=new T.Mesh(this.face,new T.MeshBasicMaterial({map:this.glyph(char)}));face.position.z=2.02;group.add(face);}else{const back=new T.Mesh(this.face,this.back);back.position.z=2.02;group.add(back);}
    return group;
  }
  private clearTiles(){
    this.tiles.traverse(o=>{if(o instanceof T.Mesh&&o.material!==this.ivory&&o.material!==this.back&&o.material!==this.shadow)(o.material as T.Material).dispose();});
    this.tiles.clear();
  }
  replace(view:TableView,showOwn:boolean,selected:string|null,acquired:string|null=null,urgent=false){
    if(this.disposed)return;const old=this.last?.view;if(old&&(old.stamp.roomId!==view.stamp.roomId||old.stamp.roundId!==view.stamp.roundId||rackPhaseKey(old.phase)!==rackPhaseKey(view.phase)||old.viewerId!==view.viewerId||old.suspension.kind!==view.suspension.kind||old.stamp.controlEpoch!==view.stamp.controlEpoch||old.rack?.cells.map(c=>c.tile.tileId).sort().join()!==view.rack?.cells.map(c=>c.tile.tileId).sort().join())){this.preview=null;this.drag=null;}this.last={view,showOwn,selected,acquired,urgent};this.clearTiles();
    const n=view.seats.length;this.frameCamera();
    // Anonymous decoration: edited large decks keep four wall sides; exact remaining count is on the center plaque.
    for(let i=0;i<Math.min(view.wall.count,216);i++){
      const side=Math.floor(i/54),slot=Math.floor((i%54)/2),layer=i%2;
      const g=this.tile(null);const along=(slot-13)*4.6;
      const angle=side*Math.PI/2;g.position.set(111+along*Math.cos(angle)+69*Math.sin(angle),111+along*Math.sin(angle)-69*Math.cos(angle),2+layer*4.1);
      g.rotation.z=angle;g.scale.set(.72,.72,1);g.userData={key:`wall:${i}`,motionKey:i===Math.min(view.wall.count,216)-1?'wall:tail':`wall:${i}`};this.tiles.add(g);
    }
    for(const seat of view.seats){if(!seat.player||seat.relation==='SELF')continue;
      for(let i=0;i<seat.concealed.count;i++){
        const g=this.tile(null),p=seat.placement,a=p.yawRadians,offset=(i-(seat.concealed.count-1)/2)*5;
        g.position.set(p.x+offset*Math.cos(a),p.y+offset*Math.sin(a),5);g.rotation.set(Math.PI/2,0,a,'ZXY');g.scale.setScalar(n>4?.7:.82);g.userData={key:`opponent:${seat.player.playerId}:${i}`,motionKey:`hand:${seat.player.playerId}:${i}`};this.tiles.add(g);
      }
    }
    for(const [i,discard] of view.discards.filter(d=>d.status!=='CLAIMED').slice(-24).entries()){
      const g=this.tile(discard.tile.char);g.position.set(85+(i%8)*7,83+Math.floor(i/8)*10,2.1);g.userData={tileId:discard.tile.tileId,motionKey:`discard:${discard.discardId}`};this.tiles.add(g);
    }
    this.layoutOwn();this.setMotionHidden(this.motionHidden);
    this.stats.capacity=this.tiles.children.length+this.ownTiles.children.length;
    const ctx=this.centerCanvas.getContext('2d')!;ctx.fillStyle='#17251f';ctx.fillRect(0,0,512,256);ctx.fillStyle='#d6bd7e';ctx.textAlign='center';ensureTileGlyph('字 间');ensureUiGlyphs('余牌 / 人桌0123456789');ensureUiGlyphs('0123456789',600);ctx.font=tileCanvasFont(30);ctx.fillText('字 间',256,60);ctx.font=uiCanvasFont(76,600);ctx.fillText(String(view.wall.count),256,153);ctx.font=uiCanvasFont(25);ctx.fillText('余牌  /  '+n+' 人桌',256,213);this.centerTexture.needsUpdate=true;
    this.render();
  }
  private clearOwn(){for(const n of this.own.values())n.mesh.traverse(o=>{if(o instanceof T.Mesh){for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});this.own.clear();this.ownTiles.clear();}
  private ownTile(char:string,comma:boolean){const g=new T.Group();g.add(new T.Mesh(this.body,comma?new T.MeshBasicMaterial({color:0xf3d899,transparent:true,opacity:.14,depthWrite:false}):this.ivory.clone()));const face=new T.Mesh(this.face,new T.MeshBasicMaterial({map:this.glyph(char,comma),transparent:comma,depthWrite:!comma}));face.position.z=2.03;g.add(face);g.rotation.x=1.02;g.scale.set(comma?2*COMMA_WIDTH_RATIO:2,2,2);return g;}
  setRackPreview(preview:Draft|null,drag:RackDrag3D|null){if(this.disposed)return;const previous=this.drag;if(previous&&!drag)for(const [key,n]of this.own)if(key===previous.key){n.from.copy(n.mesh.position);n.started=performance.now();n.duration=this.reduced.matches?0:240;}this.preview=preview;this.drag=drag;this.layoutOwn();this.render();}
  private layoutOwn(){
    const last=this.last,rack=last?.view.rack;this.gap.visible=false;if(!last?.showOwn||!rack){this.clearOwn();return;}
    const draft=this.preview??{orderedTileIds:rack.cells.map(c=>c.tile.tileId),commaAfterTileIds:rack.cells.filter(c=>c.commaAfter).map(c=>c.tile.tileId) as unknown as Draft['commaAfterTileIds']};
    const layout=rackLayout(draft,12,18,.5,Infinity,10,true),keys=new Set(layout.items.map(i=>i.key)),now=performance.now();
    for(const [key,n]of this.own)if(!keys.has(key)){this.ownTiles.remove(n.mesh);n.mesh.traverse(o=>{if(o instanceof T.Mesh)(o.material as T.Material).dispose();});this.own.delete(key);}
    let point:T.Vector3|null=null;if(this.drag){this.scene.updateMatrixWorld(true);this.camera.updateMatrixWorld(true);const ray=new T.Raycaster();ray.setFromCamera(new T.Vector2(this.drag.x/this.size.width*2-1,1-this.drag.y/this.size.height*2),this.camera);point=ray.ray.intersectPlane(new T.Plane(new T.Vector3(0,0,1),-28),new T.Vector3());}
    const draggedItem=layout.items.find(i=>i.key===this.drag?.key);
    for(const item of layout.items){const cell=rack.cells.find(c=>c.tile.tileId===item.tileId);if(!cell)continue;const target=new T.Vector3(111+item.x+item.width/2-layout.width/2,13,10+(item.kind==='tile'&&last.selected===item.tileId?3:0));let node=this.own.get(item.key);
      if(!node){const mesh=this.ownTile(item.kind==='period'?'。':item.kind==='comma'?'，':cell.tile.char,item.kind!=='tile');mesh.position.copy(target);mesh.userData={tileId:item.tileId,kind:item.kind};node={mesh,tileId:item.tileId,kind:item.kind,target:target.clone(),from:target.clone(),started:now,duration:0};this.own.set(item.key,node);this.ownTiles.add(mesh);}
      node.tileId=item.tileId;
      if(item.kind==='tile'){const fresh=last.acquired===item.tileId,body=node.mesh.children[0] as T.Mesh<T.BufferGeometry,T.MeshLambertMaterial>;body.material.color.setHex(last.urgent?0xf47b73:fresh?0xffd56a:0xf1e8cf);body.material.emissive.setHex(last.urgent?0x6d100c:fresh?0x5a3709:0x000000);const face=node.mesh.children[1] as T.Mesh<T.BufferGeometry,T.MeshBasicMaterial>;face.material.map=this.glyph(cell.tile.char);face.material.color.setHex(last.urgent?0xffb0a5:fresh?0xffedb2:0xffffff);}
      const floating=!!this.drag&&(item.key===this.drag.key);
      node.mesh.visible=(item.kind!=='tile'||!this.motionHidden.has(`tile:${item.tileId}`))&&!(floating&&this.drag?.external);node.mesh.traverse(o=>{if(o instanceof T.Mesh){o.renderOrder=floating?1000:0;(o.material as T.Material).depthTest=!floating;}});
      if(floating&&point&&draggedItem){node.mesh.position.copy(point);node.mesh.position.x+=item.x+item.width/2-draggedItem.x-draggedItem.width/2;node.target.copy(target);node.from.copy(node.mesh.position);node.started=now;node.duration=this.reduced.matches?0:240;
        if(item.key===this.drag?.key){this.gap.visible=true;this.gap.scale.set(item.kind==='comma'?2*COMMA_WIDTH_RATIO:2,2,2);this.gap.position.copy(target);}}
      else if(node.target.distanceToSquared(target)>.0001){node.from.copy(node.mesh.position);node.target.copy(target);node.started=now;node.duration=this.reduced.matches?0:180;}
    }
  }
  /** Viewport-space bounds of the actual rendered geometry, never hidden tile identities. */
  motionAnchors():MotionAnchors{
    const out:MotionAnchors={},area=this.host.getBoundingClientRect();this.scene.updateMatrixWorld(true);this.camera.updateMatrixWorld(true);
    const bounds=(g:T.Object3D):MotionRect=>{const points=[];for(const x of [-3,3])for(const y of [-4.5,4.5])points.push(g.localToWorld(new T.Vector3(x,y,2.1)).project(this.camera));const xs=points.map(p=>area.left+(p.x+1)*area.width/2),ys=points.map(p=>area.top+(1-p.y)*area.height/2);return{x:(Math.min(...xs)+Math.max(...xs))/2,y:(Math.min(...ys)+Math.max(...ys))/2,width:Math.max(...xs)-Math.min(...xs),height:Math.max(...ys)-Math.min(...ys)};};
    for(const g of this.tiles.children)if(g.userData.motionKey)out[g.userData.motionKey]=bounds(g);
    for(const n of this.own.values())if(n.kind==='tile')out[`tile:${n.tileId}`]=bounds(n.mesh);
    const ownRack=this.last?.view.rack;if(ownRack&&this.last){for(let i=0;i<=14;i++){const cell=ownRack.cells[i],real=cell&&out[`tile:${cell.tile.tileId}`];if(real){out[`hand:${this.last.view.viewerId}:${i}`]=real;continue;}const ids=ownRack.cells.map(c=>c.tile.tileId);while(ids.length<=i)ids.push(`presentation-slot-${ids.length}` as Draft['orderedTileIds'][number]);const l=rackLayout({orderedTileIds:ids,commaAfterTileIds:ownRack.cells.filter(c=>c.commaAfter).map(c=>c.tile.tileId) as unknown as Draft['commaAfterTileIds']},12,18,.5,Infinity,10,true),slot=l.items.find(t=>t.kind==='tile'&&t.tileId===ids[i])!;const g=new T.Object3D();g.position.set(111+slot.x+slot.width/2-l.width/2,13,10);g.rotation.x=1.02;g.scale.set(2,2,2);g.updateMatrixWorld(true);out[`hand:${this.last.view.viewerId}:${i}`]=bounds(g);}}
    // A reserved public tile can land beside a concealed opponent rack without inventing its contents.
    for(const seat of this.last?.view.seats??[]){if(!seat.player||seat.relation==='SELF')continue;const count=seat.concealed.count,p=seat.placement,a=p.yawRadians;for(let i=count;i<=14;i++){const g=new T.Object3D(),offset=(i-(count-1)/2)*5;g.position.set(p.x+offset*Math.cos(a),p.y+offset*Math.sin(a),5);g.rotation.set(Math.PI/2,0,a,'ZXY');g.scale.setScalar(this.last!.view.seats.length>4?.7:.82);g.updateMatrixWorld(true);out[`hand:${seat.player.playerId}:${i}`]=bounds(g);}}
    return out;
  }
  setMotionHidden(keys:Set<string>){this.motionHidden=new Set(keys);for(const g of this.tiles.children)g.visible=!keys.has(g.userData.motionKey);for(const n of this.own.values())n.mesh.visible=(n.kind!=='tile'||!keys.has(`tile:${n.tileId}`))&&!(this.drag?.external&&(this.drag.key===(n.kind==='period'?'period':`${n.kind}:${n.tileId}`)));this.render();}
  /** Portrait uses its real available height; fit the table in perspective, never stretch the canvas. */
  private frameCamera(){
    if(matchMedia('(max-width:699px) and (orientation:portrait)').matches){
      const aspect=this.size.width/this.size.height;
      const angle=Math.PI*(.12+.18*Math.min(1,Math.max(0,(aspect-1)/.7)));
      const sin=Math.sin(angle),cos=Math.cos(angle),tan=Math.tan(this.camera.fov*Math.PI/360);
      let distance=0;
      // Include rim and raised hands in the fit, with a small safe edge for hit targets.
      for(const x of [-124,124])for(const y of [-124,124])for(const z of [0,24]){
        distance=Math.max(distance,Math.abs(x)/(tan*aspect*.96)-sin*y+cos*z,Math.abs(cos*y+sin*z)/(tan*.94)-sin*y+cos*z);
      }
      this.camera.far=Math.max(1000,distance+250);this.camera.updateProjectionMatrix();
      this.camera.position.set(0,-distance*sin,distance*cos);this.camera.rotation.set(angle,0,0);
    }else{
      this.camera.far=1000;this.camera.updateProjectionMatrix();
      const zoom=(this.last?.view.seats.length??4)>4?1.08:1;
      this.camera.position.set(0,-222*1.44*zoom,222*1.05*zoom);this.camera.rotation.set(Math.PI*.3,0,0);
    }
  }
  private resize(){const width=this.host.clientWidth,height=this.host.clientHeight;if(!width||!height)return;this.size={width,height};this.renderer.setSize(width,height);this.camera.aspect=width/height;this.frameCamera();this.camera.updateProjectionMatrix();this.render();}
  private render(){cancelAnimationFrame(this.frame);this.frame=requestAnimationFrame(()=>{
    if(this.disposed)return;let moving=false;const now=performance.now();for(const [key,n]of this.own){const floating=this.drag&&(key===this.drag.key);if(floating)continue;const t=n.duration?Math.min(1,(now-n.started)/n.duration):1,eased=1-Math.pow(1-t,3);n.mesh.position.lerpVectors(n.from,n.target,eased);if(this.last?.urgent&&!this.reduced.matches&&n.kind==='tile'){n.mesh.position.x+=Math.sin(now/32+n.target.x*.7)*.35;moving=true;}if(t<1)moving=true;}this.scene.updateMatrixWorld(true);this.camera.updateMatrixWorld(true);this.renderer.render(this.scene,this.camera);this.stats.renders++;
    const {width:w,height:h}=this.size;
    const project=(v:T.Vector3)=>{v.project(this.camera);return{x:(v.x+1)*w/2,y:(1-v.y)*h/2};};
    const hits=[...this.own.values()].sort((a,b)=>a.target.x-b.target.x).map(({mesh,tileId,kind})=>{const points=[];for(const x of [-3,3])for(const y of [-4.5,4.5])points.push(project(mesh.localToWorld(new T.Vector3(x,y,2.1))));const xs=points.map(p=>p.x),ys=points.map(p=>p.y);return{tileId,comma:kind==='comma',kind,x:Math.min(...xs),y:Math.min(...ys),width:Math.max(...xs)-Math.min(...xs),height:Math.max(...ys)-Math.min(...ys)};});
    const labels=this.last?.view.seats.map(s=>({seat:s.logicalSeat,...project(new T.Vector3(s.placement.x,s.placement.y,13))}))??[];
    const center=project(new T.Vector3(111,111,3)),left=project(new T.Vector3(51,111,3)),right=project(new T.Vector3(171,111,3));
    this.projected(hits,labels,{...center,width:Math.abs(right.x-left.x)});if(moving)this.render();
  });}
  refresh(){this.render();}
  diagnostics(){return{...this.stats,memory:{...this.renderer.info.memory},calls:this.renderer.info.render.calls,dpr:this.renderer.getPixelRatio()};}
  dispose(){if(this.disposed)return;this.disposed=true;this.reduced.removeEventListener('change',this.onMotion);cancelAnimationFrame(this.frame);this.observer.disconnect();document.fonts.removeEventListener('loadingdone',this.onFonts);document.removeEventListener('hanz-font-ready',this.onFonts);this.renderer.domElement.removeEventListener('webglcontextlost',this.onLost);this.clearTiles();this.clearFaces();const geometries=new Set<T.BufferGeometry>(),materials=new Set<T.Material>();this.scene.traverse(o=>{if(o instanceof T.Mesh){geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);}});for(const g of geometries)g.dispose();for(const m of materials)m.dispose();this.body.dispose();this.face.dispose();this.ivory.dispose();this.back.dispose();this.shadow.dispose();this.centerTexture.dispose();this.renderer.dispose();this.renderer.forceContextLoss();this.renderer.domElement.remove();}
}
