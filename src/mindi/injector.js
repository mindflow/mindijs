import { Config } from "./config.js";
import { List, Logger } from "coreutil_v1";
import { ConfigEntry } from "./configEntry.js";

const LOG = new Logger("Injector");

export class Injector {

    static getInstance() {
        return injector;
    }

    constructor() {
        this.config = new Config();
        this.postInjectPromises = new List();
    }

    /**
     * 
     * @param {Config} config 
     */
    load(config) {
        this.instansiateAll(config);
        this.config.addAll(config);
        this.performInjections(config);
        let promiseList = this.executePostConfig(config, this.config.getPostConfigs());
        this.postInjectPromises.addAll(promiseList);
    }

    inject(object) {
        this.injectFields(object, 0);
        return object;
    }

    /**
     * 
     * @param {class} className 
     * @param {array} parameterArray 
     */
    prototypeInstance(className, parameterArray) {
        /** @type {ConfigEntry} */
        let classNameString = className.name;
        let config = this.config.getConfigElements().get(classNameString);
        if(!config) {
            LOG.error("No config found for class: " + classNameString);
            throw "No config found for class: " + classNameString;
        }
        if(! "PROTOTYPE" === config.getInjectionType()) {
            LOG.error("Config for class: " + classNameString + " is not a prototype");
            throw "Config for class: " + classNameString + " is not a prototype";
        }
        return this.getInstanceByClassReference(classNameString, 0, parameterArray);
    }

    resolvePostConfigs(object, successFunction, failFunction) {
        let currentPromises = this.postInjectPromises;
        this.postInjectPromises = new List();
        Promise.all(currentPromises.getArray())
        .then((success) => {
            try {
                successFunction.call(object,success);
            } catch(e) {
                LOG.error(e);
            }
        }).catch((fail) => {
            failFunction.call(object,fail);
        });
    }

    /**
     * 
     * @param {Config} config 
     * @param {List} postConfigs
     * @returns {List}
     */
    executePostConfig(config, postConfigs) {
        let promiseList = new List();
        postConfigs.forEach((entry, parent) => {
            let postInjectPromise = entry.postConfig(config);
            if(postInjectPromise) {
                promiseList.add(postInjectPromise);
            }
            return true;
        }, this);
        return promiseList;
    }

    /**
     * 
     * @param {Config} config 
     */
    instansiateAll(config) {
        config.getConfigElements().forEach((key, value, parent) => {
            value.instansiate();
            if(value.getInstance() && (value.getInstance().postConfig)) {
                config.addPostConfig(value.getInstance());
            }
            return true;
        }, this);
    }

    /**
     * 
     * @param {Config} config 
     */
    performInjections(config) {
        config.getConfigElements().forEach((key, value, parent) => {
            value.getStoredInstances().forEach((instanceEntry, innerParent) => {
                this.injectFields(instanceEntry, 0);
                return true;
            }, parent);
            return true;
        }, this);
    }

    /**
     * 
     * @param {object} instanceEntry 
     * @param {number} structureDepth 
     */
    injectFields(instanceEntry, structureDepth) {
        
        for (var field in instanceEntry) {
            
            if (field !== undefined && field !== null && instanceEntry[field] != null && instanceEntry[field].prototype instanceof Object) {
                var instance = this.getInstanceByClassReference(instanceEntry[field].name, structureDepth);
                if (instance !== undefined && instance !== null) {
                    instanceEntry[field] = instance;
                } else if (instance === undefined) {
                    LOG.error("No instance found when trying to inject field '" + field + "' in '" + instanceEntry.constructor.name + "'");
                }
            }
        }
        return instanceEntry;
    }

    /**
     * 
     * @param {class} classReference 
     * @param {number} structureDepth 
     * @param {array} parameters 
     */
    getInstanceByClassReference(classNameString, structureDepth, parameters = []) {
        let instance = null;
        if(Injector.name === classNameString) {
            return this;
        }
        this.config.getConfigElements().forEach((key, value, parent) => {
            if(key === classNameString) {
                if ("PROTOTYPE" === value.getInjectionType()){
                    if (structureDepth < 3) {
                        let classReference = value.getClassReference();
                        instance = this.injectFields(new classReference(...parameters), structureDepth++);
                    } else {
                        throw "Structure of managed objects is too deep when trying to inject " + classNameString;
                    }
                } else if ("SINGLETON" === value.getInjectionType()) {
                    instance = value.getInstance();
                } else {
                    LOG.error("Injection type " + value.getInjectionType() + " not supported for " + classNameString);
                }
                return false;
            }
            return true;

        }, this);
        if(!instance) {
            LOG.error("No object found for " + classNameString);
        }
        return instance;
    }

}

const injector = new Injector();