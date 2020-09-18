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

    get(parameters = []) {
        /** @type {InstanceHolder} */
        const instanceHolder = ConfigAccessor.instanceHolder(this.typeConfig.name, this.config, parameters);
        if (instanceHolder.type === InstanceHolder.NEW_INSTANCE) {
            this.injector.injectTarget(instanceHolder.instance, this.config)
        }
        return instanceHolder.instance;
    }

}