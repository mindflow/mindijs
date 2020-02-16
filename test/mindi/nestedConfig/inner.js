import { Logger } from "coreutil_v1";


const LOG = new Logger("Inner");

export class Inner {

    constructor() {
        this.time = Math.random(); 
    }

    postConfig() {
        LOG.info("Inner config done");
    }

}