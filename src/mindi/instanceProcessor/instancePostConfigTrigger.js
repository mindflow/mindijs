import { Logger } from "coreutil_v1";

const LOG = new Logger("InstancePostConfigTrigger");

/**
 * Instance processor which calls postConfig on objects after configProcessors are finished
 */
export class InstancePostConfigTrigger {

    /**
     * 
     * @param {Object} instance 
     * @return {Promise}
     */
    process(instance) {
        let response = null;
        if(instance.postConfig) {
            response = instance.postConfig();
        }
        if (!response) {
            response = new Promise((resolve,reject) => { resolve(); });
        }
        if (!response instanceof Promise) {
            throw "postConfig() must return either undefined or null or a Promise"
        }
        return response;
    }

}