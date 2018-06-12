import {List} from "coreutil_v1";
import { ConfigEntry } from "./configEntry.js";
import { Config } from "./config.js";
export class Injector {

    /**
     * @param {List}
     */
    static getInstance() {
        if(injector === null) {
            injector = new Injector();
        }
        return injector;
    }

    /**
     * 
     * @param {Config} config 
     */
    constructor() {
        this._config = new Config();
    }

    load(config) {
        this.instansiateAll(config);
        this._config.addAll(config);
        this.performInjections(config);
    }

    inject(object) {
        this.injectFields(object,0);
        return object;
    }

    instansiateAll(config) {
        config.getConfigElements().forEach((entry,parent) => {
            entry.instansiate();
            return true;
        },this);
    }

    performInjections(config) {
        config.getConfigElements().forEach((configEntry,parent) => {
            configEntry.getStoredInstances().forEach((instanceEntry,innerParent) => {
                this.injectFields(instanceEntry,0);
                return true;
            },parent);
            return true;
        },this);
    }

    injectFields(instanceEntry,structureDepth) {
        
        for(var field in instanceEntry) {
            
            if(field !== undefined && field !== null && instanceEntry[field] != null && instanceEntry[field].prototype instanceof Object) {
                var instance = this.getInstanceByClassReference(instanceEntry[field],structureDepth);
                if(instance !== undefined && instance !== null) {
                    instanceEntry[field] = instance;
                }
            }
        }
    }

    getInstanceByClassReference(classReference,structureDepth) {
        var instance = null;
        if(Injector == classReference) {
            return this;
        }
        this._config.getConfigElements().forEach((configEntry,parent) => {
            if(configEntry.getClassReference() == classReference) {
                if("PROTOTYPE" === configEntry.getInjectionType()){
                    if(structureDepth < 3) {
                        return this.injectFields(new classReference(),structureDepth++);
                    }else{
                        throw "Structure of managed objects is too deep when trying to inject " + classReference.name;
                    }
                }else{
                    instance = configEntry.getInstance();
                }
                return false;
            }
            return true;

        },this);
        return instance;
    }

}

var injector = null;