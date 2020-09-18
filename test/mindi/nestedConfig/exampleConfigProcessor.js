import { Config } from "../../../src/mindi/config.js";
import { TypeConfig } from "../../../src/mindi/typeConfig/typeConfig.js";
import { Logger } from "coreutil_v1";

const LOG = new Logger("ExampleConfigProcessor");

export class ExampleConfigProcessor {

    /**
     * @param {Config} config
     */
    processConfig(config) {
        config.configEntries.forEach((key, value, parent) => {
            /** @type {TypeConfig} */
            const typeConfig = value;

            LOG.info("Config processor for");
            LOG.info(typeConfig);
            LOG.info(typeConfig.classReference);

            return true;
        }, this);
    }

}