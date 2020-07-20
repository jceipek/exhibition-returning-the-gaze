import './main.css';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { Vector2, Vector3,BoxGeometry, Line, LineBasicMaterial, BufferAttribute, BufferGeometry, Material, Group, Scene, PerspectiveCamera, PlaneGeometry, MeshBasicMaterial, Mesh, WebGLRenderer, VideoTexture, LinearFilter, RGBFormat, Object3D } from "three";

import * as Stats from "stats.js"
let stats = new Stats();
stats.showPanel( 0 ); // 0: fps, 1: ms, 2: mb, 3+: custom
document.body.appendChild( stats.dom );


// // Performance Monitor
// import * as Stats from "stats.js"
// let stats = new Stats();
// stats.showPanel( 0 ); // 0: fps, 1: ms, 2: mb, 3+: custom
// document.body.appendChild( stats.dom );

// // DRACO compressed model loader
const draco = new DRACOLoader()
// TODO(JULIAN): Figure out why loading locally doesn't work!
//draco.setDecoderPath('./draco/gltf/');
draco.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');
draco.preload();

import eyesSrc from "./media/eyes.webm";
import video1src from "./media/KW.webm";
import drone from "./models/drone1.glb";

const EyesVideo = makeVideo(eyesSrc);
const EyesMaterial: Material = makeMaterial(EyesVideo);

// import video2src from "./media/V04 lowRES.webm";
// import video3src from "./media/V05.webm";
// import video4src from "./media/V03.webm";
// import video5src from "./media/V06.webm";
let videoSrcs = [
    video1src,
    // video2src,
    // video3src,
    // video4src,
    // video5src,
];
let planeData = [
    {pos: [0,0,-7], rot:  [0,0,0]},
    // {pos: [1,0,4-5], rot:  [0,-30,0]},
    // {pos: [-1,0,3-8], rot:  [0,35,0]},
    // {pos: [1,0,5-8], rot:  [0,-15,0]},
    // {pos: [0,0,3-10], rot: [0,0,0]},
];


var material = new LineBasicMaterial( { color: 0x000000 } );

var points = [];
points.push( new Vector3(7, 4 , -7 ) );
points.push( new Vector3( 7, 4, 0 ) );

points.push( new Vector3( 0, 0, -7 ) );
points.push( new Vector3( 7, -4, 0 ) );

points.push( new Vector3( 0, 0, -7 ) );
points.push( new Vector3( -7, -4, 7 ) );

points.push( new Vector3( 0, 0, -7 ) );
points.push( new Vector3( -7, 4, 7 ) );




var geometry1 = new BufferGeometry().setFromPoints( points );
var line = new Line( geometry1, material );


// 



interface Drone {
    group: Group    
}



const drones : Drone[]  = [];



const loader = new GLTFLoader();
loader.setDRACOLoader( draco );

function adjustuvs(droneindex: number){
    console.log('generatingfunction' , droneindex);
return (node: any) => {
    if(node  instanceof Mesh){
        // node.material = node.material.clone(); 
        console.log(node.material.name);
    }
    if (node instanceof Mesh && node.material.name === "screens") {
        node.material = EyesMaterial;
        let g: BufferGeometry = node.geometry;

        // console.log(g.attributes.uv.array);
        // console.log(g.attributes.uv);
        
        //offset of UV cordinate
        const columns= 5;
        const rows= 1;
        const columnsWidth= 1/columns;
        const rowsWidth= 1/rows;

        let yOffset = (Math.floor (droneindex/columns))*rowsWidth;
        let xOffset = (droneindex-columns*yOffset)*columnsWidth;
        console.log ('xOffset=', xOffset, 'yoffset =', yOffset, 'droneindex= ',droneindex);
        
        let uvAttr : BufferAttribute = g.attributes.uv as BufferAttribute;
        let arry = uvAttr.array as Float32Array;
        for (let i = 0; i < uvAttr.array.length; i+=2) {
            arry.set([uvAttr.array[i]+xOffset],i);
            arry.set([uvAttr.array[i+1]+yOffset],i+1);
        }
        uvAttr.needsUpdate = true;
    }
}};


loader.load( drone, function ( file ) {
    let model = file.scene;
    for (let droneindex= 0; droneindex<10; droneindex++){
            model = model.clone();
            drones.push({
                group: model
            });
            console.log(droneindex);
            model.traverse(adjustuvs(droneindex));
        
        
        
            scene.add(model);
            // scene.add(myMesh);
           
    }
      
}, undefined, function ( error ) {
    console.error( error );
} );



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



(window as any).video1src = video1src;

console.log("Hello World");

function makeVideoTex(video: HTMLVideoElement) {
    let texture = new VideoTexture( video );
    texture.minFilter = LinearFilter;
    texture.magFilter = LinearFilter;
    texture.format = RGBFormat;
    return texture;
}

function makeMaterial(video: HTMLVideoElement) {
    return new MeshBasicMaterial( {map: makeVideoTex(video)} );
}

function makePlane(video: HTMLVideoElement) {
    let geometry = new PlaneGeometry( 1.77777, 1, 1 );
    let material = makeMaterial(video);
    let plane = new Mesh( geometry, material );
    return plane;
}

let scene = new Scene();

let camera = new PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );

let renderer = new WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
renderer.setClearColor("white");
document.body.appendChild( renderer.domElement );

let vids = videoSrcs.map(makeVideo);
let planes = vids.map(makePlane);

for (let i = 0; i < planes.length; i++) {
    let pos = planeData[i].pos;
    let rot = planeData[i].rot;
    planes[i].position.set(pos[0],pos[1], pos[2]);
    planes[i].rotation.set(0,rot[1]*2*Math.PI/360,0);
    scene.add( planes[i] );
    scene.add( line );
}
// plane.rotation.set(Math.PI/3,Math.PI/3,Math.PI/3);

window.addEventListener("click", () => {
    vids.forEach(vid => {
        vid.play();
    });
    EyesVideo.play();
});

const STATE = {
    frac: 0
};

window.addEventListener("wheel", (scrollEvt) => {
    let evt = normalizeWheel(scrollEvt);
    let length = 6.5;
    STATE.frac -= evt.pixelY * 0.0001 * length;
    STATE.frac = Math.max(0, Math.min(1,STATE.frac));
    camera.position.set(0,0,STATE.frac*-length);
});

window.addEventListener("mousemove", (evt) => {
    let frac = (evt.clientX-window.innerWidth/2)/(window.innerWidth/2); // [-1..1]
    camera.rotation.set(0,-frac*1.3,0);
});

window.addEventListener("resize", () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
});

function makeVideo(webmSource:string) : HTMLVideoElement {
    let video = document.createElement("video");
    if (video.canPlayType("video/webm")) {
        video.src = webmSource;
    } else {
        // Not supported
    }
    
    video.width = 640;
    video.height = 480;
    video.loop = true;

    video.preload = 'auto';

    video.muted = false;
    return video;
}

//Perlin Noise
const p = new Uint8Array(512), permutation = new Uint8Array([ 151,160,137,91,90,15,
    131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,8,99,37,240,21,10,23,
    190, 6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,35,11,32,57,177,33,
    88,237,149,56,87,174,20,125,136,171,168, 68,175,74,165,71,134,139,48,27,166,
    77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,55,46,245,40,244,
    102,143,54, 65,25,63,161, 1,216,80,73,209,76,132,187,208, 89,18,169,200,196,
    135,130,116,188,159,86,164,100,109,198,173,186, 3,64,52,217,226,250,124,123,
    5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,189,28,42,
    223,183,170,213,119,248,152, 2,44,154,163, 70,221,153,101,155,167, 43,172,9,
    129,22,39,253, 19,98,108,110,79,113,224,232,178,185, 112,104,218,246,97,228,
    251,34,242,193,238,210,144,12,191,179,162,241, 81,51,145,235,249,14,239,107,
    49,192,214, 31,181,199,106,157,184, 84,204,176,115,121,50,45,127, 4,150,254,
    138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180
    ]);
   for (let i=0; i < 256 ; i++) p[256+i] = p[i] = permutation[i];
function noise(x: number, y: number, z: number): number {
    let X = Math.floor(x)|0 & 255,                  // FIND UNIT CUBE THAT
        Y = Math.floor(y)|0 & 255,                  // CONTAINS POINT.
        Z = Math.floor(z)|0 & 255;
    x -= Math.floor(x);                                // FIND RELATIVE X,Y,Z
    y -= Math.floor(y);                                // OF POINT IN CUBE.
    z -= Math.floor(z);
    let u = fade(x),                                // COMPUTE FADE CURVES
        v = fade(y),                                // FOR EACH OF X,Y,Z.
        w = fade(z);
    let A = p[X  ]+Y, AA = p[A]+Z, AB = p[A+1]+Z,      // HASH COORDINATES OF
        B = p[X+1]+Y, BA = p[B]+Z, BB = p[B+1]+Z;      // THE 8 CUBE CORNERS,

    return lerp(w, lerp(v, lerp(u, grad(p[AA  ], x  , y  , z   ),  // AND ADD
                                   grad(p[BA  ], x-1, y  , z   )), // BLENDED
                           lerp(u, grad(p[AB  ], x  , y-1, z   ),  // RESULTS
                                   grad(p[BB  ], x-1, y-1, z   ))),// FROM  8
                   lerp(v, lerp(u, grad(p[AA+1], x  , y  , z-1 ),  // CORNERS
                                   grad(p[BA+1], x-1, y  , z-1 )), // OF CUBE
                           lerp(u, grad(p[AB+1], x  , y-1, z-1 ),
                                   grad(p[BB+1], x-1, y-1, z-1 ))));
 }
 function fade(t: number): number { return t * t * t * (t * (t * 6 - 15) + 10); }
 function lerp(t: number, a: number, b: number): number { return a + t * (b - a); }
 function grad(hash: number, x: number, y: number, z: number): number {
    let h = (hash|0) & 15;                      // CONVERT LO 4 BITS OF HASH CODE
    let u = h<8 ? x : y,                 // INTO 12 GRADIENT DIRECTIONS.
           v = h<4 ? y : h==12||h==14 ? x : z;
    return ((h&1) == 0 ? u : -u) + ((h&2) == 0 ? v : -v);
 }


let startTs = Date.now();
function renderLoop () {
    stats.begin();

// for(let j=0; j<50; j++){
//     let q= Math.random()*Math.floor(5);
//     console.log('q=', q);
// // }

     
    for (let i = 0; i < drones.length; i++) {
        // console.log( 'drones number=', drones.length);
        drones[i].group.position.set(Math.sin(i*1.3)+0.2,Math.sin(i*0.9)+1.1,i-6.5);
        drones[i].group.rotation.set(noise(0,(Date.now()-startTs)*0.001,0)*0.1, noise(0,(Date.now()-startTs)*0.001,0)*0.2,0);
    }   
    // if(drones.length>0){
    // drones[0].group.position.set(0,0,  (noise(0, 0,(Date.now()-startTs)*0.001)*0.1)/(camera.position.z-3));
    // }
    // if(drones.length>0){
    // drones[1].group.position.set(-2.1,q,-2);
    // }

    renderer.render(scene, camera);
    stats.end();
    requestAnimationFrame(renderLoop);
}

requestAnimationFrame(renderLoop);
