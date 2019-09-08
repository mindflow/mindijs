import { Config } from "./config.js";
export class Injector {

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
        this.config = new Config();
    }

    load(config) {
        this.instansiateAll(config);
        this.config.addAll(config);
        this.performInjections(config);
    }

    inject(object) {
        this.injectFields(object,0);
        return object;
    }

    /**
     * 
     * @param {Config} config 
     */
    instansiateAll(config) {
        config.getConfigElements().forEach((key,value,parent) => {
            value.instansiate();
            return true;
        },this);
    }

    performInjections(config) {
        config.getConfigElements().forEach((key,value,parent) => {
            value.getStoredInstances().forEach((instanceEntry,innerParent) => {
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
        this.config.getConfigElements().forEach((key,value,parent) => {
            if(value.getClassReference() == classReference) {
                if("PROTOTYPE" === value.getInjectionType()){
                    if(structureDepth < 3) {
                        return this.injectFields(new classReference(),structureDepth++);
                    }else{
                        throw "Structure of managed objects is too deep when trying to inject " + classReference.name;
                    }
                }else{
                    instance = value.getInstance();
                }
                return false;
            }
            return true;

        },this);
        return instance;
    }

}

var injector = null;