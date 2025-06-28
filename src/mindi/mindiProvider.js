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
     */
    constructor(typeConfig, injector, config) {

        super();

        /** @type {TypeConfig} */
        this.typeConfig = typeConfig;

        /** @type {Injector} */
        this.injector = injector;

        /** @type {Config} */
        this.config = config;
    }

    /**
     * 
     * @param {Array} parameters 
     * @returns {Promise<T>}
     */
    get(parameters = []) {

        /** @type {InstanceHolder} */
        const instanceHolder = this.typeConfig.instanceHolder(parameters);

        if (instanceHolder.type === InstanceHolder.NEW_INSTANCE) {
            return this.injector.injectTarget(instanceHolder.instance, this.config);
        }
        return Promise.resolve(instanceHolder.instance);
    }

}