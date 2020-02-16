import { InjectionPoint } from "../../../src/mindi/api/injectionPoint.js";
import { Inner } from "./inner.js";
import { Logger } from "coreutil_v1";

const LOG = new Logger("Outer");

export class Outer {

    constructor() {
        this.inner1 = InjectionPoint.instance(Inner);
        this.inner2 = InjectionPoint.instance(Inner);
    }

    postConfig() {
        LOG.info("Outer config done");
    }

}