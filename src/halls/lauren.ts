import { Halls, Hall, HallState } from "../common"

interface LaurenHall extends Hall {
    state: {
        iframe: HTMLIFrameElement | null
    }
}

const thisHall: LaurenHall = {
    introClassName: null,
    state: {
        iframe: null
    },
    setup: async function (): Promise<void> {
        return new Promise<void>((resolve) => {
            let iframe = document.createElement("iframe");
            iframe.classList.add("iframe-hall");
            iframe.src = "/lauren";
            // iframe.width = `${window.innerWidth}px`;
            // iframe.height = `${window.innerHeight}px`;
            thisHall.state.iframe = iframe;    
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
            let iframe = thisHall.state.iframe;
            document.body.removeChild(iframe);
            resolve();
        });
    },
    getProgressFrac: function (): number {
        return 0;
    },
}
export = thisHall;