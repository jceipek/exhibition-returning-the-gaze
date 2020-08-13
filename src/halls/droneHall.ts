
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { GridHelper,
    Vector2,
    Vector3,
    BoxGeometry,
    Line,
    LineSegments,
    LineBasicMaterial,
    BufferAttribute,
    BufferGeometry,
    Material,
    Group,
    Scene,
    PerspectiveCamera,
    PlaneGeometry,
    MeshBasicMaterial,
    Mesh,
    WebGLRenderer,
    VideoTexture,
    LinearFilter,
    RGBFormat,
    Object3D,
    Raycaster,
    Plane } from "three";
import { getTimestamp, normalizeWheel, lerp } from "../utils"
import { Halls, Hall, HallState } from "../common"
import { loader, load3dModel } from "../modelLoader"
import { waypointMakeState, waypointReset, waypointMoveToMouse, waypointTryStartMove, waypointUpdate, WaypointState, WaypointMovingState } from "../waypoint"

import eyesSrc from "../media/eyes3.webm";
import videoLoroSrc from "../media/KW.webm";
import droneSrc from "../models/drone2.glb";
import waypointSrc from "../models/waypoint.glb";
import iconPath from "../media/map/drones.png";


interface Drone {
    group: Group
}

interface DroneHall extends Hall {
    state: {
        showcaseVideoSrc: string,
        showcaseVideo: HTMLVideoElement | null,
        eyeVideo: HTMLVideoElement | null,
        drones: Drone[],
        waypoint: Group | null,
        waypointState: WaypointState,
        scene: Scene,
        camera: PerspectiveCamera,
        progressFrac: number,
        loadedOnce: boolean
    },
    hallwayLength: number,
    hallwayFloorY: number
}

const hallwayFloorY = -.5;
const showcaseVideoScale = 1;
const showcaseVideoWidth = 1.7777 * showcaseVideoScale;
const showcaseVideoHeight = 1 * showcaseVideoScale;
const showcaseVideoPosZ = -7;


let startTs = Date.now();
const thisHall: DroneHall = {
    name: "Hall of Drones",
    iconPath,
    introId: "js-drones-hall",
    hallwayLength: 6.5,
    hallwayFloorY: hallwayFloorY,
    state: {
        showcaseVideoSrc: videoLoroSrc,
        showcaseVideo: null,
        eyeVideo: null,
        drones: [],
        waypoint: null,
        waypointState: waypointMakeState(hallwayFloorY),
        scene: new Scene(),
        camera: new PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 1000),
        progressFrac: 0,
        loadedOnce: false
    },
    setup: async function (): Promise<void> {
        function postLoad() {
            thisHall.state.progressFrac = 0;
            thisHall.state.camera.position.set(0, 0, 0);
            waypointReset(thisHall.state.waypointState);
            // registerEventListeners();
        }
        return new Promise<void>((resolve) => {
            if (!thisHall.state.loadedOnce) {
                let state = thisHall.state;

                //drawing lines
                var material = new LineBasicMaterial({ color: 0x000000 });

                var points = [];

                let depthDivisions = 10;
                let acrossDivisions = 20;

                // Floor in depth
                for (let i = 0; i <= 1; i += 1/depthDivisions) {
                    let x = lerp(i, -showcaseVideoWidth/2, showcaseVideoWidth/2);
                    points.push(new Vector3(x, hallwayFloorY, showcaseVideoPosZ));
                    points.push(new Vector3(x, hallwayFloorY, 5));
                }
                // Floor across
                for (let i = 0; i <= 1; i += 1/acrossDivisions) {
                    let z = lerp(i, 0, showcaseVideoPosZ);
                    points.push(new Vector3(-showcaseVideoWidth/2, hallwayFloorY, z));
                    points.push(new Vector3(showcaseVideoWidth/2, hallwayFloorY, z));
                }
                
                // Roof in depth
                for (let i = 0; i <= 1; i += 1/depthDivisions) {
                    let x = lerp(i, -showcaseVideoWidth/2, showcaseVideoWidth/2);
                    points.push(new Vector3(x, -hallwayFloorY, showcaseVideoPosZ));
                    points.push(new Vector3(x, -hallwayFloorY, 0));
                }
                // Roof across
                for (let i = 0; i <= 1; i += 1/acrossDivisions) {
                    let z = lerp(i, 0, showcaseVideoPosZ);
                    points.push(new Vector3(-showcaseVideoWidth/2, -hallwayFloorY, z));
                    points.push(new Vector3(showcaseVideoWidth/2, -hallwayFloorY, z));
                }
                

                // Left wall depth
                for (let i = 1/depthDivisions; i <= 1-1/depthDivisions; i += 1/depthDivisions) {
                    let y = lerp(i, hallwayFloorY, showcaseVideoHeight + hallwayFloorY);
                    points.push(new Vector3(-showcaseVideoWidth/2, y, showcaseVideoPosZ));
                    points.push(new Vector3(-showcaseVideoWidth/2, y, 0));
                }
                // Left wall across
                for (let i = 0; i <= 1; i += 1/acrossDivisions) {
                    let z = lerp(i, 0, showcaseVideoPosZ);
                    points.push(new Vector3(-showcaseVideoWidth/2, hallwayFloorY, z));
                    points.push(new Vector3(-showcaseVideoWidth/2, showcaseVideoHeight + hallwayFloorY, z));
                }

                // Right wall depth
                for (let i = 1/depthDivisions; i <= 1-1/depthDivisions; i += 1/depthDivisions) {
                    let y = lerp(i, hallwayFloorY, showcaseVideoHeight + hallwayFloorY);
                    points.push(new Vector3(showcaseVideoWidth/2, y, showcaseVideoPosZ));
                    points.push(new Vector3(showcaseVideoWidth/2, y, 0));
                }
                // Right wall across
                for (let i = 0; i <= 1; i += 1/acrossDivisions) {
                    let z = lerp(i, 0, showcaseVideoPosZ);
                    points.push(new Vector3(showcaseVideoWidth/2, hallwayFloorY, z));
                    points.push(new Vector3(showcaseVideoWidth/2, showcaseVideoHeight + hallwayFloorY, z));
                }


                var geometry1 = new BufferGeometry().setFromPoints(points);
                var line = new LineSegments(geometry1, material);
                state.scene.add(line);

                async function addWaypoint(loader: GLTFLoader, waypointSrc: string): Promise<void> {
                    return new Promise<void>((resolve, reject) => {
                        load3dModel(loader, waypointSrc).then((model) => {
                            state.scene.add(model);
                            state.waypoint = model;
                            resolve();
                        });
                    });
                }

                async function addFinishedDrones(loader: GLTFLoader, droneSrc: string, eyesSrc: string): Promise<HTMLVideoElement> {
                    // load eye video
                    // load 3d model
                    // assign many drones to scene
                    return new Promise<HTMLVideoElement>((resolve, reject) => {
                        const eyesVideoPromise = makeVideo(eyesSrc);
                        const droneModelPromise = load3dModel(loader, droneSrc);
                        Promise.all([eyesVideoPromise, droneModelPromise]).then(([eyesVideo, droneGroup]) => {
                            const eyesMaterial: Material = makeMaterial(eyesVideo);
                            let model = droneGroup;
                            for (let droneindex = 0; droneindex < 4; droneindex++) {
                                model = model.clone();

                                const columns = 2;
                                const rows = 1;
                                //the height and width of each eye video 
                                let eyeSegmentHeight = 103;
                                let eyeSegmentWidth = 233;

                                let yIndex = (Math.floor(droneindex / columns))%rows;
                                let xIndex = (droneindex - columns * yIndex)%columns;

                                let xMin = (xIndex*eyeSegmentWidth)/1280;
                                let xMax = ((xIndex+1)*eyeSegmentWidth)/1280;
                                let yMin = (yIndex*eyeSegmentHeight)/720;
                                let yMax = ((yIndex+1)*eyeSegmentHeight)/720;
                                {
                                    let geometry = new PlaneGeometry(1.108156, 0.344204, 1);                                     
                                    let uvs = geometry.faceVertexUvs[0];
                                    
                                    uvs[0][0].set( xMin , yMax );
                                    uvs[0][1].set( xMin , yMin );
                                    uvs[0][2].set( xMax , yMax );
                                    uvs[1][0].set( xMin , yMin );
                                    uvs[1][1].set( xMax , yMin );
                                    uvs[1][2].set( xMax , yMax );
                                
                                    let plane = new Mesh(geometry, eyesMaterial);
                                    plane.position.set(0, 0.2626, -0.01);
                                    model.add(plane);
                                }

                                state.drones.push({
                                    group: model
                                });

                                state.scene.add(model);
                            }
                            resolve(eyesVideo);
                        })
                    });
                }
                async function addShowcaseVideo(): Promise<HTMLVideoElement> {
                    // load the plane video
                    // assign to scene
                    return new Promise<HTMLVideoElement>((resolve) => {
                        makeVideo(state.showcaseVideoSrc).then((video) => {
                            let plane = makePlane(video, showcaseVideoWidth, showcaseVideoHeight, showcaseVideoPosZ, hallwayFloorY);
                            state.scene.add(plane);
                                // state.scene.add(line);
                            resolve(video);
                        });
                    });
                }

                Promise.all([addFinishedDrones(loader, droneSrc, eyesSrc),
                            addShowcaseVideo(),
                            addWaypoint(loader, waypointSrc)]).then(([eyes, showcaseVideo]) => {
                    thisHall.state.loadedOnce = true;
                    thisHall.state.eyeVideo = eyes;
                    thisHall.state.showcaseVideo = showcaseVideo;
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
        renderer.setClearColor("white");
        registerEventListeners();
        // TODO: Fix the fact that this assumes all videos have loaded!
        thisHall.state.showcaseVideo.muted = false;
        thisHall.state.showcaseVideo.play()
        if (thisHall.state.eyeVideo) {
            thisHall.state.eyeVideo.play();
        }
    },

    onLeave: function () {
        thisHall.state.showcaseVideo.muted = true;
        thisHall.state.showcaseVideo.pause();
        thisHall.state.eyeVideo.pause();
        removeEventListeners();
    },

    



    render: function (renderer) {
        let state = thisHall.state;
        let drones = state.drones;
        let progressFrac = thisHall.state.progressFrac;
        for (let i = 0; i < drones.length; i++) {
            console.log( 'drones number=', drones.length);
            // drones[i].group.position.set(Math.sin((i*-1.5))+0.4,
            //                             (Math.sin(i*1.3)) *0.6, 
            //                             i - 6.5);
            drones[i].group.position.set(Math.sin(i * 1.5) + 0.3, Math.sin(i * 0.2)+0.1 , i - 5);
            drones[i].group.rotation.set(noise(0, (Date.now() - startTs) * 0.001, 0) * 0.1, noise(0, (Date.now() - startTs) * 0.001, 0) * 0.2, 0);
        }

        thisHall.state.progressFrac = waypointUpdate(state.waypointState, thisHall.state.progressFrac);
        thisHall.state.camera.position.set(0, 0, thisHall.state.progressFrac * -thisHall.hallwayLength);

        renderer.render(state.scene, state.camera);
    },
    resize: function () {
        thisHall.state.camera.aspect = window.innerWidth / window.innerHeight;
        thisHall.state.camera.updateProjectionMatrix();
    },
    teardown: async function (): Promise<void> {
        return new Promise<void>((resolve) => {
            // removeEventListeners();
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
        if (thisHall.state.waypointState.state === WaypointMovingState.Idle) {
            thisHall.state.progressFrac -= evt.pixelY * 0.0001 * thisHall.hallwayLength;
            thisHall.state.progressFrac = Math.max(0, Math.min(1, thisHall.state.progressFrac));
        }
    },
    mousemove: (evt: MouseEvent) => {
        let state = thisHall.state;
        let frac = (evt.clientX - window.innerWidth / 2) / (window.innerWidth / 2); // [-1..1]
        state.camera.rotation.set(0, -frac * 1.3, 0);
        if (state.waypoint) {
            // Should technically use the renderer dimensions instead of window
            waypointMoveToMouse({ x: (evt.clientX / window.innerWidth) * 2 - 1,
                                  y: -(evt.clientY / window.innerHeight) * 2 + 1},
                                  state.waypointState,
                                  state.camera, thisHall.hallwayLength * 0.5, /* out */ state.waypoint.position);
        }
    },
    click: (evt: MouseEvent) => {
        let state = thisHall.state;
        waypointTryStartMove(state.waypointState,
                             state.progressFrac,
                             state.waypoint.position.z/(-thisHall.hallwayLength));
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

            function onCanPlay() {
                resolve(video);
                video.removeEventListener("canplay", onCanPlay);
            }

            video.addEventListener("canplay", onCanPlay);
        } else {
            reject("Your browser doesn't support webm videos.");
        }
    });
}













function adjustuvs(droneindex: number, eyesMaterial: Material) {
    console.log('generatingfunction', droneindex);
    return (node: any) => {
        if (node instanceof Mesh) {
            // node.material = node.material.clone(); 
            console.log(node.material.name);
        }
        if (node instanceof Mesh && node.material.name === "screens") {
            node.material = eyesMaterial;
            let g: BufferGeometry = node.geometry;

            // console.log(g.attributes.uv.array);
            // console.log(g.attributes.uv);

            //offset of UV cordinate
            const columns = 5;
            const rows = 1;
            const columnsWidth = 1 / columns;
            const rowsWidth = 1 / rows;

            let yOffset = (Math.floor(droneindex / columns)) * rowsWidth;
            let xOffset = (droneindex - columns * yOffset) * columnsWidth;
            console.log('xOffset=', xOffset, 'yoffset =', yOffset, 'droneindex= ', droneindex);

            let uvAttr: BufferAttribute = g.attributes.uv as BufferAttribute;
            let arry = uvAttr.array as Float32Array;
            for (let i = 0; i < uvAttr.array.length; i += 2) {
                arry.set([uvAttr.array[i] + xOffset], i);
                arry.set([uvAttr.array[i + 1] + yOffset], i + 1);
            }
            uvAttr.needsUpdate = true;
        }
    }
};



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

function makePlane(video: HTMLVideoElement, width: number, height: number, zLocation: number, floorY: number) {
    let geometry = new PlaneGeometry(width, height,1);
    let material = makeMaterial(video);
    let plane = new Mesh(geometry, material);
    plane.position.set(0, height/2 + floorY, zLocation);
    return plane;
}



//Perlin Noise
const p = new Uint8Array(512), permutation = new Uint8Array([151, 160, 137, 91, 90, 15,
    131, 13, 201, 95, 96, 53, 194, 233, 7, 225, 140, 36, 103, 30, 69, 142, 8, 99, 37, 240, 21, 10, 23,
    190, 6, 148, 247, 120, 234, 75, 0, 26, 197, 62, 94, 252, 219, 203, 117, 35, 11, 32, 57, 177, 33,
    88, 237, 149, 56, 87, 174, 20, 125, 136, 171, 168, 68, 175, 74, 165, 71, 134, 139, 48, 27, 166,
    77, 146, 158, 231, 83, 111, 229, 122, 60, 211, 133, 230, 220, 105, 92, 41, 55, 46, 245, 40, 244,
    102, 143, 54, 65, 25, 63, 161, 1, 216, 80, 73, 209, 76, 132, 187, 208, 89, 18, 169, 200, 196,
    135, 130, 116, 188, 159, 86, 164, 100, 109, 198, 173, 186, 3, 64, 52, 217, 226, 250, 124, 123,
    5, 202, 38, 147, 118, 126, 255, 82, 85, 212, 207, 206, 59, 227, 47, 16, 58, 17, 182, 189, 28, 42,
    223, 183, 170, 213, 119, 248, 152, 2, 44, 154, 163, 70, 221, 153, 101, 155, 167, 43, 172, 9,
    129, 22, 39, 253, 19, 98, 108, 110, 79, 113, 224, 232, 178, 185, 112, 104, 218, 246, 97, 228,
    251, 34, 242, 193, 238, 210, 144, 12, 191, 179, 162, 241, 81, 51, 145, 235, 249, 14, 239, 107,
    49, 192, 214, 31, 181, 199, 106, 157, 184, 84, 204, 176, 115, 121, 50, 45, 127, 4, 150, 254,
    138, 236, 205, 93, 222, 114, 67, 29, 24, 72, 243, 141, 128, 195, 78, 66, 215, 61, 156, 180
]);
for (let i = 0; i < 256; i++) p[256 + i] = p[i] = permutation[i];
function noise(x: number, y: number, z: number): number {
    let X = Math.floor(x) | 0 & 255,                  // FIND UNIT CUBE THAT
        Y = Math.floor(y) | 0 & 255,                  // CONTAINS POINT.
        Z = Math.floor(z) | 0 & 255;
    x -= Math.floor(x);                                // FIND RELATIVE X,Y,Z
    y -= Math.floor(y);                                // OF POINT IN CUBE.
    z -= Math.floor(z);
    let u = fade(x),                                // COMPUTE FADE CURVES
        v = fade(y),                                // FOR EACH OF X,Y,Z.
        w = fade(z);
    let A = p[X] + Y, AA = p[A] + Z, AB = p[A + 1] + Z,      // HASH COORDINATES OF
        B = p[X + 1] + Y, BA = p[B] + Z, BB = p[B + 1] + Z;      // THE 8 CUBE CORNERS,

    return lerp(w, lerp(v, lerp(u, grad(p[AA], x, y, z),  // AND ADD
        grad(p[BA], x - 1, y, z)), // BLENDED
        lerp(u, grad(p[AB], x, y - 1, z),  // RESULTS
            grad(p[BB], x - 1, y - 1, z))),// FROM  8
        lerp(v, lerp(u, grad(p[AA + 1], x, y, z - 1),  // CORNERS
            grad(p[BA + 1], x - 1, y, z - 1)), // OF CUBE
            lerp(u, grad(p[AB + 1], x, y - 1, z - 1),
                grad(p[BB + 1], x - 1, y - 1, z - 1))));
}
function fade(t: number): number { return t * t * t * (t * (t * 6 - 15) + 10); }
function grad(hash: number, x: number, y: number, z: number): number {
    let h = (hash | 0) & 15;                      // CONVERT LO 4 BITS OF HASH CODE
    let u = h < 8 ? x : y,                 // INTO 12 GRADIENT DIRECTIONS.
        v = h < 4 ? y : h == 12 || h == 14 ? x : z;
    return ((h & 1) == 0 ? u : -u) + ((h & 2) == 0 ? v : -v);
}