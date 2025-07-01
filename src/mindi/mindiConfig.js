import { ArrayUtils, Logger, MapUtils } from "coreutil_v1";
import { TypeConfig } from "./typeConfig/typeConfig.js";
import { ConfigProcessorExecutor } from "./configProcessor/configProcessorExecutor.js";
import { SingletonConfig } from "./typeConfig/singletonConfig.js";
import { Config } from "./config.js";
import { MindiInjector } from "./mindiInjector.js";
import { InstanceProcessor } from "./instanceProcessor/instanceProcessor.js";
import { ConfigProcessor } from "./configProcessor/configProcessor.js";

const LOG = new Logger("Config");

export class MindiConfig extends Config {

    constructor() {
        super();

        /** @type {Boolean} */
        this.finalized = false;

        /** @type {Map<TypeConfig>} */
        this.configEntries = new Map();

        /** @type {Array} */
        this.configProcessors = new Array();

        /** @type {Array} */
        this.instanceProcessors = new Array();
    }

    /**
     * 
     * @param {Config} config
     * @returns {MindiConfig}
     */
    merge(config) {
        this.finalized = true;

        this.configEntries = MapUtils
            .merge(this.configEntries, config.configEntries);
        this.configProcessors = ArrayUtils
            .merge(this.configProcessors, config.configProcessors);
        this.instanceProcessors = ArrayUtils
            .merge(this.instanceProcessors, config.instanceProcessors);

        return this;
    }

    /**
     * 
     * @param {TypeConfig} typeConfig
     * @returns {MindiConfig}
     */
    addTypeConfig(typeConfig) {
        this.finalized = false;
        this.configEntries.set(typeConfig.name, typeConfig);
        return this;
    }

    /**
     * 
     * @param {ConfigProcessor} configProcessor
     * @returns {MindiConfig}
     */
    addConfigProcessor(configProcessor) {
        this.configProcessors = ArrayUtils.add(this.configProcessors, configProcessor.name);
        return this.addTypeConfig(SingletonConfig.unnamed(configProcessor));
    }

    /**
     * 
     * @param {InstanceProcessor} instanceProcessor
     * @returns {MindiConfig}
     */
    addInstanceProcessor(instanceProcessor) {
        this.instanceProcessors = ArrayUtils.add(this.instanceProcessors, instanceProcessor.name);
        return this.addTypeConfig(SingletonConfig.unnamed(instanceProcessor));
    }

    /**
     * 
     * @param {Array<TypeConfig>} typeConfigArray
     * @return {MindiConfig}
     */
    addAllTypeConfig(typeConfigArray) {
        this.finalized = false;
        typeConfigArray.forEach((typeConfig) => {
            this.configEntries.set(typeConfig.name, typeConfig);
        });
        return this;
    }

    /**
     * 
     * @param {Array<new() => ConfigProcessor>} configProcessorArray
     * @return {MindiConfig}
     */
    addAllConfigProcessor(configProcessorArray) {
        configProcessorArray.forEach((configProcessor) => {
            this.configProcessors = ArrayUtils.add(this.configProcessors, configProcessor.name);
            this.addTypeConfig(SingletonConfig.unnamed(configProcessor));
        });
        return this;
    }

    /**
     * 
     * @param {Array<new() => InstanceProcessor>} instanceProcessorArray 
     * @return {MindiConfig}
     */
    addAllInstanceProcessor(instanceProcessorArray) {
        instanceProcessorArray.forEach((instanceProcessor) => {
            this.instanceProcessors = ArrayUtils.add(this.instanceProcessors, instanceProcessor.name);
            this.addTypeConfig(SingletonConfig.unnamed(instanceProcessor));
        });
        return this;
    }

    /**
     * @returns {Boolean}
     */
    isFinalized() {
        return this.finalized;
    }

    /**
     * @returns {Promise}
     */
    finalize() {
        this.finalized = true;
        return ConfigProcessorExecutor.execute(this.configProcessors, MindiInjector.getInstance(), this);
    }

}