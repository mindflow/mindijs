import { Logger } from "coreutil_v1";

const LOG = new Logger("Provider");

/**
 * @template T
 */
export class Provider {

    /**
     * 
     * @param {Array} parameters 
     * @returns {Promise<T>}
     */
    get(parameters = []) {
        return null;
    }

}