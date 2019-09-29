import { List, Map, Logger } from './coreutil_v1.js'

class ConfigEntry {

    constructor(classReference, injectionType, poolSize) {
        this.classReference = classReference;
        this.injectionType = injectionType;
        this.poolSize = poolSize;
        this.storedInstances = null;
        this.instancePointer = 0;
    }

    instansiate() {
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

    getInstance() {
        if(this.storedInstances === null) {
            throw "Config entry has not been instansiated: " + this.classReference.name;
        }

        // Create a new instance each time for prototypes
        if("PROTOTYPE" === this.injectionType) {
            return new this.classReference();
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
        this.postConfigs = new List();
    }

    addAll(config) {
        this.configElements.addAll(config.getConfigElements());
        this.postConfigs.addAll(config.getPostConfigs());
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

    getPostConfigs() {
        return this.postConfigs;
    }

    addPostConfig(postConfig) {
        this.postConfigs.add(postConfig);
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
            LOG.error(fail);
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

export { Config, ConfigEntry, Injector };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWluZGlfdjEuanMiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9taW5kaS9jb25maWdFbnRyeS5qcyIsIi4uLy4uL3NyYy9taW5kaS9jb25maWcuanMiLCIuLi8uLi9zcmMvbWluZGkvaW5qZWN0b3IuanMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTGlzdCB9IGZyb20gXCJjb3JldXRpbF92MVwiO1xyXG5cclxuZXhwb3J0IGNsYXNzIENvbmZpZ0VudHJ5IHtcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihjbGFzc1JlZmVyZW5jZSwgaW5qZWN0aW9uVHlwZSwgcG9vbFNpemUpIHtcclxuICAgICAgICB0aGlzLmNsYXNzUmVmZXJlbmNlID0gY2xhc3NSZWZlcmVuY2U7XHJcbiAgICAgICAgdGhpcy5pbmplY3Rpb25UeXBlID0gaW5qZWN0aW9uVHlwZTtcclxuICAgICAgICB0aGlzLnBvb2xTaXplID0gcG9vbFNpemU7XHJcbiAgICAgICAgdGhpcy5zdG9yZWRJbnN0YW5jZXMgPSBudWxsO1xyXG4gICAgICAgIHRoaXMuaW5zdGFuY2VQb2ludGVyID0gMDtcclxuICAgIH1cclxuXHJcbiAgICBpbnN0YW5zaWF0ZSgpIHtcclxuICAgICAgICB0aGlzLmluc3RhbmNlUG9pbnRlciA9IDA7XHJcbiAgICAgICAgdGhpcy5zdG9yZWRJbnN0YW5jZXMgPSBuZXcgTGlzdCgpO1xyXG4gICAgICAgIGlmKFwiU0lOR0xFVE9OXCIgPT09IHRoaXMuaW5qZWN0aW9uVHlwZSkge1xyXG4gICAgICAgICAgICB0aGlzLnN0b3JlZEluc3RhbmNlcy5hZGQobmV3IHRoaXMuY2xhc3NSZWZlcmVuY2UoKSk7XHJcbiAgICAgICAgfSBlbHNlIGlmIChcIlBPT0xcIiA9PT0gdGhpcy5pbmplY3Rpb25UeXBlKSB7XHJcbiAgICAgICAgICAgIGZvcihpID0gMCA7IGkgPCB0aGlzLnBvb2xTaXplIDsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnN0b3JlZEluc3RhbmNlcy5hZGQobmV3IHRoaXMuY2xhc3NSZWZlcmVuY2UoKSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9IGVsc2UgaWYgKFwiUFJPVE9UWVBFXCIgPT09IHRoaXMuaW5qZWN0aW9uVHlwZSkge1xyXG4gICAgICAgICAgICAvLyBOZXcgaW5zdGFuY2UgZXZlcnkgdGltZVxyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHRocm93IFwiVW5rbm93biBpbmplY3Rpb25UeXBlIFwiICsgdGhpcy5pbmplY3Rpb25UeXBlO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBnZXRDbGFzc1JlZmVyZW5jZSgpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5jbGFzc1JlZmVyZW5jZTtcclxuICAgIH1cclxuXHJcbiAgICBnZXRJbmplY3Rpb25UeXBlKCkge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmluamVjdGlvblR5cGU7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBAcmV0dXJucyB7TGlzdH0gdGhlIGxpc3Qgb2Ygc3RvcmVkIGluc3RhbmNlc1xyXG4gICAgICovXHJcbiAgICBnZXRTdG9yZWRJbnN0YW5jZXMoKSB7XHJcbiAgICAgICAgaWYodGhpcy5zdG9yZWRJbnN0YW5jZXMgPT09IG51bGwpIHtcclxuICAgICAgICAgICAgdGhyb3cgXCJDb25maWcgZW50cnkgaGFzIG5vdCBiZWVuIGluc3RhbnNpYXRlZDogXCIgKyB0aGlzLmNsYXNzUmVmZXJlbmNlLm5hbWU7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiB0aGlzLnN0b3JlZEluc3RhbmNlcztcclxuICAgIH1cclxuXHJcbiAgICBnZXRJbnN0YW5jZSgpIHtcclxuICAgICAgICBpZih0aGlzLnN0b3JlZEluc3RhbmNlcyA9PT0gbnVsbCkge1xyXG4gICAgICAgICAgICB0aHJvdyBcIkNvbmZpZyBlbnRyeSBoYXMgbm90IGJlZW4gaW5zdGFuc2lhdGVkOiBcIiArIHRoaXMuY2xhc3NSZWZlcmVuY2UubmFtZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIENyZWF0ZSBhIG5ldyBpbnN0YW5jZSBlYWNoIHRpbWUgZm9yIHByb3RvdHlwZXNcclxuICAgICAgICBpZihcIlBST1RPVFlQRVwiID09PSB0aGlzLmluamVjdGlvblR5cGUpIHtcclxuICAgICAgICAgICAgcmV0dXJuIG5ldyB0aGlzLmNsYXNzUmVmZXJlbmNlKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBHZXQgdGhlIGluc3RhbmNlIGZyb20gdGhlIG5leHQgcG9zaXRpb24gaW4gdGhlIHBvb2xcclxuICAgICAgICB2YXIgaW5zdGFuY2UgPSB0aGlzLnN0b3JlZEluc3RhbmNlcy5nZXQodGhpcy5pbnN0YW5jZVBvaW50ZXIpO1xyXG4gICAgICAgIHRoaXMuaW5zdGFuY2VQb2ludGVyICsrO1xyXG4gICAgICAgIGlmKHRoaXMuaW5zdGFuY2VQb2ludGVyID09PSB0aGlzLnN0b3JlZEluc3RhbmNlcy5zaXplKCkpIHtcclxuICAgICAgICAgICAgdGhpcy5pbnN0YW5jZVBvaW50ZXIgPSAwO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gaW5zdGFuY2U7XHJcbiAgICB9XHJcblxyXG5cclxufSIsImltcG9ydCB7TWFwLCBMaXN0fSBmcm9tIFwiY29yZXV0aWxfdjFcIjtcclxuaW1wb3J0IHtDb25maWdFbnRyeX0gZnJvbSBcIi4vY29uZmlnRW50cnkuanNcIlxyXG5cclxuZXhwb3J0IGNsYXNzIENvbmZpZyB7XHJcblxyXG4gICAgY29uc3RydWN0b3IoKSB7XHJcbiAgICAgICAgdGhpcy5jb25maWdFbGVtZW50cyA9IG5ldyBNYXAoKTtcclxuICAgICAgICB0aGlzLnBvc3RDb25maWdzID0gbmV3IExpc3QoKTtcclxuICAgIH1cclxuXHJcbiAgICBhZGRBbGwoY29uZmlnKSB7XHJcbiAgICAgICAgdGhpcy5jb25maWdFbGVtZW50cy5hZGRBbGwoY29uZmlnLmdldENvbmZpZ0VsZW1lbnRzKCkpO1xyXG4gICAgICAgIHRoaXMucG9zdENvbmZpZ3MuYWRkQWxsKGNvbmZpZy5nZXRQb3N0Q29uZmlncygpKTtcclxuICAgIH1cclxuXHJcbiAgICBhZGRTaW5nbGV0b24oY2xhc3NOYW1lKSB7XHJcbiAgICAgICAgdGhpcy5jb25maWdFbGVtZW50cy5zZXQoY2xhc3NOYW1lLm5hbWUsbmV3IENvbmZpZ0VudHJ5KGNsYXNzTmFtZSxcIlNJTkdMRVRPTlwiKSk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9XHJcblxyXG4gICAgYWRkUHJvdG90eXBlKGNsYXNzTmFtZSkge1xyXG4gICAgICAgIHRoaXMuY29uZmlnRWxlbWVudHMuc2V0KGNsYXNzTmFtZS5uYW1lLG5ldyBDb25maWdFbnRyeShjbGFzc05hbWUsXCJQUk9UT1RZUEVcIikpO1xyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfVxyXG5cclxuICAgIGFkZE5hbWVkU2luZ2xldG9uKG5hbWUsY2xhc3NOYW1lKSB7XHJcbiAgICAgICAgdGhpcy5jb25maWdFbGVtZW50cy5zZXQobmFtZSxuZXcgQ29uZmlnRW50cnkoY2xhc3NOYW1lLFwiU0lOR0xFVE9OXCIpKTtcclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH1cclxuXHJcbiAgICBhZGROYW1lZFByb3RvdHlwZShuYW1lLGNsYXNzTmFtZSkge1xyXG4gICAgICAgIHRoaXMuY29uZmlnRWxlbWVudHMuc2V0KG5hbWUsbmV3IENvbmZpZ0VudHJ5KGNsYXNzTmFtZSxcIlBST1RPVFlQRVwiKSk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9XHJcblxyXG4gICAgZ2V0Q29uZmlnRWxlbWVudHMoKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuY29uZmlnRWxlbWVudHM7XHJcbiAgICB9XHJcblxyXG4gICAgZ2V0UG9zdENvbmZpZ3MoKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMucG9zdENvbmZpZ3M7XHJcbiAgICB9XHJcblxyXG4gICAgYWRkUG9zdENvbmZpZyhwb3N0Q29uZmlnKSB7XHJcbiAgICAgICAgdGhpcy5wb3N0Q29uZmlncy5hZGQocG9zdENvbmZpZyk7XHJcbiAgICB9XHJcblxyXG59IiwiaW1wb3J0IHsgQ29uZmlnIH0gZnJvbSBcIi4vY29uZmlnLmpzXCI7XHJcbmltcG9ydCB7IExpc3QsIExvZ2dlciB9IGZyb20gXCJjb3JldXRpbF92MVwiO1xyXG5pbXBvcnQgeyBDb25maWdFbnRyeSB9IGZyb20gXCIuL2NvbmZpZ0VudHJ5LmpzXCI7XHJcblxyXG5jb25zdCBMT0cgPSBuZXcgTG9nZ2VyKFwiSW5qZWN0b3JcIik7XHJcblxyXG5leHBvcnQgY2xhc3MgSW5qZWN0b3Ige1xyXG5cclxuICAgIHN0YXRpYyBnZXRJbnN0YW5jZSgpIHtcclxuICAgICAgICByZXR1cm4gaW5qZWN0b3I7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3RydWN0b3IoKSB7XHJcbiAgICAgICAgdGhpcy5jb25maWcgPSBuZXcgQ29uZmlnKCk7XHJcbiAgICAgICAgdGhpcy5wb3N0SW5qZWN0UHJvbWlzZXMgPSBuZXcgTGlzdCgpO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogXHJcbiAgICAgKiBAcGFyYW0ge0NvbmZpZ30gY29uZmlnIFxyXG4gICAgICovXHJcbiAgICBsb2FkKGNvbmZpZykge1xyXG4gICAgICAgIHRoaXMuaW5zdGFuc2lhdGVBbGwoY29uZmlnKTtcclxuICAgICAgICB0aGlzLmNvbmZpZy5hZGRBbGwoY29uZmlnKTtcclxuICAgICAgICB0aGlzLnBlcmZvcm1JbmplY3Rpb25zKGNvbmZpZyk7XHJcbiAgICAgICAgbGV0IHByb21pc2VMaXN0ID0gdGhpcy5leGVjdXRlUG9zdENvbmZpZyhjb25maWcsIHRoaXMuY29uZmlnLmdldFBvc3RDb25maWdzKCkpO1xyXG4gICAgICAgIHRoaXMucG9zdEluamVjdFByb21pc2VzLmFkZEFsbChwcm9taXNlTGlzdCk7XHJcbiAgICB9XHJcblxyXG4gICAgaW5qZWN0KG9iamVjdCkge1xyXG4gICAgICAgIHRoaXMuaW5qZWN0RmllbGRzKG9iamVjdCwgMCk7XHJcbiAgICAgICAgcmV0dXJuIG9iamVjdDtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIFxyXG4gICAgICogQHBhcmFtIHtjbGFzc30gY2xhc3NOYW1lIFxyXG4gICAgICogQHBhcmFtIHthcnJheX0gcGFyYW1ldGVyQXJyYXkgXHJcbiAgICAgKi9cclxuICAgIHByb3RvdHlwZUluc3RhbmNlKGNsYXNzTmFtZSwgcGFyYW1ldGVyQXJyYXkpIHtcclxuICAgICAgICAvKiogQHR5cGUge0NvbmZpZ0VudHJ5fSAqL1xyXG4gICAgICAgIGxldCBjbGFzc05hbWVTdHJpbmcgPSBjbGFzc05hbWUubmFtZTtcclxuICAgICAgICBsZXQgY29uZmlnID0gdGhpcy5jb25maWcuZ2V0Q29uZmlnRWxlbWVudHMoKS5nZXQoY2xhc3NOYW1lU3RyaW5nKTtcclxuICAgICAgICBpZighY29uZmlnKSB7XHJcbiAgICAgICAgICAgIExPRy5lcnJvcihcIk5vIGNvbmZpZyBmb3VuZCBmb3IgY2xhc3M6IFwiICsgY2xhc3NOYW1lU3RyaW5nKTtcclxuICAgICAgICAgICAgdGhyb3cgXCJObyBjb25maWcgZm91bmQgZm9yIGNsYXNzOiBcIiArIGNsYXNzTmFtZVN0cmluZztcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYoISBcIlBST1RPVFlQRVwiID09PSBjb25maWcuZ2V0SW5qZWN0aW9uVHlwZSgpKSB7XHJcbiAgICAgICAgICAgIExPRy5lcnJvcihcIkNvbmZpZyBmb3IgY2xhc3M6IFwiICsgY2xhc3NOYW1lU3RyaW5nICsgXCIgaXMgbm90IGEgcHJvdG90eXBlXCIpO1xyXG4gICAgICAgICAgICB0aHJvdyBcIkNvbmZpZyBmb3IgY2xhc3M6IFwiICsgY2xhc3NOYW1lU3RyaW5nICsgXCIgaXMgbm90IGEgcHJvdG90eXBlXCI7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiB0aGlzLmdldEluc3RhbmNlQnlDbGFzc1JlZmVyZW5jZShjbGFzc05hbWVTdHJpbmcsIDAsIHBhcmFtZXRlckFycmF5KTtcclxuICAgIH1cclxuXHJcbiAgICByZXNvbHZlUG9zdENvbmZpZ3Mob2JqZWN0LCBzdWNjZXNzRnVuY3Rpb24sIGZhaWxGdW5jdGlvbikge1xyXG4gICAgICAgIGxldCBjdXJyZW50UHJvbWlzZXMgPSB0aGlzLnBvc3RJbmplY3RQcm9taXNlcztcclxuICAgICAgICB0aGlzLnBvc3RJbmplY3RQcm9taXNlcyA9IG5ldyBMaXN0KCk7XHJcbiAgICAgICAgUHJvbWlzZS5hbGwoY3VycmVudFByb21pc2VzLmdldEFycmF5KCkpXHJcbiAgICAgICAgLnRoZW4oKHN1Y2Nlc3MpID0+IHtcclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIHN1Y2Nlc3NGdW5jdGlvbi5jYWxsKG9iamVjdCxzdWNjZXNzKTtcclxuICAgICAgICAgICAgfSBjYXRjaChlKSB7XHJcbiAgICAgICAgICAgICAgICBMT0cuZXJyb3IoZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KS5jYXRjaCgoZmFpbCkgPT4ge1xyXG4gICAgICAgICAgICBMT0cuZXJyb3IoZmFpbCk7XHJcbiAgICAgICAgICAgIGZhaWxGdW5jdGlvbi5jYWxsKG9iamVjdCxmYWlsKTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIFxyXG4gICAgICogQHBhcmFtIHtDb25maWd9IGNvbmZpZyBcclxuICAgICAqIEBwYXJhbSB7TGlzdH0gcG9zdENvbmZpZ3NcclxuICAgICAqIEByZXR1cm5zIHtMaXN0fVxyXG4gICAgICovXHJcbiAgICBleGVjdXRlUG9zdENvbmZpZyhjb25maWcsIHBvc3RDb25maWdzKSB7XHJcbiAgICAgICAgbGV0IHByb21pc2VMaXN0ID0gbmV3IExpc3QoKTtcclxuICAgICAgICBwb3N0Q29uZmlncy5mb3JFYWNoKChlbnRyeSwgcGFyZW50KSA9PiB7XHJcbiAgICAgICAgICAgIGxldCBwb3N0SW5qZWN0UHJvbWlzZSA9IGVudHJ5LnBvc3RDb25maWcoY29uZmlnKTtcclxuICAgICAgICAgICAgaWYocG9zdEluamVjdFByb21pc2UpIHtcclxuICAgICAgICAgICAgICAgIHByb21pc2VMaXN0LmFkZChwb3N0SW5qZWN0UHJvbWlzZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgfSwgdGhpcyk7XHJcbiAgICAgICAgcmV0dXJuIHByb21pc2VMaXN0O1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogXHJcbiAgICAgKiBAcGFyYW0ge0NvbmZpZ30gY29uZmlnIFxyXG4gICAgICovXHJcbiAgICBpbnN0YW5zaWF0ZUFsbChjb25maWcpIHtcclxuICAgICAgICBjb25maWcuZ2V0Q29uZmlnRWxlbWVudHMoKS5mb3JFYWNoKChrZXksIHZhbHVlLCBwYXJlbnQpID0+IHtcclxuICAgICAgICAgICAgdmFsdWUuaW5zdGFuc2lhdGUoKTtcclxuICAgICAgICAgICAgaWYodmFsdWUuZ2V0SW5zdGFuY2UoKSAmJiAodmFsdWUuZ2V0SW5zdGFuY2UoKS5wb3N0Q29uZmlnKSkge1xyXG4gICAgICAgICAgICAgICAgY29uZmlnLmFkZFBvc3RDb25maWcodmFsdWUuZ2V0SW5zdGFuY2UoKSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgfSwgdGhpcyk7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBcclxuICAgICAqIEBwYXJhbSB7Q29uZmlnfSBjb25maWcgXHJcbiAgICAgKi9cclxuICAgIHBlcmZvcm1JbmplY3Rpb25zKGNvbmZpZykge1xyXG4gICAgICAgIGNvbmZpZy5nZXRDb25maWdFbGVtZW50cygpLmZvckVhY2goKGtleSwgdmFsdWUsIHBhcmVudCkgPT4ge1xyXG4gICAgICAgICAgICB2YWx1ZS5nZXRTdG9yZWRJbnN0YW5jZXMoKS5mb3JFYWNoKChpbnN0YW5jZUVudHJ5LCBpbm5lclBhcmVudCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5pbmplY3RGaWVsZHMoaW5zdGFuY2VFbnRyeSwgMCk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICAgICAgfSwgcGFyZW50KTtcclxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgfSwgdGhpcyk7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBcclxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBpbnN0YW5jZUVudHJ5IFxyXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHN0cnVjdHVyZURlcHRoIFxyXG4gICAgICovXHJcbiAgICBpbmplY3RGaWVsZHMoaW5zdGFuY2VFbnRyeSwgc3RydWN0dXJlRGVwdGgpIHtcclxuICAgICAgICBcclxuICAgICAgICBmb3IgKHZhciBmaWVsZCBpbiBpbnN0YW5jZUVudHJ5KSB7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBpZiAoZmllbGQgIT09IHVuZGVmaW5lZCAmJiBmaWVsZCAhPT0gbnVsbCAmJiBpbnN0YW5jZUVudHJ5W2ZpZWxkXSAhPSBudWxsICYmIGluc3RhbmNlRW50cnlbZmllbGRdLnByb3RvdHlwZSBpbnN0YW5jZW9mIE9iamVjdCkge1xyXG4gICAgICAgICAgICAgICAgdmFyIGluc3RhbmNlID0gdGhpcy5nZXRJbnN0YW5jZUJ5Q2xhc3NSZWZlcmVuY2UoaW5zdGFuY2VFbnRyeVtmaWVsZF0ubmFtZSwgc3RydWN0dXJlRGVwdGgpO1xyXG4gICAgICAgICAgICAgICAgaWYgKGluc3RhbmNlICE9PSB1bmRlZmluZWQgJiYgaW5zdGFuY2UgIT09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICBpbnN0YW5jZUVudHJ5W2ZpZWxkXSA9IGluc3RhbmNlO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChpbnN0YW5jZSA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgTE9HLmVycm9yKFwiTm8gaW5zdGFuY2UgZm91bmQgd2hlbiB0cnlpbmcgdG8gaW5qZWN0IGZpZWxkICdcIiArIGZpZWxkICsgXCInIGluICdcIiArIGluc3RhbmNlRW50cnkuY29uc3RydWN0b3IubmFtZSArIFwiJ1wiKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gaW5zdGFuY2VFbnRyeTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIFxyXG4gICAgICogQHBhcmFtIHtjbGFzc30gY2xhc3NSZWZlcmVuY2UgXHJcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gc3RydWN0dXJlRGVwdGggXHJcbiAgICAgKiBAcGFyYW0ge2FycmF5fSBwYXJhbWV0ZXJzIFxyXG4gICAgICovXHJcbiAgICBnZXRJbnN0YW5jZUJ5Q2xhc3NSZWZlcmVuY2UoY2xhc3NOYW1lU3RyaW5nLCBzdHJ1Y3R1cmVEZXB0aCwgcGFyYW1ldGVycyA9IFtdKSB7XHJcbiAgICAgICAgbGV0IGluc3RhbmNlID0gbnVsbDtcclxuICAgICAgICBpZihJbmplY3Rvci5uYW1lID09PSBjbGFzc05hbWVTdHJpbmcpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRoaXMuY29uZmlnLmdldENvbmZpZ0VsZW1lbnRzKCkuZm9yRWFjaCgoa2V5LCB2YWx1ZSwgcGFyZW50KSA9PiB7XHJcbiAgICAgICAgICAgIGlmKGtleSA9PT0gY2xhc3NOYW1lU3RyaW5nKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoXCJQUk9UT1RZUEVcIiA9PT0gdmFsdWUuZ2V0SW5qZWN0aW9uVHlwZSgpKXtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoc3RydWN0dXJlRGVwdGggPCAzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBjbGFzc1JlZmVyZW5jZSA9IHZhbHVlLmdldENsYXNzUmVmZXJlbmNlKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGluc3RhbmNlID0gdGhpcy5pbmplY3RGaWVsZHMobmV3IGNsYXNzUmVmZXJlbmNlKC4uLnBhcmFtZXRlcnMpLCBzdHJ1Y3R1cmVEZXB0aCsrKTtcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBcIlN0cnVjdHVyZSBvZiBtYW5hZ2VkIG9iamVjdHMgaXMgdG9vIGRlZXAgd2hlbiB0cnlpbmcgdG8gaW5qZWN0IFwiICsgY2xhc3NOYW1lU3RyaW5nO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoXCJTSU5HTEVUT05cIiA9PT0gdmFsdWUuZ2V0SW5qZWN0aW9uVHlwZSgpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaW5zdGFuY2UgPSB2YWx1ZS5nZXRJbnN0YW5jZSgpO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBMT0cuZXJyb3IoXCJJbmplY3Rpb24gdHlwZSBcIiArIHZhbHVlLmdldEluamVjdGlvblR5cGUoKSArIFwiIG5vdCBzdXBwb3J0ZWQgZm9yIFwiICsgY2xhc3NOYW1lU3RyaW5nKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuXHJcbiAgICAgICAgfSwgdGhpcyk7XHJcbiAgICAgICAgaWYoIWluc3RhbmNlKSB7XHJcbiAgICAgICAgICAgIExPRy5lcnJvcihcIk5vIG9iamVjdCBmb3VuZCBmb3IgXCIgKyBjbGFzc05hbWVTdHJpbmcpO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gaW5zdGFuY2U7XHJcbiAgICB9XHJcblxyXG59XHJcblxyXG5jb25zdCBpbmplY3RvciA9IG5ldyBJbmplY3RvcigpOyJdLCJuYW1lcyI6W10s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
