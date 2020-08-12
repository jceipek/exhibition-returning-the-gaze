import { Scene, PerspectiveCamera, PlaneGeometry, MeshBasicMaterial, Mesh, WebGLRenderer, VideoTexture, LinearFilter, RGBFormat } from "three";
import { normalizeWheel } from "../utils"
import { Halls, Hall, HallState } from "../common"

import videoDual1src from "../media/Memo6.webm";
import videoDual2src from "../media/Memo2.webm";
import videoDual3src from "../media/Memo3.webm";
import iconPath from "../media/map/learningtosee.png";

interface LearningToSeeHall extends Hall {

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

const thisHall: LearningToSeeHall = {
    name: "Hall of Learning To See",
    iconPath,
    introId: "js-learning-to-see-hall",
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
                    videoDual1src,
                    videoDual2src,
                    videoDual3src,
                ];
                state.planeData = [
                    { pos: [-.55, 0, 3 - 5], rot: [0, 35, 0] },
                    { pos: [.55, 0, 3 - 5], rot: [0, -35, 0] },
                    { pos: [-0.7, 0, 5 - 9], rot: [0, 35, 0] },
                    { pos: [0.7, 0, 5 - 9], rot: [0, -35, 0] },
                    { pos: [-1.0, 0, 5 - 11], rot: [0, 35, 0] },
                    { pos: [1.0, 0, 5 - 11], rot: [0, -35, 0] },
                ];
                
                Promise.all(state.videoSrcs.map(makeVideo)).then((videos) => {
                    state.vids = videos;

                    let materials = state.vids.map(makeMaterial);
                    for (let i = 0; i < state.planeData.length; i+=2) {
                        let material = materials[Math.floor(i/2)];
                        let yMin = 59.8/716.1;
                        let yMax = 652.4/716.1;
                        {
                            let geometry = new PlaneGeometry(1, 1, 1);
                            let uvs = geometry.faceVertexUvs[0];
                            let xMin = 28.4/1269.2;
                            let xMax = 600/1269.2;
                            
                            uvs[0][0].set( xMin , yMax );
                            uvs[0][1].set( xMin , yMin );
                            uvs[0][2].set( xMax , yMax );
                            uvs[1][0].set( xMin , yMin );
                            uvs[1][1].set( xMax , yMin );
                            uvs[1][2].set( xMax , yMax );
                        
                            let plane = new Mesh(geometry, material);
                            let pos = state.planeData[i].pos;
                            let rot = state.planeData[i].rot;
                            plane.position.set(pos[0], pos[1], pos[2]);
                            plane.rotation.set(0, rot[1] * 2 * Math.PI / 360, 0);
                            state.scene.add(plane);
                        }
                        {
                            let geometry = new PlaneGeometry(1, 1, 1);
                            let uvs = geometry.faceVertexUvs[0];
                            let xMin = 667.1/1269.2;
                            let xMax = 1290/1269.2;
                            uvs[0][0].set( xMin , yMax );
                            uvs[0][1].set( xMin , yMin );
                            uvs[0][2].set( xMax , yMax );
                            uvs[1][0].set( xMin , yMin );
                            uvs[1][1].set( xMax , yMin );
                            uvs[1][2].set( xMax , yMax );
                        
                            let plane = new Mesh(geometry, material);
                            let pos = state.planeData[i+1].pos;
                            let rot = state.planeData[i+1].rot;
                            plane.position.set(pos[0], pos[1], pos[2]);
                            plane.rotation.set(0, rot[1] * 2 * Math.PI / 360, 0);
                            state.scene.add(plane);
                        }
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
        registerEventListeners();
        thisHall.state.vids.forEach(vid => {
            vid.muted = false;
            vid.play();
        });
    },
    onLeave: function () {
        thisHall.state.vids.forEach(vid => {
            vid.muted = true;
            vid.play();
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
    teardown: async function (): Promise<void> {
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
        let length = 6.5;
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

function makeVideoTex(video: HTMLVideoElement) {
    let texture = new VideoTexture(video);
    texture.minFilter = LinearFilter;
    texture.magFilter = LinearFilter;
    texture.format = RGBFormat;
    return texture;
}

function makeMaterial(video: HTMLVideoElement) {
    return new MeshBasicMaterial({ map: makeVideoTex(video) });
}

function makePlane(video: HTMLVideoElement) {
    let geometry = new PlaneGeometry(1, 1, 1);
    let material = makeMaterial(video);
    var uvs = geometry.faceVertexUvs[0];
    let xMin = 0;
    let xMax = 0.5;
    uvs[0][0].set(xMin, 1);
    uvs[0][1].set(xMin, 0);
    uvs[0][2].set(xMax, 1);
    uvs[1][0].set(xMin, 0);
    uvs[1][1].set(xMax, 0);
    uvs[1][2].set(xMax, 1);

    let plane = new Mesh(geometry, material);
    return plane;
}

async function makeVideo(webmSource: string): Promise<HTMLVideoElement> {
    let video = document.createElement("video");
    let isSupported = video.canPlayType("video/webm");

    return new Promise<HTMLVideoElement>((resolve, reject) => {
        if (isSupported) {
            video.src = webmSource;
            video.width = 512;
            video.height = 288;
            video.loop = true;
        
            video.preload = 'auto';
            video.muted = true;
    
            function onCanPlay () {
                console.log(video);
                resolve(video);
                video.removeEventListener("canplay", onCanPlay);
            }

            video.addEventListener("canplay", onCanPlay);
        } else {
            reject("Your browser doesn't support webm videos.");
        }
    });
}
