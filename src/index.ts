import './main.css';
import { Scene, PerspectiveCamera, PlaneGeometry, MeshBasicMaterial, Mesh, WebGLRenderer, VideoTexture, LinearFilter, RGBFormat } from "three";

import { Halls, Hall, HallState } from "./common"
import * as learningToSeeHall from "./halls/learningToSee"
import * as masksHall from "./halls/masks"
import * as droneHall from "./halls/droneHall"

import * as Stats from "stats.js"
let stats = new Stats();
stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
document.body.appendChild(stats.dom);

const halls: Halls = {
    renderer: new WebGLRenderer(),
    state: HallState.Init,
    currHallIdx: 0,
    allHalls: [ masksHall,learningToSeeHall, droneHall],
}

function renderLoop() {
    stats.begin();
    switch (halls.state) {
        case HallState.Init:
            {
                let renderer = halls.renderer;
                renderer.setSize(window.innerWidth, window.innerHeight);
                renderer.setClearColor("black");
                document.body.appendChild(renderer.domElement);

                window.addEventListener("resize", () => {
                    renderer.setSize(window.innerWidth, window.innerHeight);
                    if (halls.state == HallState.InHall) {
                        halls.allHalls[halls.currHallIdx].resize();
                    }
                });

                halls.state = HallState.StartedEnteringHall;
            }
            break;
        case HallState.StartedEnteringHall:
            {
                halls.state = HallState.EnteringHall;
                halls.allHalls[halls.currHallIdx].setup().then(() => {
                    halls.allHalls[halls.currHallIdx].onEnter(halls.renderer);
                    halls.state = HallState.InHall;
                });
            } break;
        case HallState.EnteringHall:
            {
                // Waiting for promise to finish
            } break;
        case HallState.InHall:
            {
                halls.allHalls[halls.currHallIdx].resize();
                halls.allHalls[halls.currHallIdx].render(halls.renderer);
                let progress = halls.allHalls[halls.currHallIdx].getProgressFrac();
                if (progress >= 0.99) {
                    halls.state = HallState.StartedLeavingHall;
                }
            } break;
            case HallState.StartedLeavingHall:
                halls.state = HallState.LeavingHall;
                {
                    halls.allHalls[halls.currHallIdx].teardown().then(() => {
                    halls.currHallIdx = (halls.currHallIdx + 1) % halls.allHalls.length;
                    console.log(`Now entering hall: ${halls.currHallIdx}`);
                    halls.state = HallState.StartedEnteringHall;
                });
            } break;
        case HallState.LeavingHall:
            {
                // Waiting for promise to finish
            } break;
    }
    stats.end();
    requestAnimationFrame(renderLoop);
}

requestAnimationFrame(renderLoop);