import { Logger } from "coreutil_v1";

const LOG = new Logger("PostConfigInstanceProcessor");

/**
 * Instance which calls postConfig on objects after configProcessor is finished
 */
export class PostConfigInstanceProcessor {

    processInstance(instance) {
        if(instance.postConfig) {
            instance.postConfig();
        }
    }

}