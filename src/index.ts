import './main.css';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { Scene, PerspectiveCamera, PlaneGeometry, MeshBasicMaterial, Mesh, WebGLRenderer,
    VideoTexture, LinearFilter, RGBFormat,
    PointLight, HemisphereLight, DirectionalLight,SpotLight,
    LineBasicMaterial,
    WireframeGeometry,
    Object3D,
    Material, 
    BufferGeometry,
    Line,Group,
    Matrix4, Vector3, ReinhardToneMapping } from "three";


import maskLocations from "./masksLocation"
import maskSrc from './models/test.glb';

const DEBUG = {
    red: new LineBasicMaterial( { color: 0xff0000 } ),
    green: new LineBasicMaterial( { color: 0x00ff00 } ),
    blue: new LineBasicMaterial( { color: 0x0000ff } ),
};
function makeDebugLines(pos:[number,number,number], right: Vector3, up: Vector3, forward: Vector3) {
    let points = [];
    points.push( new Vector3( pos[0], pos[1], pos[2] ) );
    points.push( new Vector3( pos[0]+right.x, pos[1]+right.y, pos[2]+right.z ) );
    let rightGeometry = new BufferGeometry();
    rightGeometry.setFromPoints( points );
    let rightLine = new Line( rightGeometry, DEBUG.red );

    points = [];
    points.push( new Vector3( pos[0], pos[1], pos[2] ) );
    points.push( new Vector3( pos[0]+up.x, pos[1]+up.y, pos[2]+up.z ) );
    let upGeometry = new BufferGeometry();
    upGeometry.setFromPoints( points );
    let upLine = new Line( upGeometry, DEBUG.green );

    points = [];
    points.push( new Vector3( pos[0], pos[1], pos[2] ) );
    points.push( new Vector3( pos[0]+forward.x, pos[1]+forward.y, pos[2]+forward.z ) );
    let forwardGeometry = new BufferGeometry();
    forwardGeometry.setFromPoints( points );
    let forwardLine = new Line( forwardGeometry, DEBUG.blue );

    let group = new Group();
    // group.add( rightLine );
    // group.add( upLine );
    // group.add( forwardLine );
    return group;
}


// Performance Monitor
import * as Stats from "stats.js"
let stats = new Stats();
stats.showPanel( 0 ); // 0: fps, 1: ms, 2: mb, 3+: custom
document.body.appendChild( stats.dom );

// DRACO compressed model loader
const draco = new DRACOLoader()
// TODO(JULIAN): Figure out why loading locally doesn't work!
//draco.setDecoderPath('./draco/gltf/');
draco.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');
draco.preload();

const loader = new GLTFLoader();
loader.setDRACOLoader( draco );

// Reasonable defaults
const PIXEL_STEP  = 10;
const LINE_HEIGHT = 40;
const PAGE_HEIGHT = 800;
// from https://stackoverflow.com/questions/5527601/normalizing-mousewheel-speed-across-browsers
function normalizeWheel(event: any) : any {
  let sX = 0, sY = 0,       // spinX, spinY
      pX = 0, pY = 0;       // pixelX, pixelY

  // Legacy
  if ('detail'      in event) { sY = event.detail; }
  if ('wheelDelta'  in event) { sY = -event.wheelDelta / 120; }
  if ('wheelDeltaY' in event) { sY = -event.wheelDeltaY / 120; }
  if ('wheelDeltaX' in event) { sX = -event.wheelDeltaX / 120; }

  // side scrolling on FF with DOMMouseScroll
  if ( 'axis' in event && event.axis === event.HORIZONTAL_AXIS ) {
    sX = sY;
    sY = 0;
  }

  pX = sX * PIXEL_STEP;
  pY = sY * PIXEL_STEP;

  if ('deltaY' in event) { pY = event.deltaY; }
  if ('deltaX' in event) { pX = event.deltaX; }

  if ((pX || pY) && event.deltaMode) {
    if (event.deltaMode == 1) {          // delta in LINE units
      pX *= LINE_HEIGHT;
      pY *= LINE_HEIGHT;
    } else {                             // delta in PAGE units
      pX *= PAGE_HEIGHT;
      pY *= PAGE_HEIGHT;
    }
  }

  // Fall-back if spin cannot be determined
  if (pX && !sX) { sX = (pX < 1) ? -1 : 1; }
  if (pY && !sY) { sY = (pY < 1) ? -1 : 1; }

  return { spinX  : sX,
           spinY  : sY,
           pixelX : pX,
           pixelY : pY };
}

let scene = new Scene();
let camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000 );
camera.position.set (0,1.5,0);

let light = new HemisphereLight( 0xffffff, 0x000000, 0.1);
scene.add( light );

let light2= new SpotLight(0xFFFFFF,1,50);
light2.castShadow= true;
light2.position.set(0,-5,0);
scene.add(light2);



// let geometry= new TorusGeometry(0.06,0.01,2,100);
// let material= new MeshBasicMaterial({color: 0xFF00CC});
// let torus= new Mesh (geometry,material);
// for( let i= 0; i<maskLocations.length;i++){
//     let pos = maskLocations[i][2];
//     // let screens = torus.clone();
//     let geometry= new TorusGeometry(0.06,0.01,2,100);
//     let material= new MeshBasicMaterial({color: 0xFF00CC});
//     let screens= new Mesh (geometry,material);
//     screens.position.set(pos[0],pos[1],pos[2]);
//     scene.add(screens);
// }


loader.load( maskSrc, function ( geometry ) {
    let model = geometry.scene;

    let m = new Matrix4();
    let u = new Vector3();
    let v = new Vector3();
    let n = new Vector3();

    
    for( let i= 0; i<maskLocations.length;i++){
        let pos = maskLocations[i][2];
        let screens = model.clone();
        screens.position.set(pos[0],pos[2],pos[1]);
        
        u.set(maskLocations[i][0][0], maskLocations[i][0][2], maskLocations[i][0][1]); //side
        v.set(maskLocations[i][1][0], maskLocations[i][1][2], maskLocations[i][1][1]); //up
        n.crossVectors(v,u); //normal

        
        screens.lookAt(pos[0]+n.x,pos[2]-n.y,pos[1]+n.z);
        // screens.lookAt(pos[0]+v.x,pos[2]+v.y,pos[1]+v.z);
        scene.add(screens);

        // This is the same as: 
        //let row = maskLocations[i]; 
        // let position = row[2];
    }
}, undefined, function ( error ) {
    console.error( error );
} );

let renderer = new WebGLRenderer({antialias: true});
renderer.setSize( window.innerWidth, window.innerHeight );
renderer.setClearColor("black");
renderer.toneMapping = ReinhardToneMapping;
renderer.toneMappingExposure= 2.3;
// renderer.shadowMap.enabled= true;
document.body.appendChild( renderer.domElement );


window.addEventListener("click", () => {

});

const STATE = {
    frac: 0,
    frac2: 0
};

window.addEventListener("wheel", (scrollEvt) => {
    let evt = normalizeWheel(scrollEvt);
    let length = Math.PI*2;
    STATE.frac -= evt.pixelY * 0.001 * length;
    // STATE.frac = Math.max(0, Math.min(1,STATE.frac));

    STATE.frac2 -= evt.pixelX * 0.0001 * length;
    // STATE.frac2 = Math.max(0, Math.min(1,STATE.frac2));
    // TODO: Rotate
    // camera.rotation.set(0,STATE.frac*length,STATE.frac2*length);
    camera.rotation.set(0,STATE.frac*length,0);
});

window.addEventListener("mousemove", (evt) => {
    let frac = (evt.clientY-window.innerHeight/2)/(window.innerHeight/2); // [-1..1]
    camera.rotation.set(-frac*0.9,0,0);
});

window.addEventListener("resize", () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
});

function renderLoop () {
    stats.begin();
    renderer.render(scene, camera);
    light2.position.set(
        camera.position.x+10,
        camera.position.y+10,
        camera.position.z+10
    );
    stats.end();
    requestAnimationFrame(renderLoop);
}

requestAnimationFrame(renderLoop);
