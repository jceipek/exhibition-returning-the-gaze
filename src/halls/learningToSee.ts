import { Scene, PerspectiveCamera, PlaneGeometry, MeshBasicMaterial, Mesh, WebGLRenderer, VideoTexture, LinearFilter, RGBFormat, MathUtils, Object3D, Vector3 } from "three";
import { normalizeWheel } from "../utils"
import { Halls, Hall, HallState } from "../common"

import videoDual1src from "../media/memoakten_stardust2_noborder_512x256_crf20.webm";
import videoDual2src from "../media/memoakten_gloomysunday_noborder_512x256_crf20.webm";
import videoDual3src from "../media/memoakten_truecolors_v1_384x384_crf20.webm";
import iconPath from "../media/map/learningtosee.png";

interface LearningToSeeHall extends Hall {

    state: {
        settings: any,
        videoSrcs: string[],
        vids: HTMLVideoElement[],
        scene: Scene,
        camera: PerspectiveCamera,
        planeGroups: Mesh[][],
        progressFrac: number,
        loadedOnce: boolean
    }
}

const thisHall: LearningToSeeHall = {
    name: "Hall of Learning To See",
    iconPath,
    introId: "js-learning-to-see-hall",
    state: {
        settings: {
            startDistance: 5, // distance to first set of planes
            depthSpacing: 8, // distance in depth between planeGroups
            widthSpacingNear: 1, // minumum width between adjacent planes
            widthSpacingCamZMult: 0.003, // how camera distance affects width spacing
            widthSpacingCamZPow: 3, // order of camera distance width spacing influence
            rotMult: 2, // how much to multiply current rotation by (after looking at camera)
            moveSpeed: 0.1, // how fast each plane moves to target
            scrollSpeed: 0.0001, // how fast scrolling affects movement
        },
        videoSrcs: [],
        vids: [],
        scene: new Scene(),
        camera: new PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100),
        planeGroups: [],
        progressFrac: 0,
        loadedOnce: false
    },
    setup: async function (): Promise<void> {
        function postLoad() {
            thisHall.state.progressFrac = 0;
            thisHall.state.camera.position.set(0, 0, 0);
        }
        return new Promise<void>((resolve) => {
            if (!thisHall.state.loadedOnce) {
                let state = thisHall.state;
                state.videoSrcs = [
                    videoDual1src,
                    videoDual2src,
                    videoDual3src,
                ];

                Promise.all(state.videoSrcs.map(makeVideo)).then((videos) => {
                    state.vids = videos;

                    let materials = state.vids.map(makeMaterial);
                    for (let i = 0; i < state.vids.length; i++) {
                        let vid = state.vids[i];
                        let numPanels = Math.round(vid.width / vid.height); // should be 1 or 2
                        console.log(vid, 'numPanels:', numPanels)
                        // console.log(vid.width, vid.height);

                        let material = materials[i];
                        let yMin = 0
                        let yMax = 1;
                        let planeGroup = [];

                        for (let panel = 0; panel < numPanels; panel++) {
                            let geometry = new PlaneGeometry(1, 1, 1);
                            let uvs = geometry.faceVertexUvs[0];
                            let xMin = panel * 1 / numPanels;
                            let xMax = xMin + 1 / numPanels;

                            uvs[0][0].set(xMin, yMax);
                            uvs[0][1].set(xMin, yMin);
                            uvs[0][2].set(xMax, yMax);
                            uvs[1][0].set(xMin, yMin);
                            uvs[1][1].set(xMax, yMin);
                            uvs[1][2].set(xMax, yMax);

                            let plane = new Mesh(geometry, material);
                            state.scene.add(plane);
                            planeGroup.push(plane);

                            let bgPlane = new Mesh(geometry, new MeshBasicMaterial());
                            let ss = 1.05;
                            bgPlane.scale.set(ss, ss, ss);
                            bgPlane.position.set(0, 0, -0.01);
                            plane.add(bgPlane);
                        }

                        state.planeGroups.push(planeGroup);
                    }
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
        let state = thisHall.state;
        let settings = state.settings;
        let cam = state.camera;

        for (let planeGroupIdx = 0; planeGroupIdx < state.planeGroups.length; planeGroupIdx++) {
            let planeGroup = state.planeGroups[planeGroupIdx];

            for (let planeIdx = 0; planeIdx < planeGroup.length; planeIdx++) {
                let plane = planeGroup[planeIdx];
                
                // set plane position
                let camZDist = Math.abs(plane.position.z - cam.position.z);
                let xposMult = 0;
                let yposMult = 0;
                if(planeGroup.length == 1) {
                    xposMult = 0;
                    yposMult = 0.9;
                } else {
                    xposMult = planeIdx % 2 == 0 ? -1 : 1;
                    yposMult = 0;
                }
                let distOffset = Math.pow(camZDist, settings.widthSpacingCamZPow) * settings.widthSpacingCamZMult;
                let targetPosition = new Vector3(xposMult * (settings.widthSpacingNear / 2 + distOffset), yposMult * distOffset, -(settings.startDistance + settings.depthSpacing * planeGroupIdx));

                plane.position.addScaledVector(targetPosition.sub(plane.position), settings.moveSpeed);

                // set plane orientation
                plane.lookAt(cam.position);
                plane.rotation.set(0, plane.rotation.y * settings.rotMult, 0);

                // set volume of videos based on camera distance
                if (planeIdx == 0) { // only do it for first plane in planeGroup
                    let volume;
                    if (cam.position.z < plane.position.z) { // if screens are behind camera, quicker fade out
                        volume = MathUtils.clamp(1 - (2 * camZDist / settings.depthSpacing), 0, 1);
                        volume *= volume * volume * volume;
                    } else {
                        volume = MathUtils.clamp(camZDist / settings.depthSpacing, 0, 1);
                        // volume = volume * volume;
                        volume = 1 - volume;
                    }
                    state.vids[planeGroupIdx].volume = volume;
                }
            }
        }

        // update camera
        let length = settings.startDistance + settings.depthSpacing * state.videoSrcs.length;
        let targetCamZ = -state.progressFrac * length;
        cam.position.set(0, 0, (targetCamZ - cam.position.z) * settings.moveSpeed + cam.position.z);

        renderer.render(state.scene, cam);
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
        thisHall.state.progressFrac -= evt.pixelY * thisHall.state.settings.scrollSpeed;
        thisHall.state.progressFrac = MathUtils.clamp(thisHall.state.progressFrac, 0, 1);
        // console.log('scrollEvt', thisHall.state.progressFrac);
    },

    mousemove: (evt: MouseEvent) => {
        let frac = (evt.clientX - window.innerWidth / 2) / (window.innerWidth / 2); // [-1..1]
        thisHall.state.camera.rotation.set(0, -frac * 0.5, 0);
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
            video.loop = true;
            video.preload = 'auto';
            video.muted = true;

            function onCanPlay() {
                video.width = video.videoWidth;
                video.height = video.videoHeight;
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
