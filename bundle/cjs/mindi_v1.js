'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var coreutil_v1 = require('coreutil_v1');

class ConfigEntry {

    constructor(classReference, injectionType, poolSize) {
        this._classReference = classReference;
        this._injectionType = injectionType;
        this._poolSize = poolSize;
        this._storedInstances = null;
        this._instancePointer = 0;
    }

    instansiate() {
        this._instancePointer = 0;
        this._storedInstances = new coreutil_v1.List();
        if("SINGLETON" === this._injectionType) {
            this._storedInstances.add(new this._classReference());
        }else if("POOL" === this._injectionType) {
            for(i = 0 ; i < this._poolSize ; i++) {
                this._storedInstances.add(new this._classReference());
            }
        }else if("PROTOTYPE" === this._injectionType) {
            // New instance every time
        }else {
            throw "Unknown injectionType " + this._injectionType;
        }
    }

    getClassReference() {
        return this._classReference;
    }

    getInjectionType() {
        return this._injectionType;
    }

    /**
     * @returns {List} the list of stored instances
     */
    getStoredInstances() {
        if(this._storedInstances === null) {
            throw "Config entry has not been instansiated: " + this._classReference.name;
        }
        return this._storedInstances;
    }

    getInstance() {
        if(this._storedInstances === null) {
            throw "Config entry has not been instansiated: " + this._classReference.name;
        }

        // Create a new instance each time for prototypes
        if("PROTOTYPE" === this._injectionType) {
            return new this._classReference();
        }

        // Get the instance from the next position in the pool
        var instance = this._storedInstances.get(this._instancePointer);
        this._instancePointer ++;
        if(this._instancePointer === this._storedInstances.size()) {
            this._instancePointer = 0;
        }
        return instance;
    }


}

class Config {

    constructor() {
        this._configElements = new coreutil_v1.Map(); 
    }

    addAll(config) {
        this._configElements.addAll(config.getConfigElements());
    }

    addSingleton(className) {
        this._configElements.set(className,new ConfigEntry(className,"SINGLETON"));
        return this;
    }

    addPrototype(className) {
        this._configElements.set(className,new ConfigEntry(className,"PROTOTYPE"));
        return this;
    }

    addNamedSingleton(name,className) {
        this._configElements.set(name,new ConfigEntry(className,"SINGLETON"));
        return this;
    }

    addNamedPrototype(name,className) {
        this._configElements.set(name,new ConfigEntry(className,"PROTOTYPE"));
        return this;
    }

    getConfigElements() {
        return this._configElements;
    }

}

class Injector {

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
        this._config.getConfigElements().forEach((key,value,parent) => {
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

exports.Config = Config;
exports.ConfigEntry = ConfigEntry;
exports.Injector = Injector;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWluZGlfdjEuanMiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9taW5kaS9jb25maWdFbnRyeS5qcyIsIi4uLy4uL3NyYy9taW5kaS9jb25maWcuanMiLCIuLi8uLi9zcmMvbWluZGkvaW5qZWN0b3IuanMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTGlzdCB9IGZyb20gXCJjb3JldXRpbF92MVwiO1xyXG5cclxuZXhwb3J0IGNsYXNzIENvbmZpZ0VudHJ5IHtcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihjbGFzc1JlZmVyZW5jZSwgaW5qZWN0aW9uVHlwZSwgcG9vbFNpemUpIHtcclxuICAgICAgICB0aGlzLl9jbGFzc1JlZmVyZW5jZSA9IGNsYXNzUmVmZXJlbmNlO1xyXG4gICAgICAgIHRoaXMuX2luamVjdGlvblR5cGUgPSBpbmplY3Rpb25UeXBlO1xyXG4gICAgICAgIHRoaXMuX3Bvb2xTaXplID0gcG9vbFNpemU7XHJcbiAgICAgICAgdGhpcy5fc3RvcmVkSW5zdGFuY2VzID0gbnVsbDtcclxuICAgICAgICB0aGlzLl9pbnN0YW5jZVBvaW50ZXIgPSAwO1xyXG4gICAgfVxyXG5cclxuICAgIGluc3RhbnNpYXRlKCkge1xyXG4gICAgICAgIHRoaXMuX2luc3RhbmNlUG9pbnRlciA9IDA7XHJcbiAgICAgICAgdGhpcy5fc3RvcmVkSW5zdGFuY2VzID0gbmV3IExpc3QoKTtcclxuICAgICAgICBpZihcIlNJTkdMRVRPTlwiID09PSB0aGlzLl9pbmplY3Rpb25UeXBlKSB7XHJcbiAgICAgICAgICAgIHRoaXMuX3N0b3JlZEluc3RhbmNlcy5hZGQobmV3IHRoaXMuX2NsYXNzUmVmZXJlbmNlKCkpO1xyXG4gICAgICAgIH1lbHNlIGlmKFwiUE9PTFwiID09PSB0aGlzLl9pbmplY3Rpb25UeXBlKSB7XHJcbiAgICAgICAgICAgIGZvcihpID0gMCA7IGkgPCB0aGlzLl9wb29sU2l6ZSA7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5fc3RvcmVkSW5zdGFuY2VzLmFkZChuZXcgdGhpcy5fY2xhc3NSZWZlcmVuY2UoKSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9ZWxzZSBpZihcIlBST1RPVFlQRVwiID09PSB0aGlzLl9pbmplY3Rpb25UeXBlKSB7XHJcbiAgICAgICAgICAgIC8vIE5ldyBpbnN0YW5jZSBldmVyeSB0aW1lXHJcbiAgICAgICAgfWVsc2Uge1xyXG4gICAgICAgICAgICB0aHJvdyBcIlVua25vd24gaW5qZWN0aW9uVHlwZSBcIiArIHRoaXMuX2luamVjdGlvblR5cGU7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGdldENsYXNzUmVmZXJlbmNlKCkge1xyXG4gICAgICAgIHJldHVybiB0aGlzLl9jbGFzc1JlZmVyZW5jZTtcclxuICAgIH1cclxuXHJcbiAgICBnZXRJbmplY3Rpb25UeXBlKCkge1xyXG4gICAgICAgIHJldHVybiB0aGlzLl9pbmplY3Rpb25UeXBlO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQHJldHVybnMge0xpc3R9IHRoZSBsaXN0IG9mIHN0b3JlZCBpbnN0YW5jZXNcclxuICAgICAqL1xyXG4gICAgZ2V0U3RvcmVkSW5zdGFuY2VzKCkge1xyXG4gICAgICAgIGlmKHRoaXMuX3N0b3JlZEluc3RhbmNlcyA9PT0gbnVsbCkge1xyXG4gICAgICAgICAgICB0aHJvdyBcIkNvbmZpZyBlbnRyeSBoYXMgbm90IGJlZW4gaW5zdGFuc2lhdGVkOiBcIiArIHRoaXMuX2NsYXNzUmVmZXJlbmNlLm5hbWU7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiB0aGlzLl9zdG9yZWRJbnN0YW5jZXM7XHJcbiAgICB9XHJcblxyXG4gICAgZ2V0SW5zdGFuY2UoKSB7XHJcbiAgICAgICAgaWYodGhpcy5fc3RvcmVkSW5zdGFuY2VzID09PSBudWxsKSB7XHJcbiAgICAgICAgICAgIHRocm93IFwiQ29uZmlnIGVudHJ5IGhhcyBub3QgYmVlbiBpbnN0YW5zaWF0ZWQ6IFwiICsgdGhpcy5fY2xhc3NSZWZlcmVuY2UubmFtZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIENyZWF0ZSBhIG5ldyBpbnN0YW5jZSBlYWNoIHRpbWUgZm9yIHByb3RvdHlwZXNcclxuICAgICAgICBpZihcIlBST1RPVFlQRVwiID09PSB0aGlzLl9pbmplY3Rpb25UeXBlKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBuZXcgdGhpcy5fY2xhc3NSZWZlcmVuY2UoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIEdldCB0aGUgaW5zdGFuY2UgZnJvbSB0aGUgbmV4dCBwb3NpdGlvbiBpbiB0aGUgcG9vbFxyXG4gICAgICAgIHZhciBpbnN0YW5jZSA9IHRoaXMuX3N0b3JlZEluc3RhbmNlcy5nZXQodGhpcy5faW5zdGFuY2VQb2ludGVyKTtcclxuICAgICAgICB0aGlzLl9pbnN0YW5jZVBvaW50ZXIgKys7XHJcbiAgICAgICAgaWYodGhpcy5faW5zdGFuY2VQb2ludGVyID09PSB0aGlzLl9zdG9yZWRJbnN0YW5jZXMuc2l6ZSgpKSB7XHJcbiAgICAgICAgICAgIHRoaXMuX2luc3RhbmNlUG9pbnRlciA9IDA7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBpbnN0YW5jZTtcclxuICAgIH1cclxuXHJcblxyXG59IiwiaW1wb3J0IHtNYXB9IGZyb20gXCJjb3JldXRpbF92MVwiO1xyXG5pbXBvcnQge0NvbmZpZ0VudHJ5fSBmcm9tIFwiLi9jb25maWdFbnRyeS5qc1wiXHJcblxyXG5leHBvcnQgY2xhc3MgQ29uZmlnIHtcclxuXHJcbiAgICBjb25zdHJ1Y3RvcigpIHtcclxuICAgICAgICB0aGlzLl9jb25maWdFbGVtZW50cyA9IG5ldyBNYXAoKTsgXHJcbiAgICB9XHJcblxyXG4gICAgYWRkQWxsKGNvbmZpZykge1xyXG4gICAgICAgIHRoaXMuX2NvbmZpZ0VsZW1lbnRzLmFkZEFsbChjb25maWcuZ2V0Q29uZmlnRWxlbWVudHMoKSk7XHJcbiAgICB9XHJcblxyXG4gICAgYWRkU2luZ2xldG9uKGNsYXNzTmFtZSkge1xyXG4gICAgICAgIHRoaXMuX2NvbmZpZ0VsZW1lbnRzLnNldChjbGFzc05hbWUsbmV3IENvbmZpZ0VudHJ5KGNsYXNzTmFtZSxcIlNJTkdMRVRPTlwiKSk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9XHJcblxyXG4gICAgYWRkUHJvdG90eXBlKGNsYXNzTmFtZSkge1xyXG4gICAgICAgIHRoaXMuX2NvbmZpZ0VsZW1lbnRzLnNldChjbGFzc05hbWUsbmV3IENvbmZpZ0VudHJ5KGNsYXNzTmFtZSxcIlBST1RPVFlQRVwiKSk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9XHJcblxyXG4gICAgYWRkTmFtZWRTaW5nbGV0b24obmFtZSxjbGFzc05hbWUpIHtcclxuICAgICAgICB0aGlzLl9jb25maWdFbGVtZW50cy5zZXQobmFtZSxuZXcgQ29uZmlnRW50cnkoY2xhc3NOYW1lLFwiU0lOR0xFVE9OXCIpKTtcclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH1cclxuXHJcbiAgICBhZGROYW1lZFByb3RvdHlwZShuYW1lLGNsYXNzTmFtZSkge1xyXG4gICAgICAgIHRoaXMuX2NvbmZpZ0VsZW1lbnRzLnNldChuYW1lLG5ldyBDb25maWdFbnRyeShjbGFzc05hbWUsXCJQUk9UT1RZUEVcIikpO1xyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfVxyXG5cclxuICAgIGdldENvbmZpZ0VsZW1lbnRzKCkge1xyXG4gICAgICAgIHJldHVybiB0aGlzLl9jb25maWdFbGVtZW50cztcclxuICAgIH1cclxuXHJcbn0iLCJpbXBvcnQgeyBDb25maWcgfSBmcm9tIFwiLi9jb25maWcuanNcIjtcclxuZXhwb3J0IGNsYXNzIEluamVjdG9yIHtcclxuXHJcbiAgICBzdGF0aWMgZ2V0SW5zdGFuY2UoKSB7XHJcbiAgICAgICAgaWYoaW5qZWN0b3IgPT09IG51bGwpIHtcclxuICAgICAgICAgICAgaW5qZWN0b3IgPSBuZXcgSW5qZWN0b3IoKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGluamVjdG9yO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogXHJcbiAgICAgKiBAcGFyYW0ge0NvbmZpZ30gY29uZmlnIFxyXG4gICAgICovXHJcbiAgICBjb25zdHJ1Y3RvcigpIHtcclxuICAgICAgICB0aGlzLl9jb25maWcgPSBuZXcgQ29uZmlnKCk7XHJcbiAgICB9XHJcblxyXG4gICAgbG9hZChjb25maWcpIHtcclxuICAgICAgICB0aGlzLmluc3RhbnNpYXRlQWxsKGNvbmZpZyk7XHJcbiAgICAgICAgdGhpcy5fY29uZmlnLmFkZEFsbChjb25maWcpO1xyXG4gICAgICAgIHRoaXMucGVyZm9ybUluamVjdGlvbnMoY29uZmlnKTtcclxuICAgIH1cclxuXHJcbiAgICBpbmplY3Qob2JqZWN0KSB7XHJcbiAgICAgICAgdGhpcy5pbmplY3RGaWVsZHMob2JqZWN0LDApO1xyXG4gICAgICAgIHJldHVybiBvYmplY3Q7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBcclxuICAgICAqIEBwYXJhbSB7Q29uZmlnfSBjb25maWcgXHJcbiAgICAgKi9cclxuICAgIGluc3RhbnNpYXRlQWxsKGNvbmZpZykge1xyXG4gICAgICAgIGNvbmZpZy5nZXRDb25maWdFbGVtZW50cygpLmZvckVhY2goKGtleSx2YWx1ZSxwYXJlbnQpID0+IHtcclxuICAgICAgICAgICAgdmFsdWUuaW5zdGFuc2lhdGUoKTtcclxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgfSx0aGlzKTtcclxuICAgIH1cclxuXHJcbiAgICBwZXJmb3JtSW5qZWN0aW9ucyhjb25maWcpIHtcclxuICAgICAgICBjb25maWcuZ2V0Q29uZmlnRWxlbWVudHMoKS5mb3JFYWNoKChrZXksdmFsdWUscGFyZW50KSA9PiB7XHJcbiAgICAgICAgICAgIHZhbHVlLmdldFN0b3JlZEluc3RhbmNlcygpLmZvckVhY2goKGluc3RhbmNlRW50cnksaW5uZXJQYXJlbnQpID0+IHtcclxuICAgICAgICAgICAgICAgIHRoaXMuaW5qZWN0RmllbGRzKGluc3RhbmNlRW50cnksMCk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICAgICAgfSxwYXJlbnQpO1xyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICB9LHRoaXMpO1xyXG4gICAgfVxyXG5cclxuICAgIGluamVjdEZpZWxkcyhpbnN0YW5jZUVudHJ5LHN0cnVjdHVyZURlcHRoKSB7XHJcbiAgICAgICAgXHJcbiAgICAgICAgZm9yKHZhciBmaWVsZCBpbiBpbnN0YW5jZUVudHJ5KSB7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBpZihmaWVsZCAhPT0gdW5kZWZpbmVkICYmIGZpZWxkICE9PSBudWxsICYmIGluc3RhbmNlRW50cnlbZmllbGRdICE9IG51bGwgJiYgaW5zdGFuY2VFbnRyeVtmaWVsZF0ucHJvdG90eXBlIGluc3RhbmNlb2YgT2JqZWN0KSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgaW5zdGFuY2UgPSB0aGlzLmdldEluc3RhbmNlQnlDbGFzc1JlZmVyZW5jZShpbnN0YW5jZUVudHJ5W2ZpZWxkXSxzdHJ1Y3R1cmVEZXB0aCk7XHJcbiAgICAgICAgICAgICAgICBpZihpbnN0YW5jZSAhPT0gdW5kZWZpbmVkICYmIGluc3RhbmNlICE9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaW5zdGFuY2VFbnRyeVtmaWVsZF0gPSBpbnN0YW5jZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBnZXRJbnN0YW5jZUJ5Q2xhc3NSZWZlcmVuY2UoY2xhc3NSZWZlcmVuY2Usc3RydWN0dXJlRGVwdGgpIHtcclxuICAgICAgICB2YXIgaW5zdGFuY2UgPSBudWxsO1xyXG4gICAgICAgIGlmKEluamVjdG9yID09IGNsYXNzUmVmZXJlbmNlKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLl9jb25maWcuZ2V0Q29uZmlnRWxlbWVudHMoKS5mb3JFYWNoKChrZXksdmFsdWUscGFyZW50KSA9PiB7XHJcbiAgICAgICAgICAgIGlmKHZhbHVlLmdldENsYXNzUmVmZXJlbmNlKCkgPT0gY2xhc3NSZWZlcmVuY2UpIHtcclxuICAgICAgICAgICAgICAgIGlmKFwiUFJPVE9UWVBFXCIgPT09IHZhbHVlLmdldEluamVjdGlvblR5cGUoKSl7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYoc3RydWN0dXJlRGVwdGggPCAzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmluamVjdEZpZWxkcyhuZXcgY2xhc3NSZWZlcmVuY2UoKSxzdHJ1Y3R1cmVEZXB0aCsrKTtcclxuICAgICAgICAgICAgICAgICAgICB9ZWxzZXtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgXCJTdHJ1Y3R1cmUgb2YgbWFuYWdlZCBvYmplY3RzIGlzIHRvbyBkZWVwIHdoZW4gdHJ5aW5nIHRvIGluamVjdCBcIiArIGNsYXNzUmVmZXJlbmNlLm5hbWU7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICAgICAgICAgICAgaW5zdGFuY2UgPSB2YWx1ZS5nZXRJbnN0YW5jZSgpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG5cclxuICAgICAgICB9LHRoaXMpO1xyXG4gICAgICAgIHJldHVybiBpbnN0YW5jZTtcclxuICAgIH1cclxuXHJcbn1cclxuXHJcbnZhciBpbmplY3RvciA9IG51bGw7Il0sIm5hbWVzIjpbIkxpc3QiLCJNYXAiXSwibWFwcGluZ3MiOiI7Ozs7OztBQUVPLE1BQU0sV0FBVyxDQUFDOztJ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
