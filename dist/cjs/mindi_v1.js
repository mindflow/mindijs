'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var coreutil_v1 = require('coreutil_v1');

class InjectionPoint {

    static get INSTANCE_TYPE() { return 0; } 
    static get PROVIDER_TYPE() { return 1; } 

    static instanceByName(name, classReference, parameters = []) {
        return new InjectionPoint(name, classReference, InjectionPoint.INSTANCE_TYPE, parameters);
    }

    static instance(classReference, parameters = []) {
        return new InjectionPoint(classReference.name, classReference, InjectionPoint.INSTANCE_TYPE, parameters);
    }

    static providerByName(name, classReference, parameters = []) {
        return new InjectionPoint(name, classReference, InjectionPoint.PROVIDER_TYPE, parameters);
    }

    static provider(classReference, parameters = []) {
        return new InjectionPoint(classReference.name, classReference, InjectionPoint.PROVIDER_TYPE, parameters);
    }

    constructor(name, classReference, type = InjectionPoint.INSTANCE_TYPE, parameters) {
        this.name = name;
        this.classReference = classReference;
        this.type = type;
        this.parameters = parameters;
    }

    getName() {
        return this.name;
    }

    getClassReference() {
        return this.classReference;
    }

    getType() {
       return this.type; 
    }

    getParameters() {
        return this.parameters;
    }

}

const LOG = new coreutil_v1.Logger("Provider");

class Provider {

    get(parameters = []) {
        return null;
    }

}

class Config {
 
        /**
     * @returns {Map}
     */
    getConfigEntries() {
        return null;
    }

    /**
     * @returns {List}
     */
    getConfigProcessors() {
        return null;
    }

    /**
     * @returns {List}
     */
    getInstanceProcessors() {
        return null;
    }

}

class InstanceHolder {

    static get NEW_INSTANCE() { return 0; }

    static get EXISTING_INSTANCE() { return 1; }

    static holderWithNewInstance(instance) {
        return new InstanceHolder(instance, InstanceHolder.NEW_INSTANCE);
    }

    static holderWithExistingInstance(instance) {
        return new InstanceHolder(instance, InstanceHolder.EXISTING_INSTANCE);
    }

    constructor(instance, type) {
        this.instance = instance;
        this.type = type;
    }

    getInstance() {
        return this.instance;
    }

    getType() {
        return this.type;
    }

}

class TypeConfig {

    constructor(name, classReference) {
        this.name = name;
        this.classReference = classReference;
    }

    getClassReference() {
        return this.classReference;
    }

    getName() {
        return this.name;
    }

    instanceHolder(parameters = []) {
        return null;
    }

}

/**
 * Utilities for accessing a Config object
 */

const LOG$1 = new coreutil_v1.Logger("ConfigAccessor");

class ConfigAccessor {

    /**
     * Get an instance by class name in the config
     * 
     * @param {Config} config 
     * @param {string} name 
     * @param {Array} parameters
     * @returns {InstanceHolder}
     */
    static instanceHolder(name, config, parameters = []) {
        const typeConfig = this.typeConfigByName(name, config);
        if(typeConfig === null) {
            LOG$1.error("No typeconfig found for " + name);
            return null;
        }
        const instanceHolder = typeConfig.instanceHolder(parameters);
        if(!instanceHolder) {
            LOG$1.error("No object found for " + name);
        }
        return instanceHolder;
    }

    /**
     * Get the type config by class name in the config
     * 
     * @param {Config} config 
     * @param {string} name 
     * @returns {TypeConfig}
     */
    static typeConfigByName(name, config) {
        let configEntry = null;
        config.getConfigEntries().forEach((key, value, parent) => {
            if(key === name) {
                configEntry = value;
                return false;
            }
            return true;
        }, this);
        if(!configEntry) {
            LOG$1.error("No config entry found for " + name);
        }
        return configEntry;
    }

}

const LOG$2 = new coreutil_v1.Logger("ConfigProcessorExecutor");

/**
 * Executes the provided config processors on the provided config registry
 * Returns a list of promises for when the config processors has completed running
 * 
 * A config processor reads the config and performs any necessary actions based on
 * class and type information. A config processor does not operate on managed instances
 */
class ConfigProcessorExecutor {
    
    /**
     * @param {List} configProcessorClassList
     * @param {Injector} injector
     * @param {Config} config
     * @returns {Promise} promise which is resolved when all config processors are resolved
     */
    static execute(configProcessorClassNameList, injector, config) {
        const promiseList = new coreutil_v1.List();
        configProcessorClassNameList.forEach((configProcessorClassName, parent) => {
            /**  @type {InstanceHolder} */
            const processorHolder = ConfigAccessor.instanceHolder(configProcessorClassName, config);
            if(processorHolder.getType() === InstanceHolder.NEW_INSTANCE) {
                injector.injectTarget(processorHolder.getInstance(), config);
            }
            const processorsPromise = processorHolder.getInstance().processConfig(config);
            if (processorsPromise) {
                promiseList.add(processorsPromise);
            }
            return true;
        }, this);
        return Promise.all(promiseList.getArray());
    }

}

class Injector {

    injectTarget(target, config, depth = 0) {

    }

}

const LOG$3 = new coreutil_v1.Logger("InstancePostConfigTrigger");

/**
 * Instance processor which calls postConfig on objects after configProcessors are finished
 */
class InstancePostConfigTrigger {

    process(instance) {
        if(instance.postConfig) {
            instance.postConfig();
        }
    }

}

const LOG$4 = new coreutil_v1.Logger("InstanceProcessorExecutor");

/**
 * Executes the configs instance processors on the provided instance
 * Returns a promise for when the config processors has completed running
 * 
 * Instance processors perform operations on managed instances after they have been instansiated
 */
class InstanceProcessorExecutor {

    /**
     * @param {List} instanceProcessorList the instance processors
     * @param {Obect} instance the instance to process
     * @param {Config} config
     */
    static execute(instance, config) {
        config.getInstanceProcessors().forEach((processorName, parent) => {
            const processorHolder = ConfigAccessor.instanceHolder(processorName, config);
            processorHolder.getInstance().process(instance);
            return true;
        }, this);
    }

}

const LOG$5 = new coreutil_v1.Logger("SingletonConfig");

class SingletonConfig extends TypeConfig {

    static named(name, classReference) {
        return new SingletonConfig(name, classReference);
    }

    static unnamed(classReference) {
        return new SingletonConfig(classReference.name, classReference);
    }

    constructor(name, classReference) {
        super(name, classReference);
    }

    instanceHolder(parameters = []) {
        if (!this.instance) {
            if(parameters && parameters.length > 0) {
                this.instance = new this.classReference(...parameters);
            } else {
                this.instance = new this.classReference();
            }
            return InstanceHolder.holderWithNewInstance(this.instance);
        }
        return InstanceHolder.holderWithExistingInstance(this.instance);
    }

}

class MindiProvider extends Provider {

    /**
     * 
     * @param {TypeConfig} typeConfig 
     */
    constructor(typeConfig, injector, config) {
        /** @type {TypeConfig} */
        this.typeConfig = typeConfig;

        /** @type {Injector} */
        this.injector = injector;

        /** @type {Config} */
        this.config = config;
    }

    get(parameters = []) {
        /** @type {InstanceHolder} */
        const instanceHolder = this.typeConfig.instanceHolder(parameters);
        if (instanceHolder.getType() === InstanceHolder.NEW_INSTANCE) {
            this.injector.injectTarget(instanceHolder.getInstance(), this.config);
        }
        return insatanceHolder.getInstance();
    }

}

const LOG$6 = new coreutil_v1.Logger("MindiInjector");

class MindiInjector extends Injector {

    static inject(target, config) {
        INJECTOR.injectTarget(target, config);
    }

    /**
     * @returns {MindiInjector}
     */
    static getInstance() {
        return INJECTOR;
    }

    /**
     * Helper method for injecting fields in target object
     * 
     * @param {any} target 
     * @param {Config} config 
     * @param {number} depth
     */
    injectTarget(target, config, depth = 0) {
        if (!target) {
            throw Error("Missing target object");
        }
        if (!config) {
            throw Error("Missing config");
        }
        if (!config.getFinalized()) {
            throw Error("Config not finalized");
        }
        if (depth > 10) {
            throw Error("Injection structure too deep");
        }
        const injector = this;
        Object.keys(target).forEach(function(key,index) {
            if (target[key] instanceof InjectionPoint) {
                injector.injectProperty(target, key, config, depth);
            }
        });
        InstanceProcessorExecutor.execute(target, config);
    }

    /**
     * @param {object} target 
     * @param {string} key 
     * @param {Config} config 
     * @param {number} depth 
     */
    injectProperty(target, key, config, depth) {
        const injectionPoint = target[key];
        if (injectionPoint.getType() === InjectionPoint.PROVIDER_TYPE) {
            this.injectPropertyProvider(target, key, config, depth);
            return;
        }
        this.injectPropertyInstance(target, key, config);
    }

    /**
     * @param {object} target 
     * @param {string} key 
     * @param {Config} config 
     * @param {number} depth 
     */
    injectPropertyProvider(target, key, config) {
        /**
         * @type {InjectionPoint}
         */
        const injectionPoint = target[key];
        const typeConfig = ConfigAccessor.typeConfigByName(injectionPoint.getName(), config);
        target[key] = new MindiProvider(typeConfig, this, config);
    }

    /**
     * @param {object} target 
     * @param {string} key 
     * @param {Config} config 
     * @param {number} depth 
     */
    injectPropertyInstance(target, key, config, depth) {
        /**
         * @type {InjectionPoint}
         */
        const injectionPoint = target[key];
        const instanceHolder = ConfigAccessor.instanceHolder(injectionPoint.getName(), config, injectionPoint.getParameters());
        if(instanceHolder.getType() === InstanceHolder.NEW_INSTANCE) {
            this.injectTarget(instanceHolder.getInstance(), config, depth++);
        }
        target[key] = instanceHolder.getInstance();
    }

}

const INJECTOR = new MindiInjector();

const LOG$7 = new coreutil_v1.Logger("Config");

class MindiConfig extends Config {

    constructor() {
        super();
        this.finalized = false;
        this.configEntries = new coreutil_v1.Map();
        this.configProcessors = new coreutil_v1.List();
        this.instanceProcessors = new coreutil_v1.List();
    }

    /**
     * 
     * @param {Config} config 
     */
    merge(config) {
        if (!config.getFinalized()) {
            throw Error("Cannot merge into an unfinalized config");
        }
        const newConfigEntries = new coreutil_v1.Map();
        newConfigEntries.addAll(this.configEntries);
        newConfigEntries.addAll(config.getConfigEntries());

        const newConfigProcessors = new coreutil_v1.List();
        newConfigProcessors.addAll(this.configProcessors);
        newConfigProcessors.addAll(config.getConfigProcessors());

        const newInstanceProcessors = new coreutil_v1.List();
        newInstanceProcessors.addAll(this.instanceProcessors);
        newInstanceProcessors.addAll(config.getInstanceProcessors());

        this.configEntries = newConfigEntries;
        this.configProcessors = newConfigProcessors;
        this.instanceProcessors = newInstanceProcessors;

        return this;
    }

    /**
     * 
     * @param {TypeConfig} typeConfig 
     */
    addTypeConfig(typeConfig) {
        this.configEntries.set(typeConfig.getName(), typeConfig);
        return this;
    }

    addConfigProcessor(configProcessor) {
        this.configProcessors.add(configProcessor.name);
        return this.addTypeConfig(SingletonConfig.unnamed(configProcessor));
    }

    addInstanceProcessor(instanceProcessor) {
        this.instanceProcessors.add(instanceProcessor.name);
        return this.addTypeConfig(SingletonConfig.unnamed(instanceProcessor));
    }

    /**
     * 
     * @param {List} typeConfigList
     */
    addAllTypeConfig(typeConfigList) {
        typeConfigList.forEach((typeConfig,parent) => {
            this.configEntries.set(typeConfig.getName(), typeConfig);
            return true;
        },this);
        return this;
    }

    /**
     * 
     * @param {List} configProcessorList 
     */
    addAllConfigProcessor(configProcessorList) {
        configProcessorList.forEach((configProcessor,parent) => {
            this.configProcessors.add(configProcessor.name);
            this.addTypeConfig(SingletonConfig.unnamed(configProcessor));
            return true;
        },this);
        return this;
    }

    /**
     * 
     * @param {List} instanceProcessorList 
     */
    addAllInstanceProcessor(instanceProcessorList) {
        instanceProcessorList.forEach((instanceProcessor,parent) => {
            this.instanceProcessors.add(instanceProcessor.name);
            this.addTypeConfig(SingletonConfig.unnamed(instanceProcessor));
            return true;
        },this);
        return this;
    }

    /**
     * @returns {Map}
     */
    getConfigEntries() {
        return this.configEntries;
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

    getFinalized() {
        return this.finalized;
    }

    finalize() {
        this.finalized = true;
        return ConfigProcessorExecutor.execute(this.getConfigProcessors(), MindiInjector.getInstance(), this);
    }

}

class PoolConfig extends TypeConfig {

    static named(name, classReference, poolSize) {
        return new PoolConfig(name, classReference, poolSize);
    }

    static unnamed(classReference, poolSize) {
        return new PoolConfig(classReference.name, classReference, poolSize);
    }

    constructor(name, classReference, poolSize) {
        super(name, classReference);
        this.poolSize = poolSize;
    }

    instanceHolder(parameters = []) {

    }

}

class PrototypeConfig extends TypeConfig {

    static named(name, classReference) {
        return new PrototypeConfig(name, classReference);
    }

    static unnamed(classReference) {
        return new PrototypeConfig(classReference.name, classReference);
    }

    constructor(name, classReference) {
        super(name, classReference);
    }

    /**
     * @param {array} parameters the parameters to use for the constructor
     */
    instanceHolder(parameters = []) {
        let instance = null;
        if(parameters && parameters.length > 0) {
            instance = new this.classReference(...parameters);
        } else {
            instance = new this.classReference();
        }
        return InstanceHolder.holderWithNewInstance(instance);
    }


}

exports.Config = Config;
exports.ConfigAccessor = ConfigAccessor;
exports.ConfigProcessorExecutor = ConfigProcessorExecutor;
exports.InjectionPoint = InjectionPoint;
exports.Injector = Injector;
exports.InstanceHolder = InstanceHolder;
exports.InstancePostConfigTrigger = InstancePostConfigTrigger;
exports.InstanceProcessorExecutor = InstanceProcessorExecutor;
exports.MindiConfig = MindiConfig;
exports.MindiInjector = MindiInjector;
exports.MindiProvider = MindiProvider;
exports.PoolConfig = PoolConfig;
exports.PrototypeConfig = PrototypeConfig;
exports.Provider = Provider;
exports.SingletonConfig = SingletonConfig;
exports.TypeConfig = TypeConfig;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWluZGlfdjEuanMiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9taW5kaS9hcGkvaW5qZWN0aW9uUG9pbnQuanMiLCIuLi8uLi9zcmMvbWluZGkvYXBpL3Byb3ZpZGVyLmpzIiwiLi4vLi4vc3JjL21pbmRpL2NvbmZpZy5qcyIsIi4uLy4uL3NyYy9taW5kaS90eXBlQ29uZmlnL2luc3RhbmNlSG9sZGVyLmpzIiwiLi4vLi4vc3JjL21pbmRpL3R5cGVDb25maWcvdHlwZUNvbmZpZy5qcyIsIi4uLy4uL3NyYy9taW5kaS9jb25maWdBY2Nlc3Nvci5qcyIsIi4uLy4uL3NyYy9taW5kaS9jb25maWdQcm9jZXNzb3IvY29uZmlnUHJvY2Vzc29yRXhlY3V0b3IuanMiLCIuLi8uLi9zcmMvbWluZGkvaW5qZWN0b3IuanMiLCIuLi8uLi9zcmMvbWluZGkvaW5zdGFuY2VQcm9jZXNzb3IvaW5zdGFuY2VQb3N0Q29uZmlnVHJpZ2dlci5qcyIsIi4uLy4uL3NyYy9taW5kaS9pbnN0YW5jZVByb2Nlc3Nvci9pbnN0YW5jZVByb2Nlc3NvckV4ZWN1dG9yLmpzIiwiLi4vLi4vc3JjL21pbmRpL3R5cGVDb25maWcvc2luZ2xldG9uQ29uZmlnLmpzIiwiLi4vLi4vc3JjL21pbmRpL21pbmRpUHJvdmlkZXIuanMiLCIuLi8uLi9zcmMvbWluZGkvbWluZGlJbmplY3Rvci5qcyIsIi4uLy4uL3NyYy9taW5kaS9taW5kaUNvbmZpZy5qcyIsIi4uLy4uL3NyYy9taW5kaS90eXBlQ29uZmlnL3Bvb2xDb25maWcuanMiLCIuLi8uLi9zcmMvbWluZGkvdHlwZUNvbmZpZy9wcm90b3R5cGVDb25maWcuanMiXSwic291cmNlc0NvbnRlbnQiOlsiZXhwb3J0IGNsYXNzIEluamVjdGlvblBvaW50IHtcclxuXHJcbiAgICBzdGF0aWMgZ2V0IElOU1RBTkNFX1RZUEUoKSB7IHJldHVybiAwOyB9IFxyXG4gICAgc3RhdGljIGdldCBQUk9WSURFUl9UWVBFKCkgeyByZXR1cm4gMTsgfSBcclxuXHJcbiAgICBzdGF0aWMgaW5zdGFuY2VCeU5hbWUobmFtZSwgY2xhc3NSZWZlcmVuY2UsIHBhcmFtZXRlcnMgPSBbXSkge1xyXG4gICAgICAgIHJldHVybiBuZXcgSW5qZWN0aW9uUG9pbnQobmFtZSwgY2xhc3NSZWZlcmVuY2UsIEluamVjdGlvblBvaW50LklOU1RBTkNFX1RZUEUsIHBhcmFtZXRlcnMpO1xyXG4gICAgfVxyXG5cclxuICAgIHN0YXRpYyBpbnN0YW5jZShjbGFzc1JlZmVyZW5jZSwgcGFyYW1ldGVycyA9IFtdKSB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBJbmplY3Rpb25Qb2ludChjbGFzc1JlZmVyZW5jZS5uYW1lLCBjbGFzc1JlZmVyZW5jZSwgSW5qZWN0aW9uUG9pbnQuSU5TVEFOQ0VfVFlQRSwgcGFyYW1ldGVycyk7XHJcbiAgICB9XHJcblxyXG4gICAgc3RhdGljIHByb3ZpZGVyQnlOYW1lKG5hbWUsIGNsYXNzUmVmZXJlbmNlLCBwYXJhbWV0ZXJzID0gW10pIHtcclxuICAgICAgICByZXR1cm4gbmV3IEluamVjdGlvblBvaW50KG5hbWUsIGNsYXNzUmVmZXJlbmNlLCBJbmplY3Rpb25Qb2ludC5QUk9WSURFUl9UWVBFLCBwYXJhbWV0ZXJzKTtcclxuICAgIH1cclxuXHJcbiAgICBzdGF0aWMgcHJvdmlkZXIoY2xhc3NSZWZlcmVuY2UsIHBhcmFtZXRlcnMgPSBbXSkge1xyXG4gICAgICAgIHJldHVybiBuZXcgSW5qZWN0aW9uUG9pbnQoY2xhc3NSZWZlcmVuY2UubmFtZSwgY2xhc3NSZWZlcmVuY2UsIEluamVjdGlvblBvaW50LlBST1ZJREVSX1RZUEUsIHBhcmFtZXRlcnMpO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0cnVjdG9yKG5hbWUsIGNsYXNzUmVmZXJlbmNlLCB0eXBlID0gSW5qZWN0aW9uUG9pbnQuSU5TVEFOQ0VfVFlQRSwgcGFyYW1ldGVycykge1xyXG4gICAgICAgIHRoaXMubmFtZSA9IG5hbWU7XHJcbiAgICAgICAgdGhpcy5jbGFzc1JlZmVyZW5jZSA9IGNsYXNzUmVmZXJlbmNlO1xyXG4gICAgICAgIHRoaXMudHlwZSA9IHR5cGU7XHJcbiAgICAgICAgdGhpcy5wYXJhbWV0ZXJzID0gcGFyYW1ldGVycztcclxuICAgIH1cclxuXHJcbiAgICBnZXROYW1lKCkge1xyXG4gICAgICAgIHJldHVybiB0aGlzLm5hbWU7XHJcbiAgICB9XHJcblxyXG4gICAgZ2V0Q2xhc3NSZWZlcmVuY2UoKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuY2xhc3NSZWZlcmVuY2U7XHJcbiAgICB9XHJcblxyXG4gICAgZ2V0VHlwZSgpIHtcclxuICAgICAgIHJldHVybiB0aGlzLnR5cGU7IFxyXG4gICAgfVxyXG5cclxuICAgIGdldFBhcmFtZXRlcnMoKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMucGFyYW1ldGVycztcclxuICAgIH1cclxuXHJcbn0iLCJpbXBvcnQgeyBMb2dnZXIgfSBmcm9tIFwiY29yZXV0aWxfdjFcIjtcclxuXHJcbmNvbnN0IExPRyA9IG5ldyBMb2dnZXIoXCJQcm92aWRlclwiKTtcclxuXHJcbmV4cG9ydCBjbGFzcyBQcm92aWRlciB7XHJcblxyXG4gICAgZ2V0KHBhcmFtZXRlcnMgPSBbXSkge1xyXG4gICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgfVxyXG5cclxufSIsImV4cG9ydCBjbGFzcyBDb25maWcge1xyXG4gXHJcbiAgICAgICAgLyoqXHJcbiAgICAgKiBAcmV0dXJucyB7TWFwfVxyXG4gICAgICovXHJcbiAgICBnZXRDb25maWdFbnRyaWVzKCkge1xyXG4gICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQHJldHVybnMge0xpc3R9XHJcbiAgICAgKi9cclxuICAgIGdldENvbmZpZ1Byb2Nlc3NvcnMoKSB7XHJcbiAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBAcmV0dXJucyB7TGlzdH1cclxuICAgICAqL1xyXG4gICAgZ2V0SW5zdGFuY2VQcm9jZXNzb3JzKCkge1xyXG4gICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgfVxyXG5cclxufSIsImV4cG9ydCBjbGFzcyBJbnN0YW5jZUhvbGRlciB7XHJcblxyXG4gICAgc3RhdGljIGdldCBORVdfSU5TVEFOQ0UoKSB7IHJldHVybiAwOyB9XHJcblxyXG4gICAgc3RhdGljIGdldCBFWElTVElOR19JTlNUQU5DRSgpIHsgcmV0dXJuIDE7IH1cclxuXHJcbiAgICBzdGF0aWMgaG9sZGVyV2l0aE5ld0luc3RhbmNlKGluc3RhbmNlKSB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBJbnN0YW5jZUhvbGRlcihpbnN0YW5jZSwgSW5zdGFuY2VIb2xkZXIuTkVXX0lOU1RBTkNFKTtcclxuICAgIH1cclxuXHJcbiAgICBzdGF0aWMgaG9sZGVyV2l0aEV4aXN0aW5nSW5zdGFuY2UoaW5zdGFuY2UpIHtcclxuICAgICAgICByZXR1cm4gbmV3IEluc3RhbmNlSG9sZGVyKGluc3RhbmNlLCBJbnN0YW5jZUhvbGRlci5FWElTVElOR19JTlNUQU5DRSk7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3RydWN0b3IoaW5zdGFuY2UsIHR5cGUpIHtcclxuICAgICAgICB0aGlzLmluc3RhbmNlID0gaW5zdGFuY2U7XHJcbiAgICAgICAgdGhpcy50eXBlID0gdHlwZTtcclxuICAgIH1cclxuXHJcbiAgICBnZXRJbnN0YW5jZSgpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5pbnN0YW5jZTtcclxuICAgIH1cclxuXHJcbiAgICBnZXRUeXBlKCkge1xyXG4gICAgICAgIHJldHVybiB0aGlzLnR5cGU7XHJcbiAgICB9XHJcblxyXG59IiwiaW1wb3J0IHsgUHJvdmlkZXIgfSBmcm9tIFwiLi4vYXBpL3Byb3ZpZGVyLmpzXCI7XHJcblxyXG5leHBvcnQgY2xhc3MgVHlwZUNvbmZpZyB7XHJcblxyXG4gICAgY29uc3RydWN0b3IobmFtZSwgY2xhc3NSZWZlcmVuY2UpIHtcclxuICAgICAgICB0aGlzLm5hbWUgPSBuYW1lO1xyXG4gICAgICAgIHRoaXMuY2xhc3NSZWZlcmVuY2UgPSBjbGFzc1JlZmVyZW5jZTtcclxuICAgIH1cclxuXHJcbiAgICBnZXRDbGFzc1JlZmVyZW5jZSgpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5jbGFzc1JlZmVyZW5jZTtcclxuICAgIH1cclxuXHJcbiAgICBnZXROYW1lKCkge1xyXG4gICAgICAgIHJldHVybiB0aGlzLm5hbWU7XHJcbiAgICB9XHJcblxyXG4gICAgaW5zdGFuY2VIb2xkZXIocGFyYW1ldGVycyA9IFtdKSB7XHJcbiAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICB9XHJcblxyXG59IiwiaW1wb3J0IHsgQ29uZmlnIH0gZnJvbSBcIi4vY29uZmlnLmpzXCI7XHJcbmltcG9ydCB7IExvZ2dlciB9IGZyb20gXCJjb3JldXRpbF92MVwiO1xyXG5pbXBvcnQgeyBJbnN0YW5jZUhvbGRlciB9IGZyb20gXCIuL3R5cGVDb25maWcvaW5zdGFuY2VIb2xkZXIuanNcIjtcclxuaW1wb3J0IHsgVHlwZUNvbmZpZyB9IGZyb20gXCIuL3R5cGVDb25maWcvdHlwZUNvbmZpZy5qc1wiO1xyXG5cclxuLyoqXHJcbiAqIFV0aWxpdGllcyBmb3IgYWNjZXNzaW5nIGEgQ29uZmlnIG9iamVjdFxyXG4gKi9cclxuXHJcbmNvbnN0IExPRyA9IG5ldyBMb2dnZXIoXCJDb25maWdBY2Nlc3NvclwiKTtcclxuXHJcbmV4cG9ydCBjbGFzcyBDb25maWdBY2Nlc3NvciB7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBHZXQgYW4gaW5zdGFuY2UgYnkgY2xhc3MgbmFtZSBpbiB0aGUgY29uZmlnXHJcbiAgICAgKiBcclxuICAgICAqIEBwYXJhbSB7Q29uZmlnfSBjb25maWcgXHJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbmFtZSBcclxuICAgICAqIEBwYXJhbSB7QXJyYXl9IHBhcmFtZXRlcnNcclxuICAgICAqIEByZXR1cm5zIHtJbnN0YW5jZUhvbGRlcn1cclxuICAgICAqL1xyXG4gICAgc3RhdGljIGluc3RhbmNlSG9sZGVyKG5hbWUsIGNvbmZpZywgcGFyYW1ldGVycyA9IFtdKSB7XHJcbiAgICAgICAgY29uc3QgdHlwZUNvbmZpZyA9IHRoaXMudHlwZUNvbmZpZ0J5TmFtZShuYW1lLCBjb25maWcpO1xyXG4gICAgICAgIGlmKHR5cGVDb25maWcgPT09IG51bGwpIHtcclxuICAgICAgICAgICAgTE9HLmVycm9yKFwiTm8gdHlwZWNvbmZpZyBmb3VuZCBmb3IgXCIgKyBuYW1lKTtcclxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNvbnN0IGluc3RhbmNlSG9sZGVyID0gdHlwZUNvbmZpZy5pbnN0YW5jZUhvbGRlcihwYXJhbWV0ZXJzKTtcclxuICAgICAgICBpZighaW5zdGFuY2VIb2xkZXIpIHtcclxuICAgICAgICAgICAgTE9HLmVycm9yKFwiTm8gb2JqZWN0IGZvdW5kIGZvciBcIiArIG5hbWUpO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gaW5zdGFuY2VIb2xkZXI7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBHZXQgdGhlIHR5cGUgY29uZmlnIGJ5IGNsYXNzIG5hbWUgaW4gdGhlIGNvbmZpZ1xyXG4gICAgICogXHJcbiAgICAgKiBAcGFyYW0ge0NvbmZpZ30gY29uZmlnIFxyXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG5hbWUgXHJcbiAgICAgKiBAcmV0dXJucyB7VHlwZUNvbmZpZ31cclxuICAgICAqL1xyXG4gICAgc3RhdGljIHR5cGVDb25maWdCeU5hbWUobmFtZSwgY29uZmlnKSB7XHJcbiAgICAgICAgbGV0IGNvbmZpZ0VudHJ5ID0gbnVsbDtcclxuICAgICAgICBjb25maWcuZ2V0Q29uZmlnRW50cmllcygpLmZvckVhY2goKGtleSwgdmFsdWUsIHBhcmVudCkgPT4ge1xyXG4gICAgICAgICAgICBpZihrZXkgPT09IG5hbWUpIHtcclxuICAgICAgICAgICAgICAgIGNvbmZpZ0VudHJ5ID0gdmFsdWU7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgfSwgdGhpcyk7XHJcbiAgICAgICAgaWYoIWNvbmZpZ0VudHJ5KSB7XHJcbiAgICAgICAgICAgIExPRy5lcnJvcihcIk5vIGNvbmZpZyBlbnRyeSBmb3VuZCBmb3IgXCIgKyBuYW1lKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGNvbmZpZ0VudHJ5O1xyXG4gICAgfVxyXG5cclxufSIsImltcG9ydCB7IExvZ2dlciwgTGlzdCB9IGZyb20gXCJjb3JldXRpbF92MVwiO1xyXG5pbXBvcnQgeyBDb25maWcgfSBmcm9tIFwiLi4vY29uZmlnLmpzXCI7XHJcbmltcG9ydCB7IENvbmZpZ0FjY2Vzc29yIH0gZnJvbSBcIi4uL2NvbmZpZ0FjY2Vzc29yLmpzXCI7XHJcbmltcG9ydCB7IEluc3RhbmNlSG9sZGVyIH0gZnJvbSBcIi4uL3R5cGVDb25maWcvaW5zdGFuY2VIb2xkZXIuanNcIjtcclxuXHJcbmNvbnN0IExPRyA9IG5ldyBMb2dnZXIoXCJDb25maWdQcm9jZXNzb3JFeGVjdXRvclwiKTtcclxuXHJcbi8qKlxyXG4gKiBFeGVjdXRlcyB0aGUgcHJvdmlkZWQgY29uZmlnIHByb2Nlc3NvcnMgb24gdGhlIHByb3ZpZGVkIGNvbmZpZyByZWdpc3RyeVxyXG4gKiBSZXR1cm5zIGEgbGlzdCBvZiBwcm9taXNlcyBmb3Igd2hlbiB0aGUgY29uZmlnIHByb2Nlc3NvcnMgaGFzIGNvbXBsZXRlZCBydW5uaW5nXHJcbiAqIFxyXG4gKiBBIGNvbmZpZyBwcm9jZXNzb3IgcmVhZHMgdGhlIGNvbmZpZyBhbmQgcGVyZm9ybXMgYW55IG5lY2Vzc2FyeSBhY3Rpb25zIGJhc2VkIG9uXHJcbiAqIGNsYXNzIGFuZCB0eXBlIGluZm9ybWF0aW9uLiBBIGNvbmZpZyBwcm9jZXNzb3IgZG9lcyBub3Qgb3BlcmF0ZSBvbiBtYW5hZ2VkIGluc3RhbmNlc1xyXG4gKi9cclxuZXhwb3J0IGNsYXNzIENvbmZpZ1Byb2Nlc3NvckV4ZWN1dG9yIHtcclxuICAgIFxyXG4gICAgLyoqXHJcbiAgICAgKiBAcGFyYW0ge0xpc3R9IGNvbmZpZ1Byb2Nlc3NvckNsYXNzTGlzdFxyXG4gICAgICogQHBhcmFtIHtJbmplY3Rvcn0gaW5qZWN0b3JcclxuICAgICAqIEBwYXJhbSB7Q29uZmlnfSBjb25maWdcclxuICAgICAqIEByZXR1cm5zIHtQcm9taXNlfSBwcm9taXNlIHdoaWNoIGlzIHJlc29sdmVkIHdoZW4gYWxsIGNvbmZpZyBwcm9jZXNzb3JzIGFyZSByZXNvbHZlZFxyXG4gICAgICovXHJcbiAgICBzdGF0aWMgZXhlY3V0ZShjb25maWdQcm9jZXNzb3JDbGFzc05hbWVMaXN0LCBpbmplY3RvciwgY29uZmlnKSB7XHJcbiAgICAgICAgY29uc3QgcHJvbWlzZUxpc3QgPSBuZXcgTGlzdCgpO1xyXG4gICAgICAgIGNvbmZpZ1Byb2Nlc3NvckNsYXNzTmFtZUxpc3QuZm9yRWFjaCgoY29uZmlnUHJvY2Vzc29yQ2xhc3NOYW1lLCBwYXJlbnQpID0+IHtcclxuICAgICAgICAgICAgLyoqICBAdHlwZSB7SW5zdGFuY2VIb2xkZXJ9ICovXHJcbiAgICAgICAgICAgIGNvbnN0IHByb2Nlc3NvckhvbGRlciA9IENvbmZpZ0FjY2Vzc29yLmluc3RhbmNlSG9sZGVyKGNvbmZpZ1Byb2Nlc3NvckNsYXNzTmFtZSwgY29uZmlnKTtcclxuICAgICAgICAgICAgaWYocHJvY2Vzc29ySG9sZGVyLmdldFR5cGUoKSA9PT0gSW5zdGFuY2VIb2xkZXIuTkVXX0lOU1RBTkNFKSB7XHJcbiAgICAgICAgICAgICAgICBpbmplY3Rvci5pbmplY3RUYXJnZXQocHJvY2Vzc29ySG9sZGVyLmdldEluc3RhbmNlKCksIGNvbmZpZyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgY29uc3QgcHJvY2Vzc29yc1Byb21pc2UgPSBwcm9jZXNzb3JIb2xkZXIuZ2V0SW5zdGFuY2UoKS5wcm9jZXNzQ29uZmlnKGNvbmZpZyk7XHJcbiAgICAgICAgICAgIGlmIChwcm9jZXNzb3JzUHJvbWlzZSkge1xyXG4gICAgICAgICAgICAgICAgcHJvbWlzZUxpc3QuYWRkKHByb2Nlc3NvcnNQcm9taXNlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICB9LCB0aGlzKTtcclxuICAgICAgICByZXR1cm4gUHJvbWlzZS5hbGwocHJvbWlzZUxpc3QuZ2V0QXJyYXkoKSk7XHJcbiAgICB9XHJcblxyXG59IiwiZXhwb3J0IGNsYXNzIEluamVjdG9yIHtcclxuXHJcbiAgICBpbmplY3RUYXJnZXQodGFyZ2V0LCBjb25maWcsIGRlcHRoID0gMCkge1xyXG5cclxuICAgIH1cclxuXHJcbn0iLCJpbXBvcnQgeyBMb2dnZXIgfSBmcm9tIFwiY29yZXV0aWxfdjFcIjtcclxuXHJcbmNvbnN0IExPRyA9IG5ldyBMb2dnZXIoXCJJbnN0YW5jZVBvc3RDb25maWdUcmlnZ2VyXCIpO1xyXG5cclxuLyoqXHJcbiAqIEluc3RhbmNlIHByb2Nlc3NvciB3aGljaCBjYWxscyBwb3N0Q29uZmlnIG9uIG9iamVjdHMgYWZ0ZXIgY29uZmlnUHJvY2Vzc29ycyBhcmUgZmluaXNoZWRcclxuICovXHJcbmV4cG9ydCBjbGFzcyBJbnN0YW5jZVBvc3RDb25maWdUcmlnZ2VyIHtcclxuXHJcbiAgICBwcm9jZXNzKGluc3RhbmNlKSB7XHJcbiAgICAgICAgaWYoaW5zdGFuY2UucG9zdENvbmZpZykge1xyXG4gICAgICAgICAgICBpbnN0YW5jZS5wb3N0Q29uZmlnKCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxufSIsImltcG9ydCB7IExvZ2dlciwgTGlzdCB9IGZyb20gXCJjb3JldXRpbF92MVwiO1xyXG5pbXBvcnQgeyBDb25maWdBY2Nlc3NvciB9IGZyb20gXCIuLi9jb25maWdBY2Nlc3Nvci5qc1wiO1xyXG5pbXBvcnQgeyBDb25maWcgfSBmcm9tIFwiLi4vY29uZmlnLmpzXCI7XHJcblxyXG5jb25zdCBMT0cgPSBuZXcgTG9nZ2VyKFwiSW5zdGFuY2VQcm9jZXNzb3JFeGVjdXRvclwiKTtcclxuXHJcbi8qKlxyXG4gKiBFeGVjdXRlcyB0aGUgY29uZmlncyBpbnN0YW5jZSBwcm9jZXNzb3JzIG9uIHRoZSBwcm92aWRlZCBpbnN0YW5jZVxyXG4gKiBSZXR1cm5zIGEgcHJvbWlzZSBmb3Igd2hlbiB0aGUgY29uZmlnIHByb2Nlc3NvcnMgaGFzIGNvbXBsZXRlZCBydW5uaW5nXHJcbiAqIFxyXG4gKiBJbnN0YW5jZSBwcm9jZXNzb3JzIHBlcmZvcm0gb3BlcmF0aW9ucyBvbiBtYW5hZ2VkIGluc3RhbmNlcyBhZnRlciB0aGV5IGhhdmUgYmVlbiBpbnN0YW5zaWF0ZWRcclxuICovXHJcbmV4cG9ydCBjbGFzcyBJbnN0YW5jZVByb2Nlc3NvckV4ZWN1dG9yIHtcclxuXHJcbiAgICAvKipcclxuICAgICAqIEBwYXJhbSB7TGlzdH0gaW5zdGFuY2VQcm9jZXNzb3JMaXN0IHRoZSBpbnN0YW5jZSBwcm9jZXNzb3JzXHJcbiAgICAgKiBAcGFyYW0ge09iZWN0fSBpbnN0YW5jZSB0aGUgaW5zdGFuY2UgdG8gcHJvY2Vzc1xyXG4gICAgICogQHBhcmFtIHtDb25maWd9IGNvbmZpZ1xyXG4gICAgICovXHJcbiAgICBzdGF0aWMgZXhlY3V0ZShpbnN0YW5jZSwgY29uZmlnKSB7XHJcbiAgICAgICAgY29uZmlnLmdldEluc3RhbmNlUHJvY2Vzc29ycygpLmZvckVhY2goKHByb2Nlc3Nvck5hbWUsIHBhcmVudCkgPT4ge1xyXG4gICAgICAgICAgICBjb25zdCBwcm9jZXNzb3JIb2xkZXIgPSBDb25maWdBY2Nlc3Nvci5pbnN0YW5jZUhvbGRlcihwcm9jZXNzb3JOYW1lLCBjb25maWcpO1xyXG4gICAgICAgICAgICBwcm9jZXNzb3JIb2xkZXIuZ2V0SW5zdGFuY2UoKS5wcm9jZXNzKGluc3RhbmNlKTtcclxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgfSwgdGhpcyk7XHJcbiAgICB9XHJcblxyXG59IiwiaW1wb3J0IHsgVHlwZUNvbmZpZyB9IGZyb20gXCIuL3R5cGVDb25maWcuanNcIjtcclxuaW1wb3J0IHsgTG9nZ2VyIH0gZnJvbSBcImNvcmV1dGlsX3YxXCI7XHJcbmltcG9ydCB7IEluc3RhbmNlSG9sZGVyIH0gZnJvbSBcIi4vaW5zdGFuY2VIb2xkZXIuanNcIjtcclxuXHJcbmNvbnN0IExPRyA9IG5ldyBMb2dnZXIoXCJTaW5nbGV0b25Db25maWdcIik7XHJcblxyXG5leHBvcnQgY2xhc3MgU2luZ2xldG9uQ29uZmlnIGV4dGVuZHMgVHlwZUNvbmZpZyB7XHJcblxyXG4gICAgc3RhdGljIG5hbWVkKG5hbWUsIGNsYXNzUmVmZXJlbmNlKSB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBTaW5nbGV0b25Db25maWcobmFtZSwgY2xhc3NSZWZlcmVuY2UpO1xyXG4gICAgfVxyXG5cclxuICAgIHN0YXRpYyB1bm5hbWVkKGNsYXNzUmVmZXJlbmNlKSB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBTaW5nbGV0b25Db25maWcoY2xhc3NSZWZlcmVuY2UubmFtZSwgY2xhc3NSZWZlcmVuY2UpO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0cnVjdG9yKG5hbWUsIGNsYXNzUmVmZXJlbmNlKSB7XHJcbiAgICAgICAgc3VwZXIobmFtZSwgY2xhc3NSZWZlcmVuY2UpO1xyXG4gICAgfVxyXG5cclxuICAgIGluc3RhbmNlSG9sZGVyKHBhcmFtZXRlcnMgPSBbXSkge1xyXG4gICAgICAgIGlmICghdGhpcy5pbnN0YW5jZSkge1xyXG4gICAgICAgICAgICBpZihwYXJhbWV0ZXJzICYmIHBhcmFtZXRlcnMubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5pbnN0YW5jZSA9IG5ldyB0aGlzLmNsYXNzUmVmZXJlbmNlKC4uLnBhcmFtZXRlcnMpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5pbnN0YW5jZSA9IG5ldyB0aGlzLmNsYXNzUmVmZXJlbmNlKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIEluc3RhbmNlSG9sZGVyLmhvbGRlcldpdGhOZXdJbnN0YW5jZSh0aGlzLmluc3RhbmNlKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIEluc3RhbmNlSG9sZGVyLmhvbGRlcldpdGhFeGlzdGluZ0luc3RhbmNlKHRoaXMuaW5zdGFuY2UpO1xyXG4gICAgfVxyXG5cclxufSIsImltcG9ydCB7IFByb3ZpZGVyIH0gZnJvbSBcIi4vYXBpL3Byb3ZpZGVyLmpzXCI7XHJcbmltcG9ydCB7IFR5cGVDb25maWcgfSBmcm9tIFwiLi90eXBlQ29uZmlnL3R5cGVDb25maWcuanNcIjtcclxuaW1wb3J0IHsgSW5zdGFuY2VIb2xkZXIgfSBmcm9tIFwiLi90eXBlQ29uZmlnL2luc3RhbmNlSG9sZGVyLmpzXCI7XHJcbmltcG9ydCB7IEluamVjdG9yIH0gZnJvbSBcIi4vaW5qZWN0b3IuanNcIjtcclxuaW1wb3J0IHsgQ29uZmlnIH0gZnJvbSBcIi4vY29uZmlnLmpzXCI7XHJcblxyXG5leHBvcnQgY2xhc3MgTWluZGlQcm92aWRlciBleHRlbmRzIFByb3ZpZGVyIHtcclxuXHJcbiAgICAvKipcclxuICAgICAqIFxyXG4gICAgICogQHBhcmFtIHtUeXBlQ29uZmlnfSB0eXBlQ29uZmlnIFxyXG4gICAgICovXHJcbiAgICBjb25zdHJ1Y3Rvcih0eXBlQ29uZmlnLCBpbmplY3RvciwgY29uZmlnKSB7XHJcbiAgICAgICAgLyoqIEB0eXBlIHtUeXBlQ29uZmlnfSAqL1xyXG4gICAgICAgIHRoaXMudHlwZUNvbmZpZyA9IHR5cGVDb25maWc7XHJcblxyXG4gICAgICAgIC8qKiBAdHlwZSB7SW5qZWN0b3J9ICovXHJcbiAgICAgICAgdGhpcy5pbmplY3RvciA9IGluamVjdG9yO1xyXG5cclxuICAgICAgICAvKiogQHR5cGUge0NvbmZpZ30gKi9cclxuICAgICAgICB0aGlzLmNvbmZpZyA9IGNvbmZpZztcclxuICAgIH1cclxuXHJcbiAgICBnZXQocGFyYW1ldGVycyA9IFtdKSB7XHJcbiAgICAgICAgLyoqIEB0eXBlIHtJbnN0YW5jZUhvbGRlcn0gKi9cclxuICAgICAgICBjb25zdCBpbnN0YW5jZUhvbGRlciA9IHRoaXMudHlwZUNvbmZpZy5pbnN0YW5jZUhvbGRlcihwYXJhbWV0ZXJzKTtcclxuICAgICAgICBpZiAoaW5zdGFuY2VIb2xkZXIuZ2V0VHlwZSgpID09PSBJbnN0YW5jZUhvbGRlci5ORVdfSU5TVEFOQ0UpIHtcclxuICAgICAgICAgICAgdGhpcy5pbmplY3Rvci5pbmplY3RUYXJnZXQoaW5zdGFuY2VIb2xkZXIuZ2V0SW5zdGFuY2UoKSwgdGhpcy5jb25maWcpXHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBpbnNhdGFuY2VIb2xkZXIuZ2V0SW5zdGFuY2UoKTtcclxuICAgIH1cclxuXHJcbn0iLCJpbXBvcnQgeyBMb2dnZXIgfSBmcm9tIFwiY29yZXV0aWxfdjFcIjtcclxuaW1wb3J0IHsgQ29uZmlnIH0gZnJvbSBcIi4vY29uZmlnLmpzXCI7XHJcbmltcG9ydCB7IENvbmZpZ0FjY2Vzc29yIH0gZnJvbSBcIi4vY29uZmlnQWNjZXNzb3IuanNcIjtcclxuaW1wb3J0IHsgSW5qZWN0aW9uUG9pbnQgfSBmcm9tIFwiLi9hcGkvaW5qZWN0aW9uUG9pbnQuanNcIlxyXG5pbXBvcnQgeyBJbnN0YW5jZVByb2Nlc3NvckV4ZWN1dG9yIH0gZnJvbSBcIi4vaW5zdGFuY2VQcm9jZXNzb3IvaW5zdGFuY2VQcm9jZXNzb3JFeGVjdXRvci5qc1wiO1xyXG5pbXBvcnQgeyBJbnN0YW5jZUhvbGRlciB9IGZyb20gXCIuL3R5cGVDb25maWcvaW5zdGFuY2VIb2xkZXIuanNcIjtcclxuaW1wb3J0IHsgTWluZGlQcm92aWRlciB9IGZyb20gXCIuL21pbmRpUHJvdmlkZXIuanNcIjtcclxuaW1wb3J0IHsgSW5qZWN0b3IgfSBmcm9tIFwiLi9pbmplY3Rvci5qc1wiO1xyXG5cclxuY29uc3QgTE9HID0gbmV3IExvZ2dlcihcIk1pbmRpSW5qZWN0b3JcIik7XHJcblxyXG5leHBvcnQgY2xhc3MgTWluZGlJbmplY3RvciBleHRlbmRzIEluamVjdG9yIHtcclxuXHJcbiAgICBzdGF0aWMgaW5qZWN0KHRhcmdldCwgY29uZmlnKSB7XHJcbiAgICAgICAgSU5KRUNUT1IuaW5qZWN0VGFyZ2V0KHRhcmdldCwgY29uZmlnKTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIEByZXR1cm5zIHtNaW5kaUluamVjdG9yfVxyXG4gICAgICovXHJcbiAgICBzdGF0aWMgZ2V0SW5zdGFuY2UoKSB7XHJcbiAgICAgICAgcmV0dXJuIElOSkVDVE9SO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogSGVscGVyIG1ldGhvZCBmb3IgaW5qZWN0aW5nIGZpZWxkcyBpbiB0YXJnZXQgb2JqZWN0XHJcbiAgICAgKiBcclxuICAgICAqIEBwYXJhbSB7YW55fSB0YXJnZXQgXHJcbiAgICAgKiBAcGFyYW0ge0NvbmZpZ30gY29uZmlnIFxyXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGRlcHRoXHJcbiAgICAgKi9cclxuICAgIGluamVjdFRhcmdldCh0YXJnZXQsIGNvbmZpZywgZGVwdGggPSAwKSB7XHJcbiAgICAgICAgaWYgKCF0YXJnZXQpIHtcclxuICAgICAgICAgICAgdGhyb3cgRXJyb3IoXCJNaXNzaW5nIHRhcmdldCBvYmplY3RcIik7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICghY29uZmlnKSB7XHJcbiAgICAgICAgICAgIHRocm93IEVycm9yKFwiTWlzc2luZyBjb25maWdcIik7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICghY29uZmlnLmdldEZpbmFsaXplZCgpKSB7XHJcbiAgICAgICAgICAgIHRocm93IEVycm9yKFwiQ29uZmlnIG5vdCBmaW5hbGl6ZWRcIik7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChkZXB0aCA+IDEwKSB7XHJcbiAgICAgICAgICAgIHRocm93IEVycm9yKFwiSW5qZWN0aW9uIHN0cnVjdHVyZSB0b28gZGVlcFwiKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgY29uc3QgaW5qZWN0b3IgPSB0aGlzO1xyXG4gICAgICAgIE9iamVjdC5rZXlzKHRhcmdldCkuZm9yRWFjaChmdW5jdGlvbihrZXksaW5kZXgpIHtcclxuICAgICAgICAgICAgaWYgKHRhcmdldFtrZXldIGluc3RhbmNlb2YgSW5qZWN0aW9uUG9pbnQpIHtcclxuICAgICAgICAgICAgICAgIGluamVjdG9yLmluamVjdFByb3BlcnR5KHRhcmdldCwga2V5LCBjb25maWcsIGRlcHRoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIEluc3RhbmNlUHJvY2Vzc29yRXhlY3V0b3IuZXhlY3V0ZSh0YXJnZXQsIGNvbmZpZyk7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gdGFyZ2V0IFxyXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGtleSBcclxuICAgICAqIEBwYXJhbSB7Q29uZmlnfSBjb25maWcgXHJcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gZGVwdGggXHJcbiAgICAgKi9cclxuICAgIGluamVjdFByb3BlcnR5KHRhcmdldCwga2V5LCBjb25maWcsIGRlcHRoKSB7XHJcbiAgICAgICAgY29uc3QgaW5qZWN0aW9uUG9pbnQgPSB0YXJnZXRba2V5XTtcclxuICAgICAgICBpZiAoaW5qZWN0aW9uUG9pbnQuZ2V0VHlwZSgpID09PSBJbmplY3Rpb25Qb2ludC5QUk9WSURFUl9UWVBFKSB7XHJcbiAgICAgICAgICAgIHRoaXMuaW5qZWN0UHJvcGVydHlQcm92aWRlcih0YXJnZXQsIGtleSwgY29uZmlnLCBkZXB0aCk7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy5pbmplY3RQcm9wZXJ0eUluc3RhbmNlKHRhcmdldCwga2V5LCBjb25maWcpO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHRhcmdldCBcclxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBrZXkgXHJcbiAgICAgKiBAcGFyYW0ge0NvbmZpZ30gY29uZmlnIFxyXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGRlcHRoIFxyXG4gICAgICovXHJcbiAgICBpbmplY3RQcm9wZXJ0eVByb3ZpZGVyKHRhcmdldCwga2V5LCBjb25maWcpIHtcclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBAdHlwZSB7SW5qZWN0aW9uUG9pbnR9XHJcbiAgICAgICAgICovXHJcbiAgICAgICAgY29uc3QgaW5qZWN0aW9uUG9pbnQgPSB0YXJnZXRba2V5XTtcclxuICAgICAgICBjb25zdCB0eXBlQ29uZmlnID0gQ29uZmlnQWNjZXNzb3IudHlwZUNvbmZpZ0J5TmFtZShpbmplY3Rpb25Qb2ludC5nZXROYW1lKCksIGNvbmZpZyk7XHJcbiAgICAgICAgdGFyZ2V0W2tleV0gPSBuZXcgTWluZGlQcm92aWRlcih0eXBlQ29uZmlnLCB0aGlzLCBjb25maWcpO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHRhcmdldCBcclxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBrZXkgXHJcbiAgICAgKiBAcGFyYW0ge0NvbmZpZ30gY29uZmlnIFxyXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGRlcHRoIFxyXG4gICAgICovXHJcbiAgICBpbmplY3RQcm9wZXJ0eUluc3RhbmNlKHRhcmdldCwga2V5LCBjb25maWcsIGRlcHRoKSB7XHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogQHR5cGUge0luamVjdGlvblBvaW50fVxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIGNvbnN0IGluamVjdGlvblBvaW50ID0gdGFyZ2V0W2tleV07XHJcbiAgICAgICAgY29uc3QgaW5zdGFuY2VIb2xkZXIgPSBDb25maWdBY2Nlc3Nvci5pbnN0YW5jZUhvbGRlcihpbmplY3Rpb25Qb2ludC5nZXROYW1lKCksIGNvbmZpZywgaW5qZWN0aW9uUG9pbnQuZ2V0UGFyYW1ldGVycygpKTtcclxuICAgICAgICBpZihpbnN0YW5jZUhvbGRlci5nZXRUeXBlKCkgPT09IEluc3RhbmNlSG9sZGVyLk5FV19JTlNUQU5DRSkge1xyXG4gICAgICAgICAgICB0aGlzLmluamVjdFRhcmdldChpbnN0YW5jZUhvbGRlci5nZXRJbnN0YW5jZSgpLCBjb25maWcsIGRlcHRoKyspO1xyXG4gICAgICAgIH1cclxuICAgICAgICB0YXJnZXRba2V5XSA9IGluc3RhbmNlSG9sZGVyLmdldEluc3RhbmNlKCk7XHJcbiAgICB9XHJcblxyXG59XHJcblxyXG5jb25zdCBJTkpFQ1RPUiA9IG5ldyBNaW5kaUluamVjdG9yKCk7IiwiaW1wb3J0IHsgTWFwLCBMaXN0LCBMb2dnZXIgfSBmcm9tIFwiY29yZXV0aWxfdjFcIjtcclxuaW1wb3J0IHsgVHlwZUNvbmZpZyB9IGZyb20gXCIuL3R5cGVDb25maWcvdHlwZUNvbmZpZy5qc1wiO1xyXG5pbXBvcnQgeyBDb25maWdQcm9jZXNzb3JFeGVjdXRvciB9IGZyb20gXCIuL2NvbmZpZ1Byb2Nlc3Nvci9jb25maWdQcm9jZXNzb3JFeGVjdXRvci5qc1wiO1xyXG5pbXBvcnQgeyBTaW5nbGV0b25Db25maWcgfSBmcm9tIFwiLi90eXBlQ29uZmlnL3NpbmdsZXRvbkNvbmZpZy5qc1wiO1xyXG5pbXBvcnQgeyBDb25maWcgfSBmcm9tIFwiLi9jb25maWcuanNcIjtcclxuaW1wb3J0IHsgTWluZGlJbmplY3RvciB9IGZyb20gXCIuL21pbmRpSW5qZWN0b3IuanNcIjtcclxuXHJcbmNvbnN0IExPRyA9IG5ldyBMb2dnZXIoXCJDb25maWdcIik7XHJcblxyXG5leHBvcnQgY2xhc3MgTWluZGlDb25maWcgZXh0ZW5kcyBDb25maWcge1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgICAgIHN1cGVyKCk7XHJcbiAgICAgICAgdGhpcy5maW5hbGl6ZWQgPSBmYWxzZTtcclxuICAgICAgICB0aGlzLmNvbmZpZ0VudHJpZXMgPSBuZXcgTWFwKCk7XHJcbiAgICAgICAgdGhpcy5jb25maWdQcm9jZXNzb3JzID0gbmV3IExpc3QoKTtcclxuICAgICAgICB0aGlzLmluc3RhbmNlUHJvY2Vzc29ycyA9IG5ldyBMaXN0KCk7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBcclxuICAgICAqIEBwYXJhbSB7Q29uZmlnfSBjb25maWcgXHJcbiAgICAgKi9cclxuICAgIG1lcmdlKGNvbmZpZykge1xyXG4gICAgICAgIGlmICghY29uZmlnLmdldEZpbmFsaXplZCgpKSB7XHJcbiAgICAgICAgICAgIHRocm93IEVycm9yKFwiQ2Fubm90IG1lcmdlIGludG8gYW4gdW5maW5hbGl6ZWQgY29uZmlnXCIpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjb25zdCBuZXdDb25maWdFbnRyaWVzID0gbmV3IE1hcCgpO1xyXG4gICAgICAgIG5ld0NvbmZpZ0VudHJpZXMuYWRkQWxsKHRoaXMuY29uZmlnRW50cmllcyk7XHJcbiAgICAgICAgbmV3Q29uZmlnRW50cmllcy5hZGRBbGwoY29uZmlnLmdldENvbmZpZ0VudHJpZXMoKSk7XHJcblxyXG4gICAgICAgIGNvbnN0IG5ld0NvbmZpZ1Byb2Nlc3NvcnMgPSBuZXcgTGlzdCgpO1xyXG4gICAgICAgIG5ld0NvbmZpZ1Byb2Nlc3NvcnMuYWRkQWxsKHRoaXMuY29uZmlnUHJvY2Vzc29ycyk7XHJcbiAgICAgICAgbmV3Q29uZmlnUHJvY2Vzc29ycy5hZGRBbGwoY29uZmlnLmdldENvbmZpZ1Byb2Nlc3NvcnMoKSk7XHJcblxyXG4gICAgICAgIGNvbnN0IG5ld0luc3RhbmNlUHJvY2Vzc29ycyA9IG5ldyBMaXN0KCk7XHJcbiAgICAgICAgbmV3SW5zdGFuY2VQcm9jZXNzb3JzLmFkZEFsbCh0aGlzLmluc3RhbmNlUHJvY2Vzc29ycyk7XHJcbiAgICAgICAgbmV3SW5zdGFuY2VQcm9jZXNzb3JzLmFkZEFsbChjb25maWcuZ2V0SW5zdGFuY2VQcm9jZXNzb3JzKCkpO1xyXG5cclxuICAgICAgICB0aGlzLmNvbmZpZ0VudHJpZXMgPSBuZXdDb25maWdFbnRyaWVzO1xyXG4gICAgICAgIHRoaXMuY29uZmlnUHJvY2Vzc29ycyA9IG5ld0NvbmZpZ1Byb2Nlc3NvcnM7XHJcbiAgICAgICAgdGhpcy5pbnN0YW5jZVByb2Nlc3NvcnMgPSBuZXdJbnN0YW5jZVByb2Nlc3NvcnM7XHJcblxyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogXHJcbiAgICAgKiBAcGFyYW0ge1R5cGVDb25maWd9IHR5cGVDb25maWcgXHJcbiAgICAgKi9cclxuICAgIGFkZFR5cGVDb25maWcodHlwZUNvbmZpZykge1xyXG4gICAgICAgIHRoaXMuY29uZmlnRW50cmllcy5zZXQodHlwZUNvbmZpZy5nZXROYW1lKCksIHR5cGVDb25maWcpO1xyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfVxyXG5cclxuICAgIGFkZENvbmZpZ1Byb2Nlc3Nvcihjb25maWdQcm9jZXNzb3IpIHtcclxuICAgICAgICB0aGlzLmNvbmZpZ1Byb2Nlc3NvcnMuYWRkKGNvbmZpZ1Byb2Nlc3Nvci5uYW1lKTtcclxuICAgICAgICByZXR1cm4gdGhpcy5hZGRUeXBlQ29uZmlnKFNpbmdsZXRvbkNvbmZpZy51bm5hbWVkKGNvbmZpZ1Byb2Nlc3NvcikpO1xyXG4gICAgfVxyXG5cclxuICAgIGFkZEluc3RhbmNlUHJvY2Vzc29yKGluc3RhbmNlUHJvY2Vzc29yKSB7XHJcbiAgICAgICAgdGhpcy5pbnN0YW5jZVByb2Nlc3NvcnMuYWRkKGluc3RhbmNlUHJvY2Vzc29yLm5hbWUpO1xyXG4gICAgICAgIHJldHVybiB0aGlzLmFkZFR5cGVDb25maWcoU2luZ2xldG9uQ29uZmlnLnVubmFtZWQoaW5zdGFuY2VQcm9jZXNzb3IpKTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIFxyXG4gICAgICogQHBhcmFtIHtMaXN0fSB0eXBlQ29uZmlnTGlzdFxyXG4gICAgICovXHJcbiAgICBhZGRBbGxUeXBlQ29uZmlnKHR5cGVDb25maWdMaXN0KSB7XHJcbiAgICAgICAgdHlwZUNvbmZpZ0xpc3QuZm9yRWFjaCgodHlwZUNvbmZpZyxwYXJlbnQpID0+IHtcclxuICAgICAgICAgICAgdGhpcy5jb25maWdFbnRyaWVzLnNldCh0eXBlQ29uZmlnLmdldE5hbWUoKSwgdHlwZUNvbmZpZyk7XHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgIH0sdGhpcyk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBcclxuICAgICAqIEBwYXJhbSB7TGlzdH0gY29uZmlnUHJvY2Vzc29yTGlzdCBcclxuICAgICAqL1xyXG4gICAgYWRkQWxsQ29uZmlnUHJvY2Vzc29yKGNvbmZpZ1Byb2Nlc3Nvckxpc3QpIHtcclxuICAgICAgICBjb25maWdQcm9jZXNzb3JMaXN0LmZvckVhY2goKGNvbmZpZ1Byb2Nlc3NvcixwYXJlbnQpID0+IHtcclxuICAgICAgICAgICAgdGhpcy5jb25maWdQcm9jZXNzb3JzLmFkZChjb25maWdQcm9jZXNzb3IubmFtZSk7XHJcbiAgICAgICAgICAgIHRoaXMuYWRkVHlwZUNvbmZpZyhTaW5nbGV0b25Db25maWcudW5uYW1lZChjb25maWdQcm9jZXNzb3IpKTtcclxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgfSx0aGlzKTtcclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIFxyXG4gICAgICogQHBhcmFtIHtMaXN0fSBpbnN0YW5jZVByb2Nlc3Nvckxpc3QgXHJcbiAgICAgKi9cclxuICAgIGFkZEFsbEluc3RhbmNlUHJvY2Vzc29yKGluc3RhbmNlUHJvY2Vzc29yTGlzdCkge1xyXG4gICAgICAgIGluc3RhbmNlUHJvY2Vzc29yTGlzdC5mb3JFYWNoKChpbnN0YW5jZVByb2Nlc3NvcixwYXJlbnQpID0+IHtcclxuICAgICAgICAgICAgdGhpcy5pbnN0YW5jZVByb2Nlc3NvcnMuYWRkKGluc3RhbmNlUHJvY2Vzc29yLm5hbWUpO1xyXG4gICAgICAgICAgICB0aGlzLmFkZFR5cGVDb25maWcoU2luZ2xldG9uQ29uZmlnLnVubmFtZWQoaW5zdGFuY2VQcm9jZXNzb3IpKTtcclxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgfSx0aGlzKTtcclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIEByZXR1cm5zIHtNYXB9XHJcbiAgICAgKi9cclxuICAgIGdldENvbmZpZ0VudHJpZXMoKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuY29uZmlnRW50cmllcztcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIEByZXR1cm5zIHtMaXN0fVxyXG4gICAgICovXHJcbiAgICBnZXRDb25maWdQcm9jZXNzb3JzKCkge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmNvbmZpZ1Byb2Nlc3NvcnM7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBAcmV0dXJucyB7TGlzdH1cclxuICAgICAqL1xyXG4gICAgZ2V0SW5zdGFuY2VQcm9jZXNzb3JzKCkge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmluc3RhbmNlUHJvY2Vzc29ycztcclxuICAgIH1cclxuXHJcbiAgICBnZXRGaW5hbGl6ZWQoKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuZmluYWxpemVkO1xyXG4gICAgfVxyXG5cclxuICAgIGZpbmFsaXplKCkge1xyXG4gICAgICAgIHRoaXMuZmluYWxpemVkID0gdHJ1ZTtcclxuICAgICAgICByZXR1cm4gQ29uZmlnUHJvY2Vzc29yRXhlY3V0b3IuZXhlY3V0ZSh0aGlzLmdldENvbmZpZ1Byb2Nlc3NvcnMoKSwgTWluZGlJbmplY3Rvci5nZXRJbnN0YW5jZSgpLCB0aGlzKTtcclxuICAgIH1cclxuXHJcbn0iLCJpbXBvcnQgeyBUeXBlQ29uZmlnIH0gZnJvbSBcIi4vdHlwZUNvbmZpZy5qc1wiO1xyXG5cclxuZXhwb3J0IGNsYXNzIFBvb2xDb25maWcgZXh0ZW5kcyBUeXBlQ29uZmlnIHtcclxuXHJcbiAgICBzdGF0aWMgbmFtZWQobmFtZSwgY2xhc3NSZWZlcmVuY2UsIHBvb2xTaXplKSB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBQb29sQ29uZmlnKG5hbWUsIGNsYXNzUmVmZXJlbmNlLCBwb29sU2l6ZSk7XHJcbiAgICB9XHJcblxyXG4gICAgc3RhdGljIHVubmFtZWQoY2xhc3NSZWZlcmVuY2UsIHBvb2xTaXplKSB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBQb29sQ29uZmlnKGNsYXNzUmVmZXJlbmNlLm5hbWUsIGNsYXNzUmVmZXJlbmNlLCBwb29sU2l6ZSk7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3RydWN0b3IobmFtZSwgY2xhc3NSZWZlcmVuY2UsIHBvb2xTaXplKSB7XHJcbiAgICAgICAgc3VwZXIobmFtZSwgY2xhc3NSZWZlcmVuY2UpO1xyXG4gICAgICAgIHRoaXMucG9vbFNpemUgPSBwb29sU2l6ZTtcclxuICAgIH1cclxuXHJcbiAgICBpbnN0YW5jZUhvbGRlcihwYXJhbWV0ZXJzID0gW10pIHtcclxuXHJcbiAgICB9XHJcblxyXG59IiwiaW1wb3J0IHsgVHlwZUNvbmZpZyB9IGZyb20gXCIuL3R5cGVDb25maWcuanNcIjtcclxuaW1wb3J0IHsgSW5zdGFuY2VIb2xkZXIgfSBmcm9tIFwiLi9pbnN0YW5jZUhvbGRlci5qc1wiO1xyXG5cclxuZXhwb3J0IGNsYXNzIFByb3RvdHlwZUNvbmZpZyBleHRlbmRzIFR5cGVDb25maWcge1xyXG5cclxuICAgIHN0YXRpYyBuYW1lZChuYW1lLCBjbGFzc1JlZmVyZW5jZSkge1xyXG4gICAgICAgIHJldHVybiBuZXcgUHJvdG90eXBlQ29uZmlnKG5hbWUsIGNsYXNzUmVmZXJlbmNlKTtcclxuICAgIH1cclxuXHJcbiAgICBzdGF0aWMgdW5uYW1lZChjbGFzc1JlZmVyZW5jZSkge1xyXG4gICAgICAgIHJldHVybiBuZXcgUHJvdG90eXBlQ29uZmlnKGNsYXNzUmVmZXJlbmNlLm5hbWUsIGNsYXNzUmVmZXJlbmNlKTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdHJ1Y3RvcihuYW1lLCBjbGFzc1JlZmVyZW5jZSkge1xyXG4gICAgICAgIHN1cGVyKG5hbWUsIGNsYXNzUmVmZXJlbmNlKTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIEBwYXJhbSB7YXJyYXl9IHBhcmFtZXRlcnMgdGhlIHBhcmFtZXRlcnMgdG8gdXNlIGZvciB0aGUgY29uc3RydWN0b3JcclxuICAgICAqL1xyXG4gICAgaW5zdGFuY2VIb2xkZXIocGFyYW1ldGVycyA9IFtdKSB7XHJcbiAgICAgICAgbGV0IGluc3RhbmNlID0gbnVsbDtcclxuICAgICAgICBpZihwYXJhbWV0ZXJzICYmIHBhcmFtZXRlcnMubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICBpbnN0YW5jZSA9IG5ldyB0aGlzLmNsYXNzUmVmZXJlbmNlKC4uLnBhcmFtZXRlcnMpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGluc3RhbmNlID0gbmV3IHRoaXMuY2xhc3NSZWZlcmVuY2UoKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIEluc3RhbmNlSG9sZGVyLmhvbGRlcldpdGhOZXdJbnN0YW5jZShpbnN0YW5jZSk7XHJcbiAgICB9XHJcblxyXG5cclxufSJdLCJuYW1lcyI6WyJMb2dnZXIiLCJMT0ciLCJMaXN0IiwiTWFwIl0sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBTyxNQUFNLGNBQWMsQ0FBQzs7SUFFeEIsV0FBVyxhQUFhLEdBQUcsRUFBRSxPQUFPLENBQUMsQ0FBQyxFQUFFO0lBQ3hDLFdBQVcsYUFBYSxHQUFHLEVBQUUsT0FBTyxDQUFDLENBQUMsRUFBRTs7SUFFeEMsT0FBTyxjQUFjLENBQUMsSUFBSSxFQUFFLGNBQWMsRUFBRSxVQUFVLEdBQUcsRUFBRSxFQUFFO1FBQ3pELE9BQU8sSUFBSSxjQUFjLENBQUMs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
