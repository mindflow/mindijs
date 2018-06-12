import {List} from "coreutil_v1";
import {ConfigEntry} from "./configEntry.js"

export class Config {

    constructor() {
        this._configElements = new List(); 
    }

    addAll(config) {
        this._configElements.addAll(config.getConfigElements());
    }

    addSingleton(className) {
        this._configElements.add(new ConfigEntry(className,"SINGLETON"));
        return this;
    }

    addPrototype(className) {
        this._configElements.add(new ConfigEntry(className,"PROTOTYPE"));
        return this;
    }

    getConfigElements() {
        return this._configElements;
    }

}