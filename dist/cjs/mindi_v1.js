'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var coreutil_v1 = require('coreutil_v1');

class Config {

    constructor() {
        /** @type {Map} */
        this.configEntries = null;

        /** @type {List} */
        this.configProcessors = null;

        /** @type {List} */
        this.instanceProcessors = null;
    }

    /**
     * @returns {Promise}
     */
    finalize() {

    }

    /**
     * @returns {Boolean}
     */
    isFinalized() {
        return false;
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

}

class TypeConfig {

    static get NEW() { return "NEW"; }
    static get CONFIGURED() { return "CONFIGURED"; }

    constructor(name, classReference) {
        this.name = name;
        this.classReference = classReference;
        this.stage = TypeConfig.NEW;
    }

    instanceHolder(parameters = []) {
        return null;
    }

}

const LOG = new coreutil_v1.Logger("ConfigAccessor");

/**
 * Utilities for accessing a Config object
 */
class ConfigAccessor {

    /**
     * Get an instance by class name in the config
     * 
     * @param {string} name 
     * @param {Config} config 
     * @param {Array} parameters
     * @returns {InstanceHolder}
     */
    static instanceHolder(name, config, parameters = []) {
        const typeConfig = this.typeConfigByName(name, config);
        if(typeConfig === null) {
            LOG.error("No typeconfig found for " + name);
            return null;
        }
        const instanceHolder = typeConfig.instanceHolder(parameters);
        if(!instanceHolder) {
            LOG.error("No object found for " + name);
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
        config.configEntries.forEach((key, value, parent) => {
            if(key === name) {
                configEntry = value;
                return false;
            }
            return true;
        }, this);
        if(!configEntry) {
            LOG.error("No config entry found for " + name);
        }
        return configEntry;
    }

}

class Injector {


    /**
     * Helper method for injecting fields in target object
     * 
     * @param {any} targetObject 
     * @param {Config} config 
     * @param {number} depth
     * @returns {Promise}
     */
    injectTarget(target, config, depth = 0) {

    }

}

const LOG$1 = new coreutil_v1.Logger("ConfigProcessorExecutor");

/**
 * Executes the provided config processors on the provided config registry
 * Returns a list of promises for when the config processors has completed running
 * 
 * A config processor reads the config and performs any necessary actions based on
 * class and type information. A config processor does not operate on managed instances
 */
class ConfigProcessorExecutor {
    
    /**
     * @param {List<String>} configProcessorClassNameList
     * @param {Injector} injector
     * @param {Config} config
     * @returns {Promise} promise which is resolved when all config processors are resolved
     */
    static execute(configProcessorClassNameList, injector, config) {
        return configProcessorClassNameList.promiseChain((configProcessorClassName, parent) => {
            return new Promise((resolveConfigProcessorExecuted, reject) => {

                let targetInjectedPromise = Promise.resolve();

                /**  @type {InstanceHolder} */
                const processorHolder = ConfigAccessor.instanceHolder(configProcessorClassName, config);
                if(processorHolder.type === InstanceHolder.NEW_INSTANCE) {
                    targetInjectedPromise = injector.injectTarget(processorHolder.instance, config);
                }

                targetInjectedPromise.then(() => {
                    const toConfigureMap = ConfigProcessorExecutor.prepareUnconfiguredConfigEntries(config.configEntries);
                    processorHolder.instance.processConfig(config, toConfigureMap).then(() => {
                        resolveConfigProcessorExecuted();
                    });
                });
            });
        })
    }

    /**
     * 
     * @param {Map} configEntries 
     * @return {Map}
     */
    static prepareUnconfiguredConfigEntries(configEntries) {
        const unconfiguredConfigEntries = new coreutil_v1.Map();

        configEntries.forEach((key, value, parent) => {

            /** @type {TypeConfig} */
            const configEntry = value;

            if(configEntry.stage === TypeConfig.NEW) {
                unconfiguredConfigEntries.set(key, configEntry);
                configEntry.stage = TypeConfig.CONFIGURED;
            }

            return true;
        }, this);

        return unconfiguredConfigEntries;
    }

}

const LOG$2 = new coreutil_v1.Logger("SingletonConfig");

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

const LOG$3 = new coreutil_v1.Logger("Provider");

/**
 * @template T
 */
class Provider {

    /**
     * 
     * @param {Array} parameters 
     * @returns {Promise<T>}
     */
    get(parameters = []) {
        return null;
    }

}

class InjectionPoint {

    static get INSTANCE_TYPE() { return 0; } 
    static get PROVIDER_TYPE() { return 1; } 

    /**
     * @template T
     * @param {string} name 
     * @param {new() => T} classReference 
     * @param {array} parameters 
     * @returns {T}
     */
    static instanceByName(name, classReference, parameters = []) {
        return new InjectionPoint(name, classReference, InjectionPoint.INSTANCE_TYPE, parameters);
    }

    /**
     * @template T
     * @param {new() => T} classReference 
     * @param {array} parameters 
     * @returns {T}
     */
    static instance(classReference, parameters = []) {
        return new InjectionPoint(classReference.name, classReference, InjectionPoint.INSTANCE_TYPE, parameters);
    }

    /**
     * @template T
     * @param {string} name 
     * @param {new() => T} classReference 
     * @returns {Provider<T>}
     */
    static providerByName(name, classReference) {
        return new InjectionPoint(name, classReference, InjectionPoint.PROVIDER_TYPE);
    }

    /**
     * @template T
     * @param {new() => T} classReference 
     * @returns {Provider<T>}
     */
    static provider(classReference) {
        return new InjectionPoint(classReference.name, classReference, InjectionPoint.PROVIDER_TYPE);
    }

    constructor(name, classReference, type = InjectionPoint.INSTANCE_TYPE, parameters = null) {
        this.name = name;
        this.classReference = classReference;
        this.type = type;
        this.parameters = parameters;
    }

}

const LOG$4 = new coreutil_v1.Logger("InstanceProcessorExecutor");

/**
 * Executes the configs instance processors on the provided instance
 * Returns a promise for when the instance processors has completed running
 * 
 * Instance processors perform operations on managed instances after they have been instansiated
 */
class InstanceProcessorExecutor {

    /**
     * @param {List} instanceProcessorList the instance processors
     * @param {Object} instance the instance to process
     * @param {Config} config
     * @returns {Promise}
     */
    static execute(instance, config) {
        return config.instanceProcessors.promiseChain((processorName, parent) => {
            const processorHolder = ConfigAccessor.instanceHolder(processorName, config);
            return processorHolder.instance.process(instance);
        }, this);
    }

}

/**
 * @template T
 */
class MindiProvider extends Provider {

    /**
     * 
     * @param {TypeConfig} typeConfig 
     * @param {Injector} injector
     * @param {Config} config
     */
    constructor(typeConfig, injector, config) {

        super();

        /** @type {TypeConfig} */
        this.typeConfig = typeConfig;

        /** @type {Injector} */
        this.injector = injector;

        /** @type {Config} */
        this.config = config;
    }

    /**
     * 
     * @param {Array} parameters 
     * @returns {Promise<T>}
     */
    get(parameters = []) {
        /** @type {InstanceHolder} */
        const instanceHolder = ConfigAccessor.instanceHolder(this.typeConfig.name, this.config, parameters);
        if (instanceHolder.type === InstanceHolder.NEW_INSTANCE) {
            return this.injector.injectTarget(instanceHolder.instance, this.config);
        }
        return Promise.resolve(instanceHolder.instance);
    }

}

const LOG$5 = new coreutil_v1.Logger("MindiInjector");

class MindiInjector extends Injector {

    static inject(target, config) {
        return INJECTOR.injectTarget(target, config);
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
     * @param {any} targetObject 
     * @param {Config} config 
     * @param {number} depth
     * @returns {Promise}
     */
    injectTarget(targetObject, config, depth = 0) {
        if (!targetObject) {
            throw Error("Missing target object");
        }
        if (!config) {
            throw Error("Missing config");
        }
        if (!config.isFinalized()) {
            throw Error("Config not finalized");
        }
        if (depth > 10) {
            throw Error("Injection structure too deep");
        }
        const injector = this;
        const objectFieldNames = new coreutil_v1.List(Object.keys(targetObject));
        return new Promise((resolve, reject) => {
            return objectFieldNames.promiseChain((fieldName, parent) => {
                return MindiInjector.injectProperty(targetObject, fieldName, config, depth, injector);
            }).then(() => {
                InstanceProcessorExecutor.execute(targetObject, config).then(() =>{
                    resolve(targetObject);
                });
            });
        })

    }

    /**
     * @param {Object} targetObject 
     * @param {String} fieldName 
     * @param {Config} config 
     * @param {Number} depth 
     * @param {Injector} injector
     * @returns {Promise}
     */
    static injectProperty(targetObject, fieldName, config, depth, injector) {
        const injectionPoint = targetObject[fieldName];        
        if(!(injectionPoint instanceof InjectionPoint)) {
            return Promise.resolve();
        }
        if (injectionPoint.type === InjectionPoint.PROVIDER_TYPE) {
            MindiInjector.injectPropertyProvider(targetObject, fieldName, config, injector);
            return Promise.resolve();
        }
        return MindiInjector.injectPropertyInstance(targetObject, fieldName, config, depth, injector);
        
    }

    /**
     * @param {object} targetObject 
     * @param {string} fieldName 
     * @param {Config} config 
     * @param {Injector} injector
     */
    static injectPropertyProvider(targetObject, fieldName, config, injector) {
        /**
         * @type {InjectionPoint}
         */
        const injectionPoint = targetObject[fieldName];
        const typeConfig = ConfigAccessor.typeConfigByName(injectionPoint.name, config);
        targetObject[fieldName] = new MindiProvider(typeConfig, injector, config);
    }

    /**
     * @param {object} targetObject 
     * @param {string} fieldName 
     * @param {Config} config 
     * @param {number} depth 
     * @param {Injector} injector
     * @returns {Promise}
     */
    static injectPropertyInstance(targetObject, fieldName, config, depth, injector) {
        let injectPromise = Promise.resolve();
        /** @type {InjectionPoint} */
        const injectionPoint = targetObject[fieldName];
        const instanceHolder = ConfigAccessor.instanceHolder(injectionPoint.name, config, injectionPoint.parameters);
        if (instanceHolder.type === InstanceHolder.NEW_INSTANCE) {
            injectPromise = injector.injectTarget(instanceHolder.instance, config, depth++);
        }
        targetObject[fieldName] = instanceHolder.instance;
        return injectPromise;
    }

}

const INJECTOR = new MindiInjector();

class InstanceProcessor {

    /**
     * 
     * @param {Object} instance 
     * @return {Promise}
     */
    process(instance) {
        return Promise.resolve();
    }

}

class ConfigProcessor {

    /**
     * 
     * @param {Config} config 
     * @param {Map} configEntriesMap 
     */
    processConfig(config, configEntriesMap) {
        return Promise.resolve();
    }

}

const LOG$6 = new coreutil_v1.Logger("Config");

class MindiConfig extends Config {

    constructor() {
        super();

        /** @type {Boolean} */
        this.finalized = false;

        /** @type {Map<TypeConfig>} */
        this.configEntries = new coreutil_v1.Map();

        /** @type {List<String>} */
        this.configProcessors = new coreutil_v1.List();

        /** @type {List<String>} */
        this.instanceProcessors = new coreutil_v1.List();
    }

    /**
     * 
     * @param {Config} config
     * @returns {MindiConfig}
     */
    merge(config) {
        this.finalized = true;


        const newConfigEntries = new coreutil_v1.Map();
        newConfigEntries.addAll(this.configEntries);
        newConfigEntries.addAll(config.configEntries);

        const newConfigProcessors = new coreutil_v1.List();
        newConfigProcessors.addAll(this.configProcessors);
        newConfigProcessors.addAll(config.configProcessors);

        const newInstanceProcessors = new coreutil_v1.List();
        newInstanceProcessors.addAll(this.instanceProcessors);
        newInstanceProcessors.addAll(config.instanceProcessors);

        /** @type {Map} */
        this.configEntries = newConfigEntries;
        this.configProcessors = newConfigProcessors;
        this.instanceProcessors = newInstanceProcessors;

        return this;
    }

    /**
     * 
     * @param {TypeConfig} typeConfig
     * @returns {MindiConfig}
     */
    addTypeConfig(typeConfig) {
        this.finalized = false;
        this.configEntries.set(typeConfig.name, typeConfig);
        return this;
    }

    /**
     * 
     * @param {ConfigProcessor} configProcessor
     * @returns {MindiConfig}
     */
    addConfigProcessor(configProcessor) {
        this.configProcessors.add(configProcessor.name);
        return this.addTypeConfig(SingletonConfig.unnamed(configProcessor));
    }

    /**
     * 
     * @param {InstanceProcessor} instanceProcessor
     * @returns {MindiConfig}
     */
    addInstanceProcessor(instanceProcessor) {
        this.instanceProcessors.add(instanceProcessor.name);
        return this.addTypeConfig(SingletonConfig.unnamed(instanceProcessor));
    }

    /**
     * 
     * @param {List<TypeConfig>} typeConfigList
     * @return {MindiConfig}
     */
    addAllTypeConfig(typeConfigList) {
        this.finalized = false;
        typeConfigList.forEach((typeConfig,parent) => {
            this.configEntries.set(typeConfig.name, typeConfig);
            return true;
        }, this);
        return this;
    }

    /**
     * 
     * @param {List<new() => ConfigProcessor>} configProcessorList
     * @return {MindiConfig}
     */
    addAllConfigProcessor(configProcessorList) {
        configProcessorList.forEach((configProcessor,parent) => {
            this.configProcessors.add(configProcessor.name);
            this.addTypeConfig(SingletonConfig.unnamed(configProcessor));
            return true;
        }, this);
        return this;
    }

    /**
     * 
     * @param {List<new() => InstanceProcessor} instanceProcessorList 
     * @return {MindiConfig}
     */
    addAllInstanceProcessor(instanceProcessorList) {
        instanceProcessorList.forEach((instanceProcessor,parent) => {
            this.instanceProcessors.add(instanceProcessor.name);
            this.addTypeConfig(SingletonConfig.unnamed(instanceProcessor));
            return true;
        }, this);
        return this;
    }

    /**
     * @returns {Boolean}
     */
    isFinalized() {
        return this.finalized;
    }

    /**
     * @returns {Promise}
     */
    finalize() {
        this.finalized = true;
        return ConfigProcessorExecutor.execute(this.configProcessors, MindiInjector.getInstance(), this);
    }

}

const LOG$7 = new coreutil_v1.Logger("InstancePostConfigTrigger");

/**
 * Instance processor which calls postConfig on objects after configProcessors are finished
 */
class InstancePostConfigTrigger extends InstanceProcessor {

    /**
     * 
     * @param {Object} instance 
     * @return {Promise}
     */
    process(instance) {
        let response = null;
        if(instance.postConfig) {
            response = instance.postConfig();
        }
        if (!response) {
            response = new Promise((resolve,reject) => { resolve(); });
        }
        if (!response instanceof Promise) {
            throw "postConfig() must return either undefined or null or a Promise"
        }
        return response;
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

exports.Config = Config;
exports.ConfigAccessor = ConfigAccessor;
exports.ConfigProcessor = ConfigProcessor;
exports.ConfigProcessorExecutor = ConfigProcessorExecutor;
exports.InjectionPoint = InjectionPoint;
exports.Injector = Injector;
exports.InstanceHolder = InstanceHolder;
exports.InstancePostConfigTrigger = InstancePostConfigTrigger;
exports.InstanceProcessor = InstanceProcessor;
exports.InstanceProcessorExecutor = InstanceProcessorExecutor;
exports.MindiConfig = MindiConfig;
exports.MindiInjector = MindiInjector;
exports.MindiProvider = MindiProvider;
exports.PoolConfig = PoolConfig;
exports.PrototypeConfig = PrototypeConfig;
exports.Provider = Provider;
exports.SingletonConfig = SingletonConfig;
exports.TypeConfig = TypeConfig;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWluZGlfdjEuanMiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9taW5kaS9jb25maWcuanMiLCIuLi8uLi9zcmMvbWluZGkvdHlwZUNvbmZpZy9pbnN0YW5jZUhvbGRlci5qcyIsIi4uLy4uL3NyYy9taW5kaS90eXBlQ29uZmlnL3R5cGVDb25maWcuanMiLCIuLi8uLi9zcmMvbWluZGkvY29uZmlnQWNjZXNzb3IuanMiLCIuLi8uLi9zcmMvbWluZGkvaW5qZWN0b3IuanMiLCIuLi8uLi9zcmMvbWluZGkvY29uZmlnUHJvY2Vzc29yL2NvbmZpZ1Byb2Nlc3NvckV4ZWN1dG9yLmpzIiwiLi4vLi4vc3JjL21pbmRpL3R5cGVDb25maWcvc2luZ2xldG9uQ29uZmlnLmpzIiwiLi4vLi4vc3JjL21pbmRpL2FwaS9wcm92aWRlci5qcyIsIi4uLy4uL3NyYy9taW5kaS9hcGkvaW5qZWN0aW9uUG9pbnQuanMiLCIuLi8uLi9zcmMvbWluZGkvaW5zdGFuY2VQcm9jZXNzb3IvaW5zdGFuY2VQcm9jZXNzb3JFeGVjdXRvci5qcyIsIi4uLy4uL3NyYy9taW5kaS9taW5kaVByb3ZpZGVyLmpzIiwiLi4vLi4vc3JjL21pbmRpL21pbmRpSW5qZWN0b3IuanMiLCIuLi8uLi9zcmMvbWluZGkvaW5zdGFuY2VQcm9jZXNzb3IvaW5zdGFuY2VQcm9jZXNzb3IuanMiLCIuLi8uLi9zcmMvbWluZGkvY29uZmlnUHJvY2Vzc29yL2NvbmZpZ1Byb2Nlc3Nvci5qcyIsIi4uLy4uL3NyYy9taW5kaS9taW5kaUNvbmZpZy5qcyIsIi4uLy4uL3NyYy9taW5kaS9pbnN0YW5jZVByb2Nlc3Nvci9pbnN0YW5jZVBvc3RDb25maWdUcmlnZ2VyLmpzIiwiLi4vLi4vc3JjL21pbmRpL3R5cGVDb25maWcvcHJvdG90eXBlQ29uZmlnLmpzIiwiLi4vLi4vc3JjL21pbmRpL3R5cGVDb25maWcvcG9vbENvbmZpZy5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyJleHBvcnQgY2xhc3MgQ29uZmlnIHtcclxuXHJcbiAgICBjb25zdHJ1Y3RvcigpIHtcclxuICAgICAgICAvKiogQHR5cGUge01hcH0gKi9cclxuICAgICAgICB0aGlzLmNvbmZpZ0VudHJpZXMgPSBudWxsO1xyXG5cclxuICAgICAgICAvKiogQHR5cGUge0xpc3R9ICovXHJcbiAgICAgICAgdGhpcy5jb25maWdQcm9jZXNzb3JzID0gbnVsbDtcclxuXHJcbiAgICAgICAgLyoqIEB0eXBlIHtMaXN0fSAqL1xyXG4gICAgICAgIHRoaXMuaW5zdGFuY2VQcm9jZXNzb3JzID0gbnVsbDtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIEByZXR1cm5zIHtQcm9taXNlfVxyXG4gICAgICovXHJcbiAgICBmaW5hbGl6ZSgpIHtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cclxuICAgICAqL1xyXG4gICAgaXNGaW5hbGl6ZWQoKSB7XHJcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG59IiwiZXhwb3J0IGNsYXNzIEluc3RhbmNlSG9sZGVyIHtcclxuXHJcbiAgICBzdGF0aWMgZ2V0IE5FV19JTlNUQU5DRSgpIHsgcmV0dXJuIDA7IH1cclxuXHJcbiAgICBzdGF0aWMgZ2V0IEVYSVNUSU5HX0lOU1RBTkNFKCkgeyByZXR1cm4gMTsgfVxyXG5cclxuICAgIHN0YXRpYyBob2xkZXJXaXRoTmV3SW5zdGFuY2UoaW5zdGFuY2UpIHtcclxuICAgICAgICByZXR1cm4gbmV3IEluc3RhbmNlSG9sZGVyKGluc3RhbmNlLCBJbnN0YW5jZUhvbGRlci5ORVdfSU5TVEFOQ0UpO1xyXG4gICAgfVxyXG5cclxuICAgIHN0YXRpYyBob2xkZXJXaXRoRXhpc3RpbmdJbnN0YW5jZShpbnN0YW5jZSkge1xyXG4gICAgICAgIHJldHVybiBuZXcgSW5zdGFuY2VIb2xkZXIoaW5zdGFuY2UsIEluc3RhbmNlSG9sZGVyLkVYSVNUSU5HX0lOU1RBTkNFKTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdHJ1Y3RvcihpbnN0YW5jZSwgdHlwZSkge1xyXG4gICAgICAgIHRoaXMuaW5zdGFuY2UgPSBpbnN0YW5jZTtcclxuICAgICAgICB0aGlzLnR5cGUgPSB0eXBlO1xyXG4gICAgfVxyXG5cclxufSIsImV4cG9ydCBjbGFzcyBUeXBlQ29uZmlnIHtcclxuXHJcbiAgICBzdGF0aWMgZ2V0IE5FVygpIHsgcmV0dXJuIFwiTkVXXCI7IH1cclxuICAgIHN0YXRpYyBnZXQgQ09ORklHVVJFRCgpIHsgcmV0dXJuIFwiQ09ORklHVVJFRFwiOyB9XHJcblxyXG4gICAgY29uc3RydWN0b3IobmFtZSwgY2xhc3NSZWZlcmVuY2UpIHtcclxuICAgICAgICB0aGlzLm5hbWUgPSBuYW1lO1xyXG4gICAgICAgIHRoaXMuY2xhc3NSZWZlcmVuY2UgPSBjbGFzc1JlZmVyZW5jZTtcclxuICAgICAgICB0aGlzLnN0YWdlID0gVHlwZUNvbmZpZy5ORVc7XHJcbiAgICB9XHJcblxyXG4gICAgaW5zdGFuY2VIb2xkZXIocGFyYW1ldGVycyA9IFtdKSB7XHJcbiAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICB9XHJcblxyXG59IiwiaW1wb3J0IHsgQ29uZmlnIH0gZnJvbSBcIi4vY29uZmlnLmpzXCI7XHJcbmltcG9ydCB7IExvZ2dlciB9IGZyb20gXCJjb3JldXRpbF92MVwiO1xyXG5pbXBvcnQgeyBJbnN0YW5jZUhvbGRlciB9IGZyb20gXCIuL3R5cGVDb25maWcvaW5zdGFuY2VIb2xkZXIuanNcIjtcclxuaW1wb3J0IHsgVHlwZUNvbmZpZyB9IGZyb20gXCIuL3R5cGVDb25maWcvdHlwZUNvbmZpZy5qc1wiO1xyXG5cclxuY29uc3QgTE9HID0gbmV3IExvZ2dlcihcIkNvbmZpZ0FjY2Vzc29yXCIpO1xyXG5cclxuLyoqXHJcbiAqIFV0aWxpdGllcyBmb3IgYWNjZXNzaW5nIGEgQ29uZmlnIG9iamVjdFxyXG4gKi9cclxuZXhwb3J0IGNsYXNzIENvbmZpZ0FjY2Vzc29yIHtcclxuXHJcbiAgICAvKipcclxuICAgICAqIEdldCBhbiBpbnN0YW5jZSBieSBjbGFzcyBuYW1lIGluIHRoZSBjb25maWdcclxuICAgICAqIFxyXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG5hbWUgXHJcbiAgICAgKiBAcGFyYW0ge0NvbmZpZ30gY29uZmlnIFxyXG4gICAgICogQHBhcmFtIHtBcnJheX0gcGFyYW1ldGVyc1xyXG4gICAgICogQHJldHVybnMge0luc3RhbmNlSG9sZGVyfVxyXG4gICAgICovXHJcbiAgICBzdGF0aWMgaW5zdGFuY2VIb2xkZXIobmFtZSwgY29uZmlnLCBwYXJhbWV0ZXJzID0gW10pIHtcclxuICAgICAgICBjb25zdCB0eXBlQ29uZmlnID0gdGhpcy50eXBlQ29uZmlnQnlOYW1lKG5hbWUsIGNvbmZpZyk7XHJcbiAgICAgICAgaWYodHlwZUNvbmZpZyA9PT0gbnVsbCkge1xyXG4gICAgICAgICAgICBMT0cuZXJyb3IoXCJObyB0eXBlY29uZmlnIGZvdW5kIGZvciBcIiArIG5hbWUpO1xyXG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICB9XHJcbiAgICAgICAgY29uc3QgaW5zdGFuY2VIb2xkZXIgPSB0eXBlQ29uZmlnLmluc3RhbmNlSG9sZGVyKHBhcmFtZXRlcnMpO1xyXG4gICAgICAgIGlmKCFpbnN0YW5jZUhvbGRlcikge1xyXG4gICAgICAgICAgICBMT0cuZXJyb3IoXCJObyBvYmplY3QgZm91bmQgZm9yIFwiICsgbmFtZSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBpbnN0YW5jZUhvbGRlcjtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIEdldCB0aGUgdHlwZSBjb25maWcgYnkgY2xhc3MgbmFtZSBpbiB0aGUgY29uZmlnXHJcbiAgICAgKiBcclxuICAgICAqIEBwYXJhbSB7Q29uZmlnfSBjb25maWcgXHJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbmFtZSBcclxuICAgICAqIEByZXR1cm5zIHtUeXBlQ29uZmlnfVxyXG4gICAgICovXHJcbiAgICBzdGF0aWMgdHlwZUNvbmZpZ0J5TmFtZShuYW1lLCBjb25maWcpIHtcclxuICAgICAgICBsZXQgY29uZmlnRW50cnkgPSBudWxsO1xyXG4gICAgICAgIGNvbmZpZy5jb25maWdFbnRyaWVzLmZvckVhY2goKGtleSwgdmFsdWUsIHBhcmVudCkgPT4ge1xyXG4gICAgICAgICAgICBpZihrZXkgPT09IG5hbWUpIHtcclxuICAgICAgICAgICAgICAgIGNvbmZpZ0VudHJ5ID0gdmFsdWU7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgfSwgdGhpcyk7XHJcbiAgICAgICAgaWYoIWNvbmZpZ0VudHJ5KSB7XHJcbiAgICAgICAgICAgIExPRy5lcnJvcihcIk5vIGNvbmZpZyBlbnRyeSBmb3VuZCBmb3IgXCIgKyBuYW1lKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGNvbmZpZ0VudHJ5O1xyXG4gICAgfVxyXG5cclxufSIsImV4cG9ydCBjbGFzcyBJbmplY3RvciB7XHJcblxyXG5cclxuICAgIC8qKlxyXG4gICAgICogSGVscGVyIG1ldGhvZCBmb3IgaW5qZWN0aW5nIGZpZWxkcyBpbiB0YXJnZXQgb2JqZWN0XHJcbiAgICAgKiBcclxuICAgICAqIEBwYXJhbSB7YW55fSB0YXJnZXRPYmplY3QgXHJcbiAgICAgKiBAcGFyYW0ge0NvbmZpZ30gY29uZmlnIFxyXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGRlcHRoXHJcbiAgICAgKiBAcmV0dXJucyB7UHJvbWlzZX1cclxuICAgICAqL1xyXG4gICAgaW5qZWN0VGFyZ2V0KHRhcmdldCwgY29uZmlnLCBkZXB0aCA9IDApIHtcclxuXHJcbiAgICB9XHJcblxyXG59IiwiaW1wb3J0IHsgTWFwLCBMb2dnZXIsIExpc3QgfSBmcm9tIFwiY29yZXV0aWxfdjFcIjtcclxuaW1wb3J0IHsgQ29uZmlnIH0gZnJvbSBcIi4uL2NvbmZpZy5qc1wiO1xyXG5pbXBvcnQgeyBDb25maWdBY2Nlc3NvciB9IGZyb20gXCIuLi9jb25maWdBY2Nlc3Nvci5qc1wiO1xyXG5pbXBvcnQgeyBJbmplY3RvciB9IGZyb20gXCIuLi9pbmplY3Rvci5qc1wiO1xyXG5pbXBvcnQgeyBJbnN0YW5jZUhvbGRlciB9IGZyb20gXCIuLi90eXBlQ29uZmlnL2luc3RhbmNlSG9sZGVyLmpzXCI7XHJcbmltcG9ydCB7IFR5cGVDb25maWcgfSBmcm9tIFwiLi4vdHlwZUNvbmZpZy90eXBlQ29uZmlnLmpzXCI7XHJcblxyXG5jb25zdCBMT0cgPSBuZXcgTG9nZ2VyKFwiQ29uZmlnUHJvY2Vzc29yRXhlY3V0b3JcIik7XHJcblxyXG4vKipcclxuICogRXhlY3V0ZXMgdGhlIHByb3ZpZGVkIGNvbmZpZyBwcm9jZXNzb3JzIG9uIHRoZSBwcm92aWRlZCBjb25maWcgcmVnaXN0cnlcclxuICogUmV0dXJucyBhIGxpc3Qgb2YgcHJvbWlzZXMgZm9yIHdoZW4gdGhlIGNvbmZpZyBwcm9jZXNzb3JzIGhhcyBjb21wbGV0ZWQgcnVubmluZ1xyXG4gKiBcclxuICogQSBjb25maWcgcHJvY2Vzc29yIHJlYWRzIHRoZSBjb25maWcgYW5kIHBlcmZvcm1zIGFueSBuZWNlc3NhcnkgYWN0aW9ucyBiYXNlZCBvblxyXG4gKiBjbGFzcyBhbmQgdHlwZSBpbmZvcm1hdGlvbi4gQSBjb25maWcgcHJvY2Vzc29yIGRvZXMgbm90IG9wZXJhdGUgb24gbWFuYWdlZCBpbnN0YW5jZXNcclxuICovXHJcbmV4cG9ydCBjbGFzcyBDb25maWdQcm9jZXNzb3JFeGVjdXRvciB7XHJcbiAgICBcclxuICAgIC8qKlxyXG4gICAgICogQHBhcmFtIHtMaXN0PFN0cmluZz59IGNvbmZpZ1Byb2Nlc3NvckNsYXNzTmFtZUxpc3RcclxuICAgICAqIEBwYXJhbSB7SW5qZWN0b3J9IGluamVjdG9yXHJcbiAgICAgKiBAcGFyYW0ge0NvbmZpZ30gY29uZmlnXHJcbiAgICAgKiBAcmV0dXJucyB7UHJvbWlzZX0gcHJvbWlzZSB3aGljaCBpcyByZXNvbHZlZCB3aGVuIGFsbCBjb25maWcgcHJvY2Vzc29ycyBhcmUgcmVzb2x2ZWRcclxuICAgICAqL1xyXG4gICAgc3RhdGljIGV4ZWN1dGUoY29uZmlnUHJvY2Vzc29yQ2xhc3NOYW1lTGlzdCwgaW5qZWN0b3IsIGNvbmZpZykge1xyXG4gICAgICAgIHJldHVybiBjb25maWdQcm9jZXNzb3JDbGFzc05hbWVMaXN0LnByb21pc2VDaGFpbigoY29uZmlnUHJvY2Vzc29yQ2xhc3NOYW1lLCBwYXJlbnQpID0+IHtcclxuICAgICAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlQ29uZmlnUHJvY2Vzc29yRXhlY3V0ZWQsIHJlamVjdCkgPT4ge1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCB0YXJnZXRJbmplY3RlZFByb21pc2UgPSBQcm9taXNlLnJlc29sdmUoKTtcclxuXHJcbiAgICAgICAgICAgICAgICAvKiogIEB0eXBlIHtJbnN0YW5jZUhvbGRlcn0gKi9cclxuICAgICAgICAgICAgICAgIGNvbnN0IHByb2Nlc3NvckhvbGRlciA9IENvbmZpZ0FjY2Vzc29yLmluc3RhbmNlSG9sZGVyKGNvbmZpZ1Byb2Nlc3NvckNsYXNzTmFtZSwgY29uZmlnKTtcclxuICAgICAgICAgICAgICAgIGlmKHByb2Nlc3NvckhvbGRlci50eXBlID09PSBJbnN0YW5jZUhvbGRlci5ORVdfSU5TVEFOQ0UpIHtcclxuICAgICAgICAgICAgICAgICAgICB0YXJnZXRJbmplY3RlZFByb21pc2UgPSBpbmplY3Rvci5pbmplY3RUYXJnZXQocHJvY2Vzc29ySG9sZGVyLmluc3RhbmNlLCBjb25maWcpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIHRhcmdldEluamVjdGVkUHJvbWlzZS50aGVuKCgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCB0b0NvbmZpZ3VyZU1hcCA9IENvbmZpZ1Byb2Nlc3NvckV4ZWN1dG9yLnByZXBhcmVVbmNvbmZpZ3VyZWRDb25maWdFbnRyaWVzKGNvbmZpZy5jb25maWdFbnRyaWVzKTtcclxuICAgICAgICAgICAgICAgICAgICBwcm9jZXNzb3JIb2xkZXIuaW5zdGFuY2UucHJvY2Vzc0NvbmZpZyhjb25maWcsIHRvQ29uZmlndXJlTWFwKS50aGVuKCgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZUNvbmZpZ1Byb2Nlc3NvckV4ZWN1dGVkKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSlcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIFxyXG4gICAgICogQHBhcmFtIHtNYXB9IGNvbmZpZ0VudHJpZXMgXHJcbiAgICAgKiBAcmV0dXJuIHtNYXB9XHJcbiAgICAgKi9cclxuICAgIHN0YXRpYyBwcmVwYXJlVW5jb25maWd1cmVkQ29uZmlnRW50cmllcyhjb25maWdFbnRyaWVzKSB7XHJcbiAgICAgICAgY29uc3QgdW5jb25maWd1cmVkQ29uZmlnRW50cmllcyA9IG5ldyBNYXAoKTtcclxuXHJcbiAgICAgICAgY29uZmlnRW50cmllcy5mb3JFYWNoKChrZXksIHZhbHVlLCBwYXJlbnQpID0+IHtcclxuXHJcbiAgICAgICAgICAgIC8qKiBAdHlwZSB7VHlwZUNvbmZpZ30gKi9cclxuICAgICAgICAgICAgY29uc3QgY29uZmlnRW50cnkgPSB2YWx1ZTtcclxuXHJcbiAgICAgICAgICAgIGlmKGNvbmZpZ0VudHJ5LnN0YWdlID09PSBUeXBlQ29uZmlnLk5FVykge1xyXG4gICAgICAgICAgICAgICAgdW5jb25maWd1cmVkQ29uZmlnRW50cmllcy5zZXQoa2V5LCBjb25maWdFbnRyeSk7XHJcbiAgICAgICAgICAgICAgICBjb25maWdFbnRyeS5zdGFnZSA9IFR5cGVDb25maWcuQ09ORklHVVJFRDtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgfSwgdGhpcyk7XHJcblxyXG4gICAgICAgIHJldHVybiB1bmNvbmZpZ3VyZWRDb25maWdFbnRyaWVzO1xyXG4gICAgfVxyXG5cclxufSIsImltcG9ydCB7IFR5cGVDb25maWcgfSBmcm9tIFwiLi90eXBlQ29uZmlnLmpzXCI7XHJcbmltcG9ydCB7IExvZ2dlciB9IGZyb20gXCJjb3JldXRpbF92MVwiO1xyXG5pbXBvcnQgeyBJbnN0YW5jZUhvbGRlciB9IGZyb20gXCIuL2luc3RhbmNlSG9sZGVyLmpzXCI7XHJcblxyXG5jb25zdCBMT0cgPSBuZXcgTG9nZ2VyKFwiU2luZ2xldG9uQ29uZmlnXCIpO1xyXG5cclxuZXhwb3J0IGNsYXNzIFNpbmdsZXRvbkNvbmZpZyBleHRlbmRzIFR5cGVDb25maWcge1xyXG5cclxuICAgIHN0YXRpYyBuYW1lZChuYW1lLCBjbGFzc1JlZmVyZW5jZSkge1xyXG4gICAgICAgIHJldHVybiBuZXcgU2luZ2xldG9uQ29uZmlnKG5hbWUsIGNsYXNzUmVmZXJlbmNlKTtcclxuICAgIH1cclxuXHJcbiAgICBzdGF0aWMgdW5uYW1lZChjbGFzc1JlZmVyZW5jZSkge1xyXG4gICAgICAgIHJldHVybiBuZXcgU2luZ2xldG9uQ29uZmlnKGNsYXNzUmVmZXJlbmNlLm5hbWUsIGNsYXNzUmVmZXJlbmNlKTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdHJ1Y3RvcihuYW1lLCBjbGFzc1JlZmVyZW5jZSkge1xyXG4gICAgICAgIHN1cGVyKG5hbWUsIGNsYXNzUmVmZXJlbmNlKTtcclxuICAgIH1cclxuXHJcbiAgICBpbnN0YW5jZUhvbGRlcihwYXJhbWV0ZXJzID0gW10pIHtcclxuICAgICAgICBpZiAoIXRoaXMuaW5zdGFuY2UpIHtcclxuICAgICAgICAgICAgaWYocGFyYW1ldGVycyAmJiBwYXJhbWV0ZXJzLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuaW5zdGFuY2UgPSBuZXcgdGhpcy5jbGFzc1JlZmVyZW5jZSguLi5wYXJhbWV0ZXJzKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuaW5zdGFuY2UgPSBuZXcgdGhpcy5jbGFzc1JlZmVyZW5jZSgpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiBJbnN0YW5jZUhvbGRlci5ob2xkZXJXaXRoTmV3SW5zdGFuY2UodGhpcy5pbnN0YW5jZSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBJbnN0YW5jZUhvbGRlci5ob2xkZXJXaXRoRXhpc3RpbmdJbnN0YW5jZSh0aGlzLmluc3RhbmNlKTtcclxuICAgIH1cclxuXHJcbn0iLCJpbXBvcnQgeyBMb2dnZXIgfSBmcm9tIFwiY29yZXV0aWxfdjFcIjtcclxuXHJcbmNvbnN0IExPRyA9IG5ldyBMb2dnZXIoXCJQcm92aWRlclwiKTtcclxuXHJcbi8qKlxyXG4gKiBAdGVtcGxhdGUgVFxyXG4gKi9cclxuZXhwb3J0IGNsYXNzIFByb3ZpZGVyIHtcclxuXHJcbiAgICAvKipcclxuICAgICAqIFxyXG4gICAgICogQHBhcmFtIHtBcnJheX0gcGFyYW1ldGVycyBcclxuICAgICAqIEByZXR1cm5zIHtQcm9taXNlPFQ+fVxyXG4gICAgICovXHJcbiAgICBnZXQocGFyYW1ldGVycyA9IFtdKSB7XHJcbiAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICB9XHJcblxyXG59IiwiaW1wb3J0IHsgUHJvdmlkZXIgfSBmcm9tIFwiLi9wcm92aWRlci5qc1wiO1xyXG5cclxuZXhwb3J0IGNsYXNzIEluamVjdGlvblBvaW50IHtcclxuXHJcbiAgICBzdGF0aWMgZ2V0IElOU1RBTkNFX1RZUEUoKSB7IHJldHVybiAwOyB9IFxyXG4gICAgc3RhdGljIGdldCBQUk9WSURFUl9UWVBFKCkgeyByZXR1cm4gMTsgfSBcclxuXHJcbiAgICAvKipcclxuICAgICAqIEB0ZW1wbGF0ZSBUXHJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbmFtZSBcclxuICAgICAqIEBwYXJhbSB7bmV3KCkgPT4gVH0gY2xhc3NSZWZlcmVuY2UgXHJcbiAgICAgKiBAcGFyYW0ge2FycmF5fSBwYXJhbWV0ZXJzIFxyXG4gICAgICogQHJldHVybnMge1R9XHJcbiAgICAgKi9cclxuICAgIHN0YXRpYyBpbnN0YW5jZUJ5TmFtZShuYW1lLCBjbGFzc1JlZmVyZW5jZSwgcGFyYW1ldGVycyA9IFtdKSB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBJbmplY3Rpb25Qb2ludChuYW1lLCBjbGFzc1JlZmVyZW5jZSwgSW5qZWN0aW9uUG9pbnQuSU5TVEFOQ0VfVFlQRSwgcGFyYW1ldGVycyk7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBAdGVtcGxhdGUgVFxyXG4gICAgICogQHBhcmFtIHtuZXcoKSA9PiBUfSBjbGFzc1JlZmVyZW5jZSBcclxuICAgICAqIEBwYXJhbSB7YXJyYXl9IHBhcmFtZXRlcnMgXHJcbiAgICAgKiBAcmV0dXJucyB7VH1cclxuICAgICAqL1xyXG4gICAgc3RhdGljIGluc3RhbmNlKGNsYXNzUmVmZXJlbmNlLCBwYXJhbWV0ZXJzID0gW10pIHtcclxuICAgICAgICByZXR1cm4gbmV3IEluamVjdGlvblBvaW50KGNsYXNzUmVmZXJlbmNlLm5hbWUsIGNsYXNzUmVmZXJlbmNlLCBJbmplY3Rpb25Qb2ludC5JTlNUQU5DRV9UWVBFLCBwYXJhbWV0ZXJzKTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIEB0ZW1wbGF0ZSBUXHJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbmFtZSBcclxuICAgICAqIEBwYXJhbSB7bmV3KCkgPT4gVH0gY2xhc3NSZWZlcmVuY2UgXHJcbiAgICAgKiBAcmV0dXJucyB7UHJvdmlkZXI8VD59XHJcbiAgICAgKi9cclxuICAgIHN0YXRpYyBwcm92aWRlckJ5TmFtZShuYW1lLCBjbGFzc1JlZmVyZW5jZSkge1xyXG4gICAgICAgIHJldHVybiBuZXcgSW5qZWN0aW9uUG9pbnQobmFtZSwgY2xhc3NSZWZlcmVuY2UsIEluamVjdGlvblBvaW50LlBST1ZJREVSX1RZUEUpO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQHRlbXBsYXRlIFRcclxuICAgICAqIEBwYXJhbSB7bmV3KCkgPT4gVH0gY2xhc3NSZWZlcmVuY2UgXHJcbiAgICAgKiBAcmV0dXJucyB7UHJvdmlkZXI8VD59XHJcbiAgICAgKi9cclxuICAgIHN0YXRpYyBwcm92aWRlcihjbGFzc1JlZmVyZW5jZSkge1xyXG4gICAgICAgIHJldHVybiBuZXcgSW5qZWN0aW9uUG9pbnQoY2xhc3NSZWZlcmVuY2UubmFtZSwgY2xhc3NSZWZlcmVuY2UsIEluamVjdGlvblBvaW50LlBST1ZJREVSX1RZUEUpO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0cnVjdG9yKG5hbWUsIGNsYXNzUmVmZXJlbmNlLCB0eXBlID0gSW5qZWN0aW9uUG9pbnQuSU5TVEFOQ0VfVFlQRSwgcGFyYW1ldGVycyA9IG51bGwpIHtcclxuICAgICAgICB0aGlzLm5hbWUgPSBuYW1lO1xyXG4gICAgICAgIHRoaXMuY2xhc3NSZWZlcmVuY2UgPSBjbGFzc1JlZmVyZW5jZTtcclxuICAgICAgICB0aGlzLnR5cGUgPSB0eXBlO1xyXG4gICAgICAgIHRoaXMucGFyYW1ldGVycyA9IHBhcmFtZXRlcnM7XHJcbiAgICB9XHJcblxyXG59IiwiaW1wb3J0IHsgTG9nZ2VyLCBMaXN0IH0gZnJvbSBcImNvcmV1dGlsX3YxXCI7XHJcbmltcG9ydCB7IENvbmZpZ0FjY2Vzc29yIH0gZnJvbSBcIi4uL2NvbmZpZ0FjY2Vzc29yLmpzXCI7XHJcbmltcG9ydCB7IENvbmZpZyB9IGZyb20gXCIuLi9jb25maWcuanNcIjtcclxuXHJcbmNvbnN0IExPRyA9IG5ldyBMb2dnZXIoXCJJbnN0YW5jZVByb2Nlc3NvckV4ZWN1dG9yXCIpO1xyXG5cclxuLyoqXHJcbiAqIEV4ZWN1dGVzIHRoZSBjb25maWdzIGluc3RhbmNlIHByb2Nlc3NvcnMgb24gdGhlIHByb3ZpZGVkIGluc3RhbmNlXHJcbiAqIFJldHVybnMgYSBwcm9taXNlIGZvciB3aGVuIHRoZSBpbnN0YW5jZSBwcm9jZXNzb3JzIGhhcyBjb21wbGV0ZWQgcnVubmluZ1xyXG4gKiBcclxuICogSW5zdGFuY2UgcHJvY2Vzc29ycyBwZXJmb3JtIG9wZXJhdGlvbnMgb24gbWFuYWdlZCBpbnN0YW5jZXMgYWZ0ZXIgdGhleSBoYXZlIGJlZW4gaW5zdGFuc2lhdGVkXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgSW5zdGFuY2VQcm9jZXNzb3JFeGVjdXRvciB7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBAcGFyYW0ge0xpc3R9IGluc3RhbmNlUHJvY2Vzc29yTGlzdCB0aGUgaW5zdGFuY2UgcHJvY2Vzc29yc1xyXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGluc3RhbmNlIHRoZSBpbnN0YW5jZSB0byBwcm9jZXNzXHJcbiAgICAgKiBAcGFyYW0ge0NvbmZpZ30gY29uZmlnXHJcbiAgICAgKiBAcmV0dXJucyB7UHJvbWlzZX1cclxuICAgICAqL1xyXG4gICAgc3RhdGljIGV4ZWN1dGUoaW5zdGFuY2UsIGNvbmZpZykge1xyXG4gICAgICAgIHJldHVybiBjb25maWcuaW5zdGFuY2VQcm9jZXNzb3JzLnByb21pc2VDaGFpbigocHJvY2Vzc29yTmFtZSwgcGFyZW50KSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnN0IHByb2Nlc3NvckhvbGRlciA9IENvbmZpZ0FjY2Vzc29yLmluc3RhbmNlSG9sZGVyKHByb2Nlc3Nvck5hbWUsIGNvbmZpZyk7XHJcbiAgICAgICAgICAgIHJldHVybiBwcm9jZXNzb3JIb2xkZXIuaW5zdGFuY2UucHJvY2VzcyhpbnN0YW5jZSk7XHJcbiAgICAgICAgfSwgdGhpcyk7XHJcbiAgICB9XHJcblxyXG59IiwiaW1wb3J0IHsgUHJvdmlkZXIgfSBmcm9tIFwiLi9hcGkvcHJvdmlkZXIuanNcIjtcclxuaW1wb3J0IHsgVHlwZUNvbmZpZyB9IGZyb20gXCIuL3R5cGVDb25maWcvdHlwZUNvbmZpZy5qc1wiO1xyXG5pbXBvcnQgeyBJbnN0YW5jZUhvbGRlciB9IGZyb20gXCIuL3R5cGVDb25maWcvaW5zdGFuY2VIb2xkZXIuanNcIjtcclxuaW1wb3J0IHsgSW5qZWN0b3IgfSBmcm9tIFwiLi9pbmplY3Rvci5qc1wiO1xyXG5pbXBvcnQgeyBDb25maWcgfSBmcm9tIFwiLi9jb25maWcuanNcIjtcclxuaW1wb3J0IHsgQ29uZmlnQWNjZXNzb3IgfSBmcm9tIFwiLi9jb25maWdBY2Nlc3Nvci5qc1wiO1xyXG5cclxuLyoqXHJcbiAqIEB0ZW1wbGF0ZSBUXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgTWluZGlQcm92aWRlciBleHRlbmRzIFByb3ZpZGVyIHtcclxuXHJcbiAgICAvKipcclxuICAgICAqIFxyXG4gICAgICogQHBhcmFtIHtUeXBlQ29uZmlnfSB0eXBlQ29uZmlnIFxyXG4gICAgICogQHBhcmFtIHtJbmplY3Rvcn0gaW5qZWN0b3JcclxuICAgICAqIEBwYXJhbSB7Q29uZmlnfSBjb25maWdcclxuICAgICAqL1xyXG4gICAgY29uc3RydWN0b3IodHlwZUNvbmZpZywgaW5qZWN0b3IsIGNvbmZpZykge1xyXG5cclxuICAgICAgICBzdXBlcigpO1xyXG5cclxuICAgICAgICAvKiogQHR5cGUge1R5cGVDb25maWd9ICovXHJcbiAgICAgICAgdGhpcy50eXBlQ29uZmlnID0gdHlwZUNvbmZpZztcclxuXHJcbiAgICAgICAgLyoqIEB0eXBlIHtJbmplY3Rvcn0gKi9cclxuICAgICAgICB0aGlzLmluamVjdG9yID0gaW5qZWN0b3I7XHJcblxyXG4gICAgICAgIC8qKiBAdHlwZSB7Q29uZmlnfSAqL1xyXG4gICAgICAgIHRoaXMuY29uZmlnID0gY29uZmlnO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogXHJcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBwYXJhbWV0ZXJzIFxyXG4gICAgICogQHJldHVybnMge1Byb21pc2U8VD59XHJcbiAgICAgKi9cclxuICAgIGdldChwYXJhbWV0ZXJzID0gW10pIHtcclxuICAgICAgICAvKiogQHR5cGUge0luc3RhbmNlSG9sZGVyfSAqL1xyXG4gICAgICAgIGNvbnN0IGluc3RhbmNlSG9sZGVyID0gQ29uZmlnQWNjZXNzb3IuaW5zdGFuY2VIb2xkZXIodGhpcy50eXBlQ29uZmlnLm5hbWUsIHRoaXMuY29uZmlnLCBwYXJhbWV0ZXJzKTtcclxuICAgICAgICBpZiAoaW5zdGFuY2VIb2xkZXIudHlwZSA9PT0gSW5zdGFuY2VIb2xkZXIuTkVXX0lOU1RBTkNFKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmluamVjdG9yLmluamVjdFRhcmdldChpbnN0YW5jZUhvbGRlci5pbnN0YW5jZSwgdGhpcy5jb25maWcpO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKGluc3RhbmNlSG9sZGVyLmluc3RhbmNlKTtcclxuICAgIH1cclxuXHJcbn0iLCJpbXBvcnQgeyBMaXN0LCBMb2dnZXIgfSBmcm9tIFwiY29yZXV0aWxfdjFcIjtcclxuaW1wb3J0IHsgQ29uZmlnIH0gZnJvbSBcIi4vY29uZmlnLmpzXCI7XHJcbmltcG9ydCB7IENvbmZpZ0FjY2Vzc29yIH0gZnJvbSBcIi4vY29uZmlnQWNjZXNzb3IuanNcIjtcclxuaW1wb3J0IHsgSW5qZWN0aW9uUG9pbnQgfSBmcm9tIFwiLi9hcGkvaW5qZWN0aW9uUG9pbnQuanNcIlxyXG5pbXBvcnQgeyBJbnN0YW5jZVByb2Nlc3NvckV4ZWN1dG9yIH0gZnJvbSBcIi4vaW5zdGFuY2VQcm9jZXNzb3IvaW5zdGFuY2VQcm9jZXNzb3JFeGVjdXRvci5qc1wiO1xyXG5pbXBvcnQgeyBJbnN0YW5jZUhvbGRlciB9IGZyb20gXCIuL3R5cGVDb25maWcvaW5zdGFuY2VIb2xkZXIuanNcIjtcclxuaW1wb3J0IHsgTWluZGlQcm92aWRlciB9IGZyb20gXCIuL21pbmRpUHJvdmlkZXIuanNcIjtcclxuaW1wb3J0IHsgSW5qZWN0b3IgfSBmcm9tIFwiLi9pbmplY3Rvci5qc1wiO1xyXG5cclxuY29uc3QgTE9HID0gbmV3IExvZ2dlcihcIk1pbmRpSW5qZWN0b3JcIik7XHJcblxyXG5leHBvcnQgY2xhc3MgTWluZGlJbmplY3RvciBleHRlbmRzIEluamVjdG9yIHtcclxuXHJcbiAgICBzdGF0aWMgaW5qZWN0KHRhcmdldCwgY29uZmlnKSB7XHJcbiAgICAgICAgcmV0dXJuIElOSkVDVE9SLmluamVjdFRhcmdldCh0YXJnZXQsIGNvbmZpZyk7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBAcmV0dXJucyB7TWluZGlJbmplY3Rvcn1cclxuICAgICAqL1xyXG4gICAgc3RhdGljIGdldEluc3RhbmNlKCkge1xyXG4gICAgICAgIHJldHVybiBJTkpFQ1RPUjtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIEhlbHBlciBtZXRob2QgZm9yIGluamVjdGluZyBmaWVsZHMgaW4gdGFyZ2V0IG9iamVjdFxyXG4gICAgICogXHJcbiAgICAgKiBAcGFyYW0ge2FueX0gdGFyZ2V0T2JqZWN0IFxyXG4gICAgICogQHBhcmFtIHtDb25maWd9IGNvbmZpZyBcclxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBkZXB0aFxyXG4gICAgICogQHJldHVybnMge1Byb21pc2V9XHJcbiAgICAgKi9cclxuICAgIGluamVjdFRhcmdldCh0YXJnZXRPYmplY3QsIGNvbmZpZywgZGVwdGggPSAwKSB7XHJcbiAgICAgICAgaWYgKCF0YXJnZXRPYmplY3QpIHtcclxuICAgICAgICAgICAgdGhyb3cgRXJyb3IoXCJNaXNzaW5nIHRhcmdldCBvYmplY3RcIik7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICghY29uZmlnKSB7XHJcbiAgICAgICAgICAgIHRocm93IEVycm9yKFwiTWlzc2luZyBjb25maWdcIik7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICghY29uZmlnLmlzRmluYWxpemVkKCkpIHtcclxuICAgICAgICAgICAgdGhyb3cgRXJyb3IoXCJDb25maWcgbm90IGZpbmFsaXplZFwiKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKGRlcHRoID4gMTApIHtcclxuICAgICAgICAgICAgdGhyb3cgRXJyb3IoXCJJbmplY3Rpb24gc3RydWN0dXJlIHRvbyBkZWVwXCIpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjb25zdCBpbmplY3RvciA9IHRoaXM7XHJcbiAgICAgICAgY29uc3Qgb2JqZWN0RmllbGROYW1lcyA9IG5ldyBMaXN0KE9iamVjdC5rZXlzKHRhcmdldE9iamVjdCkpO1xyXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XHJcbiAgICAgICAgICAgIHJldHVybiBvYmplY3RGaWVsZE5hbWVzLnByb21pc2VDaGFpbigoZmllbGROYW1lLCBwYXJlbnQpID0+IHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBNaW5kaUluamVjdG9yLmluamVjdFByb3BlcnR5KHRhcmdldE9iamVjdCwgZmllbGROYW1lLCBjb25maWcsIGRlcHRoLCBpbmplY3Rvcik7XHJcbiAgICAgICAgICAgIH0pLnRoZW4oKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgSW5zdGFuY2VQcm9jZXNzb3JFeGVjdXRvci5leGVjdXRlKHRhcmdldE9iamVjdCwgY29uZmlnKS50aGVuKCgpID0+e1xyXG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUodGFyZ2V0T2JqZWN0KTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9KVxyXG5cclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSB0YXJnZXRPYmplY3QgXHJcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gZmllbGROYW1lIFxyXG4gICAgICogQHBhcmFtIHtDb25maWd9IGNvbmZpZyBcclxuICAgICAqIEBwYXJhbSB7TnVtYmVyfSBkZXB0aCBcclxuICAgICAqIEBwYXJhbSB7SW5qZWN0b3J9IGluamVjdG9yXHJcbiAgICAgKiBAcmV0dXJucyB7UHJvbWlzZX1cclxuICAgICAqL1xyXG4gICAgc3RhdGljIGluamVjdFByb3BlcnR5KHRhcmdldE9iamVjdCwgZmllbGROYW1lLCBjb25maWcsIGRlcHRoLCBpbmplY3Rvcikge1xyXG4gICAgICAgIGNvbnN0IGluamVjdGlvblBvaW50ID0gdGFyZ2V0T2JqZWN0W2ZpZWxkTmFtZV07ICAgICAgICBcclxuICAgICAgICBpZighKGluamVjdGlvblBvaW50IGluc3RhbmNlb2YgSW5qZWN0aW9uUG9pbnQpKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKGluamVjdGlvblBvaW50LnR5cGUgPT09IEluamVjdGlvblBvaW50LlBST1ZJREVSX1RZUEUpIHtcclxuICAgICAgICAgICAgTWluZGlJbmplY3Rvci5pbmplY3RQcm9wZXJ0eVByb3ZpZGVyKHRhcmdldE9iamVjdCwgZmllbGROYW1lLCBjb25maWcsIGluamVjdG9yKTtcclxuICAgICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gTWluZGlJbmplY3Rvci5pbmplY3RQcm9wZXJ0eUluc3RhbmNlKHRhcmdldE9iamVjdCwgZmllbGROYW1lLCBjb25maWcsIGRlcHRoLCBpbmplY3Rvcik7XHJcbiAgICAgICAgXHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gdGFyZ2V0T2JqZWN0IFxyXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpZWxkTmFtZSBcclxuICAgICAqIEBwYXJhbSB7Q29uZmlnfSBjb25maWcgXHJcbiAgICAgKiBAcGFyYW0ge0luamVjdG9yfSBpbmplY3RvclxyXG4gICAgICovXHJcbiAgICBzdGF0aWMgaW5qZWN0UHJvcGVydHlQcm92aWRlcih0YXJnZXRPYmplY3QsIGZpZWxkTmFtZSwgY29uZmlnLCBpbmplY3Rvcikge1xyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIEB0eXBlIHtJbmplY3Rpb25Qb2ludH1cclxuICAgICAgICAgKi9cclxuICAgICAgICBjb25zdCBpbmplY3Rpb25Qb2ludCA9IHRhcmdldE9iamVjdFtmaWVsZE5hbWVdO1xyXG4gICAgICAgIGNvbnN0IHR5cGVDb25maWcgPSBDb25maWdBY2Nlc3Nvci50eXBlQ29uZmlnQnlOYW1lKGluamVjdGlvblBvaW50Lm5hbWUsIGNvbmZpZyk7XHJcbiAgICAgICAgdGFyZ2V0T2JqZWN0W2ZpZWxkTmFtZV0gPSBuZXcgTWluZGlQcm92aWRlcih0eXBlQ29uZmlnLCBpbmplY3RvciwgY29uZmlnKTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSB0YXJnZXRPYmplY3QgXHJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmllbGROYW1lIFxyXG4gICAgICogQHBhcmFtIHtDb25maWd9IGNvbmZpZyBcclxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBkZXB0aCBcclxuICAgICAqIEBwYXJhbSB7SW5qZWN0b3J9IGluamVjdG9yXHJcbiAgICAgKiBAcmV0dXJucyB7UHJvbWlzZX1cclxuICAgICAqL1xyXG4gICAgc3RhdGljIGluamVjdFByb3BlcnR5SW5zdGFuY2UodGFyZ2V0T2JqZWN0LCBmaWVsZE5hbWUsIGNvbmZpZywgZGVwdGgsIGluamVjdG9yKSB7XHJcbiAgICAgICAgbGV0IGluamVjdFByb21pc2UgPSBQcm9taXNlLnJlc29sdmUoKTtcclxuICAgICAgICAvKiogQHR5cGUge0luamVjdGlvblBvaW50fSAqL1xyXG4gICAgICAgIGNvbnN0IGluamVjdGlvblBvaW50ID0gdGFyZ2V0T2JqZWN0W2ZpZWxkTmFtZV07XHJcbiAgICAgICAgY29uc3QgaW5zdGFuY2VIb2xkZXIgPSBDb25maWdBY2Nlc3Nvci5pbnN0YW5jZUhvbGRlcihpbmplY3Rpb25Qb2ludC5uYW1lLCBjb25maWcsIGluamVjdGlvblBvaW50LnBhcmFtZXRlcnMpO1xyXG4gICAgICAgIGlmIChpbnN0YW5jZUhvbGRlci50eXBlID09PSBJbnN0YW5jZUhvbGRlci5ORVdfSU5TVEFOQ0UpIHtcclxuICAgICAgICAgICAgaW5qZWN0UHJvbWlzZSA9IGluamVjdG9yLmluamVjdFRhcmdldChpbnN0YW5jZUhvbGRlci5pbnN0YW5jZSwgY29uZmlnLCBkZXB0aCsrKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgdGFyZ2V0T2JqZWN0W2ZpZWxkTmFtZV0gPSBpbnN0YW5jZUhvbGRlci5pbnN0YW5jZTtcclxuICAgICAgICByZXR1cm4gaW5qZWN0UHJvbWlzZTtcclxuICAgIH1cclxuXHJcbn1cclxuXHJcbmNvbnN0IElOSkVDVE9SID0gbmV3IE1pbmRpSW5qZWN0b3IoKTsiLCJleHBvcnQgY2xhc3MgSW5zdGFuY2VQcm9jZXNzb3Ige1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogXHJcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gaW5zdGFuY2UgXHJcbiAgICAgKiBAcmV0dXJuIHtQcm9taXNlfVxyXG4gICAgICovXHJcbiAgICBwcm9jZXNzKGluc3RhbmNlKSB7XHJcbiAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xyXG4gICAgfVxyXG5cclxufSIsImltcG9ydCB7IE1hcCB9IGZyb20gXCJjb3JldXRpbF92MVwiO1xyXG5pbXBvcnQgeyBDb25maWcgfSBmcm9tIFwiLi4vY29uZmlnLmpzXCI7XHJcblxyXG5leHBvcnQgY2xhc3MgQ29uZmlnUHJvY2Vzc29yIHtcclxuXHJcbiAgICAvKipcclxuICAgICAqIFxyXG4gICAgICogQHBhcmFtIHtDb25maWd9IGNvbmZpZyBcclxuICAgICAqIEBwYXJhbSB7TWFwfSBjb25maWdFbnRyaWVzTWFwIFxyXG4gICAgICovXHJcbiAgICBwcm9jZXNzQ29uZmlnKGNvbmZpZywgY29uZmlnRW50cmllc01hcCkge1xyXG4gICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKTtcclxuICAgIH1cclxuXHJcbn0iLCJpbXBvcnQgeyBNYXAsIExpc3QsIExvZ2dlciB9IGZyb20gXCJjb3JldXRpbF92MVwiO1xyXG5pbXBvcnQgeyBUeXBlQ29uZmlnIH0gZnJvbSBcIi4vdHlwZUNvbmZpZy90eXBlQ29uZmlnLmpzXCI7XHJcbmltcG9ydCB7IENvbmZpZ1Byb2Nlc3NvckV4ZWN1dG9yIH0gZnJvbSBcIi4vY29uZmlnUHJvY2Vzc29yL2NvbmZpZ1Byb2Nlc3NvckV4ZWN1dG9yLmpzXCI7XHJcbmltcG9ydCB7IFNpbmdsZXRvbkNvbmZpZyB9IGZyb20gXCIuL3R5cGVDb25maWcvc2luZ2xldG9uQ29uZmlnLmpzXCI7XHJcbmltcG9ydCB7IENvbmZpZyB9IGZyb20gXCIuL2NvbmZpZy5qc1wiO1xyXG5pbXBvcnQgeyBNaW5kaUluamVjdG9yIH0gZnJvbSBcIi4vbWluZGlJbmplY3Rvci5qc1wiO1xyXG5pbXBvcnQgeyBJbnN0YW5jZVByb2Nlc3NvciB9IGZyb20gXCIuL2luc3RhbmNlUHJvY2Vzc29yL2luc3RhbmNlUHJvY2Vzc29yLmpzXCI7XHJcbmltcG9ydCB7IENvbmZpZ1Byb2Nlc3NvciB9IGZyb20gXCIuL2NvbmZpZ1Byb2Nlc3Nvci9jb25maWdQcm9jZXNzb3IuanNcIjtcclxuXHJcbmNvbnN0IExPRyA9IG5ldyBMb2dnZXIoXCJDb25maWdcIik7XHJcblxyXG5leHBvcnQgY2xhc3MgTWluZGlDb25maWcgZXh0ZW5kcyBDb25maWcge1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgICAgIHN1cGVyKCk7XHJcblxyXG4gICAgICAgIC8qKiBAdHlwZSB7Qm9vbGVhbn0gKi9cclxuICAgICAgICB0aGlzLmZpbmFsaXplZCA9IGZhbHNlO1xyXG5cclxuICAgICAgICAvKiogQHR5cGUge01hcDxUeXBlQ29uZmlnPn0gKi9cclxuICAgICAgICB0aGlzLmNvbmZpZ0VudHJpZXMgPSBuZXcgTWFwKCk7XHJcblxyXG4gICAgICAgIC8qKiBAdHlwZSB7TGlzdDxTdHJpbmc+fSAqL1xyXG4gICAgICAgIHRoaXMuY29uZmlnUHJvY2Vzc29ycyA9IG5ldyBMaXN0KCk7XHJcblxyXG4gICAgICAgIC8qKiBAdHlwZSB7TGlzdDxTdHJpbmc+fSAqL1xyXG4gICAgICAgIHRoaXMuaW5zdGFuY2VQcm9jZXNzb3JzID0gbmV3IExpc3QoKTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIFxyXG4gICAgICogQHBhcmFtIHtDb25maWd9IGNvbmZpZ1xyXG4gICAgICogQHJldHVybnMge01pbmRpQ29uZmlnfVxyXG4gICAgICovXHJcbiAgICBtZXJnZShjb25maWcpIHtcclxuICAgICAgICB0aGlzLmZpbmFsaXplZCA9IHRydWU7XHJcblxyXG5cclxuICAgICAgICBjb25zdCBuZXdDb25maWdFbnRyaWVzID0gbmV3IE1hcCgpO1xyXG4gICAgICAgIG5ld0NvbmZpZ0VudHJpZXMuYWRkQWxsKHRoaXMuY29uZmlnRW50cmllcyk7XHJcbiAgICAgICAgbmV3Q29uZmlnRW50cmllcy5hZGRBbGwoY29uZmlnLmNvbmZpZ0VudHJpZXMpO1xyXG5cclxuICAgICAgICBjb25zdCBuZXdDb25maWdQcm9jZXNzb3JzID0gbmV3IExpc3QoKTtcclxuICAgICAgICBuZXdDb25maWdQcm9jZXNzb3JzLmFkZEFsbCh0aGlzLmNvbmZpZ1Byb2Nlc3NvcnMpO1xyXG4gICAgICAgIG5ld0NvbmZpZ1Byb2Nlc3NvcnMuYWRkQWxsKGNvbmZpZy5jb25maWdQcm9jZXNzb3JzKTtcclxuXHJcbiAgICAgICAgY29uc3QgbmV3SW5zdGFuY2VQcm9jZXNzb3JzID0gbmV3IExpc3QoKTtcclxuICAgICAgICBuZXdJbnN0YW5jZVByb2Nlc3NvcnMuYWRkQWxsKHRoaXMuaW5zdGFuY2VQcm9jZXNzb3JzKTtcclxuICAgICAgICBuZXdJbnN0YW5jZVByb2Nlc3NvcnMuYWRkQWxsKGNvbmZpZy5pbnN0YW5jZVByb2Nlc3NvcnMpO1xyXG5cclxuICAgICAgICAvKiogQHR5cGUge01hcH0gKi9cclxuICAgICAgICB0aGlzLmNvbmZpZ0VudHJpZXMgPSBuZXdDb25maWdFbnRyaWVzO1xyXG4gICAgICAgIHRoaXMuY29uZmlnUHJvY2Vzc29ycyA9IG5ld0NvbmZpZ1Byb2Nlc3NvcnM7XHJcbiAgICAgICAgdGhpcy5pbnN0YW5jZVByb2Nlc3NvcnMgPSBuZXdJbnN0YW5jZVByb2Nlc3NvcnM7XHJcblxyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogXHJcbiAgICAgKiBAcGFyYW0ge1R5cGVDb25maWd9IHR5cGVDb25maWdcclxuICAgICAqIEByZXR1cm5zIHtNaW5kaUNvbmZpZ31cclxuICAgICAqL1xyXG4gICAgYWRkVHlwZUNvbmZpZyh0eXBlQ29uZmlnKSB7XHJcbiAgICAgICAgdGhpcy5maW5hbGl6ZWQgPSBmYWxzZTtcclxuICAgICAgICB0aGlzLmNvbmZpZ0VudHJpZXMuc2V0KHR5cGVDb25maWcubmFtZSwgdHlwZUNvbmZpZyk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBcclxuICAgICAqIEBwYXJhbSB7Q29uZmlnUHJvY2Vzc29yfSBjb25maWdQcm9jZXNzb3JcclxuICAgICAqIEByZXR1cm5zIHtNaW5kaUNvbmZpZ31cclxuICAgICAqL1xyXG4gICAgYWRkQ29uZmlnUHJvY2Vzc29yKGNvbmZpZ1Byb2Nlc3Nvcikge1xyXG4gICAgICAgIHRoaXMuY29uZmlnUHJvY2Vzc29ycy5hZGQoY29uZmlnUHJvY2Vzc29yLm5hbWUpO1xyXG4gICAgICAgIHJldHVybiB0aGlzLmFkZFR5cGVDb25maWcoU2luZ2xldG9uQ29uZmlnLnVubmFtZWQoY29uZmlnUHJvY2Vzc29yKSk7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBcclxuICAgICAqIEBwYXJhbSB7SW5zdGFuY2VQcm9jZXNzb3J9IGluc3RhbmNlUHJvY2Vzc29yXHJcbiAgICAgKiBAcmV0dXJucyB7TWluZGlDb25maWd9XHJcbiAgICAgKi9cclxuICAgIGFkZEluc3RhbmNlUHJvY2Vzc29yKGluc3RhbmNlUHJvY2Vzc29yKSB7XHJcbiAgICAgICAgdGhpcy5pbnN0YW5jZVByb2Nlc3NvcnMuYWRkKGluc3RhbmNlUHJvY2Vzc29yLm5hbWUpO1xyXG4gICAgICAgIHJldHVybiB0aGlzLmFkZFR5cGVDb25maWcoU2luZ2xldG9uQ29uZmlnLnVubmFtZWQoaW5zdGFuY2VQcm9jZXNzb3IpKTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIFxyXG4gICAgICogQHBhcmFtIHtMaXN0PFR5cGVDb25maWc+fSB0eXBlQ29uZmlnTGlzdFxyXG4gICAgICogQHJldHVybiB7TWluZGlDb25maWd9XHJcbiAgICAgKi9cclxuICAgIGFkZEFsbFR5cGVDb25maWcodHlwZUNvbmZpZ0xpc3QpIHtcclxuICAgICAgICB0aGlzLmZpbmFsaXplZCA9IGZhbHNlO1xyXG4gICAgICAgIHR5cGVDb25maWdMaXN0LmZvckVhY2goKHR5cGVDb25maWcscGFyZW50KSA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMuY29uZmlnRW50cmllcy5zZXQodHlwZUNvbmZpZy5uYW1lLCB0eXBlQ29uZmlnKTtcclxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgfSwgdGhpcyk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBcclxuICAgICAqIEBwYXJhbSB7TGlzdDxuZXcoKSA9PiBDb25maWdQcm9jZXNzb3I+fSBjb25maWdQcm9jZXNzb3JMaXN0XHJcbiAgICAgKiBAcmV0dXJuIHtNaW5kaUNvbmZpZ31cclxuICAgICAqL1xyXG4gICAgYWRkQWxsQ29uZmlnUHJvY2Vzc29yKGNvbmZpZ1Byb2Nlc3Nvckxpc3QpIHtcclxuICAgICAgICBjb25maWdQcm9jZXNzb3JMaXN0LmZvckVhY2goKGNvbmZpZ1Byb2Nlc3NvcixwYXJlbnQpID0+IHtcclxuICAgICAgICAgICAgdGhpcy5jb25maWdQcm9jZXNzb3JzLmFkZChjb25maWdQcm9jZXNzb3IubmFtZSk7XHJcbiAgICAgICAgICAgIHRoaXMuYWRkVHlwZUNvbmZpZyhTaW5nbGV0b25Db25maWcudW5uYW1lZChjb25maWdQcm9jZXNzb3IpKTtcclxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgfSwgdGhpcyk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBcclxuICAgICAqIEBwYXJhbSB7TGlzdDxuZXcoKSA9PiBJbnN0YW5jZVByb2Nlc3Nvcn0gaW5zdGFuY2VQcm9jZXNzb3JMaXN0IFxyXG4gICAgICogQHJldHVybiB7TWluZGlDb25maWd9XHJcbiAgICAgKi9cclxuICAgIGFkZEFsbEluc3RhbmNlUHJvY2Vzc29yKGluc3RhbmNlUHJvY2Vzc29yTGlzdCkge1xyXG4gICAgICAgIGluc3RhbmNlUHJvY2Vzc29yTGlzdC5mb3JFYWNoKChpbnN0YW5jZVByb2Nlc3NvcixwYXJlbnQpID0+IHtcclxuICAgICAgICAgICAgdGhpcy5pbnN0YW5jZVByb2Nlc3NvcnMuYWRkKGluc3RhbmNlUHJvY2Vzc29yLm5hbWUpO1xyXG4gICAgICAgICAgICB0aGlzLmFkZFR5cGVDb25maWcoU2luZ2xldG9uQ29uZmlnLnVubmFtZWQoaW5zdGFuY2VQcm9jZXNzb3IpKTtcclxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgfSwgdGhpcyk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cclxuICAgICAqL1xyXG4gICAgaXNGaW5hbGl6ZWQoKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuZmluYWxpemVkO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQHJldHVybnMge1Byb21pc2V9XHJcbiAgICAgKi9cclxuICAgIGZpbmFsaXplKCkge1xyXG4gICAgICAgIHRoaXMuZmluYWxpemVkID0gdHJ1ZTtcclxuICAgICAgICByZXR1cm4gQ29uZmlnUHJvY2Vzc29yRXhlY3V0b3IuZXhlY3V0ZSh0aGlzLmNvbmZpZ1Byb2Nlc3NvcnMsIE1pbmRpSW5qZWN0b3IuZ2V0SW5zdGFuY2UoKSwgdGhpcyk7XHJcbiAgICB9XHJcblxyXG59IiwiaW1wb3J0IHsgTG9nZ2VyIH0gZnJvbSBcImNvcmV1dGlsX3YxXCI7XHJcbmltcG9ydCB7IEluc3RhbmNlUHJvY2Vzc29yIH0gZnJvbSBcIi4vaW5zdGFuY2VQcm9jZXNzb3IuanNcIjtcclxuXHJcbmNvbnN0IExPRyA9IG5ldyBMb2dnZXIoXCJJbnN0YW5jZVBvc3RDb25maWdUcmlnZ2VyXCIpO1xyXG5cclxuLyoqXHJcbiAqIEluc3RhbmNlIHByb2Nlc3NvciB3aGljaCBjYWxscyBwb3N0Q29uZmlnIG9uIG9iamVjdHMgYWZ0ZXIgY29uZmlnUHJvY2Vzc29ycyBhcmUgZmluaXNoZWRcclxuICovXHJcbmV4cG9ydCBjbGFzcyBJbnN0YW5jZVBvc3RDb25maWdUcmlnZ2VyIGV4dGVuZHMgSW5zdGFuY2VQcm9jZXNzb3Ige1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogXHJcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gaW5zdGFuY2UgXHJcbiAgICAgKiBAcmV0dXJuIHtQcm9taXNlfVxyXG4gICAgICovXHJcbiAgICBwcm9jZXNzKGluc3RhbmNlKSB7XHJcbiAgICAgICAgbGV0IHJlc3BvbnNlID0gbnVsbDtcclxuICAgICAgICBpZihpbnN0YW5jZS5wb3N0Q29uZmlnKSB7XHJcbiAgICAgICAgICAgIHJlc3BvbnNlID0gaW5zdGFuY2UucG9zdENvbmZpZygpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoIXJlc3BvbnNlKSB7XHJcbiAgICAgICAgICAgIHJlc3BvbnNlID0gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KSA9PiB7IHJlc29sdmUoKTsgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICghcmVzcG9uc2UgaW5zdGFuY2VvZiBQcm9taXNlKSB7XHJcbiAgICAgICAgICAgIHRocm93IFwicG9zdENvbmZpZygpIG11c3QgcmV0dXJuIGVpdGhlciB1bmRlZmluZWQgb3IgbnVsbCBvciBhIFByb21pc2VcIlxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gcmVzcG9uc2U7XHJcbiAgICB9XHJcblxyXG59IiwiaW1wb3J0IHsgVHlwZUNvbmZpZyB9IGZyb20gXCIuL3R5cGVDb25maWcuanNcIjtcclxuaW1wb3J0IHsgSW5zdGFuY2VIb2xkZXIgfSBmcm9tIFwiLi9pbnN0YW5jZUhvbGRlci5qc1wiO1xyXG5cclxuZXhwb3J0IGNsYXNzIFByb3RvdHlwZUNvbmZpZyBleHRlbmRzIFR5cGVDb25maWcge1xyXG5cclxuICAgIHN0YXRpYyBuYW1lZChuYW1lLCBjbGFzc1JlZmVyZW5jZSkge1xyXG4gICAgICAgIHJldHVybiBuZXcgUHJvdG90eXBlQ29uZmlnKG5hbWUsIGNsYXNzUmVmZXJlbmNlKTtcclxuICAgIH1cclxuXHJcbiAgICBzdGF0aWMgdW5uYW1lZChjbGFzc1JlZmVyZW5jZSkge1xyXG4gICAgICAgIHJldHVybiBuZXcgUHJvdG90eXBlQ29uZmlnKGNsYXNzUmVmZXJlbmNlLm5hbWUsIGNsYXNzUmVmZXJlbmNlKTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdHJ1Y3RvcihuYW1lLCBjbGFzc1JlZmVyZW5jZSkge1xyXG4gICAgICAgIHN1cGVyKG5hbWUsIGNsYXNzUmVmZXJlbmNlKTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIEBwYXJhbSB7YXJyYXl9IHBhcmFtZXRlcnMgdGhlIHBhcmFtZXRlcnMgdG8gdXNlIGZvciB0aGUgY29uc3RydWN0b3JcclxuICAgICAqL1xyXG4gICAgaW5zdGFuY2VIb2xkZXIocGFyYW1ldGVycyA9IFtdKSB7XHJcbiAgICAgICAgbGV0IGluc3RhbmNlID0gbnVsbDtcclxuICAgICAgICBpZihwYXJhbWV0ZXJzICYmIHBhcmFtZXRlcnMubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICBpbnN0YW5jZSA9IG5ldyB0aGlzLmNsYXNzUmVmZXJlbmNlKC4uLnBhcmFtZXRlcnMpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGluc3RhbmNlID0gbmV3IHRoaXMuY2xhc3NSZWZlcmVuY2UoKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIEluc3RhbmNlSG9sZGVyLmhvbGRlcldpdGhOZXdJbnN0YW5jZShpbnN0YW5jZSk7XHJcbiAgICB9XHJcblxyXG5cclxufSIsImltcG9ydCB7IFR5cGVDb25maWcgfSBmcm9tIFwiLi90eXBlQ29uZmlnLmpzXCI7XHJcblxyXG5leHBvcnQgY2xhc3MgUG9vbENvbmZpZyBleHRlbmRzIFR5cGVDb25maWcge1xyXG5cclxuICAgIHN0YXRpYyBuYW1lZChuYW1lLCBjbGFzc1JlZmVyZW5jZSwgcG9vbFNpemUpIHtcclxuICAgICAgICByZXR1cm4gbmV3IFBvb2xDb25maWcobmFtZSwgY2xhc3NSZWZlcmVuY2UsIHBvb2xTaXplKTtcclxuICAgIH1cclxuXHJcbiAgICBzdGF0aWMgdW5uYW1lZChjbGFzc1JlZmVyZW5jZSwgcG9vbFNpemUpIHtcclxuICAgICAgICByZXR1cm4gbmV3IFBvb2xDb25maWcoY2xhc3NSZWZlcmVuY2UubmFtZSwgY2xhc3NSZWZlcmVuY2UsIHBvb2xTaXplKTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdHJ1Y3RvcihuYW1lLCBjbGFzc1JlZmVyZW5jZSwgcG9vbFNpemUpIHtcclxuICAgICAgICBzdXBlcihuYW1lLCBjbGFzc1JlZmVyZW5jZSk7XHJcbiAgICAgICAgdGhpcy5wb29sU2l6ZSA9IHBvb2xTaXplO1xyXG4gICAgfVxyXG5cclxuICAgIGluc3RhbmNlSG9sZGVyKHBhcmFtZXRlcnMgPSBbXSkge1xyXG5cclxuICAgIH1cclxuXHJcbn0iXSwibmFtZXMiOlsiTG9nZ2VyIiwiTE9HIiwiTWFwIiwiTGlzdCJdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQU8sTUFBTSxNQUFNLENBQUM7QUFDcEI7QUFDQSxJQUFJLFdBQVcsR0FBRztBQUNsQjtBQUNBLFFBQVEsSUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJ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
