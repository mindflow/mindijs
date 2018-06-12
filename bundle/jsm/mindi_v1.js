import { List } from './coreutil_v1.js'

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
        this._storedInstances = new List();
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
        this._configElements = new List(); 
    }

    addAll(config) {
        this._configElements.addAll(config.getConfigElements());
    }

    addSingleton(className) {
        this._configElements.add(new ConfigEntry(className,"SINGLETON"));
        return this;
    }

    addPrototype(className) {
        this._configElements.add(new ConfigEntry(className,"PROTOTYPE"));
        return this;
    }

    getConfigElements() {
        return this._configElements;
    }

}

class Injector {

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

export { Config, ConfigEntry, Injector };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWluZGlfdjEuanMiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9taW5kaS9jb25maWdFbnRyeS5qcyIsIi4uLy4uL3NyYy9taW5kaS9jb25maWcuanMiLCIuLi8uLi9zcmMvbWluZGkvaW5qZWN0b3IuanMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTGlzdCB9IGZyb20gXCJjb3JldXRpbF92MVwiO1xyXG5cclxuZXhwb3J0IGNsYXNzIENvbmZpZ0VudHJ5IHtcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihjbGFzc1JlZmVyZW5jZSwgaW5qZWN0aW9uVHlwZSwgcG9vbFNpemUpIHtcclxuICAgICAgICB0aGlzLl9jbGFzc1JlZmVyZW5jZSA9IGNsYXNzUmVmZXJlbmNlO1xyXG4gICAgICAgIHRoaXMuX2luamVjdGlvblR5cGUgPSBpbmplY3Rpb25UeXBlO1xyXG4gICAgICAgIHRoaXMuX3Bvb2xTaXplID0gcG9vbFNpemU7XHJcbiAgICAgICAgdGhpcy5fc3RvcmVkSW5zdGFuY2VzID0gbnVsbDtcclxuICAgICAgICB0aGlzLl9pbnN0YW5jZVBvaW50ZXIgPSAwO1xyXG4gICAgfVxyXG5cclxuICAgIGluc3RhbnNpYXRlKCkge1xyXG4gICAgICAgIHRoaXMuX2luc3RhbmNlUG9pbnRlciA9IDA7XHJcbiAgICAgICAgdGhpcy5fc3RvcmVkSW5zdGFuY2VzID0gbmV3IExpc3QoKTtcclxuICAgICAgICBpZihcIlNJTkdMRVRPTlwiID09PSB0aGlzLl9pbmplY3Rpb25UeXBlKSB7XHJcbiAgICAgICAgICAgIHRoaXMuX3N0b3JlZEluc3RhbmNlcy5hZGQobmV3IHRoaXMuX2NsYXNzUmVmZXJlbmNlKCkpO1xyXG4gICAgICAgIH1lbHNlIGlmKFwiUE9PTFwiID09PSB0aGlzLl9pbmplY3Rpb25UeXBlKSB7XHJcbiAgICAgICAgICAgIGZvcihpID0gMCA7IGkgPCB0aGlzLl9wb29sU2l6ZSA7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5fc3RvcmVkSW5zdGFuY2VzLmFkZChuZXcgdGhpcy5fY2xhc3NSZWZlcmVuY2UoKSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9ZWxzZSBpZihcIlBST1RPVFlQRVwiID09PSB0aGlzLl9pbmplY3Rpb25UeXBlKSB7XHJcbiAgICAgICAgICAgIC8vIE5ldyBpbnN0YW5jZSBldmVyeSB0aW1lXHJcbiAgICAgICAgfWVsc2Uge1xyXG4gICAgICAgICAgICB0aHJvdyBcIlVua25vd24gaW5qZWN0aW9uVHlwZSBcIiArIHRoaXMuX2luamVjdGlvblR5cGU7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGdldENsYXNzUmVmZXJlbmNlKCkge1xyXG4gICAgICAgIHJldHVybiB0aGlzLl9jbGFzc1JlZmVyZW5jZTtcclxuICAgIH1cclxuXHJcbiAgICBnZXRJbmplY3Rpb25UeXBlKCkge1xyXG4gICAgICAgIHJldHVybiB0aGlzLl9pbmplY3Rpb25UeXBlO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQHJldHVybnMge0xpc3R9IHRoZSBsaXN0IG9mIHN0b3JlZCBpbnN0YW5jZXNcclxuICAgICAqL1xyXG4gICAgZ2V0U3RvcmVkSW5zdGFuY2VzKCkge1xyXG4gICAgICAgIGlmKHRoaXMuX3N0b3JlZEluc3RhbmNlcyA9PT0gbnVsbCkge1xyXG4gICAgICAgICAgICB0aHJvdyBcIkNvbmZpZyBlbnRyeSBoYXMgbm90IGJlZW4gaW5zdGFuc2lhdGVkOiBcIiArIHRoaXMuX2NsYXNzUmVmZXJlbmNlLm5hbWU7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiB0aGlzLl9zdG9yZWRJbnN0YW5jZXM7XHJcbiAgICB9XHJcblxyXG4gICAgZ2V0SW5zdGFuY2UoKSB7XHJcbiAgICAgICAgaWYodGhpcy5fc3RvcmVkSW5zdGFuY2VzID09PSBudWxsKSB7XHJcbiAgICAgICAgICAgIHRocm93IFwiQ29uZmlnIGVudHJ5IGhhcyBub3QgYmVlbiBpbnN0YW5zaWF0ZWQ6IFwiICsgdGhpcy5fY2xhc3NSZWZlcmVuY2UubmFtZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIENyZWF0ZSBhIG5ldyBpbnN0YW5jZSBlYWNoIHRpbWUgZm9yIHByb3RvdHlwZXNcclxuICAgICAgICBpZihcIlBST1RPVFlQRVwiID09PSB0aGlzLl9pbmplY3Rpb25UeXBlKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBuZXcgdGhpcy5fY2xhc3NSZWZlcmVuY2UoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIEdldCB0aGUgaW5zdGFuY2UgZnJvbSB0aGUgbmV4dCBwb3NpdGlvbiBpbiB0aGUgcG9vbFxyXG4gICAgICAgIHZhciBpbnN0YW5jZSA9IHRoaXMuX3N0b3JlZEluc3RhbmNlcy5nZXQodGhpcy5faW5zdGFuY2VQb2ludGVyKTtcclxuICAgICAgICB0aGlzLl9pbnN0YW5jZVBvaW50ZXIgKys7XHJcbiAgICAgICAgaWYodGhpcy5faW5zdGFuY2VQb2ludGVyID09PSB0aGlzLl9zdG9yZWRJbnN0YW5jZXMuc2l6ZSgpKSB7XHJcbiAgICAgICAgICAgIHRoaXMuX2luc3RhbmNlUG9pbnRlciA9IDA7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBpbnN0YW5jZTtcclxuICAgIH1cclxuXHJcblxyXG59IiwiaW1wb3J0IHtMaXN0fSBmcm9tIFwiY29yZXV0aWxfdjFcIjtcclxuaW1wb3J0IHtDb25maWdFbnRyeX0gZnJvbSBcIi4vY29uZmlnRW50cnkuanNcIlxyXG5cclxuZXhwb3J0IGNsYXNzIENvbmZpZyB7XHJcblxyXG4gICAgY29uc3RydWN0b3IoKSB7XHJcbiAgICAgICAgdGhpcy5fY29uZmlnRWxlbWVudHMgPSBuZXcgTGlzdCgpOyBcclxuICAgIH1cclxuXHJcbiAgICBhZGRBbGwoY29uZmlnKSB7XHJcbiAgICAgICAgdGhpcy5fY29uZmlnRWxlbWVudHMuYWRkQWxsKGNvbmZpZy5nZXRDb25maWdFbGVtZW50cygpKTtcclxuICAgIH1cclxuXHJcbiAgICBhZGRTaW5nbGV0b24oY2xhc3NOYW1lKSB7XHJcbiAgICAgICAgdGhpcy5fY29uZmlnRWxlbWVudHMuYWRkKG5ldyBDb25maWdFbnRyeShjbGFzc05hbWUsXCJTSU5HTEVUT05cIikpO1xyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfVxyXG5cclxuICAgIGFkZFByb3RvdHlwZShjbGFzc05hbWUpIHtcclxuICAgICAgICB0aGlzLl9jb25maWdFbGVtZW50cy5hZGQobmV3IENvbmZpZ0VudHJ5KGNsYXNzTmFtZSxcIlBST1RPVFlQRVwiKSk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9XHJcblxyXG4gICAgZ2V0Q29uZmlnRWxlbWVudHMoKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuX2NvbmZpZ0VsZW1lbnRzO1xyXG4gICAgfVxyXG5cclxufSIsImltcG9ydCB7TGlzdH0gZnJvbSBcImNvcmV1dGlsX3YxXCI7XHJcbmltcG9ydCB7IENvbmZpZ0VudHJ5IH0gZnJvbSBcIi4vY29uZmlnRW50cnkuanNcIjtcclxuaW1wb3J0IHsgQ29uZmlnIH0gZnJvbSBcIi4vY29uZmlnLmpzXCI7XHJcbmV4cG9ydCBjbGFzcyBJbmplY3RvciB7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBAcGFyYW0ge0xpc3R9XHJcbiAgICAgKi9cclxuICAgIHN0YXRpYyBnZXRJbnN0YW5jZSgpIHtcclxuICAgICAgICBpZihpbmplY3RvciA9PT0gbnVsbCkge1xyXG4gICAgICAgICAgICBpbmplY3RvciA9IG5ldyBJbmplY3RvcigpO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gaW5qZWN0b3I7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBcclxuICAgICAqIEBwYXJhbSB7Q29uZmlnfSBjb25maWcgXHJcbiAgICAgKi9cclxuICAgIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgICAgIHRoaXMuX2NvbmZpZyA9IG5ldyBDb25maWcoKTtcclxuICAgIH1cclxuXHJcbiAgICBsb2FkKGNvbmZpZykge1xyXG4gICAgICAgIHRoaXMuaW5zdGFuc2lhdGVBbGwoY29uZmlnKTtcclxuICAgICAgICB0aGlzLl9jb25maWcuYWRkQWxsKGNvbmZpZyk7XHJcbiAgICAgICAgdGhpcy5wZXJmb3JtSW5qZWN0aW9ucyhjb25maWcpO1xyXG4gICAgfVxyXG5cclxuICAgIGluamVjdChvYmplY3QpIHtcclxuICAgICAgICB0aGlzLmluamVjdEZpZWxkcyhvYmplY3QsMCk7XHJcbiAgICAgICAgcmV0dXJuIG9iamVjdDtcclxuICAgIH1cclxuXHJcbiAgICBpbnN0YW5zaWF0ZUFsbChjb25maWcpIHtcclxuICAgICAgICBjb25maWcuZ2V0Q29uZmlnRWxlbWVudHMoKS5mb3JFYWNoKChlbnRyeSxwYXJlbnQpID0+IHtcclxuICAgICAgICAgICAgZW50cnkuaW5zdGFuc2lhdGUoKTtcclxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgfSx0aGlzKTtcclxuICAgIH1cclxuXHJcbiAgICBwZXJmb3JtSW5qZWN0aW9ucyhjb25maWcpIHtcclxuICAgICAgICBjb25maWcuZ2V0Q29uZmlnRWxlbWVudHMoKS5mb3JFYWNoKChjb25maWdFbnRyeSxwYXJlbnQpID0+IHtcclxuICAgICAgICAgICAgY29uZmlnRW50cnkuZ2V0U3RvcmVkSW5zdGFuY2VzKCkuZm9yRWFjaCgoaW5zdGFuY2VFbnRyeSxpbm5lclBhcmVudCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5pbmplY3RGaWVsZHMoaW5zdGFuY2VFbnRyeSwwKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgICAgICB9LHBhcmVudCk7XHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgIH0sdGhpcyk7XHJcbiAgICB9XHJcblxyXG4gICAgaW5qZWN0RmllbGRzKGluc3RhbmNlRW50cnksc3RydWN0dXJlRGVwdGgpIHtcclxuICAgICAgICBcclxuICAgICAgICBmb3IodmFyIGZpZWxkIGluIGluc3RhbmNlRW50cnkpIHtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIGlmKGZpZWxkICE9PSB1bmRlZmluZWQgJiYgZmllbGQgIT09IG51bGwgJiYgaW5zdGFuY2VFbnRyeVtmaWVsZF0gIT0gbnVsbCAmJiBpbnN0YW5jZUVudHJ5W2ZpZWxkXS5wcm90b3R5cGUgaW5zdGFuY2VvZiBPYmplY3QpIHtcclxuICAgICAgICAgICAgICAgIHZhciBpbnN0YW5jZSA9IHRoaXMuZ2V0SW5zdGFuY2VCeUNsYXNzUmVmZXJlbmNlKGluc3RhbmNlRW50cnlbZmllbGRdLHN0cnVjdHVyZURlcHRoKTtcclxuICAgICAgICAgICAgICAgIGlmKGluc3RhbmNlICE9PSB1bmRlZmluZWQgJiYgaW5zdGFuY2UgIT09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICBpbnN0YW5jZUVudHJ5W2ZpZWxkXSA9IGluc3RhbmNlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGdldEluc3RhbmNlQnlDbGFzc1JlZmVyZW5jZShjbGFzc1JlZmVyZW5jZSxzdHJ1Y3R1cmVEZXB0aCkge1xyXG4gICAgICAgIHZhciBpbnN0YW5jZSA9IG51bGw7XHJcbiAgICAgICAgaWYoSW5qZWN0b3IgPT0gY2xhc3NSZWZlcmVuY2UpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRoaXMuX2NvbmZpZy5nZXRDb25maWdFbGVtZW50cygpLmZvckVhY2goKGNvbmZpZ0VudHJ5LHBhcmVudCkgPT4ge1xyXG4gICAgICAgICAgICBpZihjb25maWdFbnRyeS5nZXRDbGFzc1JlZmVyZW5jZSgpID09IGNsYXNzUmVmZXJlbmNlKSB7XHJcbiAgICAgICAgICAgICAgICBpZihcIlBST1RPVFlQRVwiID09PSBjb25maWdFbnRyeS5nZXRJbmplY3Rpb25UeXBlKCkpe1xyXG4gICAgICAgICAgICAgICAgICAgIGlmKHN0cnVjdHVyZURlcHRoIDwgMykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5pbmplY3RGaWVsZHMobmV3IGNsYXNzUmVmZXJlbmNlKCksc3RydWN0dXJlRGVwdGgrKyk7XHJcbiAgICAgICAgICAgICAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IFwiU3RydWN0dXJlIG9mIG1hbmFnZWQgb2JqZWN0cyBpcyB0b28gZGVlcCB3aGVuIHRyeWluZyB0byBpbmplY3QgXCIgKyBjbGFzc1JlZmVyZW5jZS5uYW1lO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1lbHNle1xyXG4gICAgICAgICAgICAgICAgICAgIGluc3RhbmNlID0gY29uZmlnRW50cnkuZ2V0SW5zdGFuY2UoKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuXHJcbiAgICAgICAgfSx0aGlzKTtcclxuICAgICAgICByZXR1cm4gaW5zdGFuY2U7XHJcbiAgICB9XHJcblxyXG59XHJcblxyXG52YXIgaW5qZWN0b3IgPSBudWxsOyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUVPLE1BQU0sV0FBVyxDQUFDOztJQUVyQixXQUFXLENBQUMsY0FBYyxFQUFFLGFBQWEsRUFBRSxRQUFRLEVBQUU7UUFDakQsSUFBSSxDQUFDLGVBQWUsR0FBRyxjQUFjLENBQUM7UUFDdEMsSUFBSSxDQUFDLGNBQWMsR0FBRyxhQUFhLENBQUM7UUFDcEMsSUFBSSxDQUFDLFNBQVMsR0FBRyxRQUFRLENBQUM7UUFDMUIsSUFBSSxDQUFDLGdCQUFnQixHQUFHLElBQUksQ0FBQztRQUM3QixJQUFJLENBQUMsZ0JBQWdCLEdBQUcsQ0FBQyxDQUFDO0tBQzdCOztJQUVELFdBQVcsR0FBRztRQUNWLElBQUksQ0FBQyxn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
