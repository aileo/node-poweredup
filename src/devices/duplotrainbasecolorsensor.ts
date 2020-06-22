import { Device } from "./device";

import { IDeviceInterface } from "../interfaces";

import * as Consts from "../consts";

/**
 * @class DuploTrainBaseColorSensor
 * @extends Device
 */
export class DuploTrainBaseColorSensor extends Device {

    constructor (hub: IDeviceInterface, portId: number) {
        super(hub, portId, ModeMap, Consts.DeviceType.DUPLO_TRAIN_BASE_COLOR_SENSOR);
    }

    public receive (message: Buffer) {
        if (this.hub.autoParse) {
            return super.receive(message);
        }

        const mode = this._mode;

        switch (mode) {
            case Mode.COLOR:
                if (message[4] <= 10) {
                    const color = message[4];

                    /**
                     * Emits when a color sensor is activated.
                     * @event DuploTrainBaseColorSensor#color
                     * @type {object}
                     * @param {Color} color
                     */
                    this.notify("color", { color });
                }
                break;

            case Mode.REFLECTIVITY:
                const reflect = message[4];

                /**
                 * Emits when the light reflectivity changes.
                 * @event DuploTrainBaseColorSensor#reflect
                 * @type {object}
                 * @param {number} reflect Percentage, from 0 to 100.
                 */
                this.notify("reflect", { reflect });
                break;

            case Mode.RGB:
                const red = Math.floor(message.readUInt16LE(4) / 4);
                const green = Math.floor(message.readUInt16LE(6) / 4);
                const blue = Math.floor(message.readUInt16LE(8) / 4);

                /**
                 * Emits when the light reflectivity changes.
                 * @event DuploTrainBaseColorSensor#rgb
                 * @type {object}
                 * @param {number} red
                 * @param {number} green
                 * @param {number} blue
                 */
                this.notify("rgb", { red, green, blue });
                break;

        }
    }

}

export enum Mode {
    COLOR = 0x00,
    REFLECTIVITY = 0x02,
    RGB = 0x03
}

export const ModeMap: {[event: string]: number} = {
    "color": Mode.COLOR,
    "reflect": Mode.REFLECTIVITY,
    "rgb": Mode.RGB
};
