import { InjectionPoint } from "../../../src/mindi/api/injectionPoint.js";
import { Outer } from "./outer.js";
import { Logger } from "coreutil_v1";

const LOG = new Logger("Root");

export class Root {

    constructor() {
        this.outer = InjectionPoint.instance(Outer);
    }

    postConfig() {
        LOG.info("Root config done");
    }

}