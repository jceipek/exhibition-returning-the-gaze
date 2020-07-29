import { Halls, Hall, HallState } from "../common"

interface LaurenHall extends Hall {
    state: {
        iframe: HTMLIFrameElement | null,
        shouldLeave: boolean,
    }
}

function onMessageFromIframe(event: MessageEvent) {
    if (event.origin === "http://localhost:8080" ||
        event.origin === "https://returningthegaze.com") {
        if (event.data === "leaveLaurenHall") {
            thisHall.state.shouldLeave = true;
        }
    } else {
        console.log("Ignoring message from", event.origin);
    }
}

function toggleEventListeners (state: boolean) {
    if (state) {
        window.addEventListener("message", onMessageFromIframe, false);
    } else {
        window.removeEventListener("message", onMessageFromIframe);
    }
}

const thisHall: LaurenHall = {
    introClassName: null,
    state: {
        iframe: null,
        shouldLeave: false,
    },
    setup: async function (): Promise<void> {
        return new Promise<void>((resolve) => {
            let iframe = document.createElement("iframe");
            iframe.classList.add("iframe-hall");
            iframe.src = "/lauren";
            // iframe.width = `${window.innerWidth}px`;
            // iframe.height = `${window.innerHeight}px`;
            thisHall.state.iframe = iframe;
            thisHall.state.shouldLeave = false;
            toggleEventListeners(true);
            resolve();
            // iframe.addEventListener("load", () => {
            // });
        });
    },
    onEnter: function (renderer) {
        let iframe = thisHall.state.iframe;
        if (iframe) {
            document.body.appendChild(iframe);
        }
    },
    render: function (renderer) {
    },
    resize: function () {
        let iframe = thisHall.state.iframe;
        if (iframe) {
            // iframe.width = `${window.innerWidth}px`;
            // iframe.height = `${window.innerHeight}px`;
        }
    },
    teardown: async function () : Promise<void> {
        return new Promise<void>((resolve) => {
            toggleEventListeners(false);
            let iframe = thisHall.state.iframe;
            document.body.removeChild(iframe);
            resolve();
        });
    },
    getProgressFrac: function (): number {
        if (thisHall.state.shouldLeave) {
            return 1;
        } else {
            return 0;
        }
    },
}
export = thisHall;