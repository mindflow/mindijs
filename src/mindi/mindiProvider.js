import { Provider } from "./api/provider.js";
import { TypeConfig } from "./typeConfig/typeConfig.js";
import { InstanceHolder } from "./typeConfig/instanceHolder.js";
import { Injector } from "./injector.js";
import { Config } from "./config.js";

/**
 * @template T
 */
export class MindiProvider extends Provider {

    /**
     * 
     * @param {TypeConfig} typeConfig 
     * @param {Injector} injector
     * @param {Config} config
     * @param {Array} parameters
     */
    constructor(typeConfig, injector, config, parameters = []) {

        super();

        /** @type {TypeConfig} */
        this.typeConfig = typeConfig;

        /** @type {Injector} */
        this.injector = injector;

        /** @type {Config} */
        this.config = config;

        /** @type {Array} */
        this.parameters = parameters;
    }

    /**
     * 
     * @param {Array} parameters 
     * @returns {Promise<T>}
     */
    get(parameters = []) {

        const instanceParameters = (parameters.length > 0) ? parameters : this.parameters;

        /** @type {InstanceHolder} */
        const instanceHolder = this.typeConfig.instanceHolder(instanceParameters);

        if (instanceHolder.type === InstanceHolder.NEW_INSTANCE) {
            return this.injector.injectTarget(instanceHolder.instance, this.config);
        }
        return Promise.resolve(instanceHolder.instance);
    }

}