import { WebGLRenderer } from "three";

export interface Hall {
    introClassName: string | null,
    setup(): Promise<void>,
    onEnter(renderer: WebGLRenderer): void,
    render(renderer: WebGLRenderer): void,
    teardown(): Promise<void>,
    resize(): void,
    getProgressFrac(): number,
}

export enum HallState {
    Init,
    Landing,
    StartedLoadingHall,
    LoadingHall,
    WaitingToEnterHall,
    InHall,
    StartedLeavingHall,
    LeavingHall,
}

export interface Halls {
    renderer: WebGLRenderer,
    state: HallState
    currHallIdx: number
    allHalls: Hall[],
}