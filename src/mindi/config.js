import {Map} from "coreutil_v1";
import {ConfigEntry} from "./configEntry.js"

export class Config {

    constructor() {
        this.configElements = new Map(); 
    }

    addAll(config) {
        this.configElements.addAll(config.getConfigElements());
    }

    addSingleton(className) {
        this.configElements.set(className,new ConfigEntry(className,"SINGLETON"));
        return this;
    }

    addPrototype(className) {
        this.configElements.set(className,new ConfigEntry(className,"PROTOTYPE"));
        return this;
    }

    addNamedSingleton(name,className) {
        this.configElements.set(name,new ConfigEntry(className,"SINGLETON"));
        return this;
    }

    addNamedPrototype(name,className) {
        this.configElements.set(name,new ConfigEntry(className,"PROTOTYPE"));
        return this;
    }

    getConfigElements() {
        return this.configElements;
    }

}