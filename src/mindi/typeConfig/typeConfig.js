import { InstanceHolder } from "./instanceHolder.js";

export class TypeConfig {

    static get NEW() { return "NEW"; }
    static get CONFIGURED() { return "CONFIGURED"; }

    constructor(name, classReference) {
        this.name = name;
        this.classReference = classReference;
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