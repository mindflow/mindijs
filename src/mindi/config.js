import {Map, List} from "coreutil_v1";
import {ConfigEntry} from "./configEntry.js"

export class Config {

    constructor() {
        this.configElements = new Map();
        this.configProcessors = new List();
        this.instanceProcessors = new List();
    }

    addAll(config) {
        this.configElements.addAll(config.getConfigElements());
        this.configProcessors.addAll(config.getConfigProcessors());
        this.instanceProcessors.addAll(config.getInstanceProcessors());
        return this;
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

    /**
     * @returns {Map}
     */
    getConfigElements() {
        return this.configElements;
    }

    /**
     * @returns {List}
     */
    getConfigProcessors() {
        return this.configProcessors;
    }

    /**
     * @returns {List}
     */
    getInstanceProcessors() {
        return this.instanceProcessors;
    }

    addConfigProcessor(configProcessor) {
        this.configProcessors.add(configProcessor);
    }

    addInstanceProcessor(instanceProcessor) {
        this.instanceProcessors.add(instanceProcessor);
    }
}