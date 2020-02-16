import { MindiConfig } from "../../../src/mindi/mindiConfig.js";
import { SingletonConfig } from "../../../src/mindi/typeConfig/singletonConfig.js";
import { Inner } from "./inner.js";
import { Outer } from "./outer.js";
import { InstancePostConfigTrigger } from "../../../src/mindi/instanceProcessor/instancePostConfigTrigger.js";
import { ExampleConfigProcessor } from "./exampleConfigProcessor.js";

export const CONFIG = new MindiConfig()
    .addTypeConfig(SingletonConfig.unnamed(Inner))
    .addTypeConfig(SingletonConfig.unnamed(Outer))
    .addInstanceProcessor(InstancePostConfigTrigger)
    .addConfigProcessor(ExampleConfigProcessor);