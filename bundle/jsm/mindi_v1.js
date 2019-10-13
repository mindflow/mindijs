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
    }

    addAll(config) {
        this.configElements.addAll(config.getConfigElements());
        this.configProcessors.addAll(config.getConfigProcessors());
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

    getConfigElements() {
        return this.configElements;
    }

    getConfigProcessors() {
        return this.configProcessors;
    }

    addConfigProcessor(configProcessor) {
        this.configProcessors.add(configProcessor);
    }

}

const LOG = new Logger("Injector");

class Injector {

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
                LOG.info("Clearing promises");
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

export { Config, ConfigEntry, Injector };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWluZGlfdjEuanMiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9taW5kaS9jb25maWdFbnRyeS5qcyIsIi4uLy4uL3NyYy9taW5kaS9jb25maWcuanMiLCIuLi8uLi9zcmMvbWluZGkvaW5qZWN0b3IuanMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTGlzdCB9IGZyb20gXCJjb3JldXRpbF92MVwiO1xyXG5cclxuZXhwb3J0IGNsYXNzIENvbmZpZ0VudHJ5IHtcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihjbGFzc1JlZmVyZW5jZSwgaW5qZWN0aW9uVHlwZSwgcG9vbFNpemUpIHtcclxuICAgICAgICB0aGlzLmNsYXNzUmVmZXJlbmNlID0gY2xhc3NSZWZlcmVuY2U7XHJcbiAgICAgICAgdGhpcy5pbmplY3Rpb25UeXBlID0gaW5qZWN0aW9uVHlwZTtcclxuICAgICAgICB0aGlzLnBvb2xTaXplID0gcG9vbFNpemU7XHJcbiAgICAgICAgdGhpcy5zdG9yZWRJbnN0YW5jZXMgPSBudWxsO1xyXG4gICAgICAgIHRoaXMuaW5zdGFuY2VQb2ludGVyID0gMDtcclxuICAgIH1cclxuXHJcbiAgICBwcmVsb2FkKCkge1xyXG4gICAgICAgIHRoaXMuaW5zdGFuY2VQb2ludGVyID0gMDtcclxuICAgICAgICB0aGlzLnN0b3JlZEluc3RhbmNlcyA9IG5ldyBMaXN0KCk7XHJcbiAgICAgICAgaWYoXCJTSU5HTEVUT05cIiA9PT0gdGhpcy5pbmplY3Rpb25UeXBlKSB7XHJcbiAgICAgICAgICAgIHRoaXMuc3RvcmVkSW5zdGFuY2VzLmFkZChuZXcgdGhpcy5jbGFzc1JlZmVyZW5jZSgpKTtcclxuICAgICAgICB9IGVsc2UgaWYgKFwiUE9PTFwiID09PSB0aGlzLmluamVjdGlvblR5cGUpIHtcclxuICAgICAgICAgICAgZm9yKGkgPSAwIDsgaSA8IHRoaXMucG9vbFNpemUgOyBpKyspIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuc3RvcmVkSW5zdGFuY2VzLmFkZChuZXcgdGhpcy5jbGFzc1JlZmVyZW5jZSgpKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0gZWxzZSBpZiAoXCJQUk9UT1RZUEVcIiA9PT0gdGhpcy5pbmplY3Rpb25UeXBlKSB7XHJcbiAgICAgICAgICAgIC8vIE5ldyBpbnN0YW5jZSBldmVyeSB0aW1lXHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdGhyb3cgXCJVbmtub3duIGluamVjdGlvblR5cGUgXCIgKyB0aGlzLmluamVjdGlvblR5cGU7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGdldENsYXNzUmVmZXJlbmNlKCkge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmNsYXNzUmVmZXJlbmNlO1xyXG4gICAgfVxyXG5cclxuICAgIGdldEluamVjdGlvblR5cGUoKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuaW5qZWN0aW9uVHlwZTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIEByZXR1cm5zIHtMaXN0fSB0aGUgbGlzdCBvZiBzdG9yZWQgaW5zdGFuY2VzXHJcbiAgICAgKi9cclxuICAgIGdldFN0b3JlZEluc3RhbmNlcygpIHtcclxuICAgICAgICBpZih0aGlzLnN0b3JlZEluc3RhbmNlcyA9PT0gbnVsbCkge1xyXG4gICAgICAgICAgICB0aHJvdyBcIkNvbmZpZyBlbnRyeSBoYXMgbm90IGJlZW4gaW5zdGFuc2lhdGVkOiBcIiArIHRoaXMuY2xhc3NSZWZlcmVuY2UubmFtZTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuc3RvcmVkSW5zdGFuY2VzO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogXHJcbiAgICAgKiBAcGFyYW0ge2FycmF5fSBwYXJhbWV0ZXJzIHRoZSBwYXJhbWV0ZXJzIHRvIHVzZSBmb3IgdGhlIGNsYXNzIGlmIGl0IGlzIGNvbmZpZ3VyZWQgYXMgYSBwcm90b3R5cGVcclxuICAgICAqL1xyXG4gICAgZ2V0SW5zdGFuY2UocGFyYW1ldGVycyA9IFtdKSB7XHJcblxyXG4gICAgICAgIGlmKFwiUFJPVE9UWVBFXCIgPT09IHRoaXMuaW5qZWN0aW9uVHlwZSkge1xyXG4gICAgICAgICAgICByZXR1cm4gbmV3IHRoaXMuY2xhc3NSZWZlcmVuY2UoLi4ucGFyYW1ldGVycyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBHZXQgdGhlIGluc3RhbmNlIGZyb20gdGhlIG5leHQgcG9zaXRpb24gaW4gdGhlIHBvb2xcclxuICAgICAgICB2YXIgaW5zdGFuY2UgPSB0aGlzLnN0b3JlZEluc3RhbmNlcy5nZXQodGhpcy5pbnN0YW5jZVBvaW50ZXIpO1xyXG4gICAgICAgIHRoaXMuaW5zdGFuY2VQb2ludGVyICsrO1xyXG4gICAgICAgIGlmKHRoaXMuaW5zdGFuY2VQb2ludGVyID09PSB0aGlzLnN0b3JlZEluc3RhbmNlcy5zaXplKCkpIHtcclxuICAgICAgICAgICAgdGhpcy5pbnN0YW5jZVBvaW50ZXIgPSAwO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gaW5zdGFuY2U7XHJcbiAgICB9XHJcblxyXG5cclxufSIsImltcG9ydCB7TWFwLCBMaXN0fSBmcm9tIFwiY29yZXV0aWxfdjFcIjtcclxuaW1wb3J0IHtDb25maWdFbnRyeX0gZnJvbSBcIi4vY29uZmlnRW50cnkuanNcIlxyXG5cclxuZXhwb3J0IGNsYXNzIENvbmZpZyB7XHJcblxyXG4gICAgY29uc3RydWN0b3IoKSB7XHJcbiAgICAgICAgdGhpcy5jb25maWdFbGVtZW50cyA9IG5ldyBNYXAoKTtcclxuICAgICAgICB0aGlzLmNvbmZpZ1Byb2Nlc3NvcnMgPSBuZXcgTGlzdCgpO1xyXG4gICAgfVxyXG5cclxuICAgIGFkZEFsbChjb25maWcpIHtcclxuICAgICAgICB0aGlzLmNvbmZpZ0VsZW1lbnRzLmFkZEFsbChjb25maWcuZ2V0Q29uZmlnRWxlbWVudHMoKSk7XHJcbiAgICAgICAgdGhpcy5jb25maWdQcm9jZXNzb3JzLmFkZEFsbChjb25maWcuZ2V0Q29uZmlnUHJvY2Vzc29ycygpKTtcclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH1cclxuXHJcbiAgICBhZGRTaW5nbGV0b24oY2xhc3NOYW1lKSB7XHJcbiAgICAgICAgdGhpcy5jb25maWdFbGVtZW50cy5zZXQoY2xhc3NOYW1lLm5hbWUsbmV3IENvbmZpZ0VudHJ5KGNsYXNzTmFtZSxcIlNJTkdMRVRPTlwiKSk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9XHJcblxyXG4gICAgYWRkUHJvdG90eXBlKGNsYXNzTmFtZSkge1xyXG4gICAgICAgIHRoaXMuY29uZmlnRWxlbWVudHMuc2V0KGNsYXNzTmFtZS5uYW1lLG5ldyBDb25maWdFbnRyeShjbGFzc05hbWUsXCJQUk9UT1RZUEVcIikpO1xyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfVxyXG5cclxuICAgIGFkZE5hbWVkU2luZ2xldG9uKG5hbWUsY2xhc3NOYW1lKSB7XHJcbiAgICAgICAgdGhpcy5jb25maWdFbGVtZW50cy5zZXQobmFtZSxuZXcgQ29uZmlnRW50cnkoY2xhc3NOYW1lLFwiU0lOR0xFVE9OXCIpKTtcclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH1cclxuXHJcbiAgICBhZGROYW1lZFByb3RvdHlwZShuYW1lLGNsYXNzTmFtZSkge1xyXG4gICAgICAgIHRoaXMuY29uZmlnRWxlbWVudHMuc2V0KG5hbWUsbmV3IENvbmZpZ0VudHJ5KGNsYXNzTmFtZSxcIlBST1RPVFlQRVwiKSk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9XHJcblxyXG4gICAgZ2V0Q29uZmlnRWxlbWVudHMoKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuY29uZmlnRWxlbWVudHM7XHJcbiAgICB9XHJcblxyXG4gICAgZ2V0Q29uZmlnUHJvY2Vzc29ycygpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5jb25maWdQcm9jZXNzb3JzO1xyXG4gICAgfVxyXG5cclxuICAgIGFkZENvbmZpZ1Byb2Nlc3Nvcihjb25maWdQcm9jZXNzb3IpIHtcclxuICAgICAgICB0aGlzLmNvbmZpZ1Byb2Nlc3NvcnMuYWRkKGNvbmZpZ1Byb2Nlc3Nvcik7XHJcbiAgICB9XHJcblxyXG59IiwiaW1wb3J0IHsgQ29uZmlnIH0gZnJvbSBcIi4vY29uZmlnLmpzXCI7XHJcbmltcG9ydCB7IExpc3QsIExvZ2dlciB9IGZyb20gXCJjb3JldXRpbF92MVwiO1xyXG5pbXBvcnQgeyBDb25maWdFbnRyeSB9IGZyb20gXCIuL2NvbmZpZ0VudHJ5LmpzXCI7XHJcblxyXG5jb25zdCBMT0cgPSBuZXcgTG9nZ2VyKFwiSW5qZWN0b3JcIik7XHJcblxyXG5leHBvcnQgY2xhc3MgSW5qZWN0b3Ige1xyXG5cclxuICAgIHN0YXRpYyBnZXRJbnN0YW5jZSgpIHtcclxuICAgICAgICByZXR1cm4gaW5qZWN0b3I7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3RydWN0b3IoKSB7XHJcbiAgICAgICAgdGhpcy5jb25maWcgPSBuZXcgQ29uZmlnKCk7XHJcbiAgICAgICAgdGhpcy5wb3N0SW5qZWN0UHJvbWlzZXMgPSBuZXcgTGlzdCgpO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogXHJcbiAgICAgKiBAcGFyYW0ge0NvbmZpZ30gY29uZmlnIFxyXG4gICAgICovXHJcbiAgICBsb2FkKGNvbmZpZykge1xyXG4gICAgICAgIHRoaXMucHJlbG9hZENvbmZpZ0VudHJpZXMoY29uZmlnKTtcclxuICAgICAgICB0aGlzLmNvbmZpZy5hZGRBbGwoY29uZmlnKTtcclxuICAgICAgICB0aGlzLnBlcmZvcm1JbmplY3Rpb25zKGNvbmZpZyk7XHJcbiAgICAgICAgbGV0IHByb21pc2VMaXN0ID0gdGhpcy5leGVjdXRlQ29uZmlnUHJvY2Vzc29ycyhjb25maWcsIHRoaXMuY29uZmlnLmdldENvbmZpZ1Byb2Nlc3NvcnMoKSk7XHJcbiAgICAgICAgdGhpcy5wb3N0SW5qZWN0UHJvbWlzZXMuYWRkQWxsKHByb21pc2VMaXN0KTtcclxuICAgICAgICBQcm9taXNlXHJcbiAgICAgICAgICAgIC5hbGwodGhpcy5wb3N0SW5qZWN0UHJvbWlzZXMuZ2V0QXJyYXkoKSlcclxuICAgICAgICAgICAgLnRoZW4oKHN1Y2Nlc3MpID0+IHtcclxuICAgICAgICAgICAgICAgIExPRy5pbmZvKFwiQ2xlYXJpbmcgcHJvbWlzZXNcIilcclxuICAgICAgICAgICAgICAgIHRoaXMucG9zdEluamVjdFByb21pc2VzID0gbmV3IExpc3QoKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgaW5qZWN0KG9iamVjdCkge1xyXG4gICAgICAgIHRoaXMuaW5qZWN0RmllbGRzKG9iamVjdCwgMCk7XHJcbiAgICAgICAgUHJvbWlzZVxyXG4gICAgICAgICAgICAuYWxsKHRoaXMucG9zdEluamVjdFByb21pc2VzLmdldEFycmF5KCkpXHJcbiAgICAgICAgICAgIC50aGVuKChzdWNjZXNzKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBpZihvYmplY3QucG9zdENvbmZpZykge1xyXG4gICAgICAgICAgICAgICAgICAgIG9iamVjdC5wb3N0Q29uZmlnKHRoaXMpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgcmV0dXJuIG9iamVjdDtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIFxyXG4gICAgICogQHBhcmFtIHtjbGFzc30gY2xhc3NOYW1lIFxyXG4gICAgICogQHBhcmFtIHthcnJheX0gcGFyYW1ldGVyQXJyYXkgXHJcbiAgICAgKi9cclxuICAgIHByb3RvdHlwZUluc3RhbmNlKGNsYXNzTmFtZSwgcGFyYW1ldGVyQXJyYXkpIHtcclxuICAgICAgICAvKiogQHR5cGUge0NvbmZpZ0VudHJ5fSAqL1xyXG4gICAgICAgIGxldCBjbGFzc05hbWVTdHJpbmcgPSBjbGFzc05hbWUubmFtZTtcclxuICAgICAgICBsZXQgY29uZmlnID0gdGhpcy5jb25maWcuZ2V0Q29uZmlnRWxlbWVudHMoKS5nZXQoY2xhc3NOYW1lU3RyaW5nKTtcclxuICAgICAgICBpZighY29uZmlnKSB7XHJcbiAgICAgICAgICAgIExPRy5lcnJvcihcIk5vIGNvbmZpZyBmb3VuZCBmb3IgY2xhc3M6IFwiICsgY2xhc3NOYW1lU3RyaW5nKTtcclxuICAgICAgICAgICAgdGhyb3cgXCJObyBjb25maWcgZm91bmQgZm9yIGNsYXNzOiBcIiArIGNsYXNzTmFtZVN0cmluZztcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYoISBcIlBST1RPVFlQRVwiID09PSBjb25maWcuZ2V0SW5qZWN0aW9uVHlwZSgpKSB7XHJcbiAgICAgICAgICAgIExPRy5lcnJvcihcIkNvbmZpZyBmb3IgY2xhc3M6IFwiICsgY2xhc3NOYW1lU3RyaW5nICsgXCIgaXMgbm90IGEgcHJvdG90eXBlXCIpO1xyXG4gICAgICAgICAgICB0aHJvdyBcIkNvbmZpZyBmb3IgY2xhc3M6IFwiICsgY2xhc3NOYW1lU3RyaW5nICsgXCIgaXMgbm90IGEgcHJvdG90eXBlXCI7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiB0aGlzLmdldEluc3RhbmNlQnlDbGFzc1JlZmVyZW5jZShjbGFzc05hbWVTdHJpbmcsIDAsIHBhcmFtZXRlckFycmF5KTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIFxyXG4gICAgICogQHBhcmFtIHtDb25maWd9IGNvbmZpZyBcclxuICAgICAqIEBwYXJhbSB7TGlzdH0gY29uZmlnUHJvY2Vzc29yc1xyXG4gICAgICogQHJldHVybnMge0xpc3R9XHJcbiAgICAgKi9cclxuICAgIGV4ZWN1dGVDb25maWdQcm9jZXNzb3JzKGNvbmZpZywgY29uZmlnUHJvY2Vzc29ycykge1xyXG4gICAgICAgIGxldCBwcm9taXNlTGlzdCA9IG5ldyBMaXN0KCk7XHJcbiAgICAgICAgY29uZmlnUHJvY2Vzc29ycy5mb3JFYWNoKChlbnRyeSwgcGFyZW50KSA9PiB7XHJcbiAgICAgICAgICAgIGxldCBjb25maWdQcm9jZXNzb3JzUHJvbWlzZSA9IGVudHJ5LnByb2Nlc3NDb25maWcoY29uZmlnKTtcclxuICAgICAgICAgICAgaWYoY29uZmlnUHJvY2Vzc29yc1Byb21pc2UpIHtcclxuICAgICAgICAgICAgICAgIHByb21pc2VMaXN0LmFkZChjb25maWdQcm9jZXNzb3JzUHJvbWlzZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgfSwgdGhpcyk7XHJcbiAgICAgICAgUHJvbWlzZVxyXG4gICAgICAgICAgICAuYWxsKHByb21pc2VMaXN0LmdldEFycmF5KCkpXHJcbiAgICAgICAgICAgIC50aGVuKChzdWNjZXNzKSA9PiB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmV4ZWN1dGVBbGxQb3N0Q29uZmlnKGNvbmZpZyk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIHJldHVybiBwcm9taXNlTGlzdDtcclxuICAgIH1cclxuXHJcbiAgICBleGVjdXRlQWxsUG9zdENvbmZpZyhjb25maWcpIHtcclxuICAgICAgICBjb25maWcuZ2V0Q29uZmlnRWxlbWVudHMoKS5mb3JFYWNoKChrZXksIHZhbHVlLCBwYXJlbnQpID0+IHtcclxuICAgICAgICAgICAgaWYodmFsdWUuZ2V0SW5zdGFuY2UoKSAmJiAodmFsdWUuZ2V0SW5zdGFuY2UoKS5wb3N0Q29uZmlnKSkge1xyXG4gICAgICAgICAgICAgICAgdmFsdWUuZ2V0SW5zdGFuY2UoKS5wb3N0Q29uZmlnKHRoaXMpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgIH0sIHRoaXMpO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogXHJcbiAgICAgKiBAcGFyYW0ge0NvbmZpZ30gY29uZmlnIFxyXG4gICAgICovXHJcbiAgICBwcmVsb2FkQ29uZmlnRW50cmllcyhjb25maWcpIHtcclxuICAgICAgICBjb25maWcuZ2V0Q29uZmlnRWxlbWVudHMoKS5mb3JFYWNoKChrZXksIHZhbHVlLCBwYXJlbnQpID0+IHtcclxuICAgICAgICAgICAgdmFsdWUucHJlbG9hZCgpO1xyXG4gICAgICAgICAgICBpZih2YWx1ZS5nZXRJbnN0YW5jZSgpICYmICh2YWx1ZS5nZXRJbnN0YW5jZSgpLnByb2Nlc3NDb25maWcpKSB7XHJcbiAgICAgICAgICAgICAgICBjb25maWcuYWRkQ29uZmlnUHJvY2Vzc29yKHZhbHVlLmdldEluc3RhbmNlKCkpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgIH0sIHRoaXMpO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogXHJcbiAgICAgKiBAcGFyYW0ge0NvbmZpZ30gY29uZmlnIFxyXG4gICAgICovXHJcbiAgICBwZXJmb3JtSW5qZWN0aW9ucyhjb25maWcpIHtcclxuICAgICAgICBjb25maWcuZ2V0Q29uZmlnRWxlbWVudHMoKS5mb3JFYWNoKChrZXksIHZhbHVlLCBwYXJlbnQpID0+IHtcclxuICAgICAgICAgICAgdmFsdWUuZ2V0U3RvcmVkSW5zdGFuY2VzKCkuZm9yRWFjaCgoaW5zdGFuY2VFbnRyeSwgaW5uZXJQYXJlbnQpID0+IHtcclxuICAgICAgICAgICAgICAgIHRoaXMuaW5qZWN0RmllbGRzKGluc3RhbmNlRW50cnksIDApO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgIH0sIHBhcmVudCk7XHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgIH0sIHRoaXMpO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogU3dhcHMgb3V0IGNsYXNzZXMgZm9yIGluc3RhbmNlcyBpbiB0aGUgcHJvdmlkZWQgaW5zdGFuY2VFbnRyeSwgbGltaXRlZCBieSBzdHJ1Y3R1cmVEZXB0aFxyXG4gICAgICogXHJcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gaW5zdGFuY2VFbnRyeSBcclxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBzdHJ1Y3R1cmVEZXB0aCBcclxuICAgICAqL1xyXG4gICAgaW5qZWN0RmllbGRzKGluc3RhbmNlRW50cnksIHN0cnVjdHVyZURlcHRoKSB7XHJcbiAgICAgICAgXHJcbiAgICAgICAgZm9yICh2YXIgZmllbGQgaW4gaW5zdGFuY2VFbnRyeSkge1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgaWYgKGZpZWxkICE9PSB1bmRlZmluZWQgJiYgZmllbGQgIT09IG51bGwgJiYgaW5zdGFuY2VFbnRyeVtmaWVsZF0gIT0gbnVsbCAmJiBpbnN0YW5jZUVudHJ5W2ZpZWxkXS5wcm90b3R5cGUgaW5zdGFuY2VvZiBPYmplY3QpIHtcclxuICAgICAgICAgICAgICAgIHZhciBpbnN0YW5jZSA9IHRoaXMuZ2V0SW5zdGFuY2VCeUNsYXNzUmVmZXJlbmNlKGluc3RhbmNlRW50cnlbZmllbGRdLm5hbWUsIHN0cnVjdHVyZURlcHRoKTtcclxuICAgICAgICAgICAgICAgIGlmIChpbnN0YW5jZSAhPT0gdW5kZWZpbmVkICYmIGluc3RhbmNlICE9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaW5zdGFuY2VFbnRyeVtmaWVsZF0gPSBpbnN0YW5jZTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoaW5zdGFuY2UgPT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIExPRy5lcnJvcihcIk5vIGluc3RhbmNlIGZvdW5kIHdoZW4gdHJ5aW5nIHRvIGluamVjdCBmaWVsZCAnXCIgKyBmaWVsZCArIFwiJyBpbiAnXCIgKyBpbnN0YW5jZUVudHJ5LmNvbnN0cnVjdG9yLm5hbWUgKyBcIidcIik7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgaWYoaW5zdGFuY2VFbnRyeS5wb3N0SW5qZWN0KSB7XHJcbiAgICAgICAgICAgIGluc3RhbmNlRW50cnkucG9zdEluamVjdCh0aGlzKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGluc3RhbmNlRW50cnk7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBGaW5kIGNvbmZpZ3VyYXRpb24gZm9yIGNsYXNzIG5hbWUsIGFuZCBpbnN0YW5zaWF0ZSBvciByZXR1cm4gaW5zdGFuY2VzIGJhc2VkXHJcbiAgICAgKiBvbiB3aGV0aGVyIHRoZXkgYWxscmVhZHkgZXhpc3QgYW5kIHdoZXRlciB0aGV5IGFyZSBQUk9UT1RZUEVzIG9yIFNJTkdMRVRPTnNcclxuICAgICAqIFxyXG4gICAgICogQHBhcmFtIHtjbGFzc30gY2xhc3NSZWZlcmVuY2UgXHJcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gc3RydWN0dXJlRGVwdGggXHJcbiAgICAgKiBAcGFyYW0ge2FycmF5fSBwYXJhbWV0ZXJzIFxyXG4gICAgICovXHJcbiAgICBnZXRJbnN0YW5jZUJ5Q2xhc3NSZWZlcmVuY2UoY2xhc3NOYW1lU3RyaW5nLCBzdHJ1Y3R1cmVEZXB0aCwgcGFyYW1ldGVycyA9IFtdKSB7XHJcbiAgICAgICAgbGV0IGluc3RhbmNlID0gbnVsbDtcclxuICAgICAgICBpZihJbmplY3Rvci5uYW1lID09PSBjbGFzc05hbWVTdHJpbmcpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRoaXMuY29uZmlnLmdldENvbmZpZ0VsZW1lbnRzKCkuZm9yRWFjaCgoa2V5LCB2YWx1ZSwgcGFyZW50KSA9PiB7XHJcbiAgICAgICAgICAgIGlmKGtleSA9PT0gY2xhc3NOYW1lU3RyaW5nKSB7XHJcbiAgICAgICAgICAgICAgICBpbnN0YW5jZSA9IHZhbHVlLmdldEluc3RhbmNlKHBhcmFtZXRlcnMpO1xyXG4gICAgICAgICAgICAgICAgaWYgKFwiUFJPVE9UWVBFXCIgPT09IHZhbHVlLmdldEluamVjdGlvblR5cGUoKSl7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHN0cnVjdHVyZURlcHRoIDwgMykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmluamVjdEZpZWxkcyhpbnN0YW5jZSwgc3RydWN0dXJlRGVwdGgrKyk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgXCJTdHJ1Y3R1cmUgb2YgbWFuYWdlZCBvYmplY3RzIGlzIHRvbyBkZWVwIHdoZW4gdHJ5aW5nIHRvIGluamVjdCBcIiArIGNsYXNzTmFtZVN0cmluZztcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcblxyXG4gICAgICAgIH0sIHRoaXMpO1xyXG4gICAgICAgIGlmKCFpbnN0YW5jZSkge1xyXG4gICAgICAgICAgICBMT0cuZXJyb3IoXCJObyBvYmplY3QgZm91bmQgZm9yIFwiICsgY2xhc3NOYW1lU3RyaW5nKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGluc3RhbmNlO1xyXG4gICAgfVxyXG5cclxufVxyXG5cclxuY29uc3QgaW5qZWN0b3IgPSBuZXcgSW5qZWN0b3IoKTsiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFFTyxNQUFNLFdBQVcsQ0FBQzs7SUFFckIsV0FBVyxDQUFDLGNBQWMsRUFBRSxhQUFhLEVBQUUsUUFBUSxFQUFFO1FBQ2pELElBQUksQ0FBQyxjQUFjLEdBQUcsY0FBYyxDQUFDO1FBQ3JDLElBQUksQ0FBQyxhQUFhLEdBQUcsYUFBYSxDQUFDO1FBQ25DLElBQUksQ0FBQyxRQUFRLEdBQUcsUUFBUSxDQUFDO1FBQ3pCLElBQUksQ0FBQyxlQUFlLEdBQUcsSUFBSSxDQUFDO1FBQzVCLElBQUksQ0FBQyxlQUFlLEdBQUcsQ0FBQyxDQUFDO0tBQzVCOztJQUVELE9BQU8sR0FBRztRQUNOLElBQUksQ0FBQyxlQUFlLEdBQUcsQ0FBQyxDQUFDO1FBQ3pCLElBQUksQ0FBQyxlQUFlLEdBQUcsSUFB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
