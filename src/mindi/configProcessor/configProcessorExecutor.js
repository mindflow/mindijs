import { Logger, ArrayUtils } from "coreutil_v1";
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
     * @param {Array<String>} configProcessorClassNameArray
     * @param {Injector} injector
     * @param {Config} config
     * @returns {Promise} promise which is resolved when all config processors are resolved
     */
    static execute(configProcessorClassNameArray, injector, config) {
        return ArrayUtils.promiseChain(configProcessorClassNameArray, (configProcessorClassName) => {
            return new Promise((resolveConfigProcessorExecuted, reject) => {

                let targetInjectedPromise = Promise.resolve();

                /**  @type {TypeConfig} */
                const typeConfig = ConfigAccessor.typeConfigByName(configProcessorClassName, config);

                if (!typeConfig) {
                    LOG.error(`No type config found for ${configProcessorClassName}`);
                    return;
                }

                /**  @type {InstanceHolder} */
                const processorHolder = typeConfig.instanceHolder();

                if(processorHolder.type === InstanceHolder.NEW_INSTANCE) {
                    targetInjectedPromise = injector.injectTarget(processorHolder.instance, config);
                }

                targetInjectedPromise.then(() => {
                    const toConfigureMap = ConfigProcessorExecutor.prepareUnconfiguredConfigEntries(config.configEntries);
                    processorHolder.instance.processConfig(config, toConfigureMap).then(() => {
                        resolveConfigProcessorExecuted();
                    });
                });
            });
        })
    }

    /**
     * 
     * @param {Map<string, TypeConfig>} configEntries 
     * @return {Map<string, TypeConfig>}
     */
    static prepareUnconfiguredConfigEntries(configEntries) {
        /** @type {Map<TypeConfig>} */
        const unconfiguredConfigEntries = new Map();

        configEntries.forEach((value, key) => {

            /** @type {TypeConfig} */
            const configEntry = value;

            if(configEntry.stage === TypeConfig.NEW) {
                unconfiguredConfigEntries.set(key, configEntry);
                configEntry.stage = TypeConfig.CONFIGURED;
            }
        });

        return unconfiguredConfigEntries;
    }

}