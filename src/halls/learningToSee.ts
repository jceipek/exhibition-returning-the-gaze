import {
    Scene,
    PerspectiveCamera,
    PlaneGeometry,
    Geometry,
    FogExp2,
    GridHelper,
    Material,
    MeshBasicMaterial,
    MeshStandardMaterial,
    Mesh,
    WebGLRenderer,
    VideoTexture,
    LinearFilter,
    RGBFormat,
    MathUtils,
    Object3D,
    Vector3
} from "three";

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
        screenGroups: Mesh[][],
        reflectionScreenGroups: Mesh[][],
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
            camHeight: 0.7, // camera height
            scrollSpeed: 0.0001, // how fast scrolling affects movement

            baseHeight: 0.7, // minimum screen height
            startDistance: 6, // distance to first set of screens
            depthSpacing: 8, // distance in depth between screenGroups
            widthSpacingNear: 1.1, // minumum width between adjacent screens
            camDistWidthMult: 2, // how camera distance affects width spacing
            camDistWidthPow: 3, // order of camera distance width spacing influence
            camDistHeightMult: 1, // how camera distance affects height
            camDistHeightPow: 4, // order of camera distance width height
            camDistScale: 0.3, // how distance affects scale (fake scale effect)
            camDistClamp: 1.5, // how many depthSpacings away to start moving screens
            rotMult: 1.5, // how much to multiply current rotation by (after looking at camera)
            moveSpeed: 0.05, // how fast each screen moves to target
            borderSize: 1.07, // size of white border

            floor: {
                enabled: true,
                reflections: true,
                grid: true,
                size: 100,
                divisions: 100,
                gridColor: 0x888888,
                alpha: 0.8,
            },

            fog: {
                enabled: true,
                density: 0.06,
            },
        },
        videoSrcs: [],
        vids: [],
        scene: new Scene(),
        camera: new PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100),
        screenGroups: [],
        reflectionScreenGroups: [],
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
                    let settings = state.settings;
                    state.vids = videos;

                    let materials = state.vids.map(makeMaterial);
                    for (let i = 0; i < state.vids.length; i++) {
                        let vid = state.vids[i];
                        let numPanels = Math.round(vid.width / vid.height); // should be 1 or 2
                        console.log(vid, 'numPanels:', numPanels)
                        // console.log(vid.width, vid.height);

                        let material = materials[i];
                        let uvb = 0.01; // avoid uv border artifacts
                        let yMin = 0 + uvb;
                        let yMax = 1 - uvb;
                        let screenGroup: Mesh[] = [];
                        let reflectionScreenGroup: Mesh[] = [];

                        for (let panel = 0; panel < numPanels; panel++) {
                            let geometry = new PlaneGeometry(1, 1, 1);
                            let uvs = geometry.faceVertexUvs[0];
                            let xMin = panel * 1 / numPanels + uvb;
                            let xMax = xMin + 1 / numPanels - uvb;

                            uvs[0][0].set(xMin, yMax);
                            uvs[0][1].set(xMin, yMin);
                            uvs[0][2].set(xMax, yMax);
                            uvs[1][0].set(xMin, yMin);
                            uvs[1][1].set(xMax, yMin);
                            uvs[1][2].set(xMax, yMax);

                            function createScreen(geometry: Geometry, material: Material, screenGroup: any[]) {
                                let plane = new Mesh(geometry, material);
                                plane.position.set(0, 100, 0);
                                state.scene.add(plane);
                                screenGroup.push(plane);

                                // border
                                if (settings.borderSize > 1) {
                                    let borderPlane = new Mesh(geometry, new MeshBasicMaterial());
                                    borderPlane.scale.setScalar(settings.borderSize);
                                    borderPlane.position.set(0, 0, -0.01);
                                    plane.add(borderPlane);
                                }
                            }

                            createScreen(geometry, material, screenGroup);

                            if (settings.floor.enabled && settings.floor.reflections) {
                                createScreen(geometry, material, reflectionScreenGroup);
                            }
                        }

                        state.screenGroups.push(screenGroup);
                        if (settings.floor.enabled && settings.floor.reflections) {
                            state.reflectionScreenGroups.push(reflectionScreenGroup);
                        }
                    }

                    // create floor
                    if (settings.floor.enabled) {
                        if (settings.floor.reflections) {
                            let floorMat = new MeshStandardMaterial({ color: 0x000000, opacity: settings.floor.alpha, transparent: true });
                            let floor = new Mesh(new PlaneGeometry(settings.floor.size, settings.floor.size), floorMat);
                            floor.rotateX(-Math.PI / 2);
                            state.scene.add(floor);
                        }

                        // grid
                        if (settings.floor.grid) {
                            let grid = new GridHelper(settings.floor.size, settings.floor.divisions, settings.floor.gridColor, settings.floor.gridColor);
                            grid.position.set(0, 0.1, 0);
                            state.scene.add(grid);
                        }
                    }

                    if (settings.fog.enabled) {
                        state.scene.fog = new FogExp2(0, settings.fog.density);
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

        for (let screenGroupIdx = 0; screenGroupIdx < state.screenGroups.length; screenGroupIdx++) {
            let screenGroup = state.screenGroups[screenGroupIdx];

            for (let screenIdx = 0; screenIdx < screenGroup.length; screenIdx++) {
                let screen = screenGroup[screenIdx];

                let camDistNorm = Math.abs(screen.position.z - cam.position.z) / settings.depthSpacing; // normalised
                let camDistNormClamped = MathUtils.clamp(camDistNorm, 0, settings.camDistClamp);

                // set screen position
                let xposMult = 0;
                let yposMult = 0;
                if (screenGroup.length == 1) {
                    xposMult = 0;
                    yposMult = 1;
                } else {
                    xposMult = screenIdx % 2 == 0 ? -1 : 1;
                    yposMult = 0.5;
                }
                let targetPosition = new Vector3(xposMult * Math.pow(camDistNormClamped, settings.camDistWidthPow) * settings.camDistWidthMult * (1 + screenGroupIdx * 0.0) + xposMult * settings.widthSpacingNear / 2,
                    yposMult * Math.pow(camDistNormClamped, settings.camDistHeightPow) * settings.camDistHeightMult * (1 + screenGroupIdx * 0.0) + settings.baseHeight,
                    -(settings.startDistance + settings.depthSpacing * screenGroupIdx));

                screen.position.addScaledVector(targetPosition.sub(screen.position), settings.moveSpeed);

                // set screen orientation
                screen.lookAt(cam.position);
                screen.rotation.set(0, screen.rotation.y * settings.rotMult, 0);

                // set screen scale (fake scale effect)
                let targetScale = 1 + camDistNormClamped * settings.camDistScale;
                screen.scale.setScalar(targetScale);

                // update reflection
                if (settings.floor.enabled && settings.floor.reflections) {
                    let reflectionScreen = state.reflectionScreenGroups[screenGroupIdx][screenIdx];
                    reflectionScreen.position.set(screen.position.x, -screen.position.y, screen.position.z);
                    reflectionScreen.setRotationFromEuler(screen.rotation);
                    reflectionScreen.scale.set(screen.scale.x, -screen.scale.y, screen.scale.z);
                }

                // set volume of videos based on camera distance
                if (screenIdx == 0) { // only do it for first screen in screenGroup
                    let volume;
                    if (cam.position.z < screen.position.z) { // if screens are behind camera, quicker fade out
                        volume = MathUtils.clamp(1 - (2 * camDistNorm), 0, 1);
                        volume *= volume * volume * volume;
                    } else {
                        volume = MathUtils.clamp(camDistNorm, 0, 1);
                        // volume = MathUtils.clamp(camDistNorm, 0, 1);
                        // volume = volume * volume;
                        volume = 1 - volume;
                    }

                    let vid = state.vids[screenGroupIdx];
                    vid.volume = volume;
                    if(volume==0) vid.pause();
                    else vid.play(); 
                }
            }
        }

        // update camera
        let length = settings.startDistance + settings.depthSpacing * state.videoSrcs.length;
        let targetCamZ = -state.progressFrac * length;
        cam.position.set(0, settings.camHeight, (targetCamZ - cam.position.z) * settings.moveSpeed + cam.position.z);

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

// function makePlane(video: HTMLVideoElement) {
//     let geometry = new PlaneGeometry(1, 1, 1);
//     let material = makeMaterial(video);
//     var uvs = geometry.faceVertexUvs[0];
//     let xMin = 0;
//     let xMax = 0.5;
//     uvs[0][0].set(xMin, 1);
//     uvs[0][1].set(xMin, 0);
//     uvs[0][2].set(xMax, 1);
//     uvs[1][0].set(xMin, 0);
//     uvs[1][1].set(xMax, 0);
//     uvs[1][2].set(xMax, 1);

//     let plane = new Mesh(geometry, material);
//     return plane;
// }

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
