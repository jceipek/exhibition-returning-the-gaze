import './main.css';
import { Scene, PerspectiveCamera, PlaneGeometry, MeshBasicMaterial, Mesh, WebGLRenderer, VideoTexture, LinearFilter, RGBFormat } from "three";

import { Halls, Hall, HallState } from "./common"
import * as learningToSeeHall from "./halls/learningToSee"
import * as masksHall from "./halls/masks"
import * as droneHall from "./halls/droneHall"
import * as laurenHall from "./halls/lauren"

import * as Stats from "stats.js"
let stats = new Stats();
stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
stats.dom.style.left = "auto";
stats.dom.style.right = "0";
stats.dom.style.top = "50px";
document.body.appendChild(stats.dom);

const halls: Halls = {
    renderer: new WebGLRenderer(),
    state: HallState.Init,
    lastState: HallState.None,
    currHallIdx: 0,
    lastHallIdx: -1,
    nextState: HallState.Init,
    nextHallIdx: 0,
    allHalls: [droneHall, masksHall, learningToSeeHall, laurenHall],
}

function getTimestamp() {
    return (new Date()).valueOf();
}

const loadingIndicator = document.createElement("div");
loadingIndicator.classList.add("js-loading");
loadingIndicator.classList.add("loading");
let loadingState = getTimestamp();
let loadingIndicatorVisible = false;

function toggleLoadingIndicator(state: boolean) {
    if (loadingIndicatorVisible !== state) {
        if (state) {
            document.body.appendChild(loadingIndicator);
        } else {
            document.body.removeChild(loadingIndicator);
        }
        loadingIndicatorVisible = state;
    }
}

function canNavigate(state: HallState): boolean {
    return (state === HallState.InHall ||
        state === HallState.WaitingToEnterHall ||
        state === HallState.Landing ||
        state === HallState.Reflecting);
}

let navigation = document.getElementsByClassName("navigation")[0];
let hallLinks = halls.allHalls.map((hall, idx) => {
    let li = document.createElement("li");
    let img = document.createElement("img");
    img.src = hall.iconPath;
    img.alt = hall.name;
    li.appendChild(img);
    let txt = document.createElement("p");
    txt.textContent = hall.name;
    li.appendChild(txt);
    function makeJumpToIdxOnClick(idx: number) {
        return () => {
            if ((halls.currHallIdx !== idx || halls.state == HallState.Reflecting) &&
                (canNavigate(halls.state))) {
                halls.state = HallState.LeavingHall;
                halls.allHalls[halls.currHallIdx].teardown().then(() => {
                    halls.currHallIdx = idx;
                    console.log(`Now entering hall: ${halls.currHallIdx}`);
                    halls.state = HallState.StartedLoadingHall;
                });
            }
        }
    }
    li.addEventListener("click", makeJumpToIdxOnClick(idx));
    return li;
});
let ul = document.createElement("ul");
for (let i = 0; i < hallLinks.length; i++) {
    ul.appendChild(hallLinks[i]);
}
let gotoReflection = document.createElement("li");
gotoReflection.textContent = "Hall of Reflection";
gotoReflection.addEventListener("click", () => {
    if (canNavigate(halls.state)) {
        halls.state = HallState.Reflecting;
    }
});
ul.appendChild(gotoReflection);
navigation.appendChild(ul);


const interstitials = {
    landingBlock: document.getElementById("js-landing"),
    hallIntros: (() => {
        return halls.allHalls.map((hall, idx) => {
            let introId = halls.allHalls[idx].introId;
            if (introId) {
                return document.getElementById(introId);
            } else {
                return null;
            }
        });
    })(),
    reflection: document.getElementById("js-reflection")
}

window.addEventListener("click", () => {
    if (halls.state === HallState.WaitingToEnterHall) {
        halls.state = HallState.InHall;
    } else if (halls.state === HallState.Landing) {
        halls.state = HallState.StartedLoadingHall;
    }
});

function currHallHasIntro(): boolean {
    let introId = halls.allHalls[halls.currHallIdx].introId;
    return introId ? true : false;
}

function handleStateChange(lastState: HallState, lastIdx: number,
    state: HallState, idx: number) {
    if (lastState === state && idx === lastIdx) {
        return;
    }
    if (canNavigate(state)) {
        navigation.classList.remove("hidden");
    } else {
        navigation.classList.add("hidden");
    }
    switch (state) {
        case HallState.Init:
        case HallState.Landing:
            {
                interstitials.landingBlock.classList.remove("hidden");
                let hallIntros = interstitials.hallIntros;
                for (let i = 0; i < hallIntros.length; i++) {
                    if (hallIntros[i]) {
                        hallIntros[i].classList.add("hidden");
                    }
                }
                interstitials.reflection.classList.add("hidden");
            } break;
        case HallState.StartedLoadingHall:
        case HallState.LoadingHall:
        case HallState.WaitingToEnterHall:
            {
                interstitials.landingBlock.classList.add("hidden");
                let hallIntros = interstitials.hallIntros;
                for (let i = 0; i < hallIntros.length; i++) {
                    if (hallIntros[i]) {
                        if (idx == i) {
                            hallIntros[i].classList.remove("hidden");
                        } else {
                            hallIntros[i].classList.add("hidden");
                        }
                    }
                }
                interstitials.reflection.classList.add("hidden");
            } break;
        case HallState.InHall:
        case HallState.StartedLeavingHall:
        case HallState.LeavingHall:
            {
                interstitials.landingBlock.classList.add("hidden");
                let hallIntros = interstitials.hallIntros;
                for (let i = 0; i < hallIntros.length; i++) {
                    if (hallIntros[i]) {
                        hallIntros[i].classList.add("hidden");
                    }
                }
                interstitials.reflection.classList.add("hidden");
            } break;
        case HallState.Reflecting:
            {
                interstitials.landingBlock.classList.add("hidden");
                let hallIntros = interstitials.hallIntros;
                for (let i = 0; i < hallIntros.length; i++) {
                    if (hallIntros[i]) {
                        hallIntros[i].classList.add("hidden");
                    }
                }
                interstitials.reflection.classList.remove("hidden");
            } break;
    }

    switch (state) {
        case HallState.Init:
        case HallState.Landing:
            {
                toggleLoadingIndicator(false);
            } break;
        case HallState.StartedLoadingHall:
        case HallState.LoadingHall:
        case HallState.WaitingToEnterHall:
            {
                toggleLoadingIndicator(true);
            } break;
        case HallState.InHall:
        case HallState.StartedLeavingHall:
        case HallState.LeavingHall:
            {
                toggleLoadingIndicator(false);
            } break;
        case HallState.Reflecting:
            {
                toggleLoadingIndicator(false);
            } break;
    }

    if (state === HallState.InHall && lastState !== HallState.InHall) {
        halls.allHalls[halls.lastHallIdx].onEnter(halls.renderer);
    } else if (lastState === HallState.InHall && state !== HallState.InHall) {
        halls.allHalls[halls.lastHallIdx].onLeave();
    }

    switch (state) {
        case HallState.Init: console.log("Init"); break;
        case HallState.Landing: console.log("Landing"); break;
        case HallState.StartedLoadingHall: console.log("StartedLoadingHall"); break;
        case HallState.LoadingHall: console.log("LoadingHall"); break;
        case HallState.WaitingToEnterHall: console.log("WaitingToEnterHall"); break;
        case HallState.InHall: console.log("InHall"); break;
        case HallState.StartedLeavingHall: console.log("StartedLeavingHall"); break;
        case HallState.LeavingHall: console.log("LeavingHall"); break;
        case HallState.Reflecting: console.log("Reflecting"); break;
    }
}

function handleHalls() {
    switch (halls.state) {
        case HallState.Init:
            {
                let renderer = halls.renderer;
                renderer.setSize(document.documentElement.clientWidth, window.innerHeight);
                renderer.setClearColor("black");
                renderer.domElement.classList.add("main-view");
                document.body.appendChild(renderer.domElement);

                window.addEventListener("resize", () => {
                    renderer.setSize(document.documentElement.clientWidth, window.innerHeight);
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
                let hasIntro = currHallHasIntro();
                if (hasIntro) {

                    loadingState = getTimestamp();
                }

                halls.state = HallState.LoadingHall;
                console.log("SETUP");
                halls.allHalls[halls.currHallIdx].setup().then(() => {
                    if (hasIntro) {
                        loadingIndicator.innerText = "Press to Enter";
                        halls.state = HallState.WaitingToEnterHall;
                    } else {
                        halls.state = HallState.InHall;
                    }
                });
            } break;
        case HallState.LoadingHall:
            {
                // Waiting for promise to finish
                const interval = 500;
                const times = 3;
                let elapsedMs = getTimestamp() - loadingState;
                let dotCount = Math.floor((elapsedMs % (interval * times)) / interval);
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

                    // if (halls.currHallIdx === 0) {
                    //     halls.state = HallState.Reflecting;
                    //     setReflectionVisibility(true);
                    // }
                });
            } break;
        case HallState.LeavingHall:
            {
                // Waiting for promise to finish
            } break;
        case HallState.Reflecting:
            {

            } break;
    }
    handleStateChange(halls.lastState, halls.lastHallIdx, halls.state, halls.currHallIdx);
    halls.lastState = halls.state;
    halls.lastHallIdx = halls.currHallIdx;
}

function renderLoop() {
    stats.begin();
    handleHalls();
    stats.end();
    requestAnimationFrame(renderLoop);
}

requestAnimationFrame(renderLoop);