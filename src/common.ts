import { WebGLRenderer } from "three";

export interface Hall {
    name: string,
    iconPath: string,
    introId: string | null,
    setup(): Promise<void>,
    onEnter(renderer: WebGLRenderer): void,
    onLeave(): void,
    render(renderer: WebGLRenderer): void,
    teardown(): Promise<void>,
    resize(): void,
    getProgressFrac(): number,
}

export enum HallState {
    None,
    Init,
    Landing,
    StartedLoadingHall,
    LoadingHall,
    WaitingToEnterHall,
    InHall,
    StartedLeavingHall,
    LeavingHall,
    Reflecting,
}

export interface Halls {
    renderer: WebGLRenderer,
    state: HallState
    currHallIdx: number
    lastState: HallState,
    lastHallIdx: number,
    nextState: HallState,
    nextHallIdx: number,
    allHalls: Hall[],
}

export async function makeVideo(webmSource: string): Promise<HTMLVideoElement> {
    let video = document.createElement("video");
    let isSupported = video.canPlayType("video/webm");

    return new Promise<HTMLVideoElement>((resolve, reject) => {
        if (isSupported) {
            function onCanPlay() {
                // XXX: Hack to make Chrome render the first frame
                // without throwing WebGL warnings.
                video.currentTime = 1/1000;

                video.width = video.videoWidth;
                video.height = video.videoHeight;
                console.log(video);
                resolve(video);
                video.removeEventListener("canplay", onCanPlay);
            }

            video.addEventListener("canplay", onCanPlay);

            video.preload = 'metadata';
            video.muted = true;
            video.autoplay = false;
            video.src = webmSource;
            video.loop = true;
            video.load();

            if (video.readyState >= 3) {
                onCanPlay();
            }
        } else {
            reject("Your browser doesn't support webm videos.");
        }
    });
}