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
        } else if ("PROTOTYPE" === this.injectionType) {
            // New instance every time
        } else {
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWluZGlfdjEuanMiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9taW5kaS9jb25maWdFbnRyeS5qcyIsIi4uLy4uL3NyYy9taW5kaS9jb25maWcuanMiLCIuLi8uLi9zcmMvbWluZGkvaW5qZWN0b3IuanMiLCIuLi8uLi9zcmMvbWluZGkvaW5zdGFuY2VQcm9jZXNzb3IuanMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTGlzdCB9IGZyb20gXCJjb3JldXRpbF92MVwiO1xyXG5cclxuZXhwb3J0IGNsYXNzIENvbmZpZ0VudHJ5IHtcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihjbGFzc1JlZmVyZW5jZSwgaW5qZWN0aW9uVHlwZSwgcG9vbFNpemUpIHtcclxuICAgICAgICB0aGlzLmNsYXNzUmVmZXJlbmNlID0gY2xhc3NSZWZlcmVuY2U7XHJcbiAgICAgICAgdGhpcy5pbmplY3Rpb25UeXBlID0gaW5qZWN0aW9uVHlwZTtcclxuICAgICAgICB0aGlzLnBvb2xTaXplID0gcG9vbFNpemU7XHJcbiAgICAgICAgdGhpcy5zdG9yZWRJbnN0YW5jZXMgPSBudWxsO1xyXG4gICAgICAgIHRoaXMuaW5zdGFuY2VQb2ludGVyID0gMDtcclxuICAgIH1cclxuXHJcbiAgICBwcmVsb2FkKCkge1xyXG4gICAgICAgIHRoaXMuaW5zdGFuY2VQb2ludGVyID0gMDtcclxuICAgICAgICB0aGlzLnN0b3JlZEluc3RhbmNlcyA9IG5ldyBMaXN0KCk7XHJcbiAgICAgICAgaWYoXCJTSU5HTEVUT05cIiA9PT0gdGhpcy5pbmplY3Rpb25UeXBlKSB7XHJcbiAgICAgICAgICAgIHRoaXMuc3RvcmVkSW5zdGFuY2VzLmFkZChuZXcgdGhpcy5jbGFzc1JlZmVyZW5jZSgpKTtcclxuICAgICAgICB9IGVsc2UgaWYgKFwiUE9PTFwiID09PSB0aGlzLmluamVjdGlvblR5cGUpIHtcclxuICAgICAgICAgICAgZm9yKGkgPSAwIDsgaSA8IHRoaXMucG9vbFNpemUgOyBpKyspIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuc3RvcmVkSW5zdGFuY2VzLmFkZChuZXcgdGhpcy5jbGFzc1JlZmVyZW5jZSgpKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0gZWxzZSBpZiAoXCJQUk9UT1RZUEVcIiA9PT0gdGhpcy5pbmplY3Rpb25UeXBlKSB7XHJcbiAgICAgICAgICAgIC8vIE5ldyBpbnN0YW5jZSBldmVyeSB0aW1lXHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdGhyb3cgXCJVbmtub3duIGluamVjdGlvblR5cGUgXCIgKyB0aGlzLmluamVjdGlvblR5cGU7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGdldENsYXNzUmVmZXJlbmNlKCkge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmNsYXNzUmVmZXJlbmNlO1xyXG4gICAgfVxyXG5cclxuICAgIGdldEluamVjdGlvblR5cGUoKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuaW5qZWN0aW9uVHlwZTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIEByZXR1cm5zIHtMaXN0fSB0aGUgbGlzdCBvZiBzdG9yZWQgaW5zdGFuY2VzXHJcbiAgICAgKi9cclxuICAgIGdldFN0b3JlZEluc3RhbmNlcygpIHtcclxuICAgICAgICBpZih0aGlzLnN0b3JlZEluc3RhbmNlcyA9PT0gbnVsbCkge1xyXG4gICAgICAgICAgICB0aHJvdyBcIkNvbmZpZyBlbnRyeSBoYXMgbm90IGJlZW4gaW5zdGFuc2lhdGVkOiBcIiArIHRoaXMuY2xhc3NSZWZlcmVuY2UubmFtZTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuc3RvcmVkSW5zdGFuY2VzO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogXHJcbiAgICAgKiBAcGFyYW0ge2FycmF5fSBwYXJhbWV0ZXJzIHRoZSBwYXJhbWV0ZXJzIHRvIHVzZSBmb3IgdGhlIGNsYXNzIGlmIGl0IGlzIGNvbmZpZ3VyZWQgYXMgYSBwcm90b3R5cGVcclxuICAgICAqL1xyXG4gICAgZ2V0SW5zdGFuY2UocGFyYW1ldGVycyA9IFtdKSB7XHJcblxyXG4gICAgICAgIGlmKFwiUFJPVE9UWVBFXCIgPT09IHRoaXMuaW5qZWN0aW9uVHlwZSkge1xyXG4gICAgICAgICAgICByZXR1cm4gbmV3IHRoaXMuY2xhc3NSZWZlcmVuY2UoLi4ucGFyYW1ldGVycyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBHZXQgdGhlIGluc3RhbmNlIGZyb20gdGhlIG5leHQgcG9zaXRpb24gaW4gdGhlIHBvb2xcclxuICAgICAgICB2YXIgaW5zdGFuY2UgPSB0aGlzLnN0b3JlZEluc3RhbmNlcy5nZXQodGhpcy5pbnN0YW5jZVBvaW50ZXIpO1xyXG4gICAgICAgIHRoaXMuaW5zdGFuY2VQb2ludGVyICsrO1xyXG4gICAgICAgIGlmKHRoaXMuaW5zdGFuY2VQb2ludGVyID09PSB0aGlzLnN0b3JlZEluc3RhbmNlcy5zaXplKCkpIHtcclxuICAgICAgICAgICAgdGhpcy5pbnN0YW5jZVBvaW50ZXIgPSAwO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gaW5zdGFuY2U7XHJcbiAgICB9XHJcblxyXG5cclxufSIsImltcG9ydCB7TWFwLCBMaXN0fSBmcm9tIFwiY29yZXV0aWxfdjFcIjtcclxuaW1wb3J0IHtDb25maWdFbnRyeX0gZnJvbSBcIi4vY29uZmlnRW50cnkuanNcIlxyXG5cclxuZXhwb3J0IGNsYXNzIENvbmZpZyB7XHJcblxyXG4gICAgY29uc3RydWN0b3IoKSB7XHJcbiAgICAgICAgdGhpcy5jb25maWdFbGVtZW50cyA9IG5ldyBNYXAoKTtcclxuICAgICAgICB0aGlzLmNvbmZpZ1Byb2Nlc3NvcnMgPSBuZXcgTGlzdCgpO1xyXG4gICAgICAgIHRoaXMuaW5zdGFuY2VQcm9jZXNzb3JzID0gbmV3IExpc3QoKTtcclxuICAgIH1cclxuXHJcbiAgICBhZGRBbGwoY29uZmlnKSB7XHJcbiAgICAgICAgdGhpcy5jb25maWdFbGVtZW50cy5hZGRBbGwoY29uZmlnLmdldENvbmZpZ0VsZW1lbnRzKCkpO1xyXG4gICAgICAgIHRoaXMuY29uZmlnUHJvY2Vzc29ycy5hZGRBbGwoY29uZmlnLmdldENvbmZpZ1Byb2Nlc3NvcnMoKSk7XHJcbiAgICAgICAgdGhpcy5pbnN0YW5jZVByb2Nlc3NvcnMuYWRkQWxsKGNvbmZpZy5nZXRJbnN0YW5jZVByb2Nlc3NvcnMoKSk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9XHJcblxyXG4gICAgYWRkU2luZ2xldG9uKGNsYXNzTmFtZSkge1xyXG4gICAgICAgIHRoaXMuY29uZmlnRWxlbWVudHMuc2V0KGNsYXNzTmFtZS5uYW1lLG5ldyBDb25maWdFbnRyeShjbGFzc05hbWUsXCJTSU5HTEVUT05cIikpO1xyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfVxyXG5cclxuICAgIGFkZFByb3RvdHlwZShjbGFzc05hbWUpIHtcclxuICAgICAgICB0aGlzLmNvbmZpZ0VsZW1lbnRzLnNldChjbGFzc05hbWUubmFtZSxuZXcgQ29uZmlnRW50cnkoY2xhc3NOYW1lLFwiUFJPVE9UWVBFXCIpKTtcclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH1cclxuXHJcbiAgICBhZGROYW1lZFNpbmdsZXRvbihuYW1lLGNsYXNzTmFtZSkge1xyXG4gICAgICAgIHRoaXMuY29uZmlnRWxlbWVudHMuc2V0KG5hbWUsbmV3IENvbmZpZ0VudHJ5KGNsYXNzTmFtZSxcIlNJTkdMRVRPTlwiKSk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9XHJcblxyXG4gICAgYWRkTmFtZWRQcm90b3R5cGUobmFtZSxjbGFzc05hbWUpIHtcclxuICAgICAgICB0aGlzLmNvbmZpZ0VsZW1lbnRzLnNldChuYW1lLG5ldyBDb25maWdFbnRyeShjbGFzc05hbWUsXCJQUk9UT1RZUEVcIikpO1xyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQHJldHVybnMge01hcH1cclxuICAgICAqL1xyXG4gICAgZ2V0Q29uZmlnRWxlbWVudHMoKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuY29uZmlnRWxlbWVudHM7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBAcmV0dXJucyB7TGlzdH1cclxuICAgICAqL1xyXG4gICAgZ2V0Q29uZmlnUHJvY2Vzc29ycygpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5jb25maWdQcm9jZXNzb3JzO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQHJldHVybnMge0xpc3R9XHJcbiAgICAgKi9cclxuICAgIGdldEluc3RhbmNlUHJvY2Vzc29ycygpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5pbnN0YW5jZVByb2Nlc3NvcnM7XHJcbiAgICB9XHJcblxyXG4gICAgYWRkQ29uZmlnUHJvY2Vzc29yKGNvbmZpZ1Byb2Nlc3Nvcikge1xyXG4gICAgICAgIHRoaXMuY29uZmlnUHJvY2Vzc29ycy5hZGQoY29uZmlnUHJvY2Vzc29yKTtcclxuICAgIH1cclxuXHJcbiAgICBhZGRJbnN0YW5jZVByb2Nlc3NvcihpbnN0YW5jZVByb2Nlc3Nvcikge1xyXG4gICAgICAgIHRoaXMuaW5zdGFuY2VQcm9jZXNzb3JzLmFkZChpbnN0YW5jZVByb2Nlc3Nvcik7XHJcbiAgICB9XHJcbn0iLCJpbXBvcnQgeyBDb25maWcgfSBmcm9tIFwiLi9jb25maWcuanNcIjtcclxuaW1wb3J0IHsgTGlzdCwgTG9nZ2VyIH0gZnJvbSBcImNvcmV1dGlsX3YxXCI7XHJcbmltcG9ydCB7IENvbmZpZ0VudHJ5IH0gZnJvbSBcIi4vY29uZmlnRW50cnkuanNcIjtcclxuXHJcbmNvbnN0IExPRyA9IG5ldyBMb2dnZXIoXCJJbmplY3RvclwiKTtcclxuXHJcbmV4cG9ydCBjbGFzcyBJbmplY3RvciB7XHJcblxyXG4gICAgc3RhdGljIGdldEluc3RhbmNlKCkge1xyXG4gICAgICAgIHJldHVybiBpbmplY3RvcjtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdHJ1Y3RvcigpIHtcclxuICAgICAgICB0aGlzLmNvbmZpZyA9IG5ldyBDb25maWcoKTtcclxuICAgICAgICB0aGlzLmNvbmZpZ1Byb2Nlc3NvclByb21pc2VzID0gbmV3IExpc3QoKTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIFxyXG4gICAgICogQHBhcmFtIHtDb25maWd9IGNvbmZpZyBcclxuICAgICAqL1xyXG4gICAgbG9hZChjb25maWcpIHtcclxuICAgICAgICB0aGlzLmZpbmlzaGVkTG9hZGluZyA9IG5ldyBQcm9taXNlKFxyXG4gICAgICAgICAgICAocmVzb2x2ZSwgcmVqZWN0KSA9PiB7IHJlc29sdmUoKTsgfVxyXG4gICAgICAgICk7XHJcblxyXG5cclxuICAgICAgICBsZXQgcHJlbG9hZGVkSW5zdGFuY2VzID0gdGhpcy5wcmVsb2FkQ29uZmlnRW50cmllcyhjb25maWcpO1xyXG5cclxuICAgICAgICB0aGlzLmNvbmZpZy5hZGRBbGwoY29uZmlnKTtcclxuXHJcbiAgICAgICAgdGhpcy5wZXJmb3JtSW5qZWN0aW9ucyhjb25maWcpO1xyXG5cclxuICAgICAgICBsZXQgcHJvbWlzZUxpc3QgPSB0aGlzLmV4ZWN1dGVDb25maWdQcm9jZXNzb3JzKGNvbmZpZywgdGhpcy5jb25maWcuZ2V0Q29uZmlnUHJvY2Vzc29ycygpKTtcclxuICAgICAgICB0aGlzLmNvbmZpZ1Byb2Nlc3NvclByb21pc2VzLmFkZEFsbChwcm9taXNlTGlzdCk7XHJcblxyXG4gICAgICAgIHRoaXMuZXhlY3V0ZUluc3RhbmNlUHJvY2Vzc29ycyhwcmVsb2FkZWRJbnN0YW5jZXMsIHRydWUpO1xyXG5cclxuICAgICAgICBQcm9taXNlXHJcbiAgICAgICAgICAgIC5hbGwodGhpcy5jb25maWdQcm9jZXNzb3JQcm9taXNlcy5nZXRBcnJheSgpKVxyXG4gICAgICAgICAgICAudGhlbigoc3VjY2VzcykgPT4ge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jb25maWdQcm9jZXNzb3JQcm9taXNlcyA9IG5ldyBMaXN0KCk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGluamVjdChvYmplY3QpIHtcclxuICAgICAgICB0aGlzLmluamVjdEZpZWxkcyhvYmplY3QsIDApO1xyXG4gICAgICAgIHRoaXMuZXhlY3V0ZUluc3RhbmNlUHJvY2Vzc29ycyhuZXcgTGlzdChbb2JqZWN0XSkpO1xyXG4gICAgICAgIHJldHVybiBvYmplY3Q7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBcclxuICAgICAqIEBwYXJhbSB7Y2xhc3N9IGNsYXNzTmFtZSBcclxuICAgICAqIEBwYXJhbSB7YXJyYXl9IHBhcmFtZXRlckFycmF5IFxyXG4gICAgICovXHJcbiAgICBwcm90b3R5cGVJbnN0YW5jZShjbGFzc05hbWUsIHBhcmFtZXRlckFycmF5KSB7XHJcbiAgICAgICAgLyoqIEB0eXBlIHtDb25maWdFbnRyeX0gKi9cclxuICAgICAgICBsZXQgY2xhc3NOYW1lU3RyaW5nID0gY2xhc3NOYW1lLm5hbWU7XHJcbiAgICAgICAgbGV0IGNvbmZpZyA9IHRoaXMuY29uZmlnLmdldENvbmZpZ0VsZW1lbnRzKCkuZ2V0KGNsYXNzTmFtZVN0cmluZyk7XHJcbiAgICAgICAgaWYoIWNvbmZpZykge1xyXG4gICAgICAgICAgICBMT0cuZXJyb3IoXCJObyBjb25maWcgZm91bmQgZm9yIGNsYXNzOiBcIiArIGNsYXNzTmFtZVN0cmluZyk7XHJcbiAgICAgICAgICAgIHRocm93IFwiTm8gY29uZmlnIGZvdW5kIGZvciBjbGFzczogXCIgKyBjbGFzc05hbWVTdHJpbmc7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmKCEgXCJQUk9UT1RZUEVcIiA9PT0gY29uZmlnLmdldEluamVjdGlvblR5cGUoKSkge1xyXG4gICAgICAgICAgICBMT0cuZXJyb3IoXCJDb25maWcgZm9yIGNsYXNzOiBcIiArIGNsYXNzTmFtZVN0cmluZyArIFwiIGlzIG5vdCBhIHByb3RvdHlwZVwiKTtcclxuICAgICAgICAgICAgdGhyb3cgXCJDb25maWcgZm9yIGNsYXNzOiBcIiArIGNsYXNzTmFtZVN0cmluZyArIFwiIGlzIG5vdCBhIHByb3RvdHlwZVwiO1xyXG4gICAgICAgIH1cclxuICAgICAgICBsZXQgaW5zdGFuY2UgPSB0aGlzLmdldEluc3RhbmNlQnlDbGFzc1JlZmVyZW5jZShjbGFzc05hbWVTdHJpbmcsIDAsIHBhcmFtZXRlckFycmF5KTtcclxuICAgICAgICB0aGlzLmV4ZWN1dGVJbnN0YW5jZVByb2Nlc3NvcnMobmV3IExpc3QoW2luc3RhbmNlXSkpO1xyXG4gICAgICAgIHJldHVybiBpbnN0YW5jZTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIFxyXG4gICAgICogQHBhcmFtIHtDb25maWd9IGNvbmZpZyBcclxuICAgICAqIEBwYXJhbSB7TGlzdH0gY29uZmlnUHJvY2Vzc29yc1xyXG4gICAgICogQHJldHVybnMge0xpc3R9XHJcbiAgICAgKi9cclxuICAgIGV4ZWN1dGVDb25maWdQcm9jZXNzb3JzKGNvbmZpZywgY29uZmlnUHJvY2Vzc29ycykge1xyXG4gICAgICAgIGxldCBwcm9taXNlTGlzdCA9IG5ldyBMaXN0KCk7XHJcbiAgICAgICAgY29uZmlnUHJvY2Vzc29ycy5mb3JFYWNoKChlbnRyeSwgcGFyZW50KSA9PiB7XHJcbiAgICAgICAgICAgIGxldCBjb25maWdQcm9jZXNzb3JzUHJvbWlzZSA9IGVudHJ5LnByb2Nlc3NDb25maWcoY29uZmlnKTtcclxuICAgICAgICAgICAgaWYoY29uZmlnUHJvY2Vzc29yc1Byb21pc2UpIHtcclxuICAgICAgICAgICAgICAgIHByb21pc2VMaXN0LmFkZChjb25maWdQcm9jZXNzb3JzUHJvbWlzZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgfSwgdGhpcyk7XHJcbiAgICAgICAgcmV0dXJuIHByb21pc2VMaXN0O1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogXHJcbiAgICAgKiBAcGFyYW0ge0xpc3R9IGluc3RhbmNlTGlzdCBcclxuICAgICAqL1xyXG4gICAgZXhlY3V0ZUluc3RhbmNlUHJvY2Vzc29ycyhpbnN0YW5jZUxpc3QsIHdhaXRGb3JDb25maWdQcm9jZXNzb3JzID0gZmFsc2UpIHtcclxuXHJcbiAgICAgICAgbGV0IGV4ZWN1dGUgPSAoKSA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMuY29uZmlnLmdldEluc3RhbmNlUHJvY2Vzc29ycygpLmZvckVhY2goKHByb2Nlc3NvcixwYXJlbnQpID0+IHtcclxuICAgICAgICAgICAgICAgIGluc3RhbmNlTGlzdC5mb3JFYWNoKChpbnN0YW5jZSxwYXJlbnQpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBwcm9jZXNzb3IucHJvY2Vzc0luc3RhbmNlKGluc3RhbmNlKTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIH0sdGhpcyk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICAgICAgfSx0aGlzKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmKHdhaXRGb3JDb25maWdQcm9jZXNzb3JzKSB7XHJcbiAgICAgICAgICAgIHRoaXMuZmluaXNoZWRMb2FkaW5nID0gUHJvbWlzZS5hbGwodGhpcy5jb25maWdQcm9jZXNzb3JQcm9taXNlcy5nZXRBcnJheSgpKS50aGVuKChzdWNjZXNzKSA9PiB7IGV4ZWN1dGUoKSB9KTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBleGVjdXRlKCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQHJldHVybnMge1Byb21pc2V9XHJcbiAgICAgKi9cclxuICAgIGdldEZpbmlzaGVkTG9hZGluZ1Byb21pc2UoKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuZmluaXNoZWRMb2FkaW5nO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogXHJcbiAgICAgKiBAcGFyYW0ge0NvbmZpZ30gY29uZmlnIFxyXG4gICAgICovXHJcbiAgICBwcmVsb2FkQ29uZmlnRW50cmllcyhjb25maWcpIHtcclxuICAgICAgICBsZXQgaW5zdGFuY2VzID0gbmV3IExpc3QoKTtcclxuICAgICAgICBjb25maWcuZ2V0Q29uZmlnRWxlbWVudHMoKS5mb3JFYWNoKChrZXksIHZhbHVlLCBwYXJlbnQpID0+IHtcclxuICAgICAgICAgICAgdmFsdWUucHJlbG9hZCgpO1xyXG4gICAgICAgICAgICBpbnN0YW5jZXMuYWRkQWxsKHZhbHVlLmdldFN0b3JlZEluc3RhbmNlcygpKTtcclxuICAgICAgICAgICAgaWYodmFsdWUuZ2V0SW5zdGFuY2UoKSAmJiAodmFsdWUuZ2V0SW5zdGFuY2UoKS5wcm9jZXNzQ29uZmlnKSkge1xyXG4gICAgICAgICAgICAgICAgY29uZmlnLmFkZENvbmZpZ1Byb2Nlc3Nvcih2YWx1ZS5nZXRJbnN0YW5jZSgpKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZih2YWx1ZS5nZXRJbnN0YW5jZSgpICYmICh2YWx1ZS5nZXRJbnN0YW5jZSgpLnByb2Nlc3NJbnN0YW5jZSkpIHtcclxuICAgICAgICAgICAgICAgIGNvbmZpZy5hZGRJbnN0YW5jZVByb2Nlc3Nvcih2YWx1ZS5nZXRJbnN0YW5jZSgpKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICB9LCB0aGlzKTtcclxuICAgICAgICByZXR1cm4gaW5zdGFuY2VzO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogXHJcbiAgICAgKiBAcGFyYW0ge0NvbmZpZ30gY29uZmlnIFxyXG4gICAgICovXHJcbiAgICBwZXJmb3JtSW5qZWN0aW9ucyhjb25maWcpIHtcclxuICAgICAgICBjb25maWcuZ2V0Q29uZmlnRWxlbWVudHMoKS5mb3JFYWNoKChrZXksIHZhbHVlLCBwYXJlbnQpID0+IHtcclxuICAgICAgICAgICAgdmFsdWUuZ2V0U3RvcmVkSW5zdGFuY2VzKCkuZm9yRWFjaCgoaW5zdGFuY2VFbnRyeSwgaW5uZXJQYXJlbnQpID0+IHtcclxuICAgICAgICAgICAgICAgIHRoaXMuaW5qZWN0RmllbGRzKGluc3RhbmNlRW50cnksIDApO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgIH0sIHBhcmVudCk7XHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgIH0sIHRoaXMpO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogU3dhcHMgb3V0IGNsYXNzZXMgZm9yIGluc3RhbmNlcyBpbiB0aGUgcHJvdmlkZWQgaW5zdGFuY2VFbnRyeSwgbGltaXRlZCBieSBzdHJ1Y3R1cmVEZXB0aFxyXG4gICAgICogXHJcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gaW5zdGFuY2VFbnRyeSBcclxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBzdHJ1Y3R1cmVEZXB0aCBcclxuICAgICAqL1xyXG4gICAgaW5qZWN0RmllbGRzKGluc3RhbmNlRW50cnksIHN0cnVjdHVyZURlcHRoKSB7XHJcbiAgICAgICAgXHJcbiAgICAgICAgZm9yICh2YXIgZmllbGQgaW4gaW5zdGFuY2VFbnRyeSkge1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgaWYgKGZpZWxkICE9PSB1bmRlZmluZWQgJiYgZmllbGQgIT09IG51bGwgJiYgaW5zdGFuY2VFbnRyeVtmaWVsZF0gIT0gbnVsbCAmJiBpbnN0YW5jZUVudHJ5W2ZpZWxkXS5wcm90b3R5cGUgaW5zdGFuY2VvZiBPYmplY3QpIHtcclxuICAgICAgICAgICAgICAgIHZhciBpbnN0YW5jZSA9IHRoaXMuZ2V0SW5zdGFuY2VCeUNsYXNzUmVmZXJlbmNlKGluc3RhbmNlRW50cnlbZmllbGRdLm5hbWUsIHN0cnVjdHVyZURlcHRoKTtcclxuICAgICAgICAgICAgICAgIGlmIChpbnN0YW5jZSAhPT0gdW5kZWZpbmVkICYmIGluc3RhbmNlICE9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaW5zdGFuY2VFbnRyeVtmaWVsZF0gPSBpbnN0YW5jZTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoaW5zdGFuY2UgPT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIExPRy5lcnJvcihcIk5vIGluc3RhbmNlIGZvdW5kIHdoZW4gdHJ5aW5nIHRvIGluamVjdCBmaWVsZCAnXCIgKyBmaWVsZCArIFwiJyBpbiAnXCIgKyBpbnN0YW5jZUVudHJ5LmNvbnN0cnVjdG9yLm5hbWUgKyBcIidcIik7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgaWYoaW5zdGFuY2VFbnRyeS5wb3N0SW5qZWN0KSB7XHJcbiAgICAgICAgICAgIGluc3RhbmNlRW50cnkucG9zdEluamVjdCh0aGlzKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGluc3RhbmNlRW50cnk7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBGaW5kIGNvbmZpZ3VyYXRpb24gZm9yIGNsYXNzIG5hbWUsIGFuZCBpbnN0YW5zaWF0ZSBvciByZXR1cm4gaW5zdGFuY2VzIGJhc2VkXHJcbiAgICAgKiBvbiB3aGV0aGVyIHRoZXkgYWxscmVhZHkgZXhpc3QgYW5kIHdoZXRlciB0aGV5IGFyZSBQUk9UT1RZUEVzIG9yIFNJTkdMRVRPTnNcclxuICAgICAqIFxyXG4gICAgICogQHBhcmFtIHtjbGFzc30gY2xhc3NSZWZlcmVuY2UgXHJcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gc3RydWN0dXJlRGVwdGggXHJcbiAgICAgKiBAcGFyYW0ge2FycmF5fSBwYXJhbWV0ZXJzIFxyXG4gICAgICovXHJcbiAgICBnZXRJbnN0YW5jZUJ5Q2xhc3NSZWZlcmVuY2UoY2xhc3NOYW1lU3RyaW5nLCBzdHJ1Y3R1cmVEZXB0aCwgcGFyYW1ldGVycyA9IFtdKSB7XHJcbiAgICAgICAgbGV0IGluc3RhbmNlID0gbnVsbDtcclxuICAgICAgICBpZihJbmplY3Rvci5uYW1lID09PSBjbGFzc05hbWVTdHJpbmcpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRoaXMuY29uZmlnLmdldENvbmZpZ0VsZW1lbnRzKCkuZm9yRWFjaCgoa2V5LCB2YWx1ZSwgcGFyZW50KSA9PiB7XHJcbiAgICAgICAgICAgIGlmKGtleSA9PT0gY2xhc3NOYW1lU3RyaW5nKSB7XHJcbiAgICAgICAgICAgICAgICBpbnN0YW5jZSA9IHZhbHVlLmdldEluc3RhbmNlKHBhcmFtZXRlcnMpO1xyXG4gICAgICAgICAgICAgICAgaWYgKFwiUFJPVE9UWVBFXCIgPT09IHZhbHVlLmdldEluamVjdGlvblR5cGUoKSl7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHN0cnVjdHVyZURlcHRoIDwgMykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmluamVjdEZpZWxkcyhpbnN0YW5jZSwgc3RydWN0dXJlRGVwdGgrKyk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgXCJTdHJ1Y3R1cmUgb2YgbWFuYWdlZCBvYmplY3RzIGlzIHRvbyBkZWVwIHdoZW4gdHJ5aW5nIHRvIGluamVjdCBcIiArIGNsYXNzTmFtZVN0cmluZztcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcblxyXG4gICAgICAgIH0sIHRoaXMpO1xyXG4gICAgICAgIGlmKCFpbnN0YW5jZSkge1xyXG4gICAgICAgICAgICBMT0cuZXJyb3IoXCJObyBvYmplY3QgZm91bmQgZm9yIFwiICsgY2xhc3NOYW1lU3RyaW5nKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGluc3RhbmNlO1xyXG4gICAgfVxyXG5cclxufVxyXG5cclxuY29uc3QgaW5qZWN0b3IgPSBuZXcgSW5qZWN0b3IoKTsiLCJpbXBvcnQgeyBMb2dnZXIgfSBmcm9tIFwiY29yZXV0aWxfdjFcIjtcclxuXHJcbmNvbnN0IExPRyA9IG5ldyBMb2dnZXIoXCJJbnN0YW5jZVByb2Nlc3NvclwiKTtcclxuXHJcbi8qKlxyXG4gKiBJbnN0YW5jZSB3aGljaCBjYWxscyBwb3N0Q29uZmlnIG9uIG9iamVjdHMgYWZ0ZXIgY29uZmlnUHJvY2Vzc29yIGlzIGZpbmlzaGVkXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgSW5zdGFuY2VQcm9jZXNzb3Ige1xyXG5cclxuICAgIHByb2Nlc3NJbnN0YW5jZShpbnN0YW5jZSkge1xyXG4gICAgICAgIGlmKGluc3RhbmNlLnBvc3RDb25maWcpIHtcclxuICAgICAgICAgICAgaW5zdGFuY2UucG9zdENvbmZpZygpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbn0iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFFTyxNQUFNLFdBQVcsQ0FBQzs7SUFFckIsV0FBVyxDQUFDLGNBQWMsRUFBRSxhQUFhLEVBQUUsUUFBUSxFQUFFO1FBQ2pELElBQUksQ0FBQyxjQUFjLEdBQUcsY0FBYyxDQUFDO1FBQ3JDLElBQUksQ0FBQyxhQUFhLEdBQUcsYUFBYSxDQUFDO1FBQ25DLElBQUksQ0FBQyxRQUFRLEdBQUcsUUFBUSxDQUFDO1FBQ3pCLElBQUksQ0FBQyxlQUFlLEdBQUcsSUFBSSxDQUFDO1FBQzVCLElBQUksQ0FBQyxlQUFlLEdBQUcsQ0FBQyxDQUFDO0tBQzVCOztJQUVELE9BQU8sR0FBRztRQUNOLElBQUksQ0FBQyxlQUFlLEdBQUcsQ0FBQyxDQUFDO1FBQ3pCLElBQUksQ0FBQyxlQUFlLEdBQUcsSUFBSSxJQUFJLEVBQUUsQ0FBQztRQUNsQyxHQUFHLFdBQVcsS0FBSyxJQUFJLENBQUMsYUFBYSxFQUFFO1lBQ25DLElBQUksQ0FBQyxl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
