'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var coreutil_v1 = require('coreutil_v1');

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
        this.storedInstances = new coreutil_v1.List();
        if("SINGLETON" === this.injectionType) {
            this.storedInstances.add(new this.classReference());
        }else if("POOL" === this.injectionType) {
            for(i = 0 ; i < this.poolSize ; i++) {
                this.storedInstances.add(new this.classReference());
            }
        }else if("PROTOTYPE" === this.injectionType) {
            // New instance every time
        }else {
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
        this.configElements = new coreutil_v1.Map(); 
    }

    addAll(config) {
        this.configElements.addAll(config.getConfigElements());
    }

    addSingleton(className) {
        this.configElements.set(className,new ConfigEntry(className,"SINGLETON"));
        return this;
    }

    addPrototype(className) {
        this.configElements.set(className,new ConfigEntry(className,"PROTOTYPE"));
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

exports.Config = Config;
exports.ConfigEntry = ConfigEntry;
exports.Injector = Injector;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWluZGlfdjEuanMiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9taW5kaS9jb25maWdFbnRyeS5qcyIsIi4uLy4uL3NyYy9taW5kaS9jb25maWcuanMiLCIuLi8uLi9zcmMvbWluZGkvaW5qZWN0b3IuanMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTGlzdCB9IGZyb20gXCJjb3JldXRpbF92MVwiO1xyXG5cclxuZXhwb3J0IGNsYXNzIENvbmZpZ0VudHJ5IHtcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihjbGFzc1JlZmVyZW5jZSwgaW5qZWN0aW9uVHlwZSwgcG9vbFNpemUpIHtcclxuICAgICAgICB0aGlzLmNsYXNzUmVmZXJlbmNlID0gY2xhc3NSZWZlcmVuY2U7XHJcbiAgICAgICAgdGhpcy5pbmplY3Rpb25UeXBlID0gaW5qZWN0aW9uVHlwZTtcclxuICAgICAgICB0aGlzLnBvb2xTaXplID0gcG9vbFNpemU7XHJcbiAgICAgICAgdGhpcy5zdG9yZWRJbnN0YW5jZXMgPSBudWxsO1xyXG4gICAgICAgIHRoaXMuaW5zdGFuY2VQb2ludGVyID0gMDtcclxuICAgIH1cclxuXHJcbiAgICBpbnN0YW5zaWF0ZSgpIHtcclxuICAgICAgICB0aGlzLmluc3RhbmNlUG9pbnRlciA9IDA7XHJcbiAgICAgICAgdGhpcy5zdG9yZWRJbnN0YW5jZXMgPSBuZXcgTGlzdCgpO1xyXG4gICAgICAgIGlmKFwiU0lOR0xFVE9OXCIgPT09IHRoaXMuaW5qZWN0aW9uVHlwZSkge1xyXG4gICAgICAgICAgICB0aGlzLnN0b3JlZEluc3RhbmNlcy5hZGQobmV3IHRoaXMuY2xhc3NSZWZlcmVuY2UoKSk7XHJcbiAgICAgICAgfWVsc2UgaWYoXCJQT09MXCIgPT09IHRoaXMuaW5qZWN0aW9uVHlwZSkge1xyXG4gICAgICAgICAgICBmb3IoaSA9IDAgOyBpIDwgdGhpcy5wb29sU2l6ZSA7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5zdG9yZWRJbnN0YW5jZXMuYWRkKG5ldyB0aGlzLmNsYXNzUmVmZXJlbmNlKCkpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfWVsc2UgaWYoXCJQUk9UT1RZUEVcIiA9PT0gdGhpcy5pbmplY3Rpb25UeXBlKSB7XHJcbiAgICAgICAgICAgIC8vIE5ldyBpbnN0YW5jZSBldmVyeSB0aW1lXHJcbiAgICAgICAgfWVsc2Uge1xyXG4gICAgICAgICAgICB0aHJvdyBcIlVua25vd24gaW5qZWN0aW9uVHlwZSBcIiArIHRoaXMuaW5qZWN0aW9uVHlwZTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZ2V0Q2xhc3NSZWZlcmVuY2UoKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuY2xhc3NSZWZlcmVuY2U7XHJcbiAgICB9XHJcblxyXG4gICAgZ2V0SW5qZWN0aW9uVHlwZSgpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5pbmplY3Rpb25UeXBlO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQHJldHVybnMge0xpc3R9IHRoZSBsaXN0IG9mIHN0b3JlZCBpbnN0YW5jZXNcclxuICAgICAqL1xyXG4gICAgZ2V0U3RvcmVkSW5zdGFuY2VzKCkge1xyXG4gICAgICAgIGlmKHRoaXMuc3RvcmVkSW5zdGFuY2VzID09PSBudWxsKSB7XHJcbiAgICAgICAgICAgIHRocm93IFwiQ29uZmlnIGVudHJ5IGhhcyBub3QgYmVlbiBpbnN0YW5zaWF0ZWQ6IFwiICsgdGhpcy5jbGFzc1JlZmVyZW5jZS5uYW1lO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gdGhpcy5zdG9yZWRJbnN0YW5jZXM7XHJcbiAgICB9XHJcblxyXG4gICAgZ2V0SW5zdGFuY2UoKSB7XHJcbiAgICAgICAgaWYodGhpcy5zdG9yZWRJbnN0YW5jZXMgPT09IG51bGwpIHtcclxuICAgICAgICAgICAgdGhyb3cgXCJDb25maWcgZW50cnkgaGFzIG5vdCBiZWVuIGluc3RhbnNpYXRlZDogXCIgKyB0aGlzLmNsYXNzUmVmZXJlbmNlLm5hbWU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBDcmVhdGUgYSBuZXcgaW5zdGFuY2UgZWFjaCB0aW1lIGZvciBwcm90b3R5cGVzXHJcbiAgICAgICAgaWYoXCJQUk9UT1RZUEVcIiA9PT0gdGhpcy5pbmplY3Rpb25UeXBlKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBuZXcgdGhpcy5jbGFzc1JlZmVyZW5jZSgpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gR2V0IHRoZSBpbnN0YW5jZSBmcm9tIHRoZSBuZXh0IHBvc2l0aW9uIGluIHRoZSBwb29sXHJcbiAgICAgICAgdmFyIGluc3RhbmNlID0gdGhpcy5zdG9yZWRJbnN0YW5jZXMuZ2V0KHRoaXMuaW5zdGFuY2VQb2ludGVyKTtcclxuICAgICAgICB0aGlzLmluc3RhbmNlUG9pbnRlciArKztcclxuICAgICAgICBpZih0aGlzLmluc3RhbmNlUG9pbnRlciA9PT0gdGhpcy5zdG9yZWRJbnN0YW5jZXMuc2l6ZSgpKSB7XHJcbiAgICAgICAgICAgIHRoaXMuaW5zdGFuY2VQb2ludGVyID0gMDtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGluc3RhbmNlO1xyXG4gICAgfVxyXG5cclxuXHJcbn0iLCJpbXBvcnQge01hcH0gZnJvbSBcImNvcmV1dGlsX3YxXCI7XHJcbmltcG9ydCB7Q29uZmlnRW50cnl9IGZyb20gXCIuL2NvbmZpZ0VudHJ5LmpzXCJcclxuXHJcbmV4cG9ydCBjbGFzcyBDb25maWcge1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgICAgIHRoaXMuY29uZmlnRWxlbWVudHMgPSBuZXcgTWFwKCk7IFxyXG4gICAgfVxyXG5cclxuICAgIGFkZEFsbChjb25maWcpIHtcclxuICAgICAgICB0aGlzLmNvbmZpZ0VsZW1lbnRzLmFkZEFsbChjb25maWcuZ2V0Q29uZmlnRWxlbWVudHMoKSk7XHJcbiAgICB9XHJcblxyXG4gICAgYWRkU2luZ2xldG9uKGNsYXNzTmFtZSkge1xyXG4gICAgICAgIHRoaXMuY29uZmlnRWxlbWVudHMuc2V0KGNsYXNzTmFtZSxuZXcgQ29uZmlnRW50cnkoY2xhc3NOYW1lLFwiU0lOR0xFVE9OXCIpKTtcclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH1cclxuXHJcbiAgICBhZGRQcm90b3R5cGUoY2xhc3NOYW1lKSB7XHJcbiAgICAgICAgdGhpcy5jb25maWdFbGVtZW50cy5zZXQoY2xhc3NOYW1lLG5ldyBDb25maWdFbnRyeShjbGFzc05hbWUsXCJQUk9UT1RZUEVcIikpO1xyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfVxyXG5cclxuICAgIGFkZE5hbWVkU2luZ2xldG9uKG5hbWUsY2xhc3NOYW1lKSB7XHJcbiAgICAgICAgdGhpcy5jb25maWdFbGVtZW50cy5zZXQobmFtZSxuZXcgQ29uZmlnRW50cnkoY2xhc3NOYW1lLFwiU0lOR0xFVE9OXCIpKTtcclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH1cclxuXHJcbiAgICBhZGROYW1lZFByb3RvdHlwZShuYW1lLGNsYXNzTmFtZSkge1xyXG4gICAgICAgIHRoaXMuY29uZmlnRWxlbWVudHMuc2V0KG5hbWUsbmV3IENvbmZpZ0VudHJ5KGNsYXNzTmFtZSxcIlBST1RPVFlQRVwiKSk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9XHJcblxyXG4gICAgZ2V0Q29uZmlnRWxlbWVudHMoKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuY29uZmlnRWxlbWVudHM7XHJcbiAgICB9XHJcblxyXG59IiwiaW1wb3J0IHsgQ29uZmlnIH0gZnJvbSBcIi4vY29uZmlnLmpzXCI7XHJcbmV4cG9ydCBjbGFzcyBJbmplY3RvciB7XHJcblxyXG4gICAgc3RhdGljIGdldEluc3RhbmNlKCkge1xyXG4gICAgICAgIGlmKGluamVjdG9yID09PSBudWxsKSB7XHJcbiAgICAgICAgICAgIGluamVjdG9yID0gbmV3IEluamVjdG9yKCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBpbmplY3RvcjtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIFxyXG4gICAgICogQHBhcmFtIHtDb25maWd9IGNvbmZpZyBcclxuICAgICAqL1xyXG4gICAgY29uc3RydWN0b3IoKSB7XHJcbiAgICAgICAgdGhpcy5jb25maWcgPSBuZXcgQ29uZmlnKCk7XHJcbiAgICB9XHJcblxyXG4gICAgbG9hZChjb25maWcpIHtcclxuICAgICAgICB0aGlzLmluc3RhbnNpYXRlQWxsKGNvbmZpZyk7XHJcbiAgICAgICAgdGhpcy5jb25maWcuYWRkQWxsKGNvbmZpZyk7XHJcbiAgICAgICAgdGhpcy5wZXJmb3JtSW5qZWN0aW9ucyhjb25maWcpO1xyXG4gICAgfVxyXG5cclxuICAgIGluamVjdChvYmplY3QpIHtcclxuICAgICAgICB0aGlzLmluamVjdEZpZWxkcyhvYmplY3QsMCk7XHJcbiAgICAgICAgcmV0dXJuIG9iamVjdDtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIFxyXG4gICAgICogQHBhcmFtIHtDb25maWd9IGNvbmZpZyBcclxuICAgICAqL1xyXG4gICAgaW5zdGFuc2lhdGVBbGwoY29uZmlnKSB7XHJcbiAgICAgICAgY29uZmlnLmdldENvbmZpZ0VsZW1lbnRzKCkuZm9yRWFjaCgoa2V5LHZhbHVlLHBhcmVudCkgPT4ge1xyXG4gICAgICAgICAgICB2YWx1ZS5pbnN0YW5zaWF0ZSgpO1xyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICB9LHRoaXMpO1xyXG4gICAgfVxyXG5cclxuICAgIHBlcmZvcm1JbmplY3Rpb25zKGNvbmZpZykge1xyXG4gICAgICAgIGNvbmZpZy5nZXRDb25maWdFbGVtZW50cygpLmZvckVhY2goKGtleSx2YWx1ZSxwYXJlbnQpID0+IHtcclxuICAgICAgICAgICAgdmFsdWUuZ2V0U3RvcmVkSW5zdGFuY2VzKCkuZm9yRWFjaCgoaW5zdGFuY2VFbnRyeSxpbm5lclBhcmVudCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5pbmplY3RGaWVsZHMoaW5zdGFuY2VFbnRyeSwwKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgICAgICB9LHBhcmVudCk7XHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgIH0sdGhpcyk7XHJcbiAgICB9XHJcblxyXG4gICAgaW5qZWN0RmllbGRzKGluc3RhbmNlRW50cnksc3RydWN0dXJlRGVwdGgpIHtcclxuICAgICAgICBcclxuICAgICAgICBmb3IodmFyIGZpZWxkIGluIGluc3RhbmNlRW50cnkpIHtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIGlmKGZpZWxkICE9PSB1bmRlZmluZWQgJiYgZmllbGQgIT09IG51bGwgJiYgaW5zdGFuY2VFbnRyeVtmaWVsZF0gIT0gbnVsbCAmJiBpbnN0YW5jZUVudHJ5W2ZpZWxkXS5wcm90b3R5cGUgaW5zdGFuY2VvZiBPYmplY3QpIHtcclxuICAgICAgICAgICAgICAgIHZhciBpbnN0YW5jZSA9IHRoaXMuZ2V0SW5zdGFuY2VCeUNsYXNzUmVmZXJlbmNlKGluc3RhbmNlRW50cnlbZmllbGRdLHN0cnVjdHVyZURlcHRoKTtcclxuICAgICAgICAgICAgICAgIGlmKGluc3RhbmNlICE9PSB1bmRlZmluZWQgJiYgaW5zdGFuY2UgIT09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICBpbnN0YW5jZUVudHJ5W2ZpZWxkXSA9IGluc3RhbmNlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGdldEluc3RhbmNlQnlDbGFzc1JlZmVyZW5jZShjbGFzc1JlZmVyZW5jZSxzdHJ1Y3R1cmVEZXB0aCkge1xyXG4gICAgICAgIHZhciBpbnN0YW5jZSA9IG51bGw7XHJcbiAgICAgICAgaWYoSW5qZWN0b3IgPT0gY2xhc3NSZWZlcmVuY2UpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRoaXMuY29uZmlnLmdldENvbmZpZ0VsZW1lbnRzKCkuZm9yRWFjaCgoa2V5LHZhbHVlLHBhcmVudCkgPT4ge1xyXG4gICAgICAgICAgICBpZih2YWx1ZS5nZXRDbGFzc1JlZmVyZW5jZSgpID09IGNsYXNzUmVmZXJlbmNlKSB7XHJcbiAgICAgICAgICAgICAgICBpZihcIlBST1RPVFlQRVwiID09PSB2YWx1ZS5nZXRJbmplY3Rpb25UeXBlKCkpe1xyXG4gICAgICAgICAgICAgICAgICAgIGlmKHN0cnVjdHVyZURlcHRoIDwgMykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5pbmplY3RGaWVsZHMobmV3IGNsYXNzUmVmZXJlbmNlKCksc3RydWN0dXJlRGVwdGgrKyk7XHJcbiAgICAgICAgICAgICAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IFwiU3RydWN0dXJlIG9mIG1hbmFnZWQgb2JqZWN0cyBpcyB0b28gZGVlcCB3aGVuIHRyeWluZyB0byBpbmplY3QgXCIgKyBjbGFzc1JlZmVyZW5jZS5uYW1lO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1lbHNle1xyXG4gICAgICAgICAgICAgICAgICAgIGluc3RhbmNlID0gdmFsdWUuZ2V0SW5zdGFuY2UoKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuXHJcbiAgICAgICAgfSx0aGlzKTtcclxuICAgICAgICByZXR1cm4gaW5zdGFuY2U7XHJcbiAgICB9XHJcblxyXG59XHJcblxyXG52YXIgaW5qZWN0b3IgPSBudWxsOyJdLCJuYW1lcyI6WyJMaXN0IiwiTWFwIl0sIm1hcHBpbmdzIjoiOzs7Ozs7QUFFTyxNQUFNLFdBQVcsQ0FBQzs7SUFFckIsV0FBVyxDQUFDLGNBQWMsRUFBRSxhQUFhLEVBQUUsUUFBUSxF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
