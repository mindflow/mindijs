import { ArrayUtils, Logger } from "coreutil_v1";
import { Config } from "./config.js";
import { ConfigAccessor } from "./configAccessor.js";
import { InjectionPoint } from "./api/injectionPoint.js"
import { InstanceProcessorExecutor } from "./instanceProcessor/instanceProcessorExecutor.js";
import { InstanceHolder } from "./typeConfig/instanceHolder.js";
import { MindiProvider } from "./mindiProvider.js";
import { Injector } from "./injector.js";
import { TypeConfig } from "./typeConfig/typeConfig.js";

const LOG = new Logger("MindiInjector");

export class MindiInjector extends Injector {

    static inject(target, config) {
        return INJECTOR.injectTarget(target, config);
    }

    /**
     * @returns {MindiInjector}
     */
    static getInstance() {
        return INJECTOR;
    }

    /**
     * Helper method for injecting fields in target object
     * 
     * @param {any} targetObject 
     * @param {Config} config 
     * @param {number} depth
     * @returns {Promise}
     */
    async injectTarget(targetObject, config, depth = 0) {
        if (!targetObject) {
            throw Error("Missing target object");
        }
        if (!config) {
            throw Error("Missing config");
        }
        if (!config.isFinalized()) {
            throw Error("Config not finalized");
        }
        if (depth > 10) {
            throw Error("Injection structure too deep");
        }
        const injector = this;

        await ArrayUtils.promiseChain(Object.keys(targetObject), (fieldName) => {
                return MindiInjector.injectProperty(targetObject, fieldName, config, depth, injector);
        });
        await InstanceProcessorExecutor.execute(targetObject, config);
        return targetObject;

    }

    /**
     * @param {Object} targetObject 
     * @param {String} fieldName 
     * @param {Config} config 
     * @param {Number} depth 
     * @param {Injector} injector
     * @returns {Promise}
     */
    static injectProperty(targetObject, fieldName, config, depth, injector) {
        const injectionPoint = targetObject[fieldName];        
        if(!(injectionPoint instanceof InjectionPoint)) {
            return Promise.resolve();
        }
        if (injectionPoint.type === InjectionPoint.PROVIDER_TYPE) {
            MindiInjector.injectPropertyProvider(targetObject, fieldName, config, injector);
            return Promise.resolve();
        }
        return MindiInjector.injectPropertyInstance(targetObject, fieldName, config, depth, injector);
        
    }

    /**
     * @param {object} targetObject 
     * @param {string} fieldName 
     * @param {Config} config 
     * @param {Injector} injector
     */
    static injectPropertyProvider(targetObject, fieldName, config, injector) {
        /**
         * @type {InjectionPoint}
         */
        const injectionPoint = targetObject[fieldName];

        /** @type {TypeConfig} */
        const typeConfig = MindiInjector.getTypeConfig(injectionPoint.name, injectionPoint.classReference, config);

        if (!typeConfig) {
            return;
        }

        targetObject[fieldName] = new MindiProvider(typeConfig, injector, config);
    }

    /**
     * @param {object} targetObject 
     * @param {string} fieldName 
     * @param {Config} config 
     * @param {number} depth 
     * @param {Injector} injector
     * @returns {Promise}
     */
    static injectPropertyInstance(targetObject, fieldName, config, depth, injector) {
        let injectPromise = Promise.resolve();
        /** @type {InjectionPoint} */
        const injectionPoint = targetObject[fieldName];

        /** @type {TypeConfig} */
        const typeConfig = MindiInjector.getTypeConfig(injectionPoint.name, injectionPoint.classReference, config);


        if (!typeConfig) {
            return;
        }

        /** @type {InstanceHolder} */
        const instanceHolder = typeConfig.instanceHolder(injectionPoint.parameters);

        if (instanceHolder.type === InstanceHolder.NEW_INSTANCE) {
            injectPromise = injector.injectTarget(instanceHolder.instance, config, depth++);
        }
        targetObject[fieldName] = instanceHolder.instance;
        return injectPromise;
    }

    /**
     * 
     * @param {string} name 
     * @param {object} type 
     * @param {Config} config 
     * @returns {TypeConfig}
     */
    static getTypeConfig(name, classReference, config) {
        const typeConfig = ConfigAccessor.typeConfigByName(name, config);
        if (typeConfig) {
            return typeConfig;
        }
        LOG.error(`No type config found for ${name} and classReference does not extend AutoConfig`);
        return null;
    }

}

const INJECTOR = new MindiInjector();