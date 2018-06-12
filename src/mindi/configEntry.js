import { List } from "coreutil_v1";

export class ConfigEntry {

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