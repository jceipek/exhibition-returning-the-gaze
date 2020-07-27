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
    allHalls: [ masksHall,learningToSeeHall,droneHall],
}

function resizeRenderingViewToFillScreen(canvas: HTMLCanvasElement) {
  // Lookup the size the browser is displaying the canvas.
  var displayWidth  = canvas.clientWidth;
  var displayHeight = canvas.clientHeight;
 
  // Check if the canvas is not the same size.
  if (canvas.width  != displayWidth ||
      canvas.height != displayHeight) {
 
    // Make the canvas the same size
    canvas.width  = displayWidth;
    canvas.height = displayHeight;
  }
}

function getTimestamp () {
    return (new Date()).valueOf();
}


const loadingIndicator = document.createElement("div");
loadingIndicator.classList.add("js-loading");
loadingIndicator.classList.add("loading");
let loadingState = getTimestamp();

window.addEventListener("click", () => {
    if (halls.state === HallState.WaitingToEnterHall) {
        halls.state = HallState.InHall;
        document.body.removeChild(loadingIndicator);
        let hallIntro = document.getElementsByClassName(halls.allHalls[halls.currHallIdx].introClassName)[0];
        hallIntro.classList.add("hidden");
    } else if (halls.state === HallState.Landing) {
        let hallIntro = document.getElementsByClassName("js-landing")[0];
        hallIntro.classList.add("hidden");
        halls.state = HallState.StartedLoadingHall;
    }
});

function handleHalls() {
    switch (halls.state) {
        case HallState.Init:
            {
                let renderer = halls.renderer;
                renderer.setSize(window.innerWidth, window.innerHeight);
                renderer.setClearColor("black");
                renderer.domElement.classList.add("main-view");
                document.body.appendChild(renderer.domElement);
                // resizeRenderingViewToFillScreen(renderer.domElement);

                window.addEventListener("resize", () => {
                    renderer.setSize(window.innerWidth, window.innerHeight);
                    if (halls.state == HallState.InHall) {
                        halls.allHalls[halls.currHallIdx].resize();
                    }
                });

                halls.state = HallState.Landing;
            }
            break;
        case HallState.Landing:
            {
                //halls.state = HallState.StartedLoadingHall;
            } break;
        case HallState.StartedLoadingHall:
            {
                let hallIntro = document.getElementsByClassName(halls.allHalls[halls.currHallIdx].introClassName)[0];
                hallIntro.classList.remove("hidden");
                document.body.appendChild(loadingIndicator);
                loadingState = getTimestamp();

                halls.state = HallState.LoadingHall;
                halls.allHalls[halls.currHallIdx].setup().then(() => {
                    loadingIndicator.innerText = "Click to Enter";
                    halls.allHalls[halls.currHallIdx].onEnter(halls.renderer);
                    halls.state = HallState.WaitingToEnterHall;
                });
            } break;
        case HallState.LoadingHall:
            {
                // Waiting for promise to finish
                const interval = 500;
                const times = 3;
                let elapsedMs = getTimestamp()-loadingState;
                let dotCount = Math.floor((elapsedMs % (interval * times))/interval);
                let text = "Loading";
                for (let i = 0; i <= dotCount; i++) {
                    text += ".";
                }
                loadingIndicator.innerText = text;
            } break;
        case HallState.WaitingToEnterHall:
            {
                // Waiting for click event above
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
                    halls.state = HallState.StartedLoadingHall;
                });
            } break;
        case HallState.LeavingHall:
            {
                // Waiting for promise to finish
            } break;
    }
}

function renderLoop() {
    stats.begin();
    handleHalls();
    stats.end();
    requestAnimationFrame(renderLoop);
}

requestAnimationFrame(renderLoop);