import './main.css';
import { Scene, PerspectiveCamera, PlaneGeometry, MeshBasicMaterial, Mesh, WebGLRenderer, VideoTexture, LinearFilter, RGBFormat } from "three";

import * as Stats from "stats.js"
let stats = new Stats();
stats.showPanel( 0 ); // 0: fps, 1: ms, 2: mb, 3+: custom
document.body.appendChild( stats.dom );

import video3src from "./media/Memo2.webm";
import video4src from "./media/Memo2pair.webm";
import video5src from "./media/Memo3.webm";
import video6src from "./media/Memo3pair.webm";
import video1src from "./media/Memo4.webm";
import video2src from "./media/Memo4pair.webm";
let videoSrcs = [
    video1src,
    video2src,
    video3src,
    video4src,
    video5src,
    video6src,
];
let planeData = [
    {pos: [-.5,0,3-5], rot:  [0,35,0]},
    {pos: [.5,0,3-5], rot:  [0,-35,0]},
    {pos: [-0.7,0,5-9], rot:  [0,35,0]},
    {pos: [0.7,0,5-9], rot:  [0,-35,0]},
    {pos: [-1.0,0,5-11], rot:  [0,35,0]},
    {pos: [1.0,0,5-11], rot:  [0,-35,0]},
];

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



// (window as any).video1src = video1src;
// (window as any).video2src = video1src;
// (window as any).video3src = video1src;
// (window as any).video4src = video1src;
// (window as any).video5src = video1src;
// (window as any).video6src = video1src;


// console.log("Hello World");

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
    let geometry = new PlaneGeometry( 1, 1, 1 );
    let material = makeMaterial(video);
    let plane = new Mesh( geometry, material );
    return plane;
}

let scene = new Scene();
let camera = new PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
camera.position.z=-1;

let renderer = new WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
renderer.setClearColor("black");
document.body.appendChild( renderer.domElement );

let vids = videoSrcs.map(makeVideo);
let planes = vids.map(makePlane);

for (let i = 0; i < planes.length; i++) {
    let pos = planeData[i].pos;
    let rot = planeData[i].rot;
    planes[i].position.set(pos[0],pos[1], pos[2]);
    planes[i].rotation.set(0,rot[1]*2*Math.PI/360,0);
    scene.add( planes[i] );
}
// plane.rotation.set(Math.PI/3,Math.PI/3,Math.PI/3);

window.addEventListener("click", () => {
    vids.forEach(vid => {
        vid.play();
    });
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
    camera.rotation.set(0,-frac*0.3,0);
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

    video.muted = true;
    return video;
}

function renderLoop () {
    stats.begin();
    renderer.render(scene, camera);
    stats.end();
    requestAnimationFrame(renderLoop);
}

requestAnimationFrame(renderLoop);
