import { Logger, List } from "coreutil_v1";
import { ConfigAccessor } from "../configAccessor.js";
import { Config } from "../config.js";

const LOG = new Logger("InstanceProcessorExecutor");

/**
 * Executes the configs instance processors on the provided instance
 * Returns a promise for when the config processors has completed running
 * 
 * Instance processors perform operations on managed instances after they have been instansiated
 */
export class InstanceProcessorExecutor {

    /**
     * @param {List} instanceProcessorList the instance processors
     * @param {Obect} instance the instance to process
     * @param {Config} config
     */
    static execute(instance, config) {
        config.getInstanceProcessors().forEach((processorName, parent) => {
            const processorHolder = ConfigAccessor.instanceHolder(processorName, config);
            processorHolder.getInstance().process(instance);
            return true;
        }, this);
    }

}