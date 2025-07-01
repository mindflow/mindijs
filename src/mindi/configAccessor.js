import { Config } from "./config.js";
import { Logger } from "coreutil_v1";
import { TypeConfig } from "./typeConfig/typeConfig.js";

const LOG = new Logger("ConfigAccessor");

/**
 * Utilities for accessing a Config object
 */
export class ConfigAccessor {

    /**
     * Get the type config by class name in the config
     * 
     * @param {Config} config 
     * @param {string} name 
     * @returns {TypeConfig}
     */
    static typeConfigByName(name, config) {
        let configEntry = null;
        config.configEntries.forEach((value, key) => {
            if(key === name) {
                configEntry = value;
                return false;
            }
        });
        return configEntry;
    }

}