import { List, Map, Logger } from './coreutil_v1.js'

class ConfigEntry {

    constructor(classReference, injectionType, poolSize) {
        this.classReference = classReference;
        this.injectionType = injectionType;
        this.poolSize = poolSize;
        this.storedInstances = null;
        this.instancePointer = 0;
    }

    preload() {
        this.instancePointer = 0;
        this.storedInstances = new List();
        if("SINGLETON" === this.injectionType) {
            this.storedInstances.add(new this.classReference());
        } else if ("POOL" === this.injectionType) {
            for(i = 0 ; i < this.poolSize ; i++) {
                this.storedInstances.add(new this.classReference());
            }
        } else if ("PROTOTYPE" === this.injectionType) ; else {
            throw "Unknown injectionType " + this.injectionType;
        }
    }

    getClassReference() {
        return this.classReference;
    }

    getInjectionType() {
        return this.injectionType;
    }

    /**
     * @returns {List} the list of stored instances
     */
    getStoredInstances() {
        if(this.storedInstances === null) {
            throw "Config entry has not been instansiated: " + this.classReference.name;
        }
        return this.storedInstances;
    }

    /**
     * 
     * @param {array} parameters the parameters to use for the class if it is configured as a prototype
     */
    getInstance(parameters = []) {

        if("PROTOTYPE" === this.injectionType) {
            return new this.classReference(...parameters);
        }

        // Get the instance from the next position in the pool
        var instance = this.storedInstances.get(this.instancePointer);
        this.instancePointer ++;
        if(this.instancePointer === this.storedInstances.size()) {
            this.instancePointer = 0;
        }
        return instance;
    }


}

class Config {

    constructor() {
        this.configElements = new Map();
        this.configProcessors = new List();
        this.instanceProcessors = new List();
    }

    addAll(config) {
        this.configElements.addAll(config.getConfigElements());
        this.configProcessors.addAll(config.getConfigProcessors());
        this.instanceProcessors.addAll(config.getInstanceProcessors());
        return this;
    }

    addSingleton(className) {
        this.configElements.set(className.name,new ConfigEntry(className,"SINGLETON"));
        return this;
    }

    addPrototype(className) {
        this.configElements.set(className.name,new ConfigEntry(className,"PROTOTYPE"));
        return this;
    }

    addNamedSingleton(name,className) {
        this.configElements.set(name,new ConfigEntry(className,"SINGLETON"));
        return this;
    }

    addNamedPrototype(name,className) {
        this.configElements.set(name,new ConfigEntry(className,"PROTOTYPE"));
        return this;
    }

    /**
     * @returns {Map}
     */
    getConfigElements() {
        return this.configElements;
    }

    /**
     * @returns {List}
     */
    getConfigProcessors() {
        return this.configProcessors;
    }

    /**
     * @returns {List}
     */
    getInstanceProcessors() {
        return this.instanceProcessors;
    }

    addConfigProcessor(configProcessor) {
        this.configProcessors.add(configProcessor);
    }

    addInstanceProcessor(instanceProcessor) {
        this.instanceProcessors.add(instanceProcessor);
    }
}

const LOG = new Logger("Injector");

class Injector {

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


        let preloadedInstances = this.preloadConfigEntries(config);

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
        let instance = this.getInstanceByClassReference(classNameString, 0, parameterArray);
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
        let promiseList = new List();
        configProcessors.forEach((entry, parent) => {
            let configProcessorsPromise = entry.processConfig(config);
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
        };

        if(waitForConfigProcessors) {
            this.finishedLoading = Promise.all(this.configProcessorPromises.getArray()).then((success) => { execute(); });
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
        let instances = new List();
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

const LOG$1 = new Logger("InstanceProcessor");

/**
 * Instance which calls postConfig on objects after configProcessor is finished
 */
class InstanceProcessor {

    processInstance(instance) {
        if(instance.postConfig) {
            instance.postConfig();
        }
    }

}

export { Config, ConfigEntry, Injector, InstanceProcessor };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWluZGlfdjEuanMiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9taW5kaS9jb25maWdFbnRyeS5qcyIsIi4uLy4uL3NyYy9taW5kaS9jb25maWcuanMiLCIuLi8uLi9zcmMvbWluZGkvaW5qZWN0b3IuanMiLCIuLi8uLi9zcmMvbWluZGkvaW5zdGFuY2VQcm9jZXNzb3IuanMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTGlzdCB9IGZyb20gXCJjb3JldXRpbF92MVwiO1xyXG5cclxuZXhwb3J0IGNsYXNzIENvbmZpZ0VudHJ5IHtcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihjbGFzc1JlZmVyZW5jZSwgaW5qZWN0aW9uVHlwZSwgcG9vbFNpemUpIHtcclxuICAgICAgICB0aGlzLmNsYXNzUmVmZXJlbmNlID0gY2xhc3NSZWZlcmVuY2U7XHJcbiAgICAgICAgdGhpcy5pbmplY3Rpb25UeXBlID0gaW5qZWN0aW9uVHlwZTtcclxuICAgICAgICB0aGlzLnBvb2xTaXplID0gcG9vbFNpemU7XHJcbiAgICAgICAgdGhpcy5zdG9yZWRJbnN0YW5jZXMgPSBudWxsO1xyXG4gICAgICAgIHRoaXMuaW5zdGFuY2VQb2ludGVyID0gMDtcclxuICAgIH1cclxuXHJcbiAgICBwcmVsb2FkKCkge1xyXG4gICAgICAgIHRoaXMuaW5zdGFuY2VQb2ludGVyID0gMDtcclxuICAgICAgICB0aGlzLnN0b3JlZEluc3RhbmNlcyA9IG5ldyBMaXN0KCk7XHJcbiAgICAgICAgaWYoXCJTSU5HTEVUT05cIiA9PT0gdGhpcy5pbmplY3Rpb25UeXBlKSB7XHJcbiAgICAgICAgICAgIHRoaXMuc3RvcmVkSW5zdGFuY2VzLmFkZChuZXcgdGhpcy5jbGFzc1JlZmVyZW5jZSgpKTtcclxuICAgICAgICB9IGVsc2UgaWYgKFwiUE9PTFwiID09PSB0aGlzLmluamVjdGlvblR5cGUpIHtcclxuICAgICAgICAgICAgZm9yKGkgPSAwIDsgaSA8IHRoaXMucG9vbFNpemUgOyBpKyspIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuc3RvcmVkSW5zdGFuY2VzLmFkZChuZXcgdGhpcy5jbGFzc1JlZmVyZW5jZSgpKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0gZWxzZSBpZiAoXCJQUk9UT1RZUEVcIiA9PT0gdGhpcy5pbmplY3Rpb25UeXBlKSB7XHJcbiAgICAgICAgICAgIC8vIE5ldyBpbnN0YW5jZSBldmVyeSB0aW1lXHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdGhyb3cgXCJVbmtub3duIGluamVjdGlvblR5cGUgXCIgKyB0aGlzLmluamVjdGlvblR5cGU7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGdldENsYXNzUmVmZXJlbmNlKCkge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmNsYXNzUmVmZXJlbmNlO1xyXG4gICAgfVxyXG5cclxuICAgIGdldEluamVjdGlvblR5cGUoKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuaW5qZWN0aW9uVHlwZTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIEByZXR1cm5zIHtMaXN0fSB0aGUgbGlzdCBvZiBzdG9yZWQgaW5zdGFuY2VzXHJcbiAgICAgKi9cclxuICAgIGdldFN0b3JlZEluc3RhbmNlcygpIHtcclxuICAgICAgICBpZih0aGlzLnN0b3JlZEluc3RhbmNlcyA9PT0gbnVsbCkge1xyXG4gICAgICAgICAgICB0aHJvdyBcIkNvbmZpZyBlbnRyeSBoYXMgbm90IGJlZW4gaW5zdGFuc2lhdGVkOiBcIiArIHRoaXMuY2xhc3NSZWZlcmVuY2UubmFtZTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuc3RvcmVkSW5zdGFuY2VzO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogXHJcbiAgICAgKiBAcGFyYW0ge2FycmF5fSBwYXJhbWV0ZXJzIHRoZSBwYXJhbWV0ZXJzIHRvIHVzZSBmb3IgdGhlIGNsYXNzIGlmIGl0IGlzIGNvbmZpZ3VyZWQgYXMgYSBwcm90b3R5cGVcclxuICAgICAqL1xyXG4gICAgZ2V0SW5zdGFuY2UocGFyYW1ldGVycyA9IFtdKSB7XHJcblxyXG4gICAgICAgIGlmKFwiUFJPVE9UWVBFXCIgPT09IHRoaXMuaW5qZWN0aW9uVHlwZSkge1xyXG4gICAgICAgICAgICByZXR1cm4gbmV3IHRoaXMuY2xhc3NSZWZlcmVuY2UoLi4ucGFyYW1ldGVycyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBHZXQgdGhlIGluc3RhbmNlIGZyb20gdGhlIG5leHQgcG9zaXRpb24gaW4gdGhlIHBvb2xcclxuICAgICAgICB2YXIgaW5zdGFuY2UgPSB0aGlzLnN0b3JlZEluc3RhbmNlcy5nZXQodGhpcy5pbnN0YW5jZVBvaW50ZXIpO1xyXG4gICAgICAgIHRoaXMuaW5zdGFuY2VQb2ludGVyICsrO1xyXG4gICAgICAgIGlmKHRoaXMuaW5zdGFuY2VQb2ludGVyID09PSB0aGlzLnN0b3JlZEluc3RhbmNlcy5zaXplKCkpIHtcclxuICAgICAgICAgICAgdGhpcy5pbnN0YW5jZVBvaW50ZXIgPSAwO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gaW5zdGFuY2U7XHJcbiAgICB9XHJcblxyXG5cclxufSIsImltcG9ydCB7TWFwLCBMaXN0fSBmcm9tIFwiY29yZXV0aWxfdjFcIjtcclxuaW1wb3J0IHtDb25maWdFbnRyeX0gZnJvbSBcIi4vY29uZmlnRW50cnkuanNcIlxyXG5cclxuZXhwb3J0IGNsYXNzIENvbmZpZyB7XHJcblxyXG4gICAgY29uc3RydWN0b3IoKSB7XHJcbiAgICAgICAgdGhpcy5jb25maWdFbGVtZW50cyA9IG5ldyBNYXAoKTtcclxuICAgICAgICB0aGlzLmNvbmZpZ1Byb2Nlc3NvcnMgPSBuZXcgTGlzdCgpO1xyXG4gICAgICAgIHRoaXMuaW5zdGFuY2VQcm9jZXNzb3JzID0gbmV3IExpc3QoKTtcclxuICAgIH1cclxuXHJcbiAgICBhZGRBbGwoY29uZmlnKSB7XHJcbiAgICAgICAgdGhpcy5jb25maWdFbGVtZW50cy5hZGRBbGwoY29uZmlnLmdldENvbmZpZ0VsZW1lbnRzKCkpO1xyXG4gICAgICAgIHRoaXMuY29uZmlnUHJvY2Vzc29ycy5hZGRBbGwoY29uZmlnLmdldENvbmZpZ1Byb2Nlc3NvcnMoKSk7XHJcbiAgICAgICAgdGhpcy5pbnN0YW5jZVByb2Nlc3NvcnMuYWRkQWxsKGNvbmZpZy5nZXRJbnN0YW5jZVByb2Nlc3NvcnMoKSk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9XHJcblxyXG4gICAgYWRkU2luZ2xldG9uKGNsYXNzTmFtZSkge1xyXG4gICAgICAgIHRoaXMuY29uZmlnRWxlbWVudHMuc2V0KGNsYXNzTmFtZS5uYW1lLG5ldyBDb25maWdFbnRyeShjbGFzc05hbWUsXCJTSU5HTEVUT05cIikpO1xyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfVxyXG5cclxuICAgIGFkZFByb3RvdHlwZShjbGFzc05hbWUpIHtcclxuICAgICAgICB0aGlzLmNvbmZpZ0VsZW1lbnRzLnNldChjbGFzc05hbWUubmFtZSxuZXcgQ29uZmlnRW50cnkoY2xhc3NOYW1lLFwiUFJPVE9UWVBFXCIpKTtcclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH1cclxuXHJcbiAgICBhZGROYW1lZFNpbmdsZXRvbihuYW1lLGNsYXNzTmFtZSkge1xyXG4gICAgICAgIHRoaXMuY29uZmlnRWxlbWVudHMuc2V0KG5hbWUsbmV3IENvbmZpZ0VudHJ5KGNsYXNzTmFtZSxcIlNJTkdMRVRPTlwiKSk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9XHJcblxyXG4gICAgYWRkTmFtZWRQcm90b3R5cGUobmFtZSxjbGFzc05hbWUpIHtcclxuICAgICAgICB0aGlzLmNvbmZpZ0VsZW1lbnRzLnNldChuYW1lLG5ldyBDb25maWdFbnRyeShjbGFzc05hbWUsXCJQUk9UT1RZUEVcIikpO1xyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQHJldHVybnMge01hcH1cclxuICAgICAqL1xyXG4gICAgZ2V0Q29uZmlnRWxlbWVudHMoKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuY29uZmlnRWxlbWVudHM7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBAcmV0dXJucyB7TGlzdH1cclxuICAgICAqL1xyXG4gICAgZ2V0Q29uZmlnUHJvY2Vzc29ycygpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5jb25maWdQcm9jZXNzb3JzO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQHJldHVybnMge0xpc3R9XHJcbiAgICAgKi9cclxuICAgIGdldEluc3RhbmNlUHJvY2Vzc29ycygpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5pbnN0YW5jZVByb2Nlc3NvcnM7XHJcbiAgICB9XHJcblxyXG4gICAgYWRkQ29uZmlnUHJvY2Vzc29yKGNvbmZpZ1Byb2Nlc3Nvcikge1xyXG4gICAgICAgIHRoaXMuY29uZmlnUHJvY2Vzc29ycy5hZGQoY29uZmlnUHJvY2Vzc29yKTtcclxuICAgIH1cclxuXHJcbiAgICBhZGRJbnN0YW5jZVByb2Nlc3NvcihpbnN0YW5jZVByb2Nlc3Nvcikge1xyXG4gICAgICAgIHRoaXMuaW5zdGFuY2VQcm9jZXNzb3JzLmFkZChpbnN0YW5jZVByb2Nlc3Nvcik7XHJcbiAgICB9XHJcbn0iLCJpbXBvcnQgeyBDb25maWcgfSBmcm9tIFwiLi9jb25maWcuanNcIjtcclxuaW1wb3J0IHsgTGlzdCwgTG9nZ2VyIH0gZnJvbSBcImNvcmV1dGlsX3YxXCI7XHJcbmltcG9ydCB7IENvbmZpZ0VudHJ5IH0gZnJvbSBcIi4vY29uZmlnRW50cnkuanNcIjtcclxuXHJcbmNvbnN0IExPRyA9IG5ldyBMb2dnZXIoXCJJbmplY3RvclwiKTtcclxuXHJcbmV4cG9ydCBjbGFzcyBJbmplY3RvciB7XHJcblxyXG4gICAgc3RhdGljIGdldEluc3RhbmNlKCkge1xyXG4gICAgICAgIHJldHVybiBpbmplY3RvcjtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdHJ1Y3RvcigpIHtcclxuICAgICAgICB0aGlzLmNvbmZpZyA9IG5ldyBDb25maWcoKTtcclxuICAgICAgICB0aGlzLmNvbmZpZ1Byb2Nlc3NvclByb21pc2VzID0gbmV3IExpc3QoKTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIFxyXG4gICAgICogQHBhcmFtIHtDb25maWd9IGNvbmZpZyBcclxuICAgICAqL1xyXG4gICAgbG9hZChjb25maWcpIHtcclxuICAgICAgICB0aGlzLmZpbmlzaGVkTG9hZGluZyA9IG5ldyBQcm9taXNlKFxyXG4gICAgICAgICAgICAocmVzb2x2ZSwgcmVqZWN0KSA9PiB7IHJlc29sdmUoKTsgfVxyXG4gICAgICAgICk7XHJcblxyXG5cclxuICAgICAgICBsZXQgcHJlbG9hZGVkSW5zdGFuY2VzID0gdGhpcy5wcmVsb2FkQ29uZmlnRW50cmllcyhjb25maWcpO1xyXG5cclxuICAgICAgICB0aGlzLmNvbmZpZy5hZGRBbGwoY29uZmlnKTtcclxuXHJcbiAgICAgICAgdGhpcy5wZXJmb3JtSW5qZWN0aW9ucyhjb25maWcpO1xyXG5cclxuICAgICAgICBsZXQgcHJvbWlzZUxpc3QgPSB0aGlzLmV4ZWN1dGVDb25maWdQcm9jZXNzb3JzKGNvbmZpZywgdGhpcy5jb25maWcuZ2V0Q29uZmlnUHJvY2Vzc29ycygpKTtcclxuICAgICAgICB0aGlzLmNvbmZpZ1Byb2Nlc3NvclByb21pc2VzLmFkZEFsbChwcm9taXNlTGlzdCk7XHJcblxyXG4gICAgICAgIHRoaXMuZXhlY3V0ZUluc3RhbmNlUHJvY2Vzc29ycyhwcmVsb2FkZWRJbnN0YW5jZXMsIHRydWUpO1xyXG5cclxuICAgICAgICBQcm9taXNlXHJcbiAgICAgICAgICAgIC5hbGwodGhpcy5jb25maWdQcm9jZXNzb3JQcm9taXNlcy5nZXRBcnJheSgpKVxyXG4gICAgICAgICAgICAudGhlbigoc3VjY2VzcykgPT4ge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jb25maWdQcm9jZXNzb3JQcm9taXNlcyA9IG5ldyBMaXN0KCk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGluamVjdChvYmplY3QpIHtcclxuICAgICAgICB0aGlzLmluamVjdEZpZWxkcyhvYmplY3QsIDApO1xyXG4gICAgICAgIHRoaXMuZXhlY3V0ZUluc3RhbmNlUHJvY2Vzc29ycyhuZXcgTGlzdChbb2JqZWN0XSkpO1xyXG4gICAgICAgIHJldHVybiBvYmplY3Q7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBcclxuICAgICAqIEBwYXJhbSB7Y2xhc3N9IGNsYXNzTmFtZSBcclxuICAgICAqIEBwYXJhbSB7YXJyYXl9IHBhcmFtZXRlckFycmF5IFxyXG4gICAgICovXHJcbiAgICBwcm90b3R5cGVJbnN0YW5jZShjbGFzc05hbWUsIHBhcmFtZXRlckFycmF5KSB7XHJcbiAgICAgICAgLyoqIEB0eXBlIHtDb25maWdFbnRyeX0gKi9cclxuICAgICAgICBsZXQgY2xhc3NOYW1lU3RyaW5nID0gY2xhc3NOYW1lLm5hbWU7XHJcbiAgICAgICAgbGV0IGNvbmZpZyA9IHRoaXMuY29uZmlnLmdldENvbmZpZ0VsZW1lbnRzKCkuZ2V0KGNsYXNzTmFtZVN0cmluZyk7XHJcbiAgICAgICAgaWYoIWNvbmZpZykge1xyXG4gICAgICAgICAgICBMT0cuZXJyb3IoXCJObyBjb25maWcgZm91bmQgZm9yIGNsYXNzOiBcIiArIGNsYXNzTmFtZVN0cmluZyk7XHJcbiAgICAgICAgICAgIHRocm93IFwiTm8gY29uZmlnIGZvdW5kIGZvciBjbGFzczogXCIgKyBjbGFzc05hbWVTdHJpbmc7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmKCEgXCJQUk9UT1RZUEVcIiA9PT0gY29uZmlnLmdldEluamVjdGlvblR5cGUoKSkge1xyXG4gICAgICAgICAgICBMT0cuZXJyb3IoXCJDb25maWcgZm9yIGNsYXNzOiBcIiArIGNsYXNzTmFtZVN0cmluZyArIFwiIGlzIG5vdCBhIHByb3RvdHlwZVwiKTtcclxuICAgICAgICAgICAgdGhyb3cgXCJDb25maWcgZm9yIGNsYXNzOiBcIiArIGNsYXNzTmFtZVN0cmluZyArIFwiIGlzIG5vdCBhIHByb3RvdHlwZVwiO1xyXG4gICAgICAgIH1cclxuICAgICAgICBsZXQgaW5zdGFuY2UgPSB0aGlzLmdldEluc3RhbmNlQnlDbGFzc1JlZmVyZW5jZShjbGFzc05hbWVTdHJpbmcsIDAsIHBhcmFtZXRlckFycmF5KTtcclxuICAgICAgICB0aGlzLmV4ZWN1dGVJbnN0YW5jZVByb2Nlc3NvcnMobmV3IExpc3QoW2luc3RhbmNlXSkpO1xyXG4gICAgICAgIHJldHVybiBpbnN0YW5jZTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIFxyXG4gICAgICogQHBhcmFtIHtDb25maWd9IGNvbmZpZyBcclxuICAgICAqIEBwYXJhbSB7TGlzdH0gY29uZmlnUHJvY2Vzc29yc1xyXG4gICAgICogQHJldHVybnMge0xpc3R9XHJcbiAgICAgKi9cclxuICAgIGV4ZWN1dGVDb25maWdQcm9jZXNzb3JzKGNvbmZpZywgY29uZmlnUHJvY2Vzc29ycykge1xyXG4gICAgICAgIGxldCBwcm9taXNlTGlzdCA9IG5ldyBMaXN0KCk7XHJcbiAgICAgICAgY29uZmlnUHJvY2Vzc29ycy5mb3JFYWNoKChlbnRyeSwgcGFyZW50KSA9PiB7XHJcbiAgICAgICAgICAgIGxldCBjb25maWdQcm9jZXNzb3JzUHJvbWlzZSA9IGVudHJ5LnByb2Nlc3NDb25maWcoY29uZmlnKTtcclxuICAgICAgICAgICAgaWYoY29uZmlnUHJvY2Vzc29yc1Byb21pc2UpIHtcclxuICAgICAgICAgICAgICAgIHByb21pc2VMaXN0LmFkZChjb25maWdQcm9jZXNzb3JzUHJvbWlzZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgfSwgdGhpcyk7XHJcbiAgICAgICAgcmV0dXJuIHByb21pc2VMaXN0O1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogXHJcbiAgICAgKiBAcGFyYW0ge0xpc3R9IGluc3RhbmNlTGlzdCBcclxuICAgICAqL1xyXG4gICAgZXhlY3V0ZUluc3RhbmNlUHJvY2Vzc29ycyhpbnN0YW5jZUxpc3QsIHdhaXRGb3JDb25maWdQcm9jZXNzb3JzID0gZmFsc2UpIHtcclxuXHJcbiAgICAgICAgbGV0IGV4ZWN1dGUgPSAoKSA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMuY29uZmlnLmdldEluc3RhbmNlUHJvY2Vzc29ycygpLmZvckVhY2goKHByb2Nlc3NvcixwYXJlbnQpID0+IHtcclxuICAgICAgICAgICAgICAgIGluc3RhbmNlTGlzdC5mb3JFYWNoKChpbnN0YW5jZSxwYXJlbnQpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBwcm9jZXNzb3IucHJvY2Vzc0luc3RhbmNlKGluc3RhbmNlKTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIH0sdGhpcyk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICAgICAgfSx0aGlzKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmKHdhaXRGb3JDb25maWdQcm9jZXNzb3JzKSB7XHJcbiAgICAgICAgICAgIHRoaXMuZmluaXNoZWRMb2FkaW5nID0gUHJvbWlzZS5hbGwodGhpcy5jb25maWdQcm9jZXNzb3JQcm9taXNlcy5nZXRBcnJheSgpKS50aGVuKChzdWNjZXNzKSA9PiB7IGV4ZWN1dGUoKSB9KTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBleGVjdXRlKCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQHJldHVybnMge1Byb21pc2V9XHJcbiAgICAgKi9cclxuICAgIGdldEZpbmlzaGVkTG9hZGluZ1Byb21pc2UoKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuZmluaXNoZWRMb2FkaW5nO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogXHJcbiAgICAgKiBAcGFyYW0ge0NvbmZpZ30gY29uZmlnIFxyXG4gICAgICovXHJcbiAgICBwcmVsb2FkQ29uZmlnRW50cmllcyhjb25maWcpIHtcclxuICAgICAgICBsZXQgaW5zdGFuY2VzID0gbmV3IExpc3QoKTtcclxuICAgICAgICBjb25maWcuZ2V0Q29uZmlnRWxlbWVudHMoKS5mb3JFYWNoKChrZXksIHZhbHVlLCBwYXJlbnQpID0+IHtcclxuICAgICAgICAgICAgdmFsdWUucHJlbG9hZCgpO1xyXG4gICAgICAgICAgICBpbnN0YW5jZXMuYWRkQWxsKHZhbHVlLmdldFN0b3JlZEluc3RhbmNlcygpKTtcclxuICAgICAgICAgICAgaWYodmFsdWUuZ2V0SW5zdGFuY2UoKSAmJiAodmFsdWUuZ2V0SW5zdGFuY2UoKS5wcm9jZXNzQ29uZmlnKSkge1xyXG4gICAgICAgICAgICAgICAgY29uZmlnLmFkZENvbmZpZ1Byb2Nlc3Nvcih2YWx1ZS5nZXRJbnN0YW5jZSgpKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZih2YWx1ZS5nZXRJbnN0YW5jZSgpICYmICh2YWx1ZS5nZXRJbnN0YW5jZSgpLnByb2Nlc3NJbnN0YW5jZSkpIHtcclxuICAgICAgICAgICAgICAgIGNvbmZpZy5hZGRJbnN0YW5jZVByb2Nlc3Nvcih2YWx1ZS5nZXRJbnN0YW5jZSgpKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICB9LCB0aGlzKTtcclxuICAgICAgICByZXR1cm4gaW5zdGFuY2VzO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogXHJcbiAgICAgKiBAcGFyYW0ge0NvbmZpZ30gY29uZmlnIFxyXG4gICAgICovXHJcbiAgICBwZXJmb3JtSW5qZWN0aW9ucyhjb25maWcpIHtcclxuICAgICAgICBjb25maWcuZ2V0Q29uZmlnRWxlbWVudHMoKS5mb3JFYWNoKChrZXksIHZhbHVlLCBwYXJlbnQpID0+IHtcclxuICAgICAgICAgICAgdmFsdWUuZ2V0U3RvcmVkSW5zdGFuY2VzKCkuZm9yRWFjaCgoaW5zdGFuY2VFbnRyeSwgaW5uZXJQYXJlbnQpID0+IHtcclxuICAgICAgICAgICAgICAgIHRoaXMuaW5qZWN0RmllbGRzKGluc3RhbmNlRW50cnksIDApO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgIH0sIHBhcmVudCk7XHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgIH0sIHRoaXMpO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogU3dhcHMgb3V0IGNsYXNzZXMgZm9yIGluc3RhbmNlcyBpbiB0aGUgcHJvdmlkZWQgaW5zdGFuY2VFbnRyeSwgbGltaXRlZCBieSBzdHJ1Y3R1cmVEZXB0aFxyXG4gICAgICogXHJcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gaW5zdGFuY2VFbnRyeSBcclxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBzdHJ1Y3R1cmVEZXB0aCBcclxuICAgICAqL1xyXG4gICAgaW5qZWN0RmllbGRzKGluc3RhbmNlRW50cnksIHN0cnVjdHVyZURlcHRoKSB7XHJcbiAgICAgICAgXHJcbiAgICAgICAgZm9yICh2YXIgZmllbGQgaW4gaW5zdGFuY2VFbnRyeSkge1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgaWYgKGZpZWxkICE9PSB1bmRlZmluZWQgJiYgZmllbGQgIT09IG51bGwgJiYgaW5zdGFuY2VFbnRyeVtmaWVsZF0gIT0gbnVsbCAmJiBpbnN0YW5jZUVudHJ5W2ZpZWxkXS5wcm90b3R5cGUgaW5zdGFuY2VvZiBPYmplY3QpIHtcclxuICAgICAgICAgICAgICAgIHZhciBpbnN0YW5jZSA9IHRoaXMuZ2V0SW5zdGFuY2VCeUNsYXNzUmVmZXJlbmNlKGluc3RhbmNlRW50cnlbZmllbGRdLm5hbWUsIHN0cnVjdHVyZURlcHRoKTtcclxuICAgICAgICAgICAgICAgIGlmIChpbnN0YW5jZSAhPT0gdW5kZWZpbmVkICYmIGluc3RhbmNlICE9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaW5zdGFuY2VFbnRyeVtmaWVsZF0gPSBpbnN0YW5jZTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoaW5zdGFuY2UgPT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIExPRy5lcnJvcihcIk5vIGluc3RhbmNlIGZvdW5kIHdoZW4gdHJ5aW5nIHRvIGluamVjdCBmaWVsZCAnXCIgKyBmaWVsZCArIFwiJyBpbiAnXCIgKyBpbnN0YW5jZUVudHJ5LmNvbnN0cnVjdG9yLm5hbWUgKyBcIidcIik7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgaWYoaW5zdGFuY2VFbnRyeS5wb3N0SW5qZWN0KSB7XHJcbiAgICAgICAgICAgIGluc3RhbmNlRW50cnkucG9zdEluamVjdCh0aGlzKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGluc3RhbmNlRW50cnk7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBGaW5kIGNvbmZpZ3VyYXRpb24gZm9yIGNsYXNzIG5hbWUsIGFuZCBpbnN0YW5zaWF0ZSBvciByZXR1cm4gaW5zdGFuY2VzIGJhc2VkXHJcbiAgICAgKiBvbiB3aGV0aGVyIHRoZXkgYWxscmVhZHkgZXhpc3QgYW5kIHdoZXRlciB0aGV5IGFyZSBQUk9UT1RZUEVzIG9yIFNJTkdMRVRPTnNcclxuICAgICAqIFxyXG4gICAgICogQHBhcmFtIHtjbGFzc30gY2xhc3NSZWZlcmVuY2UgXHJcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gc3RydWN0dXJlRGVwdGggXHJcbiAgICAgKiBAcGFyYW0ge2FycmF5fSBwYXJhbWV0ZXJzIFxyXG4gICAgICovXHJcbiAgICBnZXRJbnN0YW5jZUJ5Q2xhc3NSZWZlcmVuY2UoY2xhc3NOYW1lU3RyaW5nLCBzdHJ1Y3R1cmVEZXB0aCwgcGFyYW1ldGVycyA9IFtdKSB7XHJcbiAgICAgICAgbGV0IGluc3RhbmNlID0gbnVsbDtcclxuICAgICAgICBpZihJbmplY3Rvci5uYW1lID09PSBjbGFzc05hbWVTdHJpbmcpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRoaXMuY29uZmlnLmdldENvbmZpZ0VsZW1lbnRzKCkuZm9yRWFjaCgoa2V5LCB2YWx1ZSwgcGFyZW50KSA9PiB7XHJcbiAgICAgICAgICAgIGlmKGtleSA9PT0gY2xhc3NOYW1lU3RyaW5nKSB7XHJcbiAgICAgICAgICAgICAgICBpbnN0YW5jZSA9IHZhbHVlLmdldEluc3RhbmNlKHBhcmFtZXRlcnMpO1xyXG4gICAgICAgICAgICAgICAgaWYgKFwiUFJPVE9UWVBFXCIgPT09IHZhbHVlLmdldEluamVjdGlvblR5cGUoKSl7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHN0cnVjdHVyZURlcHRoIDwgMykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmluamVjdEZpZWxkcyhpbnN0YW5jZSwgc3RydWN0dXJlRGVwdGgrKyk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgXCJTdHJ1Y3R1cmUgb2YgbWFuYWdlZCBvYmplY3RzIGlzIHRvbyBkZWVwIHdoZW4gdHJ5aW5nIHRvIGluamVjdCBcIiArIGNsYXNzTmFtZVN0cmluZztcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcblxyXG4gICAgICAgIH0sIHRoaXMpO1xyXG4gICAgICAgIGlmKCFpbnN0YW5jZSkge1xyXG4gICAgICAgICAgICBMT0cuZXJyb3IoXCJObyBvYmplY3QgZm91bmQgZm9yIFwiICsgY2xhc3NOYW1lU3RyaW5nKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGluc3RhbmNlO1xyXG4gICAgfVxyXG5cclxufVxyXG5cclxuY29uc3QgaW5qZWN0b3IgPSBuZXcgSW5qZWN0b3IoKTsiLCJpbXBvcnQgeyBMb2dnZXIgfSBmcm9tIFwiY29yZXV0aWxfdjFcIjtcclxuXHJcbmNvbnN0IExPRyA9IG5ldyBMb2dnZXIoXCJJbnN0YW5jZVByb2Nlc3NvclwiKTtcclxuXHJcbi8qKlxyXG4gKiBJbnN0YW5jZSB3aGljaCBjYWxscyBwb3N0Q29uZmlnIG9uIG9iamVjdHMgYWZ0ZXIgY29uZmlnUHJvY2Vzc29yIGlzIGZpbmlzaGVkXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgSW5zdGFuY2VQcm9jZXNzb3Ige1xyXG5cclxuICAgIHByb2Nlc3NJbnN0YW5jZShpbnN0YW5jZSkge1xyXG4gICAgICAgIGlmKGluc3RhbmNlLnBvc3RDb25maWcpIHtcclxuICAgICAgICAgICAgaW5zdGFuY2UucG9zdENvbmZpZygpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbn0iXSwibmFtZXMiOlsiTE9HIl0sIm1hcHBpbmdzIjoiOztBQUVPLE1BQU0sV0FBVyxDQUFDOztJQUVyQixXQUFXLENBQUMsY0FBYyxFQUFFLGFBQWEsRUFBRSxRQUFRLEVBQUU7UUFDakQsSUFBSSxDQUFDLGNBQWMsR0FBRyxjQUFjLENBQUM7UUFDckMsSUFBSSxDQUFDLGFBQWEsR0FBRyxhQUFhLENBQUM7UUFDbkMsSUFBSSxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUM7UUFDekIsSUFBSSxDQUFDLGVBQWUsR0FBRyxJQUFJLENBQUM7UUFDNUIsSUFBSSxDQUFDLGVBQWUsR0FBRyxDQUFDLENBQUM7S0FDNUI7O0lBRUQsT0FBTyxHQUFHO1FBQ04sSUFBSSxDQUFDLGVBQWUsR0FBRyxDQUFDLENBQUM7UUFDekIsSUFBSSxDQUFDLGVBQWUsR0FBRyxJQUFJLElBQUksRUFBRSxDQUFDO1FBQ2xDLEdBQUcsV0FBVyxLQUFLLElBQUksQ0FBQyxhQUFhLEVBQUU7WUFDbkMsSUFBSSxD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
