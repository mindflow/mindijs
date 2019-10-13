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
        this.preloadConfigEntries(config);
        this.config.addAll(config);
        this.performInjections(config);
        let promiseList = this.executeConfigProcessors(config, this.config.getConfigProcessors());
        this.postInjectPromises.addAll(promiseList);
        Promise
            .all(this.postInjectPromises.getArray())
            .then((success) => {
                LOG.info("Clearing")
                this.postInjectPromises = new List();
            });
    }

    inject(object) {
        this.injectFields(object, 0);
        Promise
            .all(this.postInjectPromises.getArray())
            .then((success) => {
                if(object.postConfig) {
                    object.postConfig(this);
                }
            });

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

    /**
     * 
     * @param {Config} config 
     * @param {List} configProcessors
     * @returns {List}
     */
    executeConfigProcessors(config, configProcessors) {
        let promiseList = new List();
        configProcessors.forEach((entry, parent) => {
            let configProcessorsPromise = entry.processConfig(config);
            if(configProcessorsPromise) {
                promiseList.add(configProcessorsPromise);
            }
            return true;
        }, this);
        Promise
            .all(promiseList.getArray())
            .then((success) => {
                this.executeAllPostConfig(config);
            });
        return promiseList;
    }

    executeAllPostConfig(config) {
        config.getConfigElements().forEach((key, value, parent) => {
            if(value.getInstance() && (value.getInstance().postConfig)) {
                value.getInstance().postConfig(this);
            }
            return true;
        }, this);
    }

    /**
     * 
     * @param {Config} config 
     */
    preloadConfigEntries(config) {
        config.getConfigElements().forEach((key, value, parent) => {
            value.preload();
            if(value.getInstance() && (value.getInstance().processConfig)) {
                config.addConfigProcessor(value.getInstance());
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
     * Swaps out classes for instances in the provided instanceEntry, limited by structureDepth
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
        if(instanceEntry.postInject) {
            instanceEntry.postInject(this);
        }
        return instanceEntry;
    }

    /**
     * Find configuration for class name, and instansiate or return instances based
     * on whether they allready exist and wheter they are PROTOTYPEs or SINGLETONs
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
                instance = value.getInstance(parameters);
                if ("PROTOTYPE" === value.getInjectionType()){
                    if (structureDepth < 3) {
                        this.injectFields(instance, structureDepth++);
                    } else {
                        throw "Structure of managed objects is too deep when trying to inject " + classNameString;
                    }
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