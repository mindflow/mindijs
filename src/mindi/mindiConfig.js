import { Map, List, Logger } from "coreutil_v1";
import { TypeConfig } from "./typeConfig/typeConfig.js";
import { ConfigProcessorExecutor } from "./configProcessor/configProcessorExecutor.js";
import { SingletonConfig } from "./typeConfig/singletonConfig.js";
import { Config } from "./config.js";
import { MindiInjector } from "./mindiInjector.js";

const LOG = new Logger("Config");

export class MindiConfig extends Config {

    constructor() {
        super();
        this.finalized = false;
        this.configEntries = new Map();
        this.configProcessors = new List();
        this.instanceProcessors = new List();
    }

    /**
     * 
     * @param {Config} config 
     */
    merge(config) {
        if (!config.getFinalized()) {
            throw Error("Cannot merge into an unfinalized config");
        }
        const newConfigEntries = new Map();
        newConfigEntries.addAll(this.configEntries);
        newConfigEntries.addAll(config.getConfigEntries());

        const newConfigProcessors = new List();
        newConfigProcessors.addAll(this.configProcessors);
        newConfigProcessors.addAll(config.getConfigProcessors());

        const newInstanceProcessors = new List();
        newInstanceProcessors.addAll(this.instanceProcessors);
        newInstanceProcessors.addAll(config.getInstanceProcessors());

        this.configEntries = newConfigEntries;
        this.configProcessors = newConfigProcessors;
        this.instanceProcessors = newInstanceProcessors;

        return this;
    }

    /**
     * 
     * @param {TypeConfig} typeConfig 
     */
    addTypeConfig(typeConfig) {
        this.configEntries.set(typeConfig.getName(), typeConfig);
        return this;
    }

    addConfigProcessor(configProcessor) {
        this.configProcessors.add(configProcessor.name);
        return this.addTypeConfig(SingletonConfig.unnamed(configProcessor));
    }

    addInstanceProcessor(instanceProcessor) {
        this.instanceProcessors.add(instanceProcessor.name);
        return this.addTypeConfig(SingletonConfig.unnamed(instanceProcessor));
    }

    /**
     * @returns {Map}
     */
    getConfigEntries() {
        return this.configEntries;
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

    getFinalized() {
        return this.finalized;
    }

    finalize() {
        this.finalized = true;
        return ConfigProcessorExecutor.execute(this.getConfigProcessors(), MindiInjector.getInstance(), this);
    }

}