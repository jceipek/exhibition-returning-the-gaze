import {
    // Clock,
    Group,
    Scene,
    PerspectiveCamera,
    PlaneGeometry,
    Geometry,
    CylinderGeometry,
    FogExp2,
    GridHelper,
    Material,
    MeshBasicMaterial,
    ShaderMaterial,
    DoubleSide,
    Mesh,
    WebGLRenderer,
    VideoTexture,
    LinearFilter,
    RGBFormat,
    MathUtils,
    Object3D,
    Vector3,
} from "three";

// import { Stats } from "stats.js";
import Stats = require("stats.js");

import { normalizeWheel } from "../utils"
import { Halls, Hall, HallState } from "../common"
import { waypointMakeState, waypointReset, waypointMoveToMouse, waypointTryStartMove, waypointUpdate, WaypointState, WaypointMovingState } from "../waypoint"
import { Loader, loader, load3dModel } from "../modelLoader"

import video1src from "../media/memoakten_learningtodream_384x384_crf20.webm";
import video2src from "../media/memoakten_gloomysunday_noborder_512x256_crf20.webm";
import video3src from "../media/memoakten_stardust2_noborder_512x256_crf20.webm";
import video4src from "../media/memoakten_truecolors_v1_384x384_crf20.webm";
import videoWallsrc from "../media/memowall.webm"

import iconPath from "../media/map/learningtosee.png";
import waypointSrc from "../models/waypointwhite.glb";

interface LearningToSeeHall extends Hall {

    state: {
        stats: Stats,
        settings: any,
        videoSrcs: string[],
        vids: HTMLVideoElement[], // only videos for screens
        scene: Scene,
        camera: PerspectiveCamera,
        cameraTargetRotY: number,
        waypointState: WaypointState,
        waypoint: Group | null,
        screenGroups: Mesh[][],
        reflectionScreenGroups: Mesh[][],
        videoWall: any,
        grid: GridHelper,
        progressFrac: number,
        loadedOnce: boolean,
        mousePos: Vector3,
        // clock: Clock,
    }
}

const thisHall: LearningToSeeHall = {
    name: "Hall of Learning To See",
    iconPath,
    introId: "js-learning-to-see-hall",
    state: {
        stats: null,
        settings: {
            showStats: false,

            camHeight: 0.7, // camera height
            viewDist: 3, // ideal viewing distance from camera to screens
            startDistance: 6, // distance to first set of screens
            scrollSpeed: 0.0001, // how fast scrolling affects movement

            baseHeight: 0.7 - 0.5, // minimum screen height
            startHeight: 100, // start off screen
            depthSpacing: 8, // distance in depth between screenGroups
            widthSpacingNear: 1.3, // minumum width between adjacent screens
            camDistWidthMult: 2, // how camera distance affects width spacing
            camDistWidthPow: 3, // order of camera distance width spacing influence
            camDistHeightMult: 1.1, // how camera distance affects height
            camDistHeightPow: 4, // order of camera distance width height
            camDistScale: 0.3, // how distance affects scale (fake scale effect)
            camDistClamp: 1.5, // how many depthSpacings away to start moving screens
            rotMult: new Vector3(1, 1.5, 0), // how much to multiply current rotation by (after looking at camera)
            moveSpeed: 0.05, // how fast each screen moves to target
            borderSize: 1.07, // size of white border

            floor: {
                enabled: true,
                reflections: true,
                grid: true,
                speed: 0.05,
                size: 200,
                divisions: 200,
                gridColor: 0x888888,
                alpha: 0.75,
            },

            fog: {
                enabled: true,
                density: 0.06,
            },

            videoWall: {
                enabled: true,
                reflection: true,
                arcTheta: Math.PI * 0.22,
                radius: 80,
                zoffset: 0,
                segments: 6,
                eq: {
                    brightness: 0.9,
                    contrast: 1.1,
                    saturation: 0.5,
                    osc: {
                        enabled: true,
                        saturation: [0.1, 0.8],
                        contrast: [1.3, 1.1],
                        period: 120,
                        phase: Math.PI,
                    },
                    interactive: false,
                },
                fadeInTime: 20, // fade in at start
                fadeOutTime: 20, // fade out before ending
                fadeSpeed: 0.01, // fade in when hall is activated 
            }

        },
        videoSrcs: [],
        vids: [],
        scene: new Scene(),
        camera: new PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100),
        cameraTargetRotY: 0,
        waypointState: waypointMakeState(0.01),
        waypoint: null,
        screenGroups: [],
        reflectionScreenGroups: [],
        videoWall: {
            obj: new Object3D(),
            mat: null,
            tex: null,
            vid: null,
        },
        grid: null,
        progressFrac: 0,
        loadedOnce: false,
        mousePos: new Vector3(),
        // clock: new Clock(true),

    },
    setup: async function (): Promise<void> {
        function postLoad() {
            let state = thisHall.state;
            state.progressFrac = 0;
            state.camera.position.set(0, state.settings.camHeight, 0);
            waypointReset(state.waypointState);
        }
        return new Promise<void>((resolve) => {
            if (!thisHall.state.loadedOnce) {
                let state = thisHall.state;
                state.videoSrcs = [
                    video1src,
                    video2src,
                    video3src,
                    video4src,
                ];

                async function addWaypoint(loader: Loader, waypointSrc: string): Promise<void> {
                    return new Promise<void>((resolve, reject) => {
                        load3dModel(loader, waypointSrc).then((model) => {
                            state.scene.add(model);
                            state.waypoint = model;
                            resolve();
                        });
                    });
                }

                async function loadVideos(videoSrcs: string[]): Promise<HTMLVideoElement[]> {
                    return new Promise<HTMLVideoElement[]>((resolve, reject) => {
                        Promise.all(videoSrcs.map(makeVideo)).then((videos) => {
                            resolve(videos);
                        })
                    });
                }

                Promise.all([loadVideos(state.videoSrcs), addWaypoint(loader, waypointSrc)]).then(([videos]) => {
                    // INIT
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
                                let root = new Object3D();
                                screenGroup.push(root);
                                state.scene.add(root);

                                let plane = new Mesh(geometry, material);
                                plane.position.set(0, 0.5, 0);
                                root.add(plane);

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

                    // create videoWall
                    // TODO: I have no idea what I'm doing. wtf is Promise?, and this weird syntax? (it works so leaving as is :P)
                    if (settings.videoWall.enabled) {
                        Promise.all([videoWallsrc].map(makeVideo)).then((wallVideos) => {
                            let vid = wallVideos[0]; // get first video (bit dodgy, don't really need an array, but I don't understand this syntax)
                            // state.vids.push(vid); // add to end of state.vids
                            state.videoWall.vid = vid;

                            let tex = makeVideoTex(vid);

                            // create material
                            // let mat = makeMaterial(vid);
                            let mat = new ShaderMaterial({
                                uniforms: {
                                    brightness: { value: 0.0 },
                                    contrast: { value: settings.videoWall.eq.contrast },
                                    saturation: { value: settings.videoWall.eq.saturation },
                                    tex: { value: tex },
                                },
                                vertexShader: vertexShader(),
                                fragmentShader: fragShader(),
                                // vertexShader: document.getElementById('vertexShader').textContent,
                                // fragmentShader: document.getElementById('fragmentShader').textContent
                            });
                            mat.side = DoubleSide;
                            mat.fog = false;

                            // create geometry
                            let arcTheta = settings.videoWall.arcTheta;
                            let radius = settings.videoWall.radius;
                            let height = arcTheta * radius * vid.height / vid.width;
                            let geometry = new CylinderGeometry(radius, radius, height, settings.videoWall.segments, 1, true, 0, arcTheta);
                            let count = Math.ceil(Math.PI / arcTheta);
                            for (let j = 0; j < 1 + settings.videoWall.reflection; j++) {
                                for (let i = 0; i < count; i++) {
                                    let flip = j > 0 ? -1 : 1;
                                    let mesh = new Mesh(geometry, mat);
                                    mesh.position.set(0, flip * height / 2, settings.videoWall.zoffset);
                                    mesh.scale.set(1, flip, 1);
                                    mesh.rotateY(Math.PI / 2 + arcTheta * i);
                                    state.videoWall.obj.add(mesh);
                                }
                            }
                            state.scene.add(state.videoWall.obj);
                            state.videoWall.mat = mat;
                        });
                    }


                    // create floor
                    if (settings.floor.enabled) {
                        if (settings.floor.reflections) {
                            let floorMat = new MeshBasicMaterial({ color: 0x000000, opacity: settings.floor.alpha, transparent: true });
                            let floor = new Mesh(new PlaneGeometry(settings.floor.size, settings.floor.size), floorMat);
                            floor.position.set(0, -0.05, 0);
                            floor.rotateX(-Math.PI / 2);
                            state.scene.add(floor);
                        }

                        // grid
                        if (settings.floor.grid) {
                            state.grid = new GridHelper(settings.floor.size, settings.floor.divisions, settings.floor.gridColor, settings.floor.gridColor);
                            state.scene.add(state.grid);
                        }
                    }

                    // fog
                    if (settings.fog.enabled) {
                        state.scene.fog = new FogExp2(0, settings.fog.density);
                    }

                    // stats
                    if (settings.showStats) {
                        state.stats = new Stats();
                        state.stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
                        document.body.appendChild(state.stats.dom);
                    }

                    init();

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
        init();
        registerEventListeners();
    },

    onLeave: function () {
        init();
        removeEventListeners();
    },

    render: function (renderer) {
        let state = thisHall.state;
        let settings = state.settings;
        let cam = state.camera;
        // let time = state.clock.getElapsedTime();

        if (state.stats) state.stats.begin();

        // update camera
        // let length = settings.startDistance + settings.depthSpacing * (state.screenGroups.length - 0.5);
        let targetCamZ = -state.progressFrac * getHallwayLength();
        cam.position.set(0, settings.camHeight, (targetCamZ - cam.position.z) * settings.moveSpeed + cam.position.z);
        cam.rotation.setFromVector3(new Vector3(0, lerpTo(cam.rotation.y, state.cameraTargetRotY, settings.moveSpeed, 0.001), 0));

        // update grid
        // if (state.grid) {
        // let s = settings.floor.size / settings.floor.divisions / 2;
        // let pos = lerpTo(state.grid.position.z, s, settings.floor.speed, 0.01);
        // state.grid.position.set(s, 0, pos);
        // console.log(state.grid.position);
        // }

        // update videoWall
        if (state.videoWall.mat && state.videoWall.vid) {
            state.videoWall.obj.position.set(cam.position.x, cam.position.y, cam.position.z);
            let vid = state.videoWall.vid;
            let time = vid.currentTime; // use this to stay in sync with videowall
            let duration = vid.duration;

            // make sure video is playing
            if (vid.paused) vid.play();

            // update texture
            state.videoWall.mat.uniforms.tex.needsUpdate = true;

            // fade in/out at start and end of video
            let targetBrightness = settings.videoWall.eq.brightness;
            if (time < settings.videoWall.fadeInTime) {
                targetBrightness = MathUtils.mapLinear(time, 0, settings.videoWall.fadeInTime, 0, settings.videoWall.eq.brightness);
            }
            else if (time > duration - settings.videoWall.fadeOutTime) {
                targetBrightness = MathUtils.mapLinear(time, duration - settings.videoWall.fadeOutTime, duration, settings.videoWall.eq.brightness, 0);
            }

            // fade in video wall to target brightness when activated
            state.videoWall.mat.uniforms.brightness.value = lerpTo(state.videoWall.mat.uniforms.brightness.value, targetBrightness, settings.videoWall.fadeSpeed, 0.01);

            // contrast and saturation
            if (settings.videoWall.eq.osc.enabled) {
                let s = 0.5 + 0.5 * Math.cos(time * 2 * Math.PI / settings.videoWall.eq.osc.period + settings.videoWall.eq.osc.phase);
                state.videoWall.mat.uniforms.saturation.value = MathUtils.lerp(settings.videoWall.eq.osc.saturation[0], settings.videoWall.eq.osc.saturation[1], s);
                state.videoWall.mat.uniforms.contrast.value = MathUtils.lerp(settings.videoWall.eq.osc.contrast[0], settings.videoWall.eq.osc.contrast[1], s);
                // console.log(time.toFixed(1), 's', state.videoWall.mat.uniforms.saturation.value.toFixed(2), 'c', state.videoWall.mat.uniforms.contrast.value.toFixed(2));
            } else {
                state.videoWall.mat.uniforms.saturation.value = settings.videoWall.eq.saturation;
                state.videoWall.mat.uniforms.contrast.value = settings.videoWall.eq.contrast;
            }

        }

        // update screens
        for (let screenGroupIdx = 0; screenGroupIdx < state.screenGroups.length; screenGroupIdx++) {
            let screenGroup = state.screenGroups[screenGroupIdx];

            for (let screenIdx = 0; screenIdx < screenGroup.length; screenIdx++) {
                let screen = screenGroup[screenIdx];

                let camDist = Math.abs(screen.position.z - cam.position.z);
                let camDistNorm = camDist / settings.depthSpacing; // normalised
                let camDistNormClamped = MathUtils.clamp(camDistNorm, 0, settings.camDistClamp);

                // camDistNormClamped /= settings.camDistClamp;
                // camDistNormClamped = (3 * camDistNormClamped * camDistNormClamped) - (2 * camDistNormClamped * camDistNormClamped * camDistNormClamped);
                // camDistNormClamped *= settings.camDistClamp;

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
                screen.lookAt(cam.position.x, cam.position.y, cam.position.z);
                let rotMultX = 0;
                if (screenGroup.length == 1 && camDist < 1.5) { // only do x rotation if single screen, and very close
                    rotMultX = (1.5 - camDist) * settings.rotMult.x;
                }
                screen.rotation.set(screen.rotation.x * rotMultX, screen.rotation.y * settings.rotMult.y, screen.rotation.z * settings.rotMult.z);

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
                        volume = volume * volume;
                        volume = 1 - volume;
                    }

                    // fade with height
                    let volume0 = volume;
                    volume /= (1 - settings.baseHeight + Math.min(screen.position.y, 10));

                    let vid = state.vids[screenGroupIdx];
                    vid.volume = lerpTo(vid.volume, volume, 0.05, 0.01);
                    if (vid.volume < 0.01) { // minvolume
                        if (!vid.paused) {
                            console.log('Stopping video', screenGroupIdx)
                            vid.pause();
                            // vid.muted = true;
                        }
                    } else {
                        if (vid.paused) {
                            console.log('Starting video', screenGroupIdx)
                            vid.play();
                            // vid.muted = false;
                        }
                        // if (screenGroupIdx == 0) {
                        //     console.log("Volume", volume.toFixed(3), vid.volume.toFixed(3));
                        // }
                    }
                }
            }
        }

        // Update waypoint visualization
        updateWayPoint();
        state.progressFrac = waypointUpdate(state.waypointState, state.progressFrac);

        // render scene
        renderer.render(state.scene, cam);

        if (state.stats) state.stats.end();
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

function lerpTo(from: any, to: any, speed: number, err: any) {
    if (Math.abs(from - to) > err) {
        return from + (to - from) * speed;
    }
    else {
        return to;
    }
}


function init() {
    console.log("Learning to see: init");
    let state = thisHall.state;
    let settings = state.settings;

    // init camera
    state.cameraTargetRotY = 0;
    state.camera.rotation.set(0, 0, 0);

    // init videos
    state.vids.forEach(vid => {
        vid.volume = 0;
        vid.muted = false;
        vid.pause();
    });

    // init videowall 
    if (state.videoWall.vid) state.videoWall.vid.pause();
    if (state.videoWall.mat) state.videoWall.mat.uniforms.brightness.value = 0;

    // init screens off screen 
    for (let screenGroupIdx = 0; screenGroupIdx < state.screenGroups.length; screenGroupIdx++) {
        let screenGroup = state.screenGroups[screenGroupIdx];

        for (let screenIdx = 0; screenIdx < screenGroup.length; screenIdx++) {
            let screen = screenGroup[screenIdx];
            screen.position.set(0, settings.startHeight, 0);
        }
    }

    // init grid
    if (state.grid) {
        let s = settings.floor.size / settings.floor.divisions / 2;
        // state.grid.position.set(s, 0, s - settings.floor.size/2);
        state.grid.position.set(s, 0, s);
    }
}

function getHallwayLength() {
    let state = thisHall.state;
    let settings = state.settings;
    // return settings.startDistance + settings.depthSpacing * (state.videoSrcs.length - 0.5);
    return settings.startDistance + settings.depthSpacing * (state.videoSrcs.length - 0.8);
}

interface WindowListeners {
    [key: string]: EventListenerOrEventListenerObject,
}

const windowEventListeners: WindowListeners = {

    wheel: (scrollEvt: WheelEvent) => {
        let evt = normalizeWheel(scrollEvt);
        if (thisHall.state.waypointState.state === WaypointMovingState.Idle) {
            thisHall.state.progressFrac -= evt.pixelY * thisHall.state.settings.scrollSpeed;
            thisHall.state.progressFrac = MathUtils.clamp(thisHall.state.progressFrac, 0, 1);
            // console.log('scrollEvt', thisHall.state.progressFrac);
        }
    },

    mousemove: (evt: MouseEvent) => {
        let state = thisHall.state;
        let settings = state.settings;
        let frac = (evt.clientX - window.innerWidth / 2) / (window.innerWidth / 2); // [-1..1]
        state.cameraTargetRotY = -frac * 0.5;

        state.mousePos = new Vector3((evt.clientX / window.innerWidth) * 2 - 1, -(evt.clientY / window.innerHeight) * 2 + 1);

        // console.log("mousemove", evt);
        if (evt.buttons && state.settings.videoWall.eq.interactive) {
            let mx = evt.clientX / window.innerWidth;
            let my = evt.clientY / window.innerHeight;
            // console.log(mx, my);
            if (evt.buttons == 1) {
                state.settings.videoWall.eq.saturation = mx * 2;
                state.settings.videoWall.eq.contrast = my * 2;
            }
            if (evt.buttons == 2) {
                state.settings.videoWall.eq.brightness = my * 2;
            }
            console.log(state.settings.videoWall.eq);
        }
    },

    click: (evt: MouseEvent) => {
        // console.log("click", evt);
        let state = thisHall.state;

        state.mousePos = new Vector3((evt.clientX / window.innerWidth) * 2 - 1, -(evt.clientY / window.innerHeight) * 2 + 1);

        waypointTryStartMove(state.waypointState,
            state.progressFrac,
            state.waypoint.position.z / (-getHallwayLength()));
    }
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

function updateWayPoint() {
    let state = thisHall.state;
    let settings = state.settings;

    if (state.waypoint) {

        // find distance to next screen (remember we are moving in -z)
        let targetz = -(getHallwayLength() + settings.viewDist * 2); // if no screen is found, aim for past end
        for (let screenGroupIdx = 0; screenGroupIdx < state.screenGroups.length; screenGroupIdx++) {
            let screenGroup = state.screenGroups[screenGroupIdx];
            let screen = screenGroup[0];
            if (-state.camera.position.z < -screen.position.z - settings.viewDist * 1.1) { // if camera has not yet reached screen 
                targetz = screen.position.z;
                break;
            }
        }

        let maxz = -(targetz - state.camera.position.z) - settings.viewDist;

        // Should technically use the renderer dimensions instead of window
        waypointMoveToMouse({
            x: state.mousePos.x,
            y: state.mousePos.y
        },
            state.waypointState,
            state.camera, maxz, /* out */ state.waypoint.position, -0.1);
        // console.log('camz:', state.camera.position.z.toFixed(2),
        //     '\ntargetz:', targetz.toFixed(2),
        //     '\nmaxz:', maxz.toFixed(2),
        //     '\nwaypointz:', state.waypoint.position.z.toFixed(2));
    }
}

function vertexShader() {
    return `
varying vec2 vUv; 
void main() {
    vUv = uv; 
    vec4 modelViewPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * modelViewPosition; 
}
`
}

function fragShader() {
    return `
uniform float brightness;
uniform float contrast;
uniform float saturation;
uniform sampler2D tex;
varying vec2 vUv;

void main() {
    vec3 rgb = texture2D(tex, vUv).rgb;
    rgb = (rgb - 0.5) * contrast + 0.5;
    rgb = mix(vec3(dot(rgb, vec3(0.22, 0.707, 0.071))), rgb, saturation);
    rgb *= brightness;
	gl_FragColor = vec4(rgb, 1);
}
`
}