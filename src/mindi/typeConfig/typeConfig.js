import { InstanceHolder } from "./instanceHolder.js";

export class TypeConfig {

    static get NEW() { return "NEW"; }
    static get CONFIGURED() { return "CONFIGURED"; }

    /**
     * 
     * @param {String} name 
     * @param {Function} classReference 
     */
    constructor(name, classReference) {

        /** @type {String} */
        this.name = name;

        /** @type {Function} */
        this.classReference = classReference;

        /** @type {String} */
        this.stage = TypeConfig.NEW;
    }

    /**
     * 
     * @param {array} parameters 
     * @returns {InstanceHolder}
     */
    instanceHolder(parameters = []) {
        return null;
    }

}