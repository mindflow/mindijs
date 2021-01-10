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
     * @param {Map<TypeConfig>} configEntries 
     * @return {Map<TypeConfig>}
     */
    static prepareUnconfiguredConfigEntries(configEntries) {
        /** @type {Map<TypeConfig>} */
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
     * @param {Map<TypeConfig>} configEntriesMap 
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWluZGlfdjEuanMiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9taW5kaS9jb25maWcuanMiLCIuLi8uLi9zcmMvbWluZGkvdHlwZUNvbmZpZy9pbnN0YW5jZUhvbGRlci5qcyIsIi4uLy4uL3NyYy9taW5kaS90eXBlQ29uZmlnL3R5cGVDb25maWcuanMiLCIuLi8uLi9zcmMvbWluZGkvY29uZmlnQWNjZXNzb3IuanMiLCIuLi8uLi9zcmMvbWluZGkvaW5qZWN0b3IuanMiLCIuLi8uLi9zcmMvbWluZGkvY29uZmlnUHJvY2Vzc29yL2NvbmZpZ1Byb2Nlc3NvckV4ZWN1dG9yLmpzIiwiLi4vLi4vc3JjL21pbmRpL3R5cGVDb25maWcvc2luZ2xldG9uQ29uZmlnLmpzIiwiLi4vLi4vc3JjL21pbmRpL2FwaS9wcm92aWRlci5qcyIsIi4uLy4uL3NyYy9taW5kaS9hcGkvaW5qZWN0aW9uUG9pbnQuanMiLCIuLi8uLi9zcmMvbWluZGkvaW5zdGFuY2VQcm9jZXNzb3IvaW5zdGFuY2VQcm9jZXNzb3JFeGVjdXRvci5qcyIsIi4uLy4uL3NyYy9taW5kaS9taW5kaVByb3ZpZGVyLmpzIiwiLi4vLi4vc3JjL21pbmRpL21pbmRpSW5qZWN0b3IuanMiLCIuLi8uLi9zcmMvbWluZGkvaW5zdGFuY2VQcm9jZXNzb3IvaW5zdGFuY2VQcm9jZXNzb3IuanMiLCIuLi8uLi9zcmMvbWluZGkvY29uZmlnUHJvY2Vzc29yL2NvbmZpZ1Byb2Nlc3Nvci5qcyIsIi4uLy4uL3NyYy9taW5kaS9taW5kaUNvbmZpZy5qcyIsIi4uLy4uL3NyYy9taW5kaS9pbnN0YW5jZVByb2Nlc3Nvci9pbnN0YW5jZVBvc3RDb25maWdUcmlnZ2VyLmpzIiwiLi4vLi4vc3JjL21pbmRpL3R5cGVDb25maWcvcG9vbENvbmZpZy5qcyIsIi4uLy4uL3NyYy9taW5kaS90eXBlQ29uZmlnL3Byb3RvdHlwZUNvbmZpZy5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyJleHBvcnQgY2xhc3MgQ29uZmlnIHtcblxuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICAvKiogQHR5cGUge01hcH0gKi9cbiAgICAgICAgdGhpcy5jb25maWdFbnRyaWVzID0gbnVsbDtcblxuICAgICAgICAvKiogQHR5cGUge0xpc3R9ICovXG4gICAgICAgIHRoaXMuY29uZmlnUHJvY2Vzc29ycyA9IG51bGw7XG5cbiAgICAgICAgLyoqIEB0eXBlIHtMaXN0fSAqL1xuICAgICAgICB0aGlzLmluc3RhbmNlUHJvY2Vzc29ycyA9IG51bGw7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQHJldHVybnMge1Byb21pc2V9XG4gICAgICovXG4gICAgZmluYWxpemUoKSB7XG5cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAgICAgKi9cbiAgICBpc0ZpbmFsaXplZCgpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbn0iLCJleHBvcnQgY2xhc3MgSW5zdGFuY2VIb2xkZXIge1xuXG4gICAgc3RhdGljIGdldCBORVdfSU5TVEFOQ0UoKSB7IHJldHVybiAwOyB9XG5cbiAgICBzdGF0aWMgZ2V0IEVYSVNUSU5HX0lOU1RBTkNFKCkgeyByZXR1cm4gMTsgfVxuXG4gICAgc3RhdGljIGhvbGRlcldpdGhOZXdJbnN0YW5jZShpbnN0YW5jZSkge1xuICAgICAgICByZXR1cm4gbmV3IEluc3RhbmNlSG9sZGVyKGluc3RhbmNlLCBJbnN0YW5jZUhvbGRlci5ORVdfSU5TVEFOQ0UpO1xuICAgIH1cblxuICAgIHN0YXRpYyBob2xkZXJXaXRoRXhpc3RpbmdJbnN0YW5jZShpbnN0YW5jZSkge1xuICAgICAgICByZXR1cm4gbmV3IEluc3RhbmNlSG9sZGVyKGluc3RhbmNlLCBJbnN0YW5jZUhvbGRlci5FWElTVElOR19JTlNUQU5DRSk7XG4gICAgfVxuXG4gICAgY29uc3RydWN0b3IoaW5zdGFuY2UsIHR5cGUpIHtcbiAgICAgICAgdGhpcy5pbnN0YW5jZSA9IGluc3RhbmNlO1xuICAgICAgICB0aGlzLnR5cGUgPSB0eXBlO1xuICAgIH1cblxufSIsImV4cG9ydCBjbGFzcyBUeXBlQ29uZmlnIHtcblxuICAgIHN0YXRpYyBnZXQgTkVXKCkgeyByZXR1cm4gXCJORVdcIjsgfVxuICAgIHN0YXRpYyBnZXQgQ09ORklHVVJFRCgpIHsgcmV0dXJuIFwiQ09ORklHVVJFRFwiOyB9XG5cbiAgICBjb25zdHJ1Y3RvcihuYW1lLCBjbGFzc1JlZmVyZW5jZSkge1xuICAgICAgICB0aGlzLm5hbWUgPSBuYW1lO1xuICAgICAgICB0aGlzLmNsYXNzUmVmZXJlbmNlID0gY2xhc3NSZWZlcmVuY2U7XG4gICAgICAgIHRoaXMuc3RhZ2UgPSBUeXBlQ29uZmlnLk5FVztcbiAgICB9XG5cbiAgICBpbnN0YW5jZUhvbGRlcihwYXJhbWV0ZXJzID0gW10pIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG59IiwiaW1wb3J0IHsgQ29uZmlnIH0gZnJvbSBcIi4vY29uZmlnLmpzXCI7XG5pbXBvcnQgeyBMb2dnZXIgfSBmcm9tIFwiY29yZXV0aWxfdjFcIjtcbmltcG9ydCB7IEluc3RhbmNlSG9sZGVyIH0gZnJvbSBcIi4vdHlwZUNvbmZpZy9pbnN0YW5jZUhvbGRlci5qc1wiO1xuaW1wb3J0IHsgVHlwZUNvbmZpZyB9IGZyb20gXCIuL3R5cGVDb25maWcvdHlwZUNvbmZpZy5qc1wiO1xuXG5jb25zdCBMT0cgPSBuZXcgTG9nZ2VyKFwiQ29uZmlnQWNjZXNzb3JcIik7XG5cbi8qKlxuICogVXRpbGl0aWVzIGZvciBhY2Nlc3NpbmcgYSBDb25maWcgb2JqZWN0XG4gKi9cbmV4cG9ydCBjbGFzcyBDb25maWdBY2Nlc3NvciB7XG5cbiAgICAvKipcbiAgICAgKiBHZXQgYW4gaW5zdGFuY2UgYnkgY2xhc3MgbmFtZSBpbiB0aGUgY29uZmlnXG4gICAgICogXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG5hbWUgXG4gICAgICogQHBhcmFtIHtDb25maWd9IGNvbmZpZyBcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBwYXJhbWV0ZXJzXG4gICAgICogQHJldHVybnMge0luc3RhbmNlSG9sZGVyfVxuICAgICAqL1xuICAgIHN0YXRpYyBpbnN0YW5jZUhvbGRlcihuYW1lLCBjb25maWcsIHBhcmFtZXRlcnMgPSBbXSkge1xuICAgICAgICBjb25zdCB0eXBlQ29uZmlnID0gdGhpcy50eXBlQ29uZmlnQnlOYW1lKG5hbWUsIGNvbmZpZyk7XG4gICAgICAgIGlmKHR5cGVDb25maWcgPT09IG51bGwpIHtcbiAgICAgICAgICAgIExPRy5lcnJvcihcIk5vIHR5cGVjb25maWcgZm91bmQgZm9yIFwiICsgbmFtZSk7XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBpbnN0YW5jZUhvbGRlciA9IHR5cGVDb25maWcuaW5zdGFuY2VIb2xkZXIocGFyYW1ldGVycyk7XG4gICAgICAgIGlmKCFpbnN0YW5jZUhvbGRlcikge1xuICAgICAgICAgICAgTE9HLmVycm9yKFwiTm8gb2JqZWN0IGZvdW5kIGZvciBcIiArIG5hbWUpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBpbnN0YW5jZUhvbGRlcjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgdGhlIHR5cGUgY29uZmlnIGJ5IGNsYXNzIG5hbWUgaW4gdGhlIGNvbmZpZ1xuICAgICAqIFxuICAgICAqIEBwYXJhbSB7Q29uZmlnfSBjb25maWcgXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG5hbWUgXG4gICAgICogQHJldHVybnMge1R5cGVDb25maWd9XG4gICAgICovXG4gICAgc3RhdGljIHR5cGVDb25maWdCeU5hbWUobmFtZSwgY29uZmlnKSB7XG4gICAgICAgIGxldCBjb25maWdFbnRyeSA9IG51bGw7XG4gICAgICAgIGNvbmZpZy5jb25maWdFbnRyaWVzLmZvckVhY2goKGtleSwgdmFsdWUsIHBhcmVudCkgPT4ge1xuICAgICAgICAgICAgaWYoa2V5ID09PSBuYW1lKSB7XG4gICAgICAgICAgICAgICAgY29uZmlnRW50cnkgPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfSwgdGhpcyk7XG4gICAgICAgIGlmKCFjb25maWdFbnRyeSkge1xuICAgICAgICAgICAgTE9HLmVycm9yKFwiTm8gY29uZmlnIGVudHJ5IGZvdW5kIGZvciBcIiArIG5hbWUpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBjb25maWdFbnRyeTtcbiAgICB9XG5cbn0iLCJleHBvcnQgY2xhc3MgSW5qZWN0b3Ige1xuXG5cbiAgICAvKipcbiAgICAgKiBIZWxwZXIgbWV0aG9kIGZvciBpbmplY3RpbmcgZmllbGRzIGluIHRhcmdldCBvYmplY3RcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge2FueX0gdGFyZ2V0T2JqZWN0IFxuICAgICAqIEBwYXJhbSB7Q29uZmlnfSBjb25maWcgXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGRlcHRoXG4gICAgICogQHJldHVybnMge1Byb21pc2V9XG4gICAgICovXG4gICAgaW5qZWN0VGFyZ2V0KHRhcmdldCwgY29uZmlnLCBkZXB0aCA9IDApIHtcblxuICAgIH1cblxufSIsImltcG9ydCB7IE1hcCwgTG9nZ2VyLCBMaXN0IH0gZnJvbSBcImNvcmV1dGlsX3YxXCI7XG5pbXBvcnQgeyBDb25maWcgfSBmcm9tIFwiLi4vY29uZmlnLmpzXCI7XG5pbXBvcnQgeyBDb25maWdBY2Nlc3NvciB9IGZyb20gXCIuLi9jb25maWdBY2Nlc3Nvci5qc1wiO1xuaW1wb3J0IHsgSW5qZWN0b3IgfSBmcm9tIFwiLi4vaW5qZWN0b3IuanNcIjtcbmltcG9ydCB7IEluc3RhbmNlSG9sZGVyIH0gZnJvbSBcIi4uL3R5cGVDb25maWcvaW5zdGFuY2VIb2xkZXIuanNcIjtcbmltcG9ydCB7IFR5cGVDb25maWcgfSBmcm9tIFwiLi4vdHlwZUNvbmZpZy90eXBlQ29uZmlnLmpzXCI7XG5cbmNvbnN0IExPRyA9IG5ldyBMb2dnZXIoXCJDb25maWdQcm9jZXNzb3JFeGVjdXRvclwiKTtcblxuLyoqXG4gKiBFeGVjdXRlcyB0aGUgcHJvdmlkZWQgY29uZmlnIHByb2Nlc3NvcnMgb24gdGhlIHByb3ZpZGVkIGNvbmZpZyByZWdpc3RyeVxuICogUmV0dXJucyBhIGxpc3Qgb2YgcHJvbWlzZXMgZm9yIHdoZW4gdGhlIGNvbmZpZyBwcm9jZXNzb3JzIGhhcyBjb21wbGV0ZWQgcnVubmluZ1xuICogXG4gKiBBIGNvbmZpZyBwcm9jZXNzb3IgcmVhZHMgdGhlIGNvbmZpZyBhbmQgcGVyZm9ybXMgYW55IG5lY2Vzc2FyeSBhY3Rpb25zIGJhc2VkIG9uXG4gKiBjbGFzcyBhbmQgdHlwZSBpbmZvcm1hdGlvbi4gQSBjb25maWcgcHJvY2Vzc29yIGRvZXMgbm90IG9wZXJhdGUgb24gbWFuYWdlZCBpbnN0YW5jZXNcbiAqL1xuZXhwb3J0IGNsYXNzIENvbmZpZ1Byb2Nlc3NvckV4ZWN1dG9yIHtcbiAgICBcbiAgICAvKipcbiAgICAgKiBAcGFyYW0ge0xpc3Q8U3RyaW5nPn0gY29uZmlnUHJvY2Vzc29yQ2xhc3NOYW1lTGlzdFxuICAgICAqIEBwYXJhbSB7SW5qZWN0b3J9IGluamVjdG9yXG4gICAgICogQHBhcmFtIHtDb25maWd9IGNvbmZpZ1xuICAgICAqIEByZXR1cm5zIHtQcm9taXNlfSBwcm9taXNlIHdoaWNoIGlzIHJlc29sdmVkIHdoZW4gYWxsIGNvbmZpZyBwcm9jZXNzb3JzIGFyZSByZXNvbHZlZFxuICAgICAqL1xuICAgIHN0YXRpYyBleGVjdXRlKGNvbmZpZ1Byb2Nlc3NvckNsYXNzTmFtZUxpc3QsIGluamVjdG9yLCBjb25maWcpIHtcbiAgICAgICAgcmV0dXJuIGNvbmZpZ1Byb2Nlc3NvckNsYXNzTmFtZUxpc3QucHJvbWlzZUNoYWluKChjb25maWdQcm9jZXNzb3JDbGFzc05hbWUsIHBhcmVudCkgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlQ29uZmlnUHJvY2Vzc29yRXhlY3V0ZWQsIHJlamVjdCkgPT4ge1xuXG4gICAgICAgICAgICAgICAgbGV0IHRhcmdldEluamVjdGVkUHJvbWlzZSA9IFByb21pc2UucmVzb2x2ZSgpO1xuXG4gICAgICAgICAgICAgICAgLyoqICBAdHlwZSB7SW5zdGFuY2VIb2xkZXJ9ICovXG4gICAgICAgICAgICAgICAgY29uc3QgcHJvY2Vzc29ySG9sZGVyID0gQ29uZmlnQWNjZXNzb3IuaW5zdGFuY2VIb2xkZXIoY29uZmlnUHJvY2Vzc29yQ2xhc3NOYW1lLCBjb25maWcpO1xuICAgICAgICAgICAgICAgIGlmKHByb2Nlc3NvckhvbGRlci50eXBlID09PSBJbnN0YW5jZUhvbGRlci5ORVdfSU5TVEFOQ0UpIHtcbiAgICAgICAgICAgICAgICAgICAgdGFyZ2V0SW5qZWN0ZWRQcm9taXNlID0gaW5qZWN0b3IuaW5qZWN0VGFyZ2V0KHByb2Nlc3NvckhvbGRlci5pbnN0YW5jZSwgY29uZmlnKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB0YXJnZXRJbmplY3RlZFByb21pc2UudGhlbigoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRvQ29uZmlndXJlTWFwID0gQ29uZmlnUHJvY2Vzc29yRXhlY3V0b3IucHJlcGFyZVVuY29uZmlndXJlZENvbmZpZ0VudHJpZXMoY29uZmlnLmNvbmZpZ0VudHJpZXMpO1xuICAgICAgICAgICAgICAgICAgICBwcm9jZXNzb3JIb2xkZXIuaW5zdGFuY2UucHJvY2Vzc0NvbmZpZyhjb25maWcsIHRvQ29uZmlndXJlTWFwKS50aGVuKCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmVDb25maWdQcm9jZXNzb3JFeGVjdXRlZCgpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7TWFwPFR5cGVDb25maWc+fSBjb25maWdFbnRyaWVzIFxuICAgICAqIEByZXR1cm4ge01hcDxUeXBlQ29uZmlnPn1cbiAgICAgKi9cbiAgICBzdGF0aWMgcHJlcGFyZVVuY29uZmlndXJlZENvbmZpZ0VudHJpZXMoY29uZmlnRW50cmllcykge1xuICAgICAgICAvKiogQHR5cGUge01hcDxUeXBlQ29uZmlnPn0gKi9cbiAgICAgICAgY29uc3QgdW5jb25maWd1cmVkQ29uZmlnRW50cmllcyA9IG5ldyBNYXAoKTtcblxuICAgICAgICBjb25maWdFbnRyaWVzLmZvckVhY2goKGtleSwgdmFsdWUsIHBhcmVudCkgPT4ge1xuXG4gICAgICAgICAgICAvKiogQHR5cGUge1R5cGVDb25maWd9ICovXG4gICAgICAgICAgICBjb25zdCBjb25maWdFbnRyeSA9IHZhbHVlO1xuXG4gICAgICAgICAgICBpZihjb25maWdFbnRyeS5zdGFnZSA9PT0gVHlwZUNvbmZpZy5ORVcpIHtcbiAgICAgICAgICAgICAgICB1bmNvbmZpZ3VyZWRDb25maWdFbnRyaWVzLnNldChrZXksIGNvbmZpZ0VudHJ5KTtcbiAgICAgICAgICAgICAgICBjb25maWdFbnRyeS5zdGFnZSA9IFR5cGVDb25maWcuQ09ORklHVVJFRDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH0sIHRoaXMpO1xuXG4gICAgICAgIHJldHVybiB1bmNvbmZpZ3VyZWRDb25maWdFbnRyaWVzO1xuICAgIH1cblxufSIsImltcG9ydCB7IFR5cGVDb25maWcgfSBmcm9tIFwiLi90eXBlQ29uZmlnLmpzXCI7XG5pbXBvcnQgeyBMb2dnZXIgfSBmcm9tIFwiY29yZXV0aWxfdjFcIjtcbmltcG9ydCB7IEluc3RhbmNlSG9sZGVyIH0gZnJvbSBcIi4vaW5zdGFuY2VIb2xkZXIuanNcIjtcblxuY29uc3QgTE9HID0gbmV3IExvZ2dlcihcIlNpbmdsZXRvbkNvbmZpZ1wiKTtcblxuZXhwb3J0IGNsYXNzIFNpbmdsZXRvbkNvbmZpZyBleHRlbmRzIFR5cGVDb25maWcge1xuXG4gICAgc3RhdGljIG5hbWVkKG5hbWUsIGNsYXNzUmVmZXJlbmNlKSB7XG4gICAgICAgIHJldHVybiBuZXcgU2luZ2xldG9uQ29uZmlnKG5hbWUsIGNsYXNzUmVmZXJlbmNlKTtcbiAgICB9XG5cbiAgICBzdGF0aWMgdW5uYW1lZChjbGFzc1JlZmVyZW5jZSkge1xuICAgICAgICByZXR1cm4gbmV3IFNpbmdsZXRvbkNvbmZpZyhjbGFzc1JlZmVyZW5jZS5uYW1lLCBjbGFzc1JlZmVyZW5jZSk7XG4gICAgfVxuXG4gICAgY29uc3RydWN0b3IobmFtZSwgY2xhc3NSZWZlcmVuY2UpIHtcbiAgICAgICAgc3VwZXIobmFtZSwgY2xhc3NSZWZlcmVuY2UpO1xuICAgIH1cblxuICAgIGluc3RhbmNlSG9sZGVyKHBhcmFtZXRlcnMgPSBbXSkge1xuICAgICAgICBpZiAoIXRoaXMuaW5zdGFuY2UpIHtcbiAgICAgICAgICAgIGlmKHBhcmFtZXRlcnMgJiYgcGFyYW1ldGVycy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5pbnN0YW5jZSA9IG5ldyB0aGlzLmNsYXNzUmVmZXJlbmNlKC4uLnBhcmFtZXRlcnMpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLmluc3RhbmNlID0gbmV3IHRoaXMuY2xhc3NSZWZlcmVuY2UoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBJbnN0YW5jZUhvbGRlci5ob2xkZXJXaXRoTmV3SW5zdGFuY2UodGhpcy5pbnN0YW5jZSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIEluc3RhbmNlSG9sZGVyLmhvbGRlcldpdGhFeGlzdGluZ0luc3RhbmNlKHRoaXMuaW5zdGFuY2UpO1xuICAgIH1cblxufSIsImltcG9ydCB7IExvZ2dlciB9IGZyb20gXCJjb3JldXRpbF92MVwiO1xuXG5jb25zdCBMT0cgPSBuZXcgTG9nZ2VyKFwiUHJvdmlkZXJcIik7XG5cbi8qKlxuICogQHRlbXBsYXRlIFRcbiAqL1xuZXhwb3J0IGNsYXNzIFByb3ZpZGVyIHtcblxuICAgIC8qKlxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7QXJyYXl9IHBhcmFtZXRlcnMgXG4gICAgICogQHJldHVybnMge1Byb21pc2U8VD59XG4gICAgICovXG4gICAgZ2V0KHBhcmFtZXRlcnMgPSBbXSkge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbn0iLCJpbXBvcnQgeyBQcm92aWRlciB9IGZyb20gXCIuL3Byb3ZpZGVyLmpzXCI7XG5cbmV4cG9ydCBjbGFzcyBJbmplY3Rpb25Qb2ludCB7XG5cbiAgICBzdGF0aWMgZ2V0IElOU1RBTkNFX1RZUEUoKSB7IHJldHVybiAwOyB9IFxuICAgIHN0YXRpYyBnZXQgUFJPVklERVJfVFlQRSgpIHsgcmV0dXJuIDE7IH0gXG5cbiAgICAvKipcbiAgICAgKiBAdGVtcGxhdGUgVFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBuYW1lIFxuICAgICAqIEBwYXJhbSB7bmV3KCkgPT4gVH0gY2xhc3NSZWZlcmVuY2UgXG4gICAgICogQHBhcmFtIHthcnJheX0gcGFyYW1ldGVycyBcbiAgICAgKiBAcmV0dXJucyB7VH1cbiAgICAgKi9cbiAgICBzdGF0aWMgaW5zdGFuY2VCeU5hbWUobmFtZSwgY2xhc3NSZWZlcmVuY2UsIHBhcmFtZXRlcnMgPSBbXSkge1xuICAgICAgICByZXR1cm4gbmV3IEluamVjdGlvblBvaW50KG5hbWUsIGNsYXNzUmVmZXJlbmNlLCBJbmplY3Rpb25Qb2ludC5JTlNUQU5DRV9UWVBFLCBwYXJhbWV0ZXJzKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAdGVtcGxhdGUgVFxuICAgICAqIEBwYXJhbSB7bmV3KCkgPT4gVH0gY2xhc3NSZWZlcmVuY2UgXG4gICAgICogQHBhcmFtIHthcnJheX0gcGFyYW1ldGVycyBcbiAgICAgKiBAcmV0dXJucyB7VH1cbiAgICAgKi9cbiAgICBzdGF0aWMgaW5zdGFuY2UoY2xhc3NSZWZlcmVuY2UsIHBhcmFtZXRlcnMgPSBbXSkge1xuICAgICAgICByZXR1cm4gbmV3IEluamVjdGlvblBvaW50KGNsYXNzUmVmZXJlbmNlLm5hbWUsIGNsYXNzUmVmZXJlbmNlLCBJbmplY3Rpb25Qb2ludC5JTlNUQU5DRV9UWVBFLCBwYXJhbWV0ZXJzKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAdGVtcGxhdGUgVFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBuYW1lIFxuICAgICAqIEBwYXJhbSB7bmV3KCkgPT4gVH0gY2xhc3NSZWZlcmVuY2UgXG4gICAgICogQHJldHVybnMge1Byb3ZpZGVyPFQ+fVxuICAgICAqL1xuICAgIHN0YXRpYyBwcm92aWRlckJ5TmFtZShuYW1lLCBjbGFzc1JlZmVyZW5jZSkge1xuICAgICAgICByZXR1cm4gbmV3IEluamVjdGlvblBvaW50KG5hbWUsIGNsYXNzUmVmZXJlbmNlLCBJbmplY3Rpb25Qb2ludC5QUk9WSURFUl9UWVBFKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAdGVtcGxhdGUgVFxuICAgICAqIEBwYXJhbSB7bmV3KCkgPT4gVH0gY2xhc3NSZWZlcmVuY2UgXG4gICAgICogQHJldHVybnMge1Byb3ZpZGVyPFQ+fVxuICAgICAqL1xuICAgIHN0YXRpYyBwcm92aWRlcihjbGFzc1JlZmVyZW5jZSkge1xuICAgICAgICByZXR1cm4gbmV3IEluamVjdGlvblBvaW50KGNsYXNzUmVmZXJlbmNlLm5hbWUsIGNsYXNzUmVmZXJlbmNlLCBJbmplY3Rpb25Qb2ludC5QUk9WSURFUl9UWVBFKTtcbiAgICB9XG5cbiAgICBjb25zdHJ1Y3RvcihuYW1lLCBjbGFzc1JlZmVyZW5jZSwgdHlwZSA9IEluamVjdGlvblBvaW50LklOU1RBTkNFX1RZUEUsIHBhcmFtZXRlcnMgPSBudWxsKSB7XG4gICAgICAgIHRoaXMubmFtZSA9IG5hbWU7XG4gICAgICAgIHRoaXMuY2xhc3NSZWZlcmVuY2UgPSBjbGFzc1JlZmVyZW5jZTtcbiAgICAgICAgdGhpcy50eXBlID0gdHlwZTtcbiAgICAgICAgdGhpcy5wYXJhbWV0ZXJzID0gcGFyYW1ldGVycztcbiAgICB9XG5cbn0iLCJpbXBvcnQgeyBMb2dnZXIsIExpc3QgfSBmcm9tIFwiY29yZXV0aWxfdjFcIjtcbmltcG9ydCB7IENvbmZpZ0FjY2Vzc29yIH0gZnJvbSBcIi4uL2NvbmZpZ0FjY2Vzc29yLmpzXCI7XG5pbXBvcnQgeyBDb25maWcgfSBmcm9tIFwiLi4vY29uZmlnLmpzXCI7XG5cbmNvbnN0IExPRyA9IG5ldyBMb2dnZXIoXCJJbnN0YW5jZVByb2Nlc3NvckV4ZWN1dG9yXCIpO1xuXG4vKipcbiAqIEV4ZWN1dGVzIHRoZSBjb25maWdzIGluc3RhbmNlIHByb2Nlc3NvcnMgb24gdGhlIHByb3ZpZGVkIGluc3RhbmNlXG4gKiBSZXR1cm5zIGEgcHJvbWlzZSBmb3Igd2hlbiB0aGUgaW5zdGFuY2UgcHJvY2Vzc29ycyBoYXMgY29tcGxldGVkIHJ1bm5pbmdcbiAqIFxuICogSW5zdGFuY2UgcHJvY2Vzc29ycyBwZXJmb3JtIG9wZXJhdGlvbnMgb24gbWFuYWdlZCBpbnN0YW5jZXMgYWZ0ZXIgdGhleSBoYXZlIGJlZW4gaW5zdGFuc2lhdGVkXG4gKi9cbmV4cG9ydCBjbGFzcyBJbnN0YW5jZVByb2Nlc3NvckV4ZWN1dG9yIHtcblxuICAgIC8qKlxuICAgICAqIEBwYXJhbSB7TGlzdH0gaW5zdGFuY2VQcm9jZXNzb3JMaXN0IHRoZSBpbnN0YW5jZSBwcm9jZXNzb3JzXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGluc3RhbmNlIHRoZSBpbnN0YW5jZSB0byBwcm9jZXNzXG4gICAgICogQHBhcmFtIHtDb25maWd9IGNvbmZpZ1xuICAgICAqIEByZXR1cm5zIHtQcm9taXNlfVxuICAgICAqL1xuICAgIHN0YXRpYyBleGVjdXRlKGluc3RhbmNlLCBjb25maWcpIHtcbiAgICAgICAgcmV0dXJuIGNvbmZpZy5pbnN0YW5jZVByb2Nlc3NvcnMucHJvbWlzZUNoYWluKChwcm9jZXNzb3JOYW1lLCBwYXJlbnQpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHByb2Nlc3NvckhvbGRlciA9IENvbmZpZ0FjY2Vzc29yLmluc3RhbmNlSG9sZGVyKHByb2Nlc3Nvck5hbWUsIGNvbmZpZyk7XG4gICAgICAgICAgICByZXR1cm4gcHJvY2Vzc29ySG9sZGVyLmluc3RhbmNlLnByb2Nlc3MoaW5zdGFuY2UpO1xuICAgICAgICB9LCB0aGlzKTtcbiAgICB9XG5cbn0iLCJpbXBvcnQgeyBQcm92aWRlciB9IGZyb20gXCIuL2FwaS9wcm92aWRlci5qc1wiO1xuaW1wb3J0IHsgVHlwZUNvbmZpZyB9IGZyb20gXCIuL3R5cGVDb25maWcvdHlwZUNvbmZpZy5qc1wiO1xuaW1wb3J0IHsgSW5zdGFuY2VIb2xkZXIgfSBmcm9tIFwiLi90eXBlQ29uZmlnL2luc3RhbmNlSG9sZGVyLmpzXCI7XG5pbXBvcnQgeyBJbmplY3RvciB9IGZyb20gXCIuL2luamVjdG9yLmpzXCI7XG5pbXBvcnQgeyBDb25maWcgfSBmcm9tIFwiLi9jb25maWcuanNcIjtcbmltcG9ydCB7IENvbmZpZ0FjY2Vzc29yIH0gZnJvbSBcIi4vY29uZmlnQWNjZXNzb3IuanNcIjtcblxuLyoqXG4gKiBAdGVtcGxhdGUgVFxuICovXG5leHBvcnQgY2xhc3MgTWluZGlQcm92aWRlciBleHRlbmRzIFByb3ZpZGVyIHtcblxuICAgIC8qKlxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7VHlwZUNvbmZpZ30gdHlwZUNvbmZpZyBcbiAgICAgKiBAcGFyYW0ge0luamVjdG9yfSBpbmplY3RvclxuICAgICAqIEBwYXJhbSB7Q29uZmlnfSBjb25maWdcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3Rvcih0eXBlQ29uZmlnLCBpbmplY3RvciwgY29uZmlnKSB7XG5cbiAgICAgICAgc3VwZXIoKTtcblxuICAgICAgICAvKiogQHR5cGUge1R5cGVDb25maWd9ICovXG4gICAgICAgIHRoaXMudHlwZUNvbmZpZyA9IHR5cGVDb25maWc7XG5cbiAgICAgICAgLyoqIEB0eXBlIHtJbmplY3Rvcn0gKi9cbiAgICAgICAgdGhpcy5pbmplY3RvciA9IGluamVjdG9yO1xuXG4gICAgICAgIC8qKiBAdHlwZSB7Q29uZmlnfSAqL1xuICAgICAgICB0aGlzLmNvbmZpZyA9IGNvbmZpZztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBwYXJhbWV0ZXJzIFxuICAgICAqIEByZXR1cm5zIHtQcm9taXNlPFQ+fVxuICAgICAqL1xuICAgIGdldChwYXJhbWV0ZXJzID0gW10pIHtcbiAgICAgICAgLyoqIEB0eXBlIHtJbnN0YW5jZUhvbGRlcn0gKi9cbiAgICAgICAgY29uc3QgaW5zdGFuY2VIb2xkZXIgPSBDb25maWdBY2Nlc3Nvci5pbnN0YW5jZUhvbGRlcih0aGlzLnR5cGVDb25maWcubmFtZSwgdGhpcy5jb25maWcsIHBhcmFtZXRlcnMpO1xuICAgICAgICBpZiAoaW5zdGFuY2VIb2xkZXIudHlwZSA9PT0gSW5zdGFuY2VIb2xkZXIuTkVXX0lOU1RBTkNFKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5pbmplY3Rvci5pbmplY3RUYXJnZXQoaW5zdGFuY2VIb2xkZXIuaW5zdGFuY2UsIHRoaXMuY29uZmlnKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKGluc3RhbmNlSG9sZGVyLmluc3RhbmNlKTtcbiAgICB9XG5cbn0iLCJpbXBvcnQgeyBMaXN0LCBMb2dnZXIgfSBmcm9tIFwiY29yZXV0aWxfdjFcIjtcbmltcG9ydCB7IENvbmZpZyB9IGZyb20gXCIuL2NvbmZpZy5qc1wiO1xuaW1wb3J0IHsgQ29uZmlnQWNjZXNzb3IgfSBmcm9tIFwiLi9jb25maWdBY2Nlc3Nvci5qc1wiO1xuaW1wb3J0IHsgSW5qZWN0aW9uUG9pbnQgfSBmcm9tIFwiLi9hcGkvaW5qZWN0aW9uUG9pbnQuanNcIlxuaW1wb3J0IHsgSW5zdGFuY2VQcm9jZXNzb3JFeGVjdXRvciB9IGZyb20gXCIuL2luc3RhbmNlUHJvY2Vzc29yL2luc3RhbmNlUHJvY2Vzc29yRXhlY3V0b3IuanNcIjtcbmltcG9ydCB7IEluc3RhbmNlSG9sZGVyIH0gZnJvbSBcIi4vdHlwZUNvbmZpZy9pbnN0YW5jZUhvbGRlci5qc1wiO1xuaW1wb3J0IHsgTWluZGlQcm92aWRlciB9IGZyb20gXCIuL21pbmRpUHJvdmlkZXIuanNcIjtcbmltcG9ydCB7IEluamVjdG9yIH0gZnJvbSBcIi4vaW5qZWN0b3IuanNcIjtcblxuY29uc3QgTE9HID0gbmV3IExvZ2dlcihcIk1pbmRpSW5qZWN0b3JcIik7XG5cbmV4cG9ydCBjbGFzcyBNaW5kaUluamVjdG9yIGV4dGVuZHMgSW5qZWN0b3Ige1xuXG4gICAgc3RhdGljIGluamVjdCh0YXJnZXQsIGNvbmZpZykge1xuICAgICAgICByZXR1cm4gSU5KRUNUT1IuaW5qZWN0VGFyZ2V0KHRhcmdldCwgY29uZmlnKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAcmV0dXJucyB7TWluZGlJbmplY3Rvcn1cbiAgICAgKi9cbiAgICBzdGF0aWMgZ2V0SW5zdGFuY2UoKSB7XG4gICAgICAgIHJldHVybiBJTkpFQ1RPUjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBIZWxwZXIgbWV0aG9kIGZvciBpbmplY3RpbmcgZmllbGRzIGluIHRhcmdldCBvYmplY3RcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge2FueX0gdGFyZ2V0T2JqZWN0IFxuICAgICAqIEBwYXJhbSB7Q29uZmlnfSBjb25maWcgXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGRlcHRoXG4gICAgICogQHJldHVybnMge1Byb21pc2V9XG4gICAgICovXG4gICAgaW5qZWN0VGFyZ2V0KHRhcmdldE9iamVjdCwgY29uZmlnLCBkZXB0aCA9IDApIHtcbiAgICAgICAgaWYgKCF0YXJnZXRPYmplY3QpIHtcbiAgICAgICAgICAgIHRocm93IEVycm9yKFwiTWlzc2luZyB0YXJnZXQgb2JqZWN0XCIpO1xuICAgICAgICB9XG4gICAgICAgIGlmICghY29uZmlnKSB7XG4gICAgICAgICAgICB0aHJvdyBFcnJvcihcIk1pc3NpbmcgY29uZmlnXCIpO1xuICAgICAgICB9XG4gICAgICAgIGlmICghY29uZmlnLmlzRmluYWxpemVkKCkpIHtcbiAgICAgICAgICAgIHRocm93IEVycm9yKFwiQ29uZmlnIG5vdCBmaW5hbGl6ZWRcIik7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRlcHRoID4gMTApIHtcbiAgICAgICAgICAgIHRocm93IEVycm9yKFwiSW5qZWN0aW9uIHN0cnVjdHVyZSB0b28gZGVlcFwiKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBpbmplY3RvciA9IHRoaXM7XG4gICAgICAgIGNvbnN0IG9iamVjdEZpZWxkTmFtZXMgPSBuZXcgTGlzdChPYmplY3Qua2V5cyh0YXJnZXRPYmplY3QpKTtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgIHJldHVybiBvYmplY3RGaWVsZE5hbWVzLnByb21pc2VDaGFpbigoZmllbGROYW1lLCBwYXJlbnQpID0+IHtcbiAgICAgICAgICAgICAgICByZXR1cm4gTWluZGlJbmplY3Rvci5pbmplY3RQcm9wZXJ0eSh0YXJnZXRPYmplY3QsIGZpZWxkTmFtZSwgY29uZmlnLCBkZXB0aCwgaW5qZWN0b3IpO1xuICAgICAgICAgICAgfSkudGhlbigoKSA9PiB7XG4gICAgICAgICAgICAgICAgSW5zdGFuY2VQcm9jZXNzb3JFeGVjdXRvci5leGVjdXRlKHRhcmdldE9iamVjdCwgY29uZmlnKS50aGVuKCgpID0+e1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHRhcmdldE9iamVjdCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSlcblxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSB0YXJnZXRPYmplY3QgXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IGZpZWxkTmFtZSBcbiAgICAgKiBAcGFyYW0ge0NvbmZpZ30gY29uZmlnIFxuICAgICAqIEBwYXJhbSB7TnVtYmVyfSBkZXB0aCBcbiAgICAgKiBAcGFyYW0ge0luamVjdG9yfSBpbmplY3RvclxuICAgICAqIEByZXR1cm5zIHtQcm9taXNlfVxuICAgICAqL1xuICAgIHN0YXRpYyBpbmplY3RQcm9wZXJ0eSh0YXJnZXRPYmplY3QsIGZpZWxkTmFtZSwgY29uZmlnLCBkZXB0aCwgaW5qZWN0b3IpIHtcbiAgICAgICAgY29uc3QgaW5qZWN0aW9uUG9pbnQgPSB0YXJnZXRPYmplY3RbZmllbGROYW1lXTsgICAgICAgIFxuICAgICAgICBpZighKGluamVjdGlvblBvaW50IGluc3RhbmNlb2YgSW5qZWN0aW9uUG9pbnQpKSB7XG4gICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGluamVjdGlvblBvaW50LnR5cGUgPT09IEluamVjdGlvblBvaW50LlBST1ZJREVSX1RZUEUpIHtcbiAgICAgICAgICAgIE1pbmRpSW5qZWN0b3IuaW5qZWN0UHJvcGVydHlQcm92aWRlcih0YXJnZXRPYmplY3QsIGZpZWxkTmFtZSwgY29uZmlnLCBpbmplY3Rvcik7XG4gICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIE1pbmRpSW5qZWN0b3IuaW5qZWN0UHJvcGVydHlJbnN0YW5jZSh0YXJnZXRPYmplY3QsIGZpZWxkTmFtZSwgY29uZmlnLCBkZXB0aCwgaW5qZWN0b3IpO1xuICAgICAgICBcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gdGFyZ2V0T2JqZWN0IFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWVsZE5hbWUgXG4gICAgICogQHBhcmFtIHtDb25maWd9IGNvbmZpZyBcbiAgICAgKiBAcGFyYW0ge0luamVjdG9yfSBpbmplY3RvclxuICAgICAqL1xuICAgIHN0YXRpYyBpbmplY3RQcm9wZXJ0eVByb3ZpZGVyKHRhcmdldE9iamVjdCwgZmllbGROYW1lLCBjb25maWcsIGluamVjdG9yKSB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBAdHlwZSB7SW5qZWN0aW9uUG9pbnR9XG4gICAgICAgICAqL1xuICAgICAgICBjb25zdCBpbmplY3Rpb25Qb2ludCA9IHRhcmdldE9iamVjdFtmaWVsZE5hbWVdO1xuICAgICAgICBjb25zdCB0eXBlQ29uZmlnID0gQ29uZmlnQWNjZXNzb3IudHlwZUNvbmZpZ0J5TmFtZShpbmplY3Rpb25Qb2ludC5uYW1lLCBjb25maWcpO1xuICAgICAgICB0YXJnZXRPYmplY3RbZmllbGROYW1lXSA9IG5ldyBNaW5kaVByb3ZpZGVyKHR5cGVDb25maWcsIGluamVjdG9yLCBjb25maWcpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSB0YXJnZXRPYmplY3QgXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpZWxkTmFtZSBcbiAgICAgKiBAcGFyYW0ge0NvbmZpZ30gY29uZmlnIFxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBkZXB0aCBcbiAgICAgKiBAcGFyYW0ge0luamVjdG9yfSBpbmplY3RvclxuICAgICAqIEByZXR1cm5zIHtQcm9taXNlfVxuICAgICAqL1xuICAgIHN0YXRpYyBpbmplY3RQcm9wZXJ0eUluc3RhbmNlKHRhcmdldE9iamVjdCwgZmllbGROYW1lLCBjb25maWcsIGRlcHRoLCBpbmplY3Rvcikge1xuICAgICAgICBsZXQgaW5qZWN0UHJvbWlzZSA9IFByb21pc2UucmVzb2x2ZSgpO1xuICAgICAgICAvKiogQHR5cGUge0luamVjdGlvblBvaW50fSAqL1xuICAgICAgICBjb25zdCBpbmplY3Rpb25Qb2ludCA9IHRhcmdldE9iamVjdFtmaWVsZE5hbWVdO1xuICAgICAgICBjb25zdCBpbnN0YW5jZUhvbGRlciA9IENvbmZpZ0FjY2Vzc29yLmluc3RhbmNlSG9sZGVyKGluamVjdGlvblBvaW50Lm5hbWUsIGNvbmZpZywgaW5qZWN0aW9uUG9pbnQucGFyYW1ldGVycyk7XG4gICAgICAgIGlmIChpbnN0YW5jZUhvbGRlci50eXBlID09PSBJbnN0YW5jZUhvbGRlci5ORVdfSU5TVEFOQ0UpIHtcbiAgICAgICAgICAgIGluamVjdFByb21pc2UgPSBpbmplY3Rvci5pbmplY3RUYXJnZXQoaW5zdGFuY2VIb2xkZXIuaW5zdGFuY2UsIGNvbmZpZywgZGVwdGgrKyk7XG4gICAgICAgIH1cbiAgICAgICAgdGFyZ2V0T2JqZWN0W2ZpZWxkTmFtZV0gPSBpbnN0YW5jZUhvbGRlci5pbnN0YW5jZTtcbiAgICAgICAgcmV0dXJuIGluamVjdFByb21pc2U7XG4gICAgfVxuXG59XG5cbmNvbnN0IElOSkVDVE9SID0gbmV3IE1pbmRpSW5qZWN0b3IoKTsiLCJleHBvcnQgY2xhc3MgSW5zdGFuY2VQcm9jZXNzb3Ige1xuXG4gICAgLyoqXG4gICAgICogXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGluc3RhbmNlIFxuICAgICAqIEByZXR1cm4ge1Byb21pc2V9XG4gICAgICovXG4gICAgcHJvY2VzcyhpbnN0YW5jZSkge1xuICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG4gICAgfVxuXG59IiwiaW1wb3J0IHsgTWFwIH0gZnJvbSBcImNvcmV1dGlsX3YxXCI7XG5pbXBvcnQgeyBDb25maWcgfSBmcm9tIFwiLi4vY29uZmlnLmpzXCI7XG5pbXBvcnQgeyBUeXBlQ29uZmlnIH0gZnJvbSBcIi4uL3R5cGVDb25maWcvdHlwZUNvbmZpZy5qc1wiO1xuXG5leHBvcnQgY2xhc3MgQ29uZmlnUHJvY2Vzc29yIHtcblxuICAgIC8qKlxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7Q29uZmlnfSBjb25maWcgXG4gICAgICogQHBhcmFtIHtNYXA8VHlwZUNvbmZpZz59IGNvbmZpZ0VudHJpZXNNYXAgXG4gICAgICovXG4gICAgcHJvY2Vzc0NvbmZpZyhjb25maWcsIGNvbmZpZ0VudHJpZXNNYXApIHtcbiAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xuICAgIH1cblxufSIsImltcG9ydCB7IE1hcCwgTGlzdCwgTG9nZ2VyIH0gZnJvbSBcImNvcmV1dGlsX3YxXCI7XG5pbXBvcnQgeyBUeXBlQ29uZmlnIH0gZnJvbSBcIi4vdHlwZUNvbmZpZy90eXBlQ29uZmlnLmpzXCI7XG5pbXBvcnQgeyBDb25maWdQcm9jZXNzb3JFeGVjdXRvciB9IGZyb20gXCIuL2NvbmZpZ1Byb2Nlc3Nvci9jb25maWdQcm9jZXNzb3JFeGVjdXRvci5qc1wiO1xuaW1wb3J0IHsgU2luZ2xldG9uQ29uZmlnIH0gZnJvbSBcIi4vdHlwZUNvbmZpZy9zaW5nbGV0b25Db25maWcuanNcIjtcbmltcG9ydCB7IENvbmZpZyB9IGZyb20gXCIuL2NvbmZpZy5qc1wiO1xuaW1wb3J0IHsgTWluZGlJbmplY3RvciB9IGZyb20gXCIuL21pbmRpSW5qZWN0b3IuanNcIjtcbmltcG9ydCB7IEluc3RhbmNlUHJvY2Vzc29yIH0gZnJvbSBcIi4vaW5zdGFuY2VQcm9jZXNzb3IvaW5zdGFuY2VQcm9jZXNzb3IuanNcIjtcbmltcG9ydCB7IENvbmZpZ1Byb2Nlc3NvciB9IGZyb20gXCIuL2NvbmZpZ1Byb2Nlc3Nvci9jb25maWdQcm9jZXNzb3IuanNcIjtcblxuY29uc3QgTE9HID0gbmV3IExvZ2dlcihcIkNvbmZpZ1wiKTtcblxuZXhwb3J0IGNsYXNzIE1pbmRpQ29uZmlnIGV4dGVuZHMgQ29uZmlnIHtcblxuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICBzdXBlcigpO1xuXG4gICAgICAgIC8qKiBAdHlwZSB7Qm9vbGVhbn0gKi9cbiAgICAgICAgdGhpcy5maW5hbGl6ZWQgPSBmYWxzZTtcblxuICAgICAgICAvKiogQHR5cGUge01hcDxUeXBlQ29uZmlnPn0gKi9cbiAgICAgICAgdGhpcy5jb25maWdFbnRyaWVzID0gbmV3IE1hcCgpO1xuXG4gICAgICAgIC8qKiBAdHlwZSB7TGlzdDxTdHJpbmc+fSAqL1xuICAgICAgICB0aGlzLmNvbmZpZ1Byb2Nlc3NvcnMgPSBuZXcgTGlzdCgpO1xuXG4gICAgICAgIC8qKiBAdHlwZSB7TGlzdDxTdHJpbmc+fSAqL1xuICAgICAgICB0aGlzLmluc3RhbmNlUHJvY2Vzc29ycyA9IG5ldyBMaXN0KCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogXG4gICAgICogQHBhcmFtIHtDb25maWd9IGNvbmZpZ1xuICAgICAqIEByZXR1cm5zIHtNaW5kaUNvbmZpZ31cbiAgICAgKi9cbiAgICBtZXJnZShjb25maWcpIHtcbiAgICAgICAgdGhpcy5maW5hbGl6ZWQgPSB0cnVlO1xuXG5cbiAgICAgICAgY29uc3QgbmV3Q29uZmlnRW50cmllcyA9IG5ldyBNYXAoKTtcbiAgICAgICAgbmV3Q29uZmlnRW50cmllcy5hZGRBbGwodGhpcy5jb25maWdFbnRyaWVzKTtcbiAgICAgICAgbmV3Q29uZmlnRW50cmllcy5hZGRBbGwoY29uZmlnLmNvbmZpZ0VudHJpZXMpO1xuXG4gICAgICAgIGNvbnN0IG5ld0NvbmZpZ1Byb2Nlc3NvcnMgPSBuZXcgTGlzdCgpO1xuICAgICAgICBuZXdDb25maWdQcm9jZXNzb3JzLmFkZEFsbCh0aGlzLmNvbmZpZ1Byb2Nlc3NvcnMpO1xuICAgICAgICBuZXdDb25maWdQcm9jZXNzb3JzLmFkZEFsbChjb25maWcuY29uZmlnUHJvY2Vzc29ycyk7XG5cbiAgICAgICAgY29uc3QgbmV3SW5zdGFuY2VQcm9jZXNzb3JzID0gbmV3IExpc3QoKTtcbiAgICAgICAgbmV3SW5zdGFuY2VQcm9jZXNzb3JzLmFkZEFsbCh0aGlzLmluc3RhbmNlUHJvY2Vzc29ycyk7XG4gICAgICAgIG5ld0luc3RhbmNlUHJvY2Vzc29ycy5hZGRBbGwoY29uZmlnLmluc3RhbmNlUHJvY2Vzc29ycyk7XG5cbiAgICAgICAgLyoqIEB0eXBlIHtNYXB9ICovXG4gICAgICAgIHRoaXMuY29uZmlnRW50cmllcyA9IG5ld0NvbmZpZ0VudHJpZXM7XG4gICAgICAgIHRoaXMuY29uZmlnUHJvY2Vzc29ycyA9IG5ld0NvbmZpZ1Byb2Nlc3NvcnM7XG4gICAgICAgIHRoaXMuaW5zdGFuY2VQcm9jZXNzb3JzID0gbmV3SW5zdGFuY2VQcm9jZXNzb3JzO1xuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7VHlwZUNvbmZpZ30gdHlwZUNvbmZpZ1xuICAgICAqIEByZXR1cm5zIHtNaW5kaUNvbmZpZ31cbiAgICAgKi9cbiAgICBhZGRUeXBlQ29uZmlnKHR5cGVDb25maWcpIHtcbiAgICAgICAgdGhpcy5maW5hbGl6ZWQgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5jb25maWdFbnRyaWVzLnNldCh0eXBlQ29uZmlnLm5hbWUsIHR5cGVDb25maWcpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge0NvbmZpZ1Byb2Nlc3Nvcn0gY29uZmlnUHJvY2Vzc29yXG4gICAgICogQHJldHVybnMge01pbmRpQ29uZmlnfVxuICAgICAqL1xuICAgIGFkZENvbmZpZ1Byb2Nlc3Nvcihjb25maWdQcm9jZXNzb3IpIHtcbiAgICAgICAgdGhpcy5jb25maWdQcm9jZXNzb3JzLmFkZChjb25maWdQcm9jZXNzb3IubmFtZSk7XG4gICAgICAgIHJldHVybiB0aGlzLmFkZFR5cGVDb25maWcoU2luZ2xldG9uQ29uZmlnLnVubmFtZWQoY29uZmlnUHJvY2Vzc29yKSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogXG4gICAgICogQHBhcmFtIHtJbnN0YW5jZVByb2Nlc3Nvcn0gaW5zdGFuY2VQcm9jZXNzb3JcbiAgICAgKiBAcmV0dXJucyB7TWluZGlDb25maWd9XG4gICAgICovXG4gICAgYWRkSW5zdGFuY2VQcm9jZXNzb3IoaW5zdGFuY2VQcm9jZXNzb3IpIHtcbiAgICAgICAgdGhpcy5pbnN0YW5jZVByb2Nlc3NvcnMuYWRkKGluc3RhbmNlUHJvY2Vzc29yLm5hbWUpO1xuICAgICAgICByZXR1cm4gdGhpcy5hZGRUeXBlQ29uZmlnKFNpbmdsZXRvbkNvbmZpZy51bm5hbWVkKGluc3RhbmNlUHJvY2Vzc29yKSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogXG4gICAgICogQHBhcmFtIHtMaXN0PFR5cGVDb25maWc+fSB0eXBlQ29uZmlnTGlzdFxuICAgICAqIEByZXR1cm4ge01pbmRpQ29uZmlnfVxuICAgICAqL1xuICAgIGFkZEFsbFR5cGVDb25maWcodHlwZUNvbmZpZ0xpc3QpIHtcbiAgICAgICAgdGhpcy5maW5hbGl6ZWQgPSBmYWxzZTtcbiAgICAgICAgdHlwZUNvbmZpZ0xpc3QuZm9yRWFjaCgodHlwZUNvbmZpZyxwYXJlbnQpID0+IHtcbiAgICAgICAgICAgIHRoaXMuY29uZmlnRW50cmllcy5zZXQodHlwZUNvbmZpZy5uYW1lLCB0eXBlQ29uZmlnKTtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9LCB0aGlzKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogXG4gICAgICogQHBhcmFtIHtMaXN0PG5ldygpID0+IENvbmZpZ1Byb2Nlc3Nvcj59IGNvbmZpZ1Byb2Nlc3Nvckxpc3RcbiAgICAgKiBAcmV0dXJuIHtNaW5kaUNvbmZpZ31cbiAgICAgKi9cbiAgICBhZGRBbGxDb25maWdQcm9jZXNzb3IoY29uZmlnUHJvY2Vzc29yTGlzdCkge1xuICAgICAgICBjb25maWdQcm9jZXNzb3JMaXN0LmZvckVhY2goKGNvbmZpZ1Byb2Nlc3NvcixwYXJlbnQpID0+IHtcbiAgICAgICAgICAgIHRoaXMuY29uZmlnUHJvY2Vzc29ycy5hZGQoY29uZmlnUHJvY2Vzc29yLm5hbWUpO1xuICAgICAgICAgICAgdGhpcy5hZGRUeXBlQ29uZmlnKFNpbmdsZXRvbkNvbmZpZy51bm5hbWVkKGNvbmZpZ1Byb2Nlc3NvcikpO1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH0sIHRoaXMpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge0xpc3Q8bmV3KCkgPT4gSW5zdGFuY2VQcm9jZXNzb3J9IGluc3RhbmNlUHJvY2Vzc29yTGlzdCBcbiAgICAgKiBAcmV0dXJuIHtNaW5kaUNvbmZpZ31cbiAgICAgKi9cbiAgICBhZGRBbGxJbnN0YW5jZVByb2Nlc3NvcihpbnN0YW5jZVByb2Nlc3Nvckxpc3QpIHtcbiAgICAgICAgaW5zdGFuY2VQcm9jZXNzb3JMaXN0LmZvckVhY2goKGluc3RhbmNlUHJvY2Vzc29yLHBhcmVudCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5pbnN0YW5jZVByb2Nlc3NvcnMuYWRkKGluc3RhbmNlUHJvY2Vzc29yLm5hbWUpO1xuICAgICAgICAgICAgdGhpcy5hZGRUeXBlQ29uZmlnKFNpbmdsZXRvbkNvbmZpZy51bm5hbWVkKGluc3RhbmNlUHJvY2Vzc29yKSk7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfSwgdGhpcyk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgICAqL1xuICAgIGlzRmluYWxpemVkKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5maW5hbGl6ZWQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQHJldHVybnMge1Byb21pc2V9XG4gICAgICovXG4gICAgZmluYWxpemUoKSB7XG4gICAgICAgIHRoaXMuZmluYWxpemVkID0gdHJ1ZTtcbiAgICAgICAgcmV0dXJuIENvbmZpZ1Byb2Nlc3NvckV4ZWN1dG9yLmV4ZWN1dGUodGhpcy5jb25maWdQcm9jZXNzb3JzLCBNaW5kaUluamVjdG9yLmdldEluc3RhbmNlKCksIHRoaXMpO1xuICAgIH1cblxufSIsImltcG9ydCB7IExvZ2dlciB9IGZyb20gXCJjb3JldXRpbF92MVwiO1xuaW1wb3J0IHsgSW5zdGFuY2VQcm9jZXNzb3IgfSBmcm9tIFwiLi9pbnN0YW5jZVByb2Nlc3Nvci5qc1wiO1xuXG5jb25zdCBMT0cgPSBuZXcgTG9nZ2VyKFwiSW5zdGFuY2VQb3N0Q29uZmlnVHJpZ2dlclwiKTtcblxuLyoqXG4gKiBJbnN0YW5jZSBwcm9jZXNzb3Igd2hpY2ggY2FsbHMgcG9zdENvbmZpZyBvbiBvYmplY3RzIGFmdGVyIGNvbmZpZ1Byb2Nlc3NvcnMgYXJlIGZpbmlzaGVkXG4gKi9cbmV4cG9ydCBjbGFzcyBJbnN0YW5jZVBvc3RDb25maWdUcmlnZ2VyIGV4dGVuZHMgSW5zdGFuY2VQcm9jZXNzb3Ige1xuXG4gICAgLyoqXG4gICAgICogXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGluc3RhbmNlIFxuICAgICAqIEByZXR1cm4ge1Byb21pc2V9XG4gICAgICovXG4gICAgcHJvY2VzcyhpbnN0YW5jZSkge1xuICAgICAgICBsZXQgcmVzcG9uc2UgPSBudWxsO1xuICAgICAgICBpZihpbnN0YW5jZS5wb3N0Q29uZmlnKSB7XG4gICAgICAgICAgICByZXNwb25zZSA9IGluc3RhbmNlLnBvc3RDb25maWcoKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIXJlc3BvbnNlKSB7XG4gICAgICAgICAgICByZXNwb25zZSA9IG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCkgPT4geyByZXNvbHZlKCk7IH0pO1xuICAgICAgICB9XG4gICAgICAgIGlmICghcmVzcG9uc2UgaW5zdGFuY2VvZiBQcm9taXNlKSB7XG4gICAgICAgICAgICB0aHJvdyBcInBvc3RDb25maWcoKSBtdXN0IHJldHVybiBlaXRoZXIgdW5kZWZpbmVkIG9yIG51bGwgb3IgYSBQcm9taXNlXCJcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzcG9uc2U7XG4gICAgfVxuXG59IiwiaW1wb3J0IHsgVHlwZUNvbmZpZyB9IGZyb20gXCIuL3R5cGVDb25maWcuanNcIjtcblxuZXhwb3J0IGNsYXNzIFBvb2xDb25maWcgZXh0ZW5kcyBUeXBlQ29uZmlnIHtcblxuICAgIHN0YXRpYyBuYW1lZChuYW1lLCBjbGFzc1JlZmVyZW5jZSwgcG9vbFNpemUpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBQb29sQ29uZmlnKG5hbWUsIGNsYXNzUmVmZXJlbmNlLCBwb29sU2l6ZSk7XG4gICAgfVxuXG4gICAgc3RhdGljIHVubmFtZWQoY2xhc3NSZWZlcmVuY2UsIHBvb2xTaXplKSB7XG4gICAgICAgIHJldHVybiBuZXcgUG9vbENvbmZpZyhjbGFzc1JlZmVyZW5jZS5uYW1lLCBjbGFzc1JlZmVyZW5jZSwgcG9vbFNpemUpO1xuICAgIH1cblxuICAgIGNvbnN0cnVjdG9yKG5hbWUsIGNsYXNzUmVmZXJlbmNlLCBwb29sU2l6ZSkge1xuICAgICAgICBzdXBlcihuYW1lLCBjbGFzc1JlZmVyZW5jZSk7XG4gICAgICAgIHRoaXMucG9vbFNpemUgPSBwb29sU2l6ZTtcbiAgICB9XG5cbiAgICBpbnN0YW5jZUhvbGRlcihwYXJhbWV0ZXJzID0gW10pIHtcblxuICAgIH1cblxufSIsImltcG9ydCB7IFR5cGVDb25maWcgfSBmcm9tIFwiLi90eXBlQ29uZmlnLmpzXCI7XG5pbXBvcnQgeyBJbnN0YW5jZUhvbGRlciB9IGZyb20gXCIuL2luc3RhbmNlSG9sZGVyLmpzXCI7XG5cbmV4cG9ydCBjbGFzcyBQcm90b3R5cGVDb25maWcgZXh0ZW5kcyBUeXBlQ29uZmlnIHtcblxuICAgIHN0YXRpYyBuYW1lZChuYW1lLCBjbGFzc1JlZmVyZW5jZSkge1xuICAgICAgICByZXR1cm4gbmV3IFByb3RvdHlwZUNvbmZpZyhuYW1lLCBjbGFzc1JlZmVyZW5jZSk7XG4gICAgfVxuXG4gICAgc3RhdGljIHVubmFtZWQoY2xhc3NSZWZlcmVuY2UpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm90b3R5cGVDb25maWcoY2xhc3NSZWZlcmVuY2UubmFtZSwgY2xhc3NSZWZlcmVuY2UpO1xuICAgIH1cblxuICAgIGNvbnN0cnVjdG9yKG5hbWUsIGNsYXNzUmVmZXJlbmNlKSB7XG4gICAgICAgIHN1cGVyKG5hbWUsIGNsYXNzUmVmZXJlbmNlKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAcGFyYW0ge2FycmF5fSBwYXJhbWV0ZXJzIHRoZSBwYXJhbWV0ZXJzIHRvIHVzZSBmb3IgdGhlIGNvbnN0cnVjdG9yXG4gICAgICovXG4gICAgaW5zdGFuY2VIb2xkZXIocGFyYW1ldGVycyA9IFtdKSB7XG4gICAgICAgIGxldCBpbnN0YW5jZSA9IG51bGw7XG4gICAgICAgIGlmKHBhcmFtZXRlcnMgJiYgcGFyYW1ldGVycy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBpbnN0YW5jZSA9IG5ldyB0aGlzLmNsYXNzUmVmZXJlbmNlKC4uLnBhcmFtZXRlcnMpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaW5zdGFuY2UgPSBuZXcgdGhpcy5jbGFzc1JlZmVyZW5jZSgpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBJbnN0YW5jZUhvbGRlci5ob2xkZXJXaXRoTmV3SW5zdGFuY2UoaW5zdGFuY2UpO1xuICAgIH1cblxuXG59Il0sIm5hbWVzIjpbIkxvZ2dlciIsIkxPRyIsIk1hcCIsIkxpc3QiXSwibWFwcGluZ3MiOiI7Ozs7OztBQUFPLE1BQU0sTUFBTSxDQUFDO0FBQ3BCO0FBQ0EsSUFBSSxXQUFXLEdBQUc7QUFDbEI7QUFDQSxRQUFRLElBQUksQ0FBQyxhQUFhLEdBQUcsSUFBSSxDQUFDO0FBQ2xDO0FBQ0E7QUFDQSxRQUFRLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxJQUFJLENBQUM7QUFDckM7QUFDQTtBQUNBLFFBQVEsSUFBSSxDQUFDLGtCQUFrQixHQUFHLElBQUksQ0FBQztBQUN2QyxLQUFLO0FBQ0w7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFJLFFBQVEsR0FBRztBQUNmO0FBQ0EsS0FBSztBQUNMO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBSSxXQUFXLEdBQUc7QUFDbEIsUUFBUSxPQUFPLEtBQUssQ0FBQztBQUNyQixLQUFLO0FBQ0w7O0FDMUJPLE1BQU0sY0FBYyxDQUFDO0FBQzVCO0FBQ0EsSUFBSSxXQUFXLFlBQVksR0FBRyxFQUFFLE9BQU8sQ0FBQyxDQUFDLEVBQUU7QUFDM0M7QUFDQSxJQUFJLFdBQVcsaUJBQWlCLEdBQUcsRUFBRSxPQUFPLENBQUMsQ0FBQyxFQUFFO0FBQ2hEO0FBQ0EsSUFBSSxPQUFPLHFCQUFxQixDQUFDLFFBQVEsRUFBRTtBQUMzQyxRQUFRLE9BQU8s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
