import {Map, List} from "coreutil_v1";
import {ConfigEntry} from "./configEntry.js"

export class Config {

    constructor() {
        this.configElements = new Map();
        this.postConfigs = new List();
    }

    addAll(config) {
        this.configElements.addAll(config.getConfigElements());
        this.postConfigs.addAll(config.getPostConfigs());
    }

    addSingleton(className) {
        this.configElements.set(className.name,new ConfigEntry(className,"SINGLETON"));
        return this;
    }

    addPrototype(className) {
        this.configElements.set(className.name,new ConfigEntry(className,"PROTOTYPE"));
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

    getPostConfigs() {
        return this.postConfigs;
    }

    addPostConfig(postConfig) {
        this.postConfigs.add(postConfig);
    }

}