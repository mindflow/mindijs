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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWluZGlfdjEuanMiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9taW5kaS9jb25maWdFbnRyeS5qcyIsIi4uLy4uL3NyYy9taW5kaS9jb25maWcuanMiLCIuLi8uLi9zcmMvbWluZGkvaW5qZWN0b3IuanMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTGlzdCB9IGZyb20gXCJjb3JldXRpbF92MVwiO1xyXG5cclxuZXhwb3J0IGNsYXNzIENvbmZpZ0VudHJ5IHtcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihjbGFzc1JlZmVyZW5jZSwgaW5qZWN0aW9uVHlwZSwgcG9vbFNpemUpIHtcclxuICAgICAgICB0aGlzLmNsYXNzUmVmZXJlbmNlID0gY2xhc3NSZWZlcmVuY2U7XHJcbiAgICAgICAgdGhpcy5pbmplY3Rpb25UeXBlID0gaW5qZWN0aW9uVHlwZTtcclxuICAgICAgICB0aGlzLnBvb2xTaXplID0gcG9vbFNpemU7XHJcbiAgICAgICAgdGhpcy5zdG9yZWRJbnN0YW5jZXMgPSBudWxsO1xyXG4gICAgICAgIHRoaXMuaW5zdGFuY2VQb2ludGVyID0gMDtcclxuICAgIH1cclxuXHJcbiAgICBpbnN0YW5zaWF0ZSgpIHtcclxuICAgICAgICB0aGlzLmluc3RhbmNlUG9pbnRlciA9IDA7XHJcbiAgICAgICAgdGhpcy5zdG9yZWRJbnN0YW5jZXMgPSBuZXcgTGlzdCgpO1xyXG4gICAgICAgIGlmKFwiU0lOR0xFVE9OXCIgPT09IHRoaXMuaW5qZWN0aW9uVHlwZSkge1xyXG4gICAgICAgICAgICB0aGlzLnN0b3JlZEluc3RhbmNlcy5hZGQobmV3IHRoaXMuY2xhc3NSZWZlcmVuY2UoKSk7XHJcbiAgICAgICAgfSBlbHNlIGlmIChcIlBPT0xcIiA9PT0gdGhpcy5pbmplY3Rpb25UeXBlKSB7XHJcbiAgICAgICAgICAgIGZvcihpID0gMCA7IGkgPCB0aGlzLnBvb2xTaXplIDsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnN0b3JlZEluc3RhbmNlcy5hZGQobmV3IHRoaXMuY2xhc3NSZWZlcmVuY2UoKSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9IGVsc2UgaWYgKFwiUFJPVE9UWVBFXCIgPT09IHRoaXMuaW5qZWN0aW9uVHlwZSkge1xyXG4gICAgICAgICAgICAvLyBOZXcgaW5zdGFuY2UgZXZlcnkgdGltZVxyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHRocm93IFwiVW5rbm93biBpbmplY3Rpb25UeXBlIFwiICsgdGhpcy5pbmplY3Rpb25UeXBlO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBnZXRDbGFzc1JlZmVyZW5jZSgpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5jbGFzc1JlZmVyZW5jZTtcclxuICAgIH1cclxuXHJcbiAgICBnZXRJbmplY3Rpb25UeXBlKCkge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmluamVjdGlvblR5cGU7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBAcmV0dXJucyB7TGlzdH0gdGhlIGxpc3Qgb2Ygc3RvcmVkIGluc3RhbmNlc1xyXG4gICAgICovXHJcbiAgICBnZXRTdG9yZWRJbnN0YW5jZXMoKSB7XHJcbiAgICAgICAgaWYodGhpcy5zdG9yZWRJbnN0YW5jZXMgPT09IG51bGwpIHtcclxuICAgICAgICAgICAgdGhyb3cgXCJDb25maWcgZW50cnkgaGFzIG5vdCBiZWVuIGluc3RhbnNpYXRlZDogXCIgKyB0aGlzLmNsYXNzUmVmZXJlbmNlLm5hbWU7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiB0aGlzLnN0b3JlZEluc3RhbmNlcztcclxuICAgIH1cclxuXHJcbiAgICBnZXRJbnN0YW5jZSgpIHtcclxuICAgICAgICBpZih0aGlzLnN0b3JlZEluc3RhbmNlcyA9PT0gbnVsbCkge1xyXG4gICAgICAgICAgICB0aHJvdyBcIkNvbmZpZyBlbnRyeSBoYXMgbm90IGJlZW4gaW5zdGFuc2lhdGVkOiBcIiArIHRoaXMuY2xhc3NSZWZlcmVuY2UubmFtZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIENyZWF0ZSBhIG5ldyBpbnN0YW5jZSBlYWNoIHRpbWUgZm9yIHByb3RvdHlwZXNcclxuICAgICAgICBpZihcIlBST1RPVFlQRVwiID09PSB0aGlzLmluamVjdGlvblR5cGUpIHtcclxuICAgICAgICAgICAgcmV0dXJuIG5ldyB0aGlzLmNsYXNzUmVmZXJlbmNlKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBHZXQgdGhlIGluc3RhbmNlIGZyb20gdGhlIG5leHQgcG9zaXRpb24gaW4gdGhlIHBvb2xcclxuICAgICAgICB2YXIgaW5zdGFuY2UgPSB0aGlzLnN0b3JlZEluc3RhbmNlcy5nZXQodGhpcy5pbnN0YW5jZVBvaW50ZXIpO1xyXG4gICAgICAgIHRoaXMuaW5zdGFuY2VQb2ludGVyICsrO1xyXG4gICAgICAgIGlmKHRoaXMuaW5zdGFuY2VQb2ludGVyID09PSB0aGlzLnN0b3JlZEluc3RhbmNlcy5zaXplKCkpIHtcclxuICAgICAgICAgICAgdGhpcy5pbnN0YW5jZVBvaW50ZXIgPSAwO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gaW5zdGFuY2U7XHJcbiAgICB9XHJcblxyXG5cclxufSIsImltcG9ydCB7TWFwLCBMaXN0fSBmcm9tIFwiY29yZXV0aWxfdjFcIjtcclxuaW1wb3J0IHtDb25maWdFbnRyeX0gZnJvbSBcIi4vY29uZmlnRW50cnkuanNcIlxyXG5cclxuZXhwb3J0IGNsYXNzIENvbmZpZyB7XHJcblxyXG4gICAgY29uc3RydWN0b3IoKSB7XHJcbiAgICAgICAgdGhpcy5jb25maWdFbGVtZW50cyA9IG5ldyBNYXAoKTtcclxuICAgICAgICB0aGlzLnBvc3RDb25maWdzID0gbmV3IExpc3QoKTtcclxuICAgIH1cclxuXHJcbiAgICBhZGRBbGwoY29uZmlnKSB7XHJcbiAgICAgICAgdGhpcy5jb25maWdFbGVtZW50cy5hZGRBbGwoY29uZmlnLmdldENvbmZpZ0VsZW1lbnRzKCkpO1xyXG4gICAgICAgIHRoaXMucG9zdENvbmZpZ3MuYWRkQWxsKGNvbmZpZy5nZXRQb3N0Q29uZmlncygpKTtcclxuICAgIH1cclxuXHJcbiAgICBhZGRTaW5nbGV0b24oY2xhc3NOYW1lKSB7XHJcbiAgICAgICAgdGhpcy5jb25maWdFbGVtZW50cy5zZXQoY2xhc3NOYW1lLm5hbWUsbmV3IENvbmZpZ0VudHJ5KGNsYXNzTmFtZSxcIlNJTkdMRVRPTlwiKSk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9XHJcblxyXG4gICAgYWRkUHJvdG90eXBlKGNsYXNzTmFtZSkge1xyXG4gICAgICAgIHRoaXMuY29uZmlnRWxlbWVudHMuc2V0KGNsYXNzTmFtZS5uYW1lLG5ldyBDb25maWdFbnRyeShjbGFzc05hbWUsXCJQUk9UT1RZUEVcIikpO1xyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfVxyXG5cclxuICAgIGFkZE5hbWVkU2luZ2xldG9uKG5hbWUsY2xhc3NOYW1lKSB7XHJcbiAgICAgICAgdGhpcy5jb25maWdFbGVtZW50cy5zZXQobmFtZSxuZXcgQ29uZmlnRW50cnkoY2xhc3NOYW1lLFwiU0lOR0xFVE9OXCIpKTtcclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH1cclxuXHJcbiAgICBhZGROYW1lZFByb3RvdHlwZShuYW1lLGNsYXNzTmFtZSkge1xyXG4gICAgICAgIHRoaXMuY29uZmlnRWxlbWVudHMuc2V0KG5hbWUsbmV3IENvbmZpZ0VudHJ5KGNsYXNzTmFtZSxcIlBST1RPVFlQRVwiKSk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9XHJcblxyXG4gICAgZ2V0Q29uZmlnRWxlbWVudHMoKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuY29uZmlnRWxlbWVudHM7XHJcbiAgICB9XHJcblxyXG4gICAgZ2V0UG9zdENvbmZpZ3MoKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMucG9zdENvbmZpZ3M7XHJcbiAgICB9XHJcblxyXG4gICAgYWRkUG9zdENvbmZpZyhwb3N0Q29uZmlnKSB7XHJcbiAgICAgICAgdGhpcy5wb3N0Q29uZmlncy5hZGQocG9zdENvbmZpZyk7XHJcbiAgICB9XHJcblxyXG59IiwiaW1wb3J0IHsgQ29uZmlnIH0gZnJvbSBcIi4vY29uZmlnLmpzXCI7XHJcbmltcG9ydCB7IExpc3QsIExvZ2dlciB9IGZyb20gXCJjb3JldXRpbF92MVwiO1xyXG5pbXBvcnQgeyBDb25maWdFbnRyeSB9IGZyb20gXCIuL2NvbmZpZ0VudHJ5LmpzXCI7XHJcblxyXG5jb25zdCBMT0cgPSBuZXcgTG9nZ2VyKFwiSW5qZWN0b3JcIik7XHJcblxyXG5leHBvcnQgY2xhc3MgSW5qZWN0b3Ige1xyXG5cclxuICAgIHN0YXRpYyBnZXRJbnN0YW5jZSgpIHtcclxuICAgICAgICByZXR1cm4gaW5qZWN0b3I7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3RydWN0b3IoKSB7XHJcbiAgICAgICAgdGhpcy5jb25maWcgPSBuZXcgQ29uZmlnKCk7XHJcbiAgICAgICAgdGhpcy5wb3N0SW5qZWN0UHJvbWlzZXMgPSBuZXcgTGlzdCgpO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogXHJcbiAgICAgKiBAcGFyYW0ge0NvbmZpZ30gY29uZmlnIFxyXG4gICAgICovXHJcbiAgICBsb2FkKGNvbmZpZykge1xyXG4gICAgICAgIHRoaXMuaW5zdGFuc2lhdGVBbGwoY29uZmlnKTtcclxuICAgICAgICB0aGlzLmNvbmZpZy5hZGRBbGwoY29uZmlnKTtcclxuICAgICAgICB0aGlzLnBlcmZvcm1JbmplY3Rpb25zKGNvbmZpZyk7XHJcbiAgICAgICAgbGV0IHByb21pc2VMaXN0ID0gdGhpcy5leGVjdXRlUG9zdENvbmZpZyhjb25maWcsIHRoaXMuY29uZmlnLmdldFBvc3RDb25maWdzKCkpO1xyXG4gICAgICAgIHRoaXMucG9zdEluamVjdFByb21pc2VzLmFkZEFsbChwcm9taXNlTGlzdCk7XHJcbiAgICB9XHJcblxyXG4gICAgaW5qZWN0KG9iamVjdCkge1xyXG4gICAgICAgIHRoaXMuaW5qZWN0RmllbGRzKG9iamVjdCwgMCk7XHJcbiAgICAgICAgcmV0dXJuIG9iamVjdDtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIFxyXG4gICAgICogQHBhcmFtIHtjbGFzc30gY2xhc3NOYW1lIFxyXG4gICAgICogQHBhcmFtIHthcnJheX0gcGFyYW1ldGVyQXJyYXkgXHJcbiAgICAgKi9cclxuICAgIHByb3RvdHlwZUluc3RhbmNlKGNsYXNzTmFtZSwgcGFyYW1ldGVyQXJyYXkpIHtcclxuICAgICAgICAvKiogQHR5cGUge0NvbmZpZ0VudHJ5fSAqL1xyXG4gICAgICAgIGxldCBjbGFzc05hbWVTdHJpbmcgPSBjbGFzc05hbWUubmFtZTtcclxuICAgICAgICBsZXQgY29uZmlnID0gdGhpcy5jb25maWcuZ2V0Q29uZmlnRWxlbWVudHMoKS5nZXQoY2xhc3NOYW1lU3RyaW5nKTtcclxuICAgICAgICBpZighY29uZmlnKSB7XHJcbiAgICAgICAgICAgIExPRy5lcnJvcihcIk5vIGNvbmZpZyBmb3VuZCBmb3IgY2xhc3M6IFwiICsgY2xhc3NOYW1lU3RyaW5nKTtcclxuICAgICAgICAgICAgdGhyb3cgXCJObyBjb25maWcgZm91bmQgZm9yIGNsYXNzOiBcIiArIGNsYXNzTmFtZVN0cmluZztcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYoISBcIlBST1RPVFlQRVwiID09PSBjb25maWcuZ2V0SW5qZWN0aW9uVHlwZSgpKSB7XHJcbiAgICAgICAgICAgIExPRy5lcnJvcihcIkNvbmZpZyBmb3IgY2xhc3M6IFwiICsgY2xhc3NOYW1lU3RyaW5nICsgXCIgaXMgbm90IGEgcHJvdG90eXBlXCIpO1xyXG4gICAgICAgICAgICB0aHJvdyBcIkNvbmZpZyBmb3IgY2xhc3M6IFwiICsgY2xhc3NOYW1lU3RyaW5nICsgXCIgaXMgbm90IGEgcHJvdG90eXBlXCI7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiB0aGlzLmdldEluc3RhbmNlQnlDbGFzc1JlZmVyZW5jZShjbGFzc05hbWVTdHJpbmcsIDAsIHBhcmFtZXRlckFycmF5KTtcclxuICAgIH1cclxuXHJcbiAgICByZXNvbHZlUG9zdENvbmZpZ3Mob2JqZWN0LCBzdWNjZXNzRnVuY3Rpb24sIGZhaWxGdW5jdGlvbikge1xyXG4gICAgICAgIGxldCBjdXJyZW50UHJvbWlzZXMgPSB0aGlzLnBvc3RJbmplY3RQcm9taXNlcztcclxuICAgICAgICB0aGlzLnBvc3RJbmplY3RQcm9taXNlcyA9IG5ldyBMaXN0KCk7XHJcbiAgICAgICAgUHJvbWlzZS5hbGwoY3VycmVudFByb21pc2VzLmdldEFycmF5KCkpXHJcbiAgICAgICAgLnRoZW4oKHN1Y2Nlc3MpID0+IHtcclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIHN1Y2Nlc3NGdW5jdGlvbi5jYWxsKG9iamVjdCxzdWNjZXNzKTtcclxuICAgICAgICAgICAgfSBjYXRjaChlKSB7XHJcbiAgICAgICAgICAgICAgICBMT0cuZXJyb3IoZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KS5jYXRjaCgoZmFpbCkgPT4ge1xyXG4gICAgICAgICAgICBmYWlsRnVuY3Rpb24uY2FsbChvYmplY3QsZmFpbCk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBcclxuICAgICAqIEBwYXJhbSB7Q29uZmlnfSBjb25maWcgXHJcbiAgICAgKiBAcGFyYW0ge0xpc3R9IHBvc3RDb25maWdzXHJcbiAgICAgKiBAcmV0dXJucyB7TGlzdH1cclxuICAgICAqL1xyXG4gICAgZXhlY3V0ZVBvc3RDb25maWcoY29uZmlnLCBwb3N0Q29uZmlncykge1xyXG4gICAgICAgIGxldCBwcm9taXNlTGlzdCA9IG5ldyBMaXN0KCk7XHJcbiAgICAgICAgcG9zdENvbmZpZ3MuZm9yRWFjaCgoZW50cnksIHBhcmVudCkgPT4ge1xyXG4gICAgICAgICAgICBsZXQgcG9zdEluamVjdFByb21pc2UgPSBlbnRyeS5wb3N0Q29uZmlnKGNvbmZpZyk7XHJcbiAgICAgICAgICAgIGlmKHBvc3RJbmplY3RQcm9taXNlKSB7XHJcbiAgICAgICAgICAgICAgICBwcm9taXNlTGlzdC5hZGQocG9zdEluamVjdFByb21pc2UpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgIH0sIHRoaXMpO1xyXG4gICAgICAgIHJldHVybiBwcm9taXNlTGlzdDtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIFxyXG4gICAgICogQHBhcmFtIHtDb25maWd9IGNvbmZpZyBcclxuICAgICAqL1xyXG4gICAgaW5zdGFuc2lhdGVBbGwoY29uZmlnKSB7XHJcbiAgICAgICAgY29uZmlnLmdldENvbmZpZ0VsZW1lbnRzKCkuZm9yRWFjaCgoa2V5LCB2YWx1ZSwgcGFyZW50KSA9PiB7XHJcbiAgICAgICAgICAgIHZhbHVlLmluc3RhbnNpYXRlKCk7XHJcbiAgICAgICAgICAgIGlmKHZhbHVlLmdldEluc3RhbmNlKCkgJiYgKHZhbHVlLmdldEluc3RhbmNlKCkucG9zdENvbmZpZykpIHtcclxuICAgICAgICAgICAgICAgIGNvbmZpZy5hZGRQb3N0Q29uZmlnKHZhbHVlLmdldEluc3RhbmNlKCkpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgIH0sIHRoaXMpO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogXHJcbiAgICAgKiBAcGFyYW0ge0NvbmZpZ30gY29uZmlnIFxyXG4gICAgICovXHJcbiAgICBwZXJmb3JtSW5qZWN0aW9ucyhjb25maWcpIHtcclxuICAgICAgICBjb25maWcuZ2V0Q29uZmlnRWxlbWVudHMoKS5mb3JFYWNoKChrZXksIHZhbHVlLCBwYXJlbnQpID0+IHtcclxuICAgICAgICAgICAgdmFsdWUuZ2V0U3RvcmVkSW5zdGFuY2VzKCkuZm9yRWFjaCgoaW5zdGFuY2VFbnRyeSwgaW5uZXJQYXJlbnQpID0+IHtcclxuICAgICAgICAgICAgICAgIHRoaXMuaW5qZWN0RmllbGRzKGluc3RhbmNlRW50cnksIDApO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgIH0sIHBhcmVudCk7XHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgIH0sIHRoaXMpO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogXHJcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gaW5zdGFuY2VFbnRyeSBcclxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBzdHJ1Y3R1cmVEZXB0aCBcclxuICAgICAqL1xyXG4gICAgaW5qZWN0RmllbGRzKGluc3RhbmNlRW50cnksIHN0cnVjdHVyZURlcHRoKSB7XHJcbiAgICAgICAgXHJcbiAgICAgICAgZm9yICh2YXIgZmllbGQgaW4gaW5zdGFuY2VFbnRyeSkge1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgaWYgKGZpZWxkICE9PSB1bmRlZmluZWQgJiYgZmllbGQgIT09IG51bGwgJiYgaW5zdGFuY2VFbnRyeVtmaWVsZF0gIT0gbnVsbCAmJiBpbnN0YW5jZUVudHJ5W2ZpZWxkXS5wcm90b3R5cGUgaW5zdGFuY2VvZiBPYmplY3QpIHtcclxuICAgICAgICAgICAgICAgIHZhciBpbnN0YW5jZSA9IHRoaXMuZ2V0SW5zdGFuY2VCeUNsYXNzUmVmZXJlbmNlKGluc3RhbmNlRW50cnlbZmllbGRdLm5hbWUsIHN0cnVjdHVyZURlcHRoKTtcclxuICAgICAgICAgICAgICAgIGlmIChpbnN0YW5jZSAhPT0gdW5kZWZpbmVkICYmIGluc3RhbmNlICE9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaW5zdGFuY2VFbnRyeVtmaWVsZF0gPSBpbnN0YW5jZTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoaW5zdGFuY2UgPT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIExPRy5lcnJvcihcIk5vIGluc3RhbmNlIGZvdW5kIHdoZW4gdHJ5aW5nIHRvIGluamVjdCBmaWVsZCAnXCIgKyBmaWVsZCArIFwiJyBpbiAnXCIgKyBpbnN0YW5jZUVudHJ5LmNvbnN0cnVjdG9yLm5hbWUgKyBcIidcIik7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGluc3RhbmNlRW50cnk7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBcclxuICAgICAqIEBwYXJhbSB7Y2xhc3N9IGNsYXNzUmVmZXJlbmNlIFxyXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHN0cnVjdHVyZURlcHRoIFxyXG4gICAgICogQHBhcmFtIHthcnJheX0gcGFyYW1ldGVycyBcclxuICAgICAqL1xyXG4gICAgZ2V0SW5zdGFuY2VCeUNsYXNzUmVmZXJlbmNlKGNsYXNzTmFtZVN0cmluZywgc3RydWN0dXJlRGVwdGgsIHBhcmFtZXRlcnMgPSBbXSkge1xyXG4gICAgICAgIGxldCBpbnN0YW5jZSA9IG51bGw7XHJcbiAgICAgICAgaWYoSW5qZWN0b3IubmFtZSA9PT0gY2xhc3NOYW1lU3RyaW5nKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLmNvbmZpZy5nZXRDb25maWdFbGVtZW50cygpLmZvckVhY2goKGtleSwgdmFsdWUsIHBhcmVudCkgPT4ge1xyXG4gICAgICAgICAgICBpZihrZXkgPT09IGNsYXNzTmFtZVN0cmluZykge1xyXG4gICAgICAgICAgICAgICAgaWYgKFwiUFJPVE9UWVBFXCIgPT09IHZhbHVlLmdldEluamVjdGlvblR5cGUoKSl7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHN0cnVjdHVyZURlcHRoIDwgMykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgY2xhc3NSZWZlcmVuY2UgPSB2YWx1ZS5nZXRDbGFzc1JlZmVyZW5jZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpbnN0YW5jZSA9IHRoaXMuaW5qZWN0RmllbGRzKG5ldyBjbGFzc1JlZmVyZW5jZSguLi5wYXJhbWV0ZXJzKSwgc3RydWN0dXJlRGVwdGgrKyk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgXCJTdHJ1Y3R1cmUgb2YgbWFuYWdlZCBvYmplY3RzIGlzIHRvbyBkZWVwIHdoZW4gdHJ5aW5nIHRvIGluamVjdCBcIiArIGNsYXNzTmFtZVN0cmluZztcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKFwiU0lOR0xFVE9OXCIgPT09IHZhbHVlLmdldEluamVjdGlvblR5cGUoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGluc3RhbmNlID0gdmFsdWUuZ2V0SW5zdGFuY2UoKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgTE9HLmVycm9yKFwiSW5qZWN0aW9uIHR5cGUgXCIgKyB2YWx1ZS5nZXRJbmplY3Rpb25UeXBlKCkgKyBcIiBub3Qgc3VwcG9ydGVkIGZvciBcIiArIGNsYXNzTmFtZVN0cmluZyk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcblxyXG4gICAgICAgIH0sIHRoaXMpO1xyXG4gICAgICAgIGlmKCFpbnN0YW5jZSkge1xyXG4gICAgICAgICAgICBMT0cuZXJyb3IoXCJObyBvYmplY3QgZm91bmQgZm9yIFwiICsgY2xhc3NOYW1lU3RyaW5nKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGluc3RhbmNlO1xyXG4gICAgfVxyXG5cclxufVxyXG5cclxuY29uc3QgaW5qZWN0b3IgPSBuZXcgSW5qZWN0b3IoKTsiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFFTyxNQUFNLFdBQVcsQ0FB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
