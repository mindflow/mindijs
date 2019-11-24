import { List, Logger } from "coreutil_v1";
import { Config } from "./config.js";
import { ConfigEntry } from "./configEntry.js";

const LOG = new Logger("Injector");

export class Injector {

    static getInstance() {
        return injector;
    }

    constructor() {
        this.config = new Config();
        this.configProcessorPromises = new List();
    }

    /**
     * 
     * @param {Config} config 
     */
    load(config) {
        this.finishedLoading = new Promise(
            (resolve, reject) => { resolve(); }
        );

        const preloadedInstances = this.preloadConfigEntries(config);

        this.config.addAll(config);

        this.performInjections(config);

        let promiseList = this.executeConfigProcessors(config, this.config.getConfigProcessors());
        this.configProcessorPromises.addAll(promiseList);

        this.executeInstanceProcessors(preloadedInstances, true);

        Promise
            .all(this.configProcessorPromises.getArray())
            .then((success) => {
                this.configProcessorPromises = new List();
            });
    }

    inject(object) {
        this.injectFields(object, 0);
        this.executeInstanceProcessors(new List([object]));
        return object;
    }

    /**
     * 
     * @param {class} classReference 
     * @param {array} parameterArray 
     */
    prototypeInstance(classReference, parameterArray) {
        /** @type {ConfigEntry} */
        const className = classReference.name;
        const config = this.config.getConfigElements().get(className);
        if(!config) {
            LOG.error("No config found for class: " + className);
            throw "No config found for class: " + className;
        }
        if ("PROTOTYPE" !== config.getInjectionType()) {
            LOG.error("Config for class: " + className + " is not a prototype");
            throw "Config for class: " + className + " is not a prototype";
        }
        const instance = this.getInstanceByClassReference(className, 0, parameterArray);
        this.executeInstanceProcessors(new List([instance]));
        return instance;
    }

    /**
     * 
     * @param {Config} config 
     * @param {List} configProcessors
     * @returns {List}
     */
    executeConfigProcessors(config, configProcessors) {
        const promiseList = new List();
        configProcessors.forEach((entry, parent) => {
            const configProcessorsPromise = entry.processConfig(config);
            if(configProcessorsPromise) {
                promiseList.add(configProcessorsPromise);
            }
            return true;
        }, this);
        return promiseList;
    }

    /**
     * 
     * @param {List} instanceList 
     */
    executeInstanceProcessors(instanceList, waitForConfigProcessors = false) {

        let execute = () => {
            this.config.getInstanceProcessors().forEach((processor,parent) => {
                instanceList.forEach((instance,parent) => {
                    processor.processInstance(instance);
                    return true;
                },this);
                return true;
            },this);
        }

        if(waitForConfigProcessors) {
            this.finishedLoading = Promise.all(this.configProcessorPromises.getArray()).then((success) => { execute() });
        } else {
            execute();
        }
    }

    /**
     * @returns {Promise}
     */
    getFinishedLoadingPromise() {
        return this.finishedLoading;
    }

    /**
     * 
     * @param {Config} config 
     */
    preloadConfigEntries(config) {
        const instances = new List();
        config.getConfigElements().forEach((key, value, parent) => {
            value.preload();
            instances.addAll(value.getStoredInstances());
            if(value.getInstance() && (value.getInstance().processConfig)) {
                config.addConfigProcessor(value.getInstance());
            }
            if(value.getInstance() && (value.getInstance().processInstance)) {
                config.addInstanceProcessor(value.getInstance());
            }
            return true;
        }, this);
        return instances;
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
        
        for (const field in instanceEntry) {
            
            if (field !== undefined && field !== null && instanceEntry[field] != null && instanceEntry[field].prototype instanceof Object) {
                const instance = this.getInstanceByClassReference(instanceEntry[field].name, structureDepth);
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