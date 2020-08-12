import { Scene, PerspectiveCamera, PlaneGeometry, MeshBasicMaterial, Mesh, WebGLRenderer, VideoTexture, LinearFilter, RGBFormat } from "three";
import { normalizeWheel } from "../utils"
import { Halls, Hall, HallState } from "../common"

import video1src from "../media/Mask03.webm";
import video2src from "../media/Mask02.webm";
import video3src from "../media/Mask04.webm";
import video4src from "../media/Mask05.webm";
import video5src from "../media/Mask01.webm";
import iconPath from "../media/map/eyes.png";

interface MasksHall extends Hall {
    state: {
        videoSrcs: string[],
        planeData: { pos: [number, number, number], rot: [number, number, number] }[],
        vids: HTMLVideoElement[],
        scene: Scene,
        camera: PerspectiveCamera,
        progressFrac: number,
        loadedOnce: boolean
    }
}

const thisHall: MasksHall = {
    name: "Hall of Eyes",
    iconPath,
    introId: "js-eyes-hall",
    state: {
        videoSrcs: [],
        planeData: [],
        vids: [],
        scene: new Scene(),
        camera: new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000),
        progressFrac: 0,
        loadedOnce: false
    },
    setup: async function (): Promise<void> {
        function postLoad () {
            console.log("Postload - masks");
            thisHall.state.progressFrac= 0;
            thisHall.state.camera.position.set(0, 0, 0);
        }
        return new Promise<void>((resolve) => {
            if (!thisHall.state.loadedOnce) {
                let state = thisHall.state;
                // state.videoSrcs = [
                //     video1src,
                //     video2src,
                //     video3src,
                //     video4src,
                //     video5src,
                //     video6src,
                // ];
                state.videoSrcs = [
                    video1src,
                    video2src,
                    video3src,
                    video4src,
                    video5src,
                ];
                state.planeData = [
                    {pos: [-1,0,3-5-1], rot:  [0,45,0]},
                    {pos: [1,0,4-5-1], rot:  [0,-30,0]},
                    {pos: [-1,0,3-8-1], rot:  [0,35,0]},
                    {pos: [1,0,5-8-1], rot:  [0,-15,0]},
                    {pos: [0,0,3-10-1], rot: [0,0,0]},
                ];
                
                Promise.all(state.videoSrcs.map(makeVideo)).then((videos) => {
                    state.vids = videos;
                    
                    let planes = state.vids.map(makePlane);
                    for (let i = 0; i < planes.length; i++) {
                        let pos = state.planeData[i].pos;
                        let rot = state.planeData[i].rot;
                        planes[i].position.set(pos[0],pos[1], pos[2]);
                        planes[i].rotation.set(0,rot[1]*2*Math.PI/360,0);
                        state.scene.add( planes[i] );
                    }
                    // plane.rotation.set(Math.PI/3,Math.PI/3,Math.PI/3);
                    thisHall.state.loadedOnce = true;
                    postLoad();
                    resolve();
                });
            } else {
                // Already loaded
                postLoad();
                resolve();
            }
        });
    },
    onEnter: function (renderer: WebGLRenderer) {
        renderer.setClearColor("black");
        thisHall.state.vids.forEach(vid => {
            vid.muted = false;
            vid.play();
        });
        registerEventListeners();
    },
    onLeave: function () {
        thisHall.state.vids.forEach(vid => {
            vid.muted = true;
        });
        removeEventListeners();
    },
    render: function (renderer) {
        renderer.render(thisHall.state.scene, thisHall.state.camera);
    },
    resize: function () {
        thisHall.state.camera.aspect = window.innerWidth / window.innerHeight;
        thisHall.state.camera.updateProjectionMatrix();
        
    },
    teardown: async function () : Promise<void> {
        return new Promise<void>((resolve) => {
            resolve();
        });
    },
    getProgressFrac: function (): number {
        return thisHall.state.progressFrac;
    },
}
export = thisHall;

interface WindowListeners {
    [key: string]: EventListenerOrEventListenerObject,
}

const windowEventListeners: WindowListeners = {
    wheel: (scrollEvt: WheelEvent) => {
        let evt = normalizeWheel(scrollEvt);
        let length = 7.5;
        thisHall.state.progressFrac -= evt.pixelY * 0.0001 * length;
        thisHall.state.progressFrac = Math.max(0, Math.min(1, thisHall.state.progressFrac));
        thisHall.state.camera.position.set(0, 0, thisHall.state.progressFrac * -length);
    },
    mousemove: (evt: MouseEvent) => {
        let frac = (evt.clientX - window.innerWidth / 2) / (window.innerWidth / 2); // [-1..1]
        thisHall.state.camera.rotation.set(0, -frac * 0.3, 0);
    },
}

function registerEventListeners() {
    for (let listener in windowEventListeners) {
        if (windowEventListeners.hasOwnProperty(listener)) {
            window.addEventListener(listener, windowEventListeners[listener]);
        }
    }
}

function removeEventListeners() {
    for (let listener in windowEventListeners) {
        if (windowEventListeners.hasOwnProperty(listener)) {
            window.removeEventListener(listener, windowEventListeners[listener]);
        }
    }
}


async function makeVideo(webmSource: string): Promise<HTMLVideoElement> {
    let video = document.createElement("video");
    let isSupported = video.canPlayType("video/webm");

    return new Promise<HTMLVideoElement>((resolve, reject) => {
        if (isSupported) {
            video.src = webmSource;
            video.width = 640;
            video.height = 480;
            video.loop = true;
        
            video.preload = 'auto';
            video.muted = true;
    
            function onCanPlay () {
                console.log(webmSource);
                resolve(video);
                video.removeEventListener("canplay", onCanPlay);
            }

            video.addEventListener("canplay", onCanPlay);
        } else {
            reject("Your browser doesn't support webm videos.");
        }
    });
}








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










