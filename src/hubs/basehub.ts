import { EventEmitter } from "events";

import { IBLEAbstraction } from "../interfaces";

import { ColorDistanceSensor } from "../devices/colordistancesensor";
import { CurrentSensor } from "../devices/currentsensor";
import { Device } from "../devices/device";

import { DuploTrainBaseColorSensor } from "../devices/duplotrainbasecolorsensor";
import { DuploTrainBaseMotor } from "../devices/duplotrainbasemotor";
import { DuploTrainBaseSpeaker } from "../devices/duplotrainbasespeaker";
import { DuploTrainBaseSpeedometer } from "../devices/duplotrainbasespeedometer";

import { HubLED } from "../devices/hubled";
import { Light } from "../devices/light";
import { MediumLinearMotor } from "../devices/mediumlinearmotor";
import { MotionSensor } from "../devices/motionsensor";
import { MoveHubMediumLinearMotor } from "../devices/movehubmediumlinearmotor";
import { MoveHubTiltSensor } from "../devices/movehubtiltsensor";
import { RemoteControlButton } from "../devices/remotecontrolbutton";
import { SimpleMediumLinearMotor } from "../devices/simplemediumlinearmotor";
import { PiezoBuzzer } from "../devices/piezobuzzer";
import { TechnicLargeLinearMotor } from "../devices/techniclargelinearmotor";
import { TechnicMediumHubAccelerometerSensor } from "../devices/technicmediumhubaccelerometersensor";
import { TechnicMediumHubGyroSensor } from "../devices/technicmediumhubgyrosensor";
import { TechnicMediumHubTiltSensor } from "../devices/technicmediumhubtiltsensor";
import { TechnicXLargeLinearMotor } from "../devices/technicxlargelinearmotor";
import { TiltSensor } from "../devices/tiltsensor";
import { TrainMotor } from "../devices/trainmotor";
import { VoltageSensor } from "../devices/voltagesensor";

import * as Consts from "../consts";

import Debug = require("debug");
const debug = Debug("basehub");


/**
 * @class BaseHub
 * @extends EventEmitter
 */
export class BaseHub extends EventEmitter {

    protected _attachedDevices: {[portId: number]: Device} = {};
    // protected _virtualPorts: {[portName: string]: Port} = {};

    protected _name: string = "";
    protected _firmwareVersion: string = "0.0.00.0000";
    protected _hardwareVersion: string = "0.0.00.0000";
    protected _primaryMACAddress: string = "00:00:00:00:00:00";
    protected _batteryLevel: number = 100;
    protected _rssi: number = -60;

    protected _bleDevice: IBLEAbstraction;

    private _type: Consts.HubType;
    private _portMap: {[portName: string]: number} = {};
    private _attachCallbacks: ((device: Device) => boolean)[] = [];

    constructor (device: IBLEAbstraction, portMap: {[portName: string]: number} = {}, type: Consts.HubType = Consts.HubType.UNKNOWN) {
        super();
        this.setMaxListeners(20); // Technic Medium Hub has 9 built in devices + 4 external ports. Node.js throws a warning after 11 attached event listeners.
        this._type = type;
        this._bleDevice = device;
        this._portMap = portMap;
        device.on("disconnect", () => {
            /**
             * Emits when the hub is disconnected.
             * @event Hub#disconnect
             */
            this.emit("disconnect");
        });
    }


    /**
     * @readonly
     * @property {string} name Name of the hub
     */
    public get name () {
        return this._bleDevice.name;
    }


    /**
     * @readonly
     * @property {string} type Hub type
     */
    public get type () {
        return this._type;
    }


    /**
     * @readonly
     * @property {string[]} ports Array of port names
     */
    public get ports () {
        return Object.keys(this._portMap);
    }


    /**
     * @readonly
     * @property {string} firmwareVersion Firmware version of the hub
     */
    public get firmwareVersion () {
        return this._firmwareVersion;
    }


    /**
     * @readonly
     * @property {string} firmwareVersion Hardware version of the hub
     */
    public get hardwareVersion () {
        return this._hardwareVersion;
    }


    /**
     * @readonly
     * @property {string} primaryMACAddress Primary MAC address of the hub
     */
    public get primaryMACAddress () {
        return this._primaryMACAddress;
    }


    /**
     * @readonly
     * @property {string} uuid UUID of the hub
     */
    public get uuid () {
        return this._bleDevice.uuid;
    }


    /**
     * @readonly
     * @property {number} batteryLevel Battery level of the hub (Percentage between 0-100)
     */
    public get batteryLevel () {
        return this._batteryLevel;
    }


    /**
     * @readonly
     * @property {number} rssi Signal strength of the hub
     */
    public get rssi () {
        return this._rssi;
    }


    /**
     * Connect to the Hub.
     * @method Hub#connect
     * @returns {Promise} Resolved upon successful connect.
     */
    public connect () {
        return new Promise(async (connectResolve, connectReject) => {
            if (this._bleDevice.connecting) {
                return connectReject("Already connecting");
            } else if (this._bleDevice.connected) {
                return connectReject("Already connected");
            }
            await this._bleDevice.connect();
            return connectResolve();
        });

    }


    /**
     * Disconnect the Hub.
     * @method Hub#disconnect
     * @returns {Promise} Resolved upon successful disconnect.
     */
    public disconnect () {
        return this._bleDevice.disconnect();
    }


    public getDeviceAtPort (portName: string) {
        const portId = this._portMap[portName];
        if (portId !== undefined) {
            return this._attachedDevices[portId];
        } else {
            throw new Error(`Port ${portName} does not exist on this hub type`);
        }
    }


    public waitForDeviceAtPort (portName: string) {
        return new Promise((resolve) => {
            const existingDevice = this.getDeviceAtPort(portName);
            if (existingDevice) {
                return resolve(existingDevice);
            }
            this._attachCallbacks.push((device) => {
                if (device.portName === portName) {
                    resolve(device);
                    return true;
                } else {
                    return false;
                }
            });
        });
    }


    public getDevices () {
        return Object.values(this._attachedDevices);
    }


    public getDevicesByType (deviceType: number) {
        return this.getDevices().filter((device) => device.type === deviceType);
    }


    public waitForDeviceByType (deviceType: number) {
        return new Promise((resolve) => {
            const existingDevices = this.getDevicesByType(deviceType);
            if (existingDevices.length >= 1) {
                return resolve(existingDevices[0]);
            }
            this._attachCallbacks.push((device) => {
                if (device.type === deviceType) {
                    resolve(device);
                    return true;
                } else {
                    return false;
                }
            })
        });
    }


    public getPortNameForPortId (portId: number) {
        for (const port of Object.keys(this._portMap)) {
            if (this._portMap[port] === portId) {
                return port;
            }
        }
        return;
    }


    /**
     * Sleep a given amount of time.
     *
     * This is a helper method to make it easier to add delays into a chain of commands.
     * @method Hub#sleep
     * @param {number} delay How long to sleep (in milliseconds).
     * @returns {Promise} Resolved after the delay is finished.
     */
    public sleep (delay: number) {
        return new Promise((resolve) => {
            global.setTimeout(resolve, delay);
        });
    }


    /**
     * Wait until a given list of concurrently running commands are complete.
     *
     * This is a helper method to make it easier to wait for concurrent commands to complete.
     * @method Hub#wait
     * @param {Array<Promise<any>>} commands Array of executing commands.
     * @returns {Promise} Resolved after the commands are finished.
     */
    public wait (commands: Array<Promise<any>>) {
        return Promise.all(commands);
    }


    public send (message: Buffer, uuid: string, callback?: () => void) {
        if (callback) {
            callback();
        }
    }


    public subscribe (portId: number, deviceType: number, mode: number) {
        // NK Do nothing here
    }


    protected _attachDevice (device: Device) {
        this._attachedDevices[device.portId] = device;
        /**
         * Emits when a device is attached to the Hub.
         * @event Hub#attach
         * @param {Device} device
         */
        this.emit("attach", device);
        debug(`Attached device type ${device.type} (${Consts.DeviceTypeNames[device.type]}) on port ${device.portName} (${device.portId})`);

        let i = this._attachCallbacks.length;
        while (i--) {
            const callback = this._attachCallbacks[i];
            if (callback(device)) {
                this._attachCallbacks.splice(i, 1); 
            }
        }
    }


    protected _detachDevice (device: Device) {
        delete this._attachedDevices[device.portId];
        /**
         * Emits when a device is detached from the Hub.
         * @event Hub#attach
         * @param {Device} device
         */
        this.emit("detach", device);
        debug(`Detached device type ${device.type} (${Consts.DeviceTypeNames[device.type]}) on port ${device.portName} (${device.portId})`);
    }


    protected _createDevice (deviceType: number, portId: number) {
        let constructor;

        // NK TODO: This needs to go in a better place
        const deviceConstructors: {[type: number]: typeof Device} = {
            [Consts.DeviceType.LIGHT]: Light,
            [Consts.DeviceType.TRAIN_MOTOR]: TrainMotor,
            [Consts.DeviceType.SIMPLE_MEDIUM_LINEAR_MOTOR]: SimpleMediumLinearMotor,
            [Consts.DeviceType.MOVE_HUB_MEDIUM_LINEAR_MOTOR]: MoveHubMediumLinearMotor,
            [Consts.DeviceType.MOTION_SENSOR]: MotionSensor,
            [Consts.DeviceType.TILT_SENSOR]: TiltSensor,
            [Consts.DeviceType.MOVE_HUB_TILT_SENSOR]: MoveHubTiltSensor,
            [Consts.DeviceType.TECHNIC_MEDIUM_HUB_TILT_SENSOR]: TechnicMediumHubTiltSensor,
            [Consts.DeviceType.TECHNIC_MEDIUM_HUB_GYRO_SENSOR]: TechnicMediumHubGyroSensor,
            [Consts.DeviceType.TECHNIC_MEDIUM_HUB_ACCELEROMETER]: TechnicMediumHubAccelerometerSensor,
            [Consts.DeviceType.MEDIUM_LINEAR_MOTOR]: MediumLinearMotor,
            [Consts.DeviceType.TECHNIC_LARGE_LINEAR_MOTOR]: TechnicLargeLinearMotor,
            [Consts.DeviceType.TECHNIC_XLARGE_LINEAR_MOTOR]: TechnicXLargeLinearMotor,
            [Consts.DeviceType.COLOR_DISTANCE_SENSOR]: ColorDistanceSensor,
            [Consts.DeviceType.VOLTAGE_SENSOR]: VoltageSensor,
            [Consts.DeviceType.CURRENT_SENSOR]: CurrentSensor,
            [Consts.DeviceType.REMOTE_CONTROL_BUTTON]: RemoteControlButton,
            [Consts.DeviceType.HUB_LED]: HubLED,
            [Consts.DeviceType.DUPLO_TRAIN_BASE_COLOR_SENSOR]: DuploTrainBaseColorSensor,
            [Consts.DeviceType.DUPLO_TRAIN_BASE_MOTOR]: DuploTrainBaseMotor,
            [Consts.DeviceType.DUPLO_TRAIN_BASE_SPEAKER]: DuploTrainBaseSpeaker,
            [Consts.DeviceType.DUPLO_TRAIN_BASE_SPEEDOMETER]: DuploTrainBaseSpeedometer
        };

        constructor = deviceConstructors[deviceType as Consts.DeviceType];
        
        if (constructor) {
            return new constructor(this, portId);
        } else {
            return new Device(this, portId, undefined, deviceType);
        }

    }


    protected _getDeviceByPortId (portId: number) {
        return this._attachedDevices[portId];
    }


}
