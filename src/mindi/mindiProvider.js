import { Provider } from "./api/provider.js";
import { TypeConfig } from "./typeConfig/typeConfig.js";
import { InstanceHolder } from "./typeConfig/instanceHolder.js";
import { Injector } from "./injector.js";
import { Config } from "./config.js";

export class MindiProvider extends Provider {

    /**
     * 
     * @param {TypeConfig} typeConfig 
     */
    constructor(typeConfig, injector, config) {
        /** @type {TypeConfig} */
        this.typeConfig = typeConfig;

        /** @type {Injector} */
        this.injector = injector;

        /** @type {Config} */
        this.config = config;
    }

    get(parameters = []) {
        /** @type {InstanceHolder} */
        const instanceHolder = this.typeConfig.instanceHolder(parameters);
        if (instanceHolder.getType() === InstanceHolder.NEW_INSTANCE) {
            this.injector.injectTarget(instanceHolder.getInstance(), this.config)
        }
        return insatanceHolder.getInstance();
    }

}