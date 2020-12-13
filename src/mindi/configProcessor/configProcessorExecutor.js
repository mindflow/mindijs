import { Map, Logger, List } from "coreutil_v1";
import { Config } from "../config.js";
import { ConfigAccessor } from "../configAccessor.js";
import { Injector } from "../injector.js";
import { InstanceHolder } from "../typeConfig/instanceHolder.js";
import { TypeConfig } from "../typeConfig/typeConfig.js";

const LOG = new Logger("ConfigProcessorExecutor");

/**
 * Executes the provided config processors on the provided config registry
 * Returns a list of promises for when the config processors has completed running
 * 
 * A config processor reads the config and performs any necessary actions based on
 * class and type information. A config processor does not operate on managed instances
 */
export class ConfigProcessorExecutor {
    
    /**
     * @param {List} configProcessorClassList
     * @param {Injector} injector
     * @param {Config} config
     * @returns {Promise} promise which is resolved when all config processors are resolved
     */
    static execute(configProcessorClassNameList, injector, config) {
        const promiseList = new List();
        configProcessorClassNameList.forEach((configProcessorClassName, parent) => {
            /**  @type {InstanceHolder} */
            const processorHolder = ConfigAccessor.instanceHolder(configProcessorClassName, config);
            if(processorHolder.type === InstanceHolder.NEW_INSTANCE) {
                injector.injectTarget(processorHolder.instance, config);
            }
            const processorsPromise = processorHolder.instance.processConfig(config, 
                ConfigProcessorExecutor.prepareUnconfiguredConfigEntries(config.configEntries));
            if (processorsPromise) {
                promiseList.add(processorsPromise);
            }
            return true;
        }, this);
        return Promise.all(promiseList.getArray());
    }

    static prepareUnconfiguredConfigEntries(configEntries) {
        const unconfiguredConfigEntries = new Map();

        configEntries.forEach((key, value, parent) => {

            /**
             * @type {TypeConfig}
             */
            const configEntry = value;

            if(configEntry.stage === TypeConfig.NEW) {
                unconfiguredConfigEntries.set(key, configEntry);
                configEntry.stage = TypeConfig.CONFIGURED;
            }

            return true;
        }, this);

        return unconfiguredConfigEntries;
    }

}