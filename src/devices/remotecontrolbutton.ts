import { Device, DeviceVersion } from "./generic/device";

import { IDeviceInterface } from "../interfaces";

export class RemoteControlButton extends Device {
    protected static _type = 55;

    constructor (hub: IDeviceInterface, portId: number, versions: DeviceVersion) {
        super(hub, portId, versions, RemoteControlButton.ModeMap);
    }

    public receive (message: Buffer) {
        const mode = this._mode;

        switch (mode) {
            case RemoteControlButton.Mode.BUTTON_EVENTS:
                /**
                 * Emits when a button on the remote is pressed or released.
                 * @event RemoteControlButton#button
                 * @param {number} event
                 */
                const event = message[4];
                this.emitGlobal("remoteButton", event);
                break;
        }
    }

}

export namespace RemoteControlButton {

    export enum Mode {
        BUTTON_EVENTS = 0x00
    }

    export const ModeMap: {[event: string]: number} = {
        "remoteButton": RemoteControlButton.Mode.BUTTON_EVENTS
    }

    export const ButtonState: {[state: string]: number} = {
        "UP": 0x01,
        "DOWN": 0xff,
        "STOP": 0x7f,
        "RELEASED": 0x00,
    }

}