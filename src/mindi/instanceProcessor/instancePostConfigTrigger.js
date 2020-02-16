import { Logger } from "coreutil_v1";

const LOG = new Logger("InstancePostConfigTrigger");

/**
 * Instance processor which calls postConfig on objects after configProcessors are finished
 */
export class InstancePostConfigTrigger {

    process(instance) {
        if(instance.postConfig) {
            instance.postConfig();
        }
    }

}