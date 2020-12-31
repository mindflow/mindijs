import { Provider } from "./api/provider.js";
import { TypeConfig } from "./typeConfig/typeConfig.js";
import { InstanceHolder } from "./typeConfig/instanceHolder.js";
import { Injector } from "./injector.js";
import { Config } from "./config.js";
import { ConfigAccessor } from "./configAccessor.js";

export class MindiProvider extends Provider {

    /**
     * 
     * @param {TypeConfig} typeConfig 
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
     * @returns {Promise}
     */
    get(parameters = []) {
        /** @type {InstanceHolder} */
        const instanceHolder = ConfigAccessor.instanceHolder(this.typeConfig.name, this.config, parameters);
        if (instanceHolder.type === InstanceHolder.NEW_INSTANCE) {
            return this.injector.injectTarget(instanceHolder.instance, this.config);
        }
        return new Promise((resolve, reject) => { resolve(instanceHolder.instance)});;
    }

}