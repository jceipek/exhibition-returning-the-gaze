import { WebGLRenderer } from "three";

export interface Hall {
    setup(): Promise<void>,
    onEnter(renderer: WebGLRenderer): void,
    render(renderer: WebGLRenderer): void,
    teardown(): Promise<void>,
    resize(): void,
    getProgressFrac(): number,
}

export enum HallState {
    Init,
    StartedEnteringHall,
    EnteringHall,
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