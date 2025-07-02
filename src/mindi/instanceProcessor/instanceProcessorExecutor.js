import { Logger, ArrayUtils } from "coreutil_v1";
import { ConfigAccessor } from "../configAccessor.js";
import { Config } from "../config.js";
import { TypeConfig } from "../typeConfig/typeConfig.js";
import { InstanceHolder } from "../typeConfig/instanceHolder.js";

const LOG = new Logger("InstanceProcessorExecutor");

/**
 * Executes the configs instance processors on the provided instance
 * Returns a promise for when the instance processors has completed running
 * 
 * Instance processors perform operations on managed instances after they have been instansiated
 */
export class InstanceProcessorExecutor {

    /**
     * @param {Object} instance the instance to process
     * @param {Config} config
     * @returns {Promise}
     */
    static execute(instance, config) {
        return ArrayUtils.promiseChain(config.instanceProcessors, (processorName) => {
            /** @type {TypeConfig} */
            const typeConfig = ConfigAccessor.typeConfigByName(processorName, config);

            /** @type {InstanceHolder} */
            const processorHolder = typeConfig.instanceHolder();

            return processorHolder.instance.process(instance);
        });
    }

}