import { Logger } from "coreutil_v1";

const LOG = new Logger("InstanceProcessor");

/**
 * Instance which calls postConfig on objects after configProcessor is finished
 */
export class InstanceProcessor {

    processInstance(instance) {
        if(instance.postConfig) {
            instance.postConfig();
        }
    }

}