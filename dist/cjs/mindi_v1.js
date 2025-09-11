'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var coreutil_v1 = require('coreutil_v1');

class Config {

    constructor() {
        /** @type {Map<any,any>} */
        this.configEntries = null;

        /** @type {Array<any>} */
        this.configProcessors = null;

        /** @type {Array<any>} */
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

    /**
     * 
     * @param {array} parameters 
     * @returns {InstanceHolder}
     */
    instanceHolder(parameters = []) {
        return null;
    }

}

new coreutil_v1.Logger("ConfigAccessor");

/**
 * Utilities for accessing a Config object
 */
class ConfigAccessor {

    /**
     * Get the type config by class name in the config
     * 
     * @param {Config} config 
     * @param {string} name 
     * @returns {TypeConfig}
     */
    static typeConfigByName(name, config) {
        let configEntry = null;
        config.configEntries.forEach((value, key) => {
            if(key === name) {
                configEntry = value;
                return false;
            }
        });
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
     * @param {Array<String>} configProcessorClassNameArray
     * @param {Injector} injector
     * @param {Config} config
     * @returns {Promise} promise which is resolved when all config processors are resolved
     */
    static execute(configProcessorClassNameArray, injector, config) {
        return coreutil_v1.ArrayUtils.promiseChain(configProcessorClassNameArray, (configProcessorClassName) => {
            return new Promise((resolveConfigProcessorExecuted, reject) => {

                let targetInjectedPromise = Promise.resolve();

                /**  @type {TypeConfig} */
                const typeConfig = ConfigAccessor.typeConfigByName(configProcessorClassName, config);

                if (!typeConfig) {
                    LOG$1.error(`No type config found for ${configProcessorClassName}`);
                    return;
                }

                /**  @type {InstanceHolder} */
                const processorHolder = typeConfig.instanceHolder();

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
     * @param {Map<string, TypeConfig>} configEntries 
     * @return {Map<string, TypeConfig>}
     */
    static prepareUnconfiguredConfigEntries(configEntries) {
        /** @type {Map<TypeConfig>} */
        const unconfiguredConfigEntries = new Map();

        configEntries.forEach((value, key) => {

            /** @type {TypeConfig} */
            const configEntry = value;

            if(configEntry.stage === TypeConfig.NEW) {
                unconfiguredConfigEntries.set(key, configEntry);
                configEntry.stage = TypeConfig.CONFIGURED;
            }
        });

        return unconfiguredConfigEntries;
    }

}

new coreutil_v1.Logger("SingletonConfig");

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

new coreutil_v1.Logger("Provider");

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
     * @param {array} parameters 
     * @returns {Provider<T>}
     */
    static providerByName(name, classReference, parameters = []) {
        return new InjectionPoint(name, classReference, InjectionPoint.PROVIDER_TYPE, parameters);
    }

    /**
     * @template T
     * @param {new() => T} classReference 
     * @returns {Provider<T>}
     */
    static provider(classReference, parameters = []) {
        return new InjectionPoint(classReference.name, classReference, InjectionPoint.PROVIDER_TYPE, parameters);
    }

    constructor(name, classReference, type = InjectionPoint.INSTANCE_TYPE, parameters = null) {
        this.name = name;
        this.classReference = classReference;
        this.type = type;
        this.parameters = parameters;
    }

}

new coreutil_v1.Logger("InstanceProcessorExecutor");

/**
 * Executes the configs instance processors on the provided instance
 * Returns a promise for when the instance processors has completed running
 * 
 * Instance processors perform operations on managed instances after they have been instansiated
 */
class InstanceProcessorExecutor {

    /**
     * @param {Object} instance the instance to process
     * @param {Config} config
     * @returns {Promise}
     */
    static execute(instance, config) {
        return coreutil_v1.ArrayUtils.promiseChain(config.instanceProcessors, (processorName) => {
            /** @type {TypeConfig} */
            const typeConfig = ConfigAccessor.typeConfigByName(processorName, config);

            /** @type {InstanceHolder} */
            const processorHolder = typeConfig.instanceHolder();

            return processorHolder.instance.process(instance);
        });
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
     * @param {Array} parameters
     */
    constructor(typeConfig, injector, config, parameters = []) {

        super();

        /** @type {TypeConfig} */
        this.typeConfig = typeConfig;

        /** @type {Injector} */
        this.injector = injector;

        /** @type {Config} */
        this.config = config;

        /** @type {Array} */
        this.parameters = parameters;
    }

    /**
     * 
     * @param {Array} parameters 
     * @returns {Promise<T>}
     */
    get(parameters = []) {

        const instanceParameters = (parameters.length > 0) ? parameters : this.parameters;

        /** @type {InstanceHolder} */
        const instanceHolder = this.typeConfig.instanceHolder(instanceParameters);

        if (instanceHolder.type === InstanceHolder.NEW_INSTANCE) {
            return this.injector.injectTarget(instanceHolder.instance, this.config);
        }
        return Promise.resolve(instanceHolder.instance);
    }

}

const LOG = new coreutil_v1.Logger("MindiInjector");

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
    async injectTarget(targetObject, config, depth = 0) {
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

        await coreutil_v1.ArrayUtils.promiseChain(Object.keys(targetObject), (fieldName) => {
                return MindiInjector.injectProperty(targetObject, fieldName, config, depth, injector);
        });
        await InstanceProcessorExecutor.execute(targetObject, config);
        return targetObject;

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

        /** @type {TypeConfig} */
        const typeConfig = MindiInjector.getTypeConfig(injectionPoint.name, injectionPoint.classReference, config);

        if (!typeConfig) {
            return;
        }

        targetObject[fieldName] = new MindiProvider(typeConfig, injector, config, injectionPoint.parameters);
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

        /** @type {TypeConfig} */
        const typeConfig = MindiInjector.getTypeConfig(injectionPoint.name, injectionPoint.classReference, config);


        if (!typeConfig) {
            return;
        }

        /** @type {InstanceHolder} */
        const instanceHolder = typeConfig.instanceHolder(injectionPoint.parameters);

        if (instanceHolder.type === InstanceHolder.NEW_INSTANCE) {
            injectPromise = injector.injectTarget(instanceHolder.instance, config, depth++);
        }
        targetObject[fieldName] = instanceHolder.instance;
        return injectPromise;
    }

    /**
     * 
     * @param {string} name 
     * @param {object} type 
     * @param {Config} config 
     * @returns {TypeConfig}
     */
    static getTypeConfig(name, classReference, config) {
        const typeConfig = ConfigAccessor.typeConfigByName(name, config);
        if (typeConfig) {
            return typeConfig;
        }
        LOG.error(`No type config found for ${name} and classReference does not extend AutoConfig`);
        return null;
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

new coreutil_v1.Logger("Config");

class MindiConfig extends Config {

    constructor() {
        super();

        /** @type {Boolean} */
        this.finalized = false;

        /** @type {Map<TypeConfig>} */
        this.configEntries = new Map();

        /** @type {Array} */
        this.configProcessors = new Array();

        /** @type {Array} */
        this.instanceProcessors = new Array();
    }

    /**
     * 
     * @param {Config} config
     * @returns {MindiConfig}
     */
    merge(config) {
        this.finalized = true;

        this.configEntries = coreutil_v1.MapUtils
            .merge(this.configEntries, config.configEntries);
        this.configProcessors = coreutil_v1.ArrayUtils
            .merge(this.configProcessors, config.configProcessors);
        this.instanceProcessors = coreutil_v1.ArrayUtils
            .merge(this.instanceProcessors, config.instanceProcessors);

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
        this.configProcessors = coreutil_v1.ArrayUtils.add(this.configProcessors, configProcessor.name);
        return this.addTypeConfig(SingletonConfig.unnamed(configProcessor));
    }

    /**
     * 
     * @param {InstanceProcessor} instanceProcessor
     * @returns {MindiConfig}
     */
    addInstanceProcessor(instanceProcessor) {
        this.instanceProcessors = coreutil_v1.ArrayUtils.add(this.instanceProcessors, instanceProcessor.name);
        return this.addTypeConfig(SingletonConfig.unnamed(instanceProcessor));
    }

    /**
     * 
     * @param {Array<TypeConfig>} typeConfigArray
     * @return {MindiConfig}
     */
    addAllTypeConfig(typeConfigArray) {
        this.finalized = false;
        typeConfigArray.forEach((typeConfig) => {
            this.configEntries.set(typeConfig.name, typeConfig);
        });
        return this;
    }

    /**
     * 
     * @param {Array<new() => ConfigProcessor>} configProcessorArray
     * @return {MindiConfig}
     */
    addAllConfigProcessor(configProcessorArray) {
        configProcessorArray.forEach((configProcessor) => {
            this.configProcessors = coreutil_v1.ArrayUtils.add(this.configProcessors, configProcessor.name);
            this.addTypeConfig(SingletonConfig.unnamed(configProcessor));
        });
        return this;
    }

    /**
     * 
     * @param {Array<new() => InstanceProcessor>} instanceProcessorArray 
     * @return {MindiConfig}
     */
    addAllInstanceProcessor(instanceProcessorArray) {
        instanceProcessorArray.forEach((instanceProcessor) => {
            this.instanceProcessors = coreutil_v1.ArrayUtils.add(this.instanceProcessors, instanceProcessor.name);
            this.addTypeConfig(SingletonConfig.unnamed(instanceProcessor));
        });
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

new coreutil_v1.Logger("InstancePostConfigTrigger");

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

class TypeConfigPack {

    static _instance;

    constructor() {
        /** @type {Map<String, Map<String, TypeConfig>>} */
        this.typeConfigPackMap = new Map();
    }

    /**
     * 
     * @returns {TypeConfigPack}
     */
    static instance() {
        if (!TypeConfigPack._instance) {
            TypeConfigPack._instance = new TypeConfigPack();
        }
        return TypeConfigPack._instance;
    }

    /**
     * 
     * @param {string} packName 
     * @param {TypeConfig} typeConfig 
     */
    addTypeConfig(packName, typeConfig) {
        if (!this.typeConfigPackMap.has(packName)) {
            this.typeConfigPackMap.set(packName, new Map());
        }
        if (!this.typeConfigPackMap.get(packName).has(typeConfig.name)) {
            this.typeConfigPackMap.get(packName).set(typeConfig.name, typeConfig);
        }
    }

    /**
     * 
     * @param {string} packName 
     * @returns {Array<TypeConfig>}
     */
    getConfigArrayByPackName(packName) { 
        if (this.typeConfigPackMap.has(packName)) {
            return Array.from(this.typeConfigPackMap.get(packName).values());
        }
        return [];
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
exports.TypeConfigPack = TypeConfigPack;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWluZGlfdjEuanMiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9taW5kaS9jb25maWcuanMiLCIuLi8uLi9zcmMvbWluZGkvdHlwZUNvbmZpZy9pbnN0YW5jZUhvbGRlci5qcyIsIi4uLy4uL3NyYy9taW5kaS90eXBlQ29uZmlnL3R5cGVDb25maWcuanMiLCIuLi8uLi9zcmMvbWluZGkvY29uZmlnQWNjZXNzb3IuanMiLCIuLi8uLi9zcmMvbWluZGkvaW5qZWN0b3IuanMiLCIuLi8uLi9zcmMvbWluZGkvY29uZmlnUHJvY2Vzc29yL2NvbmZpZ1Byb2Nlc3NvckV4ZWN1dG9yLmpzIiwiLi4vLi4vc3JjL21pbmRpL3R5cGVDb25maWcvc2luZ2xldG9uQ29uZmlnLmpzIiwiLi4vLi4vc3JjL21pbmRpL2FwaS9wcm92aWRlci5qcyIsIi4uLy4uL3NyYy9taW5kaS9hcGkvaW5qZWN0aW9uUG9pbnQuanMiLCIuLi8uLi9zcmMvbWluZGkvaW5zdGFuY2VQcm9jZXNzb3IvaW5zdGFuY2VQcm9jZXNzb3JFeGVjdXRvci5qcyIsIi4uLy4uL3NyYy9taW5kaS9taW5kaVByb3ZpZGVyLmpzIiwiLi4vLi4vc3JjL21pbmRpL21pbmRpSW5qZWN0b3IuanMiLCIuLi8uLi9zcmMvbWluZGkvaW5zdGFuY2VQcm9jZXNzb3IvaW5zdGFuY2VQcm9jZXNzb3IuanMiLCIuLi8uLi9zcmMvbWluZGkvY29uZmlnUHJvY2Vzc29yL2NvbmZpZ1Byb2Nlc3Nvci5qcyIsIi4uLy4uL3NyYy9taW5kaS9taW5kaUNvbmZpZy5qcyIsIi4uLy4uL3NyYy9taW5kaS9pbnN0YW5jZVByb2Nlc3Nvci9pbnN0YW5jZVBvc3RDb25maWdUcmlnZ2VyLmpzIiwiLi4vLi4vc3JjL21pbmRpL3R5cGVDb25maWcvcG9vbENvbmZpZy5qcyIsIi4uLy4uL3NyYy9taW5kaS90eXBlQ29uZmlnL3Byb3RvdHlwZUNvbmZpZy5qcyIsIi4uLy4uL3NyYy9taW5kaS90eXBlQ29uZmlnL3R5cGVDb25maWdQYWNrLmpzIl0sInNvdXJjZXNDb250ZW50IjpbImV4cG9ydCBjbGFzcyBDb25maWcge1xuXG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIC8qKiBAdHlwZSB7TWFwPGFueSxhbnk+fSAqL1xuICAgICAgICB0aGlzLmNvbmZpZ0VudHJpZXMgPSBudWxsO1xuXG4gICAgICAgIC8qKiBAdHlwZSB7QXJyYXk8YW55Pn0gKi9cbiAgICAgICAgdGhpcy5jb25maWdQcm9jZXNzb3JzID0gbnVsbDtcblxuICAgICAgICAvKiogQHR5cGUge0FycmF5PGFueT59ICovXG4gICAgICAgIHRoaXMuaW5zdGFuY2VQcm9jZXNzb3JzID0gbnVsbDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAcmV0dXJucyB7UHJvbWlzZX1cbiAgICAgKi9cbiAgICBmaW5hbGl6ZSgpIHtcblxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgICAqL1xuICAgIGlzRmluYWxpemVkKCkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxufSIsImV4cG9ydCBjbGFzcyBJbnN0YW5jZUhvbGRlciB7XG5cbiAgICBzdGF0aWMgZ2V0IE5FV19JTlNUQU5DRSgpIHsgcmV0dXJuIDA7IH1cblxuICAgIHN0YXRpYyBnZXQgRVhJU1RJTkdfSU5TVEFOQ0UoKSB7IHJldHVybiAxOyB9XG5cbiAgICBzdGF0aWMgaG9sZGVyV2l0aE5ld0luc3RhbmNlKGluc3RhbmNlKSB7XG4gICAgICAgIHJldHVybiBuZXcgSW5zdGFuY2VIb2xkZXIoaW5zdGFuY2UsIEluc3RhbmNlSG9sZGVyLk5FV19JTlNUQU5DRSk7XG4gICAgfVxuXG4gICAgc3RhdGljIGhvbGRlcldpdGhFeGlzdGluZ0luc3RhbmNlKGluc3RhbmNlKSB7XG4gICAgICAgIHJldHVybiBuZXcgSW5zdGFuY2VIb2xkZXIoaW5zdGFuY2UsIEluc3RhbmNlSG9sZGVyLkVYSVNUSU5HX0lOU1RBTkNFKTtcbiAgICB9XG5cbiAgICBjb25zdHJ1Y3RvcihpbnN0YW5jZSwgdHlwZSkge1xuICAgICAgICB0aGlzLmluc3RhbmNlID0gaW5zdGFuY2U7XG4gICAgICAgIHRoaXMudHlwZSA9IHR5cGU7XG4gICAgfVxuXG59IiwiaW1wb3J0IHsgSW5zdGFuY2VIb2xkZXIgfSBmcm9tIFwiLi9pbnN0YW5jZUhvbGRlci5qc1wiO1xuXG5leHBvcnQgY2xhc3MgVHlwZUNvbmZpZyB7XG5cbiAgICBzdGF0aWMgZ2V0IE5FVygpIHsgcmV0dXJuIFwiTkVXXCI7IH1cbiAgICBzdGF0aWMgZ2V0IENPTkZJR1VSRUQoKSB7IHJldHVybiBcIkNPTkZJR1VSRURcIjsgfVxuXG4gICAgY29uc3RydWN0b3IobmFtZSwgY2xhc3NSZWZlcmVuY2UpIHtcbiAgICAgICAgdGhpcy5uYW1lID0gbmFtZTtcbiAgICAgICAgdGhpcy5jbGFzc1JlZmVyZW5jZSA9IGNsYXNzUmVmZXJlbmNlO1xuICAgICAgICB0aGlzLnN0YWdlID0gVHlwZUNvbmZpZy5ORVc7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogXG4gICAgICogQHBhcmFtIHthcnJheX0gcGFyYW1ldGVycyBcbiAgICAgKiBAcmV0dXJucyB7SW5zdGFuY2VIb2xkZXJ9XG4gICAgICovXG4gICAgaW5zdGFuY2VIb2xkZXIocGFyYW1ldGVycyA9IFtdKSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxufSIsImltcG9ydCB7IENvbmZpZyB9IGZyb20gXCIuL2NvbmZpZy5qc1wiO1xuaW1wb3J0IHsgTG9nZ2VyIH0gZnJvbSBcImNvcmV1dGlsX3YxXCI7XG5pbXBvcnQgeyBUeXBlQ29uZmlnIH0gZnJvbSBcIi4vdHlwZUNvbmZpZy90eXBlQ29uZmlnLmpzXCI7XG5cbmNvbnN0IExPRyA9IG5ldyBMb2dnZXIoXCJDb25maWdBY2Nlc3NvclwiKTtcblxuLyoqXG4gKiBVdGlsaXRpZXMgZm9yIGFjY2Vzc2luZyBhIENvbmZpZyBvYmplY3RcbiAqL1xuZXhwb3J0IGNsYXNzIENvbmZpZ0FjY2Vzc29yIHtcblxuICAgIC8qKlxuICAgICAqIEdldCB0aGUgdHlwZSBjb25maWcgYnkgY2xhc3MgbmFtZSBpbiB0aGUgY29uZmlnXG4gICAgICogXG4gICAgICogQHBhcmFtIHtDb25maWd9IGNvbmZpZyBcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbmFtZSBcbiAgICAgKiBAcmV0dXJucyB7VHlwZUNvbmZpZ31cbiAgICAgKi9cbiAgICBzdGF0aWMgdHlwZUNvbmZpZ0J5TmFtZShuYW1lLCBjb25maWcpIHtcbiAgICAgICAgbGV0IGNvbmZpZ0VudHJ5ID0gbnVsbDtcbiAgICAgICAgY29uZmlnLmNvbmZpZ0VudHJpZXMuZm9yRWFjaCgodmFsdWUsIGtleSkgPT4ge1xuICAgICAgICAgICAgaWYoa2V5ID09PSBuYW1lKSB7XG4gICAgICAgICAgICAgICAgY29uZmlnRW50cnkgPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gY29uZmlnRW50cnk7XG4gICAgfVxuXG59IiwiZXhwb3J0IGNsYXNzIEluamVjdG9yIHtcblxuXG4gICAgLyoqXG4gICAgICogSGVscGVyIG1ldGhvZCBmb3IgaW5qZWN0aW5nIGZpZWxkcyBpbiB0YXJnZXQgb2JqZWN0XG4gICAgICogXG4gICAgICogQHBhcmFtIHthbnl9IHRhcmdldE9iamVjdCBcbiAgICAgKiBAcGFyYW0ge0NvbmZpZ30gY29uZmlnIFxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBkZXB0aFxuICAgICAqIEByZXR1cm5zIHtQcm9taXNlfVxuICAgICAqL1xuICAgIGluamVjdFRhcmdldCh0YXJnZXQsIGNvbmZpZywgZGVwdGggPSAwKSB7XG5cbiAgICB9XG5cbn0iLCJpbXBvcnQgeyBMb2dnZXIsIEFycmF5VXRpbHMgfSBmcm9tIFwiY29yZXV0aWxfdjFcIjtcbmltcG9ydCB7IENvbmZpZyB9IGZyb20gXCIuLi9jb25maWcuanNcIjtcbmltcG9ydCB7IENvbmZpZ0FjY2Vzc29yIH0gZnJvbSBcIi4uL2NvbmZpZ0FjY2Vzc29yLmpzXCI7XG5pbXBvcnQgeyBJbmplY3RvciB9IGZyb20gXCIuLi9pbmplY3Rvci5qc1wiO1xuaW1wb3J0IHsgSW5zdGFuY2VIb2xkZXIgfSBmcm9tIFwiLi4vdHlwZUNvbmZpZy9pbnN0YW5jZUhvbGRlci5qc1wiO1xuaW1wb3J0IHsgVHlwZUNvbmZpZyB9IGZyb20gXCIuLi90eXBlQ29uZmlnL3R5cGVDb25maWcuanNcIjtcblxuY29uc3QgTE9HID0gbmV3IExvZ2dlcihcIkNvbmZpZ1Byb2Nlc3NvckV4ZWN1dG9yXCIpO1xuXG4vKipcbiAqIEV4ZWN1dGVzIHRoZSBwcm92aWRlZCBjb25maWcgcHJvY2Vzc29ycyBvbiB0aGUgcHJvdmlkZWQgY29uZmlnIHJlZ2lzdHJ5XG4gKiBSZXR1cm5zIGEgbGlzdCBvZiBwcm9taXNlcyBmb3Igd2hlbiB0aGUgY29uZmlnIHByb2Nlc3NvcnMgaGFzIGNvbXBsZXRlZCBydW5uaW5nXG4gKiBcbiAqIEEgY29uZmlnIHByb2Nlc3NvciByZWFkcyB0aGUgY29uZmlnIGFuZCBwZXJmb3JtcyBhbnkgbmVjZXNzYXJ5IGFjdGlvbnMgYmFzZWQgb25cbiAqIGNsYXNzIGFuZCB0eXBlIGluZm9ybWF0aW9uLiBBIGNvbmZpZyBwcm9jZXNzb3IgZG9lcyBub3Qgb3BlcmF0ZSBvbiBtYW5hZ2VkIGluc3RhbmNlc1xuICovXG5leHBvcnQgY2xhc3MgQ29uZmlnUHJvY2Vzc29yRXhlY3V0b3Ige1xuICAgIFxuICAgIC8qKlxuICAgICAqIEBwYXJhbSB7QXJyYXk8U3RyaW5nPn0gY29uZmlnUHJvY2Vzc29yQ2xhc3NOYW1lQXJyYXlcbiAgICAgKiBAcGFyYW0ge0luamVjdG9yfSBpbmplY3RvclxuICAgICAqIEBwYXJhbSB7Q29uZmlnfSBjb25maWdcbiAgICAgKiBAcmV0dXJucyB7UHJvbWlzZX0gcHJvbWlzZSB3aGljaCBpcyByZXNvbHZlZCB3aGVuIGFsbCBjb25maWcgcHJvY2Vzc29ycyBhcmUgcmVzb2x2ZWRcbiAgICAgKi9cbiAgICBzdGF0aWMgZXhlY3V0ZShjb25maWdQcm9jZXNzb3JDbGFzc05hbWVBcnJheSwgaW5qZWN0b3IsIGNvbmZpZykge1xuICAgICAgICByZXR1cm4gQXJyYXlVdGlscy5wcm9taXNlQ2hhaW4oY29uZmlnUHJvY2Vzc29yQ2xhc3NOYW1lQXJyYXksIChjb25maWdQcm9jZXNzb3JDbGFzc05hbWUpID0+IHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZUNvbmZpZ1Byb2Nlc3NvckV4ZWN1dGVkLCByZWplY3QpID0+IHtcblxuICAgICAgICAgICAgICAgIGxldCB0YXJnZXRJbmplY3RlZFByb21pc2UgPSBQcm9taXNlLnJlc29sdmUoKTtcblxuICAgICAgICAgICAgICAgIC8qKiAgQHR5cGUge1R5cGVDb25maWd9ICovXG4gICAgICAgICAgICAgICAgY29uc3QgdHlwZUNvbmZpZyA9IENvbmZpZ0FjY2Vzc29yLnR5cGVDb25maWdCeU5hbWUoY29uZmlnUHJvY2Vzc29yQ2xhc3NOYW1lLCBjb25maWcpO1xuXG4gICAgICAgICAgICAgICAgaWYgKCF0eXBlQ29uZmlnKSB7XG4gICAgICAgICAgICAgICAgICAgIExPRy5lcnJvcihgTm8gdHlwZSBjb25maWcgZm91bmQgZm9yICR7Y29uZmlnUHJvY2Vzc29yQ2xhc3NOYW1lfWApO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLyoqICBAdHlwZSB7SW5zdGFuY2VIb2xkZXJ9ICovXG4gICAgICAgICAgICAgICAgY29uc3QgcHJvY2Vzc29ySG9sZGVyID0gdHlwZUNvbmZpZy5pbnN0YW5jZUhvbGRlcigpO1xuXG4gICAgICAgICAgICAgICAgaWYocHJvY2Vzc29ySG9sZGVyLnR5cGUgPT09IEluc3RhbmNlSG9sZGVyLk5FV19JTlNUQU5DRSkge1xuICAgICAgICAgICAgICAgICAgICB0YXJnZXRJbmplY3RlZFByb21pc2UgPSBpbmplY3Rvci5pbmplY3RUYXJnZXQocHJvY2Vzc29ySG9sZGVyLmluc3RhbmNlLCBjb25maWcpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHRhcmdldEluamVjdGVkUHJvbWlzZS50aGVuKCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdG9Db25maWd1cmVNYXAgPSBDb25maWdQcm9jZXNzb3JFeGVjdXRvci5wcmVwYXJlVW5jb25maWd1cmVkQ29uZmlnRW50cmllcyhjb25maWcuY29uZmlnRW50cmllcyk7XG4gICAgICAgICAgICAgICAgICAgIHByb2Nlc3NvckhvbGRlci5pbnN0YW5jZS5wcm9jZXNzQ29uZmlnKGNvbmZpZywgdG9Db25maWd1cmVNYXApLnRoZW4oKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZUNvbmZpZ1Byb2Nlc3NvckV4ZWN1dGVkKCk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogXG4gICAgICogQHBhcmFtIHtNYXA8c3RyaW5nLCBUeXBlQ29uZmlnPn0gY29uZmlnRW50cmllcyBcbiAgICAgKiBAcmV0dXJuIHtNYXA8c3RyaW5nLCBUeXBlQ29uZmlnPn1cbiAgICAgKi9cbiAgICBzdGF0aWMgcHJlcGFyZVVuY29uZmlndXJlZENvbmZpZ0VudHJpZXMoY29uZmlnRW50cmllcykge1xuICAgICAgICAvKiogQHR5cGUge01hcDxUeXBlQ29uZmlnPn0gKi9cbiAgICAgICAgY29uc3QgdW5jb25maWd1cmVkQ29uZmlnRW50cmllcyA9IG5ldyBNYXAoKTtcblxuICAgICAgICBjb25maWdFbnRyaWVzLmZvckVhY2goKHZhbHVlLCBrZXkpID0+IHtcblxuICAgICAgICAgICAgLyoqIEB0eXBlIHtUeXBlQ29uZmlnfSAqL1xuICAgICAgICAgICAgY29uc3QgY29uZmlnRW50cnkgPSB2YWx1ZTtcblxuICAgICAgICAgICAgaWYoY29uZmlnRW50cnkuc3RhZ2UgPT09IFR5cGVDb25maWcuTkVXKSB7XG4gICAgICAgICAgICAgICAgdW5jb25maWd1cmVkQ29uZmlnRW50cmllcy5zZXQoa2V5LCBjb25maWdFbnRyeSk7XG4gICAgICAgICAgICAgICAgY29uZmlnRW50cnkuc3RhZ2UgPSBUeXBlQ29uZmlnLkNPTkZJR1VSRUQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJldHVybiB1bmNvbmZpZ3VyZWRDb25maWdFbnRyaWVzO1xuICAgIH1cblxufSIsImltcG9ydCB7IFR5cGVDb25maWcgfSBmcm9tIFwiLi90eXBlQ29uZmlnLmpzXCI7XG5pbXBvcnQgeyBMb2dnZXIgfSBmcm9tIFwiY29yZXV0aWxfdjFcIjtcbmltcG9ydCB7IEluc3RhbmNlSG9sZGVyIH0gZnJvbSBcIi4vaW5zdGFuY2VIb2xkZXIuanNcIjtcblxuY29uc3QgTE9HID0gbmV3IExvZ2dlcihcIlNpbmdsZXRvbkNvbmZpZ1wiKTtcblxuZXhwb3J0IGNsYXNzIFNpbmdsZXRvbkNvbmZpZyBleHRlbmRzIFR5cGVDb25maWcge1xuXG4gICAgc3RhdGljIG5hbWVkKG5hbWUsIGNsYXNzUmVmZXJlbmNlKSB7XG4gICAgICAgIHJldHVybiBuZXcgU2luZ2xldG9uQ29uZmlnKG5hbWUsIGNsYXNzUmVmZXJlbmNlKTtcbiAgICB9XG5cbiAgICBzdGF0aWMgdW5uYW1lZChjbGFzc1JlZmVyZW5jZSkge1xuICAgICAgICByZXR1cm4gbmV3IFNpbmdsZXRvbkNvbmZpZyhjbGFzc1JlZmVyZW5jZS5uYW1lLCBjbGFzc1JlZmVyZW5jZSk7XG4gICAgfVxuXG4gICAgY29uc3RydWN0b3IobmFtZSwgY2xhc3NSZWZlcmVuY2UpIHtcbiAgICAgICAgc3VwZXIobmFtZSwgY2xhc3NSZWZlcmVuY2UpO1xuICAgIH1cblxuICAgIGluc3RhbmNlSG9sZGVyKHBhcmFtZXRlcnMgPSBbXSkge1xuICAgICAgICBpZiAoIXRoaXMuaW5zdGFuY2UpIHtcbiAgICAgICAgICAgIGlmKHBhcmFtZXRlcnMgJiYgcGFyYW1ldGVycy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5pbnN0YW5jZSA9IG5ldyB0aGlzLmNsYXNzUmVmZXJlbmNlKC4uLnBhcmFtZXRlcnMpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLmluc3RhbmNlID0gbmV3IHRoaXMuY2xhc3NSZWZlcmVuY2UoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBJbnN0YW5jZUhvbGRlci5ob2xkZXJXaXRoTmV3SW5zdGFuY2UodGhpcy5pbnN0YW5jZSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIEluc3RhbmNlSG9sZGVyLmhvbGRlcldpdGhFeGlzdGluZ0luc3RhbmNlKHRoaXMuaW5zdGFuY2UpO1xuICAgIH1cblxufSIsImltcG9ydCB7IExvZ2dlciB9IGZyb20gXCJjb3JldXRpbF92MVwiO1xuXG5jb25zdCBMT0cgPSBuZXcgTG9nZ2VyKFwiUHJvdmlkZXJcIik7XG5cbi8qKlxuICogQHRlbXBsYXRlIFRcbiAqL1xuZXhwb3J0IGNsYXNzIFByb3ZpZGVyIHtcblxuICAgIC8qKlxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7QXJyYXl9IHBhcmFtZXRlcnMgXG4gICAgICogQHJldHVybnMge1Byb21pc2U8VD59XG4gICAgICovXG4gICAgZ2V0KHBhcmFtZXRlcnMgPSBbXSkge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbn0iLCJpbXBvcnQgeyBQcm92aWRlciB9IGZyb20gXCIuL3Byb3ZpZGVyLmpzXCI7XG5cbmV4cG9ydCBjbGFzcyBJbmplY3Rpb25Qb2ludCB7XG5cbiAgICBzdGF0aWMgZ2V0IElOU1RBTkNFX1RZUEUoKSB7IHJldHVybiAwOyB9IFxuICAgIHN0YXRpYyBnZXQgUFJPVklERVJfVFlQRSgpIHsgcmV0dXJuIDE7IH0gXG5cbiAgICAvKipcbiAgICAgKiBAdGVtcGxhdGUgVFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBuYW1lIFxuICAgICAqIEBwYXJhbSB7bmV3KCkgPT4gVH0gY2xhc3NSZWZlcmVuY2UgXG4gICAgICogQHBhcmFtIHthcnJheX0gcGFyYW1ldGVycyBcbiAgICAgKiBAcmV0dXJucyB7VH1cbiAgICAgKi9cbiAgICBzdGF0aWMgaW5zdGFuY2VCeU5hbWUobmFtZSwgY2xhc3NSZWZlcmVuY2UsIHBhcmFtZXRlcnMgPSBbXSkge1xuICAgICAgICByZXR1cm4gbmV3IEluamVjdGlvblBvaW50KG5hbWUsIGNsYXNzUmVmZXJlbmNlLCBJbmplY3Rpb25Qb2ludC5JTlNUQU5DRV9UWVBFLCBwYXJhbWV0ZXJzKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAdGVtcGxhdGUgVFxuICAgICAqIEBwYXJhbSB7bmV3KCkgPT4gVH0gY2xhc3NSZWZlcmVuY2UgXG4gICAgICogQHBhcmFtIHthcnJheX0gcGFyYW1ldGVycyBcbiAgICAgKiBAcmV0dXJucyB7VH1cbiAgICAgKi9cbiAgICBzdGF0aWMgaW5zdGFuY2UoY2xhc3NSZWZlcmVuY2UsIHBhcmFtZXRlcnMgPSBbXSkge1xuICAgICAgICByZXR1cm4gbmV3IEluamVjdGlvblBvaW50KGNsYXNzUmVmZXJlbmNlLm5hbWUsIGNsYXNzUmVmZXJlbmNlLCBJbmplY3Rpb25Qb2ludC5JTlNUQU5DRV9UWVBFLCBwYXJhbWV0ZXJzKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAdGVtcGxhdGUgVFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBuYW1lIFxuICAgICAqIEBwYXJhbSB7bmV3KCkgPT4gVH0gY2xhc3NSZWZlcmVuY2UgXG4gICAgICogQHBhcmFtIHthcnJheX0gcGFyYW1ldGVycyBcbiAgICAgKiBAcmV0dXJucyB7UHJvdmlkZXI8VD59XG4gICAgICovXG4gICAgc3RhdGljIHByb3ZpZGVyQnlOYW1lKG5hbWUsIGNsYXNzUmVmZXJlbmNlLCBwYXJhbWV0ZXJzID0gW10pIHtcbiAgICAgICAgcmV0dXJuIG5ldyBJbmplY3Rpb25Qb2ludChuYW1lLCBjbGFzc1JlZmVyZW5jZSwgSW5qZWN0aW9uUG9pbnQuUFJPVklERVJfVFlQRSwgcGFyYW1ldGVycyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQHRlbXBsYXRlIFRcbiAgICAgKiBAcGFyYW0ge25ldygpID0+IFR9IGNsYXNzUmVmZXJlbmNlIFxuICAgICAqIEByZXR1cm5zIHtQcm92aWRlcjxUPn1cbiAgICAgKi9cbiAgICBzdGF0aWMgcHJvdmlkZXIoY2xhc3NSZWZlcmVuY2UsIHBhcmFtZXRlcnMgPSBbXSkge1xuICAgICAgICByZXR1cm4gbmV3IEluamVjdGlvblBvaW50KGNsYXNzUmVmZXJlbmNlLm5hbWUsIGNsYXNzUmVmZXJlbmNlLCBJbmplY3Rpb25Qb2ludC5QUk9WSURFUl9UWVBFLCBwYXJhbWV0ZXJzKTtcbiAgICB9XG5cbiAgICBjb25zdHJ1Y3RvcihuYW1lLCBjbGFzc1JlZmVyZW5jZSwgdHlwZSA9IEluamVjdGlvblBvaW50LklOU1RBTkNFX1RZUEUsIHBhcmFtZXRlcnMgPSBudWxsKSB7XG4gICAgICAgIHRoaXMubmFtZSA9IG5hbWU7XG4gICAgICAgIHRoaXMuY2xhc3NSZWZlcmVuY2UgPSBjbGFzc1JlZmVyZW5jZTtcbiAgICAgICAgdGhpcy50eXBlID0gdHlwZTtcbiAgICAgICAgdGhpcy5wYXJhbWV0ZXJzID0gcGFyYW1ldGVycztcbiAgICB9XG5cbn0iLCJpbXBvcnQgeyBMb2dnZXIsIEFycmF5VXRpbHMgfSBmcm9tIFwiY29yZXV0aWxfdjFcIjtcbmltcG9ydCB7IENvbmZpZ0FjY2Vzc29yIH0gZnJvbSBcIi4uL2NvbmZpZ0FjY2Vzc29yLmpzXCI7XG5pbXBvcnQgeyBDb25maWcgfSBmcm9tIFwiLi4vY29uZmlnLmpzXCI7XG5pbXBvcnQgeyBUeXBlQ29uZmlnIH0gZnJvbSBcIi4uL3R5cGVDb25maWcvdHlwZUNvbmZpZy5qc1wiO1xuaW1wb3J0IHsgSW5zdGFuY2VIb2xkZXIgfSBmcm9tIFwiLi4vdHlwZUNvbmZpZy9pbnN0YW5jZUhvbGRlci5qc1wiO1xuXG5jb25zdCBMT0cgPSBuZXcgTG9nZ2VyKFwiSW5zdGFuY2VQcm9jZXNzb3JFeGVjdXRvclwiKTtcblxuLyoqXG4gKiBFeGVjdXRlcyB0aGUgY29uZmlncyBpbnN0YW5jZSBwcm9jZXNzb3JzIG9uIHRoZSBwcm92aWRlZCBpbnN0YW5jZVxuICogUmV0dXJucyBhIHByb21pc2UgZm9yIHdoZW4gdGhlIGluc3RhbmNlIHByb2Nlc3NvcnMgaGFzIGNvbXBsZXRlZCBydW5uaW5nXG4gKiBcbiAqIEluc3RhbmNlIHByb2Nlc3NvcnMgcGVyZm9ybSBvcGVyYXRpb25zIG9uIG1hbmFnZWQgaW5zdGFuY2VzIGFmdGVyIHRoZXkgaGF2ZSBiZWVuIGluc3RhbnNpYXRlZFxuICovXG5leHBvcnQgY2xhc3MgSW5zdGFuY2VQcm9jZXNzb3JFeGVjdXRvciB7XG5cbiAgICAvKipcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gaW5zdGFuY2UgdGhlIGluc3RhbmNlIHRvIHByb2Nlc3NcbiAgICAgKiBAcGFyYW0ge0NvbmZpZ30gY29uZmlnXG4gICAgICogQHJldHVybnMge1Byb21pc2V9XG4gICAgICovXG4gICAgc3RhdGljIGV4ZWN1dGUoaW5zdGFuY2UsIGNvbmZpZykge1xuICAgICAgICByZXR1cm4gQXJyYXlVdGlscy5wcm9taXNlQ2hhaW4oY29uZmlnLmluc3RhbmNlUHJvY2Vzc29ycywgKHByb2Nlc3Nvck5hbWUpID0+IHtcbiAgICAgICAgICAgIC8qKiBAdHlwZSB7VHlwZUNvbmZpZ30gKi9cbiAgICAgICAgICAgIGNvbnN0IHR5cGVDb25maWcgPSBDb25maWdBY2Nlc3Nvci50eXBlQ29uZmlnQnlOYW1lKHByb2Nlc3Nvck5hbWUsIGNvbmZpZyk7XG5cbiAgICAgICAgICAgIC8qKiBAdHlwZSB7SW5zdGFuY2VIb2xkZXJ9ICovXG4gICAgICAgICAgICBjb25zdCBwcm9jZXNzb3JIb2xkZXIgPSB0eXBlQ29uZmlnLmluc3RhbmNlSG9sZGVyKCk7XG5cbiAgICAgICAgICAgIHJldHVybiBwcm9jZXNzb3JIb2xkZXIuaW5zdGFuY2UucHJvY2VzcyhpbnN0YW5jZSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxufSIsImltcG9ydCB7IFByb3ZpZGVyIH0gZnJvbSBcIi4vYXBpL3Byb3ZpZGVyLmpzXCI7XG5pbXBvcnQgeyBUeXBlQ29uZmlnIH0gZnJvbSBcIi4vdHlwZUNvbmZpZy90eXBlQ29uZmlnLmpzXCI7XG5pbXBvcnQgeyBJbnN0YW5jZUhvbGRlciB9IGZyb20gXCIuL3R5cGVDb25maWcvaW5zdGFuY2VIb2xkZXIuanNcIjtcbmltcG9ydCB7IEluamVjdG9yIH0gZnJvbSBcIi4vaW5qZWN0b3IuanNcIjtcbmltcG9ydCB7IENvbmZpZyB9IGZyb20gXCIuL2NvbmZpZy5qc1wiO1xuXG4vKipcbiAqIEB0ZW1wbGF0ZSBUXG4gKi9cbmV4cG9ydCBjbGFzcyBNaW5kaVByb3ZpZGVyIGV4dGVuZHMgUHJvdmlkZXIge1xuXG4gICAgLyoqXG4gICAgICogXG4gICAgICogQHBhcmFtIHtUeXBlQ29uZmlnfSB0eXBlQ29uZmlnIFxuICAgICAqIEBwYXJhbSB7SW5qZWN0b3J9IGluamVjdG9yXG4gICAgICogQHBhcmFtIHtDb25maWd9IGNvbmZpZ1xuICAgICAqIEBwYXJhbSB7QXJyYXl9IHBhcmFtZXRlcnNcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3Rvcih0eXBlQ29uZmlnLCBpbmplY3RvciwgY29uZmlnLCBwYXJhbWV0ZXJzID0gW10pIHtcblxuICAgICAgICBzdXBlcigpO1xuXG4gICAgICAgIC8qKiBAdHlwZSB7VHlwZUNvbmZpZ30gKi9cbiAgICAgICAgdGhpcy50eXBlQ29uZmlnID0gdHlwZUNvbmZpZztcblxuICAgICAgICAvKiogQHR5cGUge0luamVjdG9yfSAqL1xuICAgICAgICB0aGlzLmluamVjdG9yID0gaW5qZWN0b3I7XG5cbiAgICAgICAgLyoqIEB0eXBlIHtDb25maWd9ICovXG4gICAgICAgIHRoaXMuY29uZmlnID0gY29uZmlnO1xuXG4gICAgICAgIC8qKiBAdHlwZSB7QXJyYXl9ICovXG4gICAgICAgIHRoaXMucGFyYW1ldGVycyA9IHBhcmFtZXRlcnM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogXG4gICAgICogQHBhcmFtIHtBcnJheX0gcGFyYW1ldGVycyBcbiAgICAgKiBAcmV0dXJucyB7UHJvbWlzZTxUPn1cbiAgICAgKi9cbiAgICBnZXQocGFyYW1ldGVycyA9IFtdKSB7XG5cbiAgICAgICAgY29uc3QgaW5zdGFuY2VQYXJhbWV0ZXJzID0gKHBhcmFtZXRlcnMubGVuZ3RoID4gMCkgPyBwYXJhbWV0ZXJzIDogdGhpcy5wYXJhbWV0ZXJzO1xuXG4gICAgICAgIC8qKiBAdHlwZSB7SW5zdGFuY2VIb2xkZXJ9ICovXG4gICAgICAgIGNvbnN0IGluc3RhbmNlSG9sZGVyID0gdGhpcy50eXBlQ29uZmlnLmluc3RhbmNlSG9sZGVyKGluc3RhbmNlUGFyYW1ldGVycyk7XG5cbiAgICAgICAgaWYgKGluc3RhbmNlSG9sZGVyLnR5cGUgPT09IEluc3RhbmNlSG9sZGVyLk5FV19JTlNUQU5DRSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuaW5qZWN0b3IuaW5qZWN0VGFyZ2V0KGluc3RhbmNlSG9sZGVyLmluc3RhbmNlLCB0aGlzLmNvbmZpZyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShpbnN0YW5jZUhvbGRlci5pbnN0YW5jZSk7XG4gICAgfVxuXG59IiwiaW1wb3J0IHsgQXJyYXlVdGlscywgTG9nZ2VyIH0gZnJvbSBcImNvcmV1dGlsX3YxXCI7XG5pbXBvcnQgeyBDb25maWcgfSBmcm9tIFwiLi9jb25maWcuanNcIjtcbmltcG9ydCB7IENvbmZpZ0FjY2Vzc29yIH0gZnJvbSBcIi4vY29uZmlnQWNjZXNzb3IuanNcIjtcbmltcG9ydCB7IEluamVjdGlvblBvaW50IH0gZnJvbSBcIi4vYXBpL2luamVjdGlvblBvaW50LmpzXCJcbmltcG9ydCB7IEluc3RhbmNlUHJvY2Vzc29yRXhlY3V0b3IgfSBmcm9tIFwiLi9pbnN0YW5jZVByb2Nlc3Nvci9pbnN0YW5jZVByb2Nlc3NvckV4ZWN1dG9yLmpzXCI7XG5pbXBvcnQgeyBJbnN0YW5jZUhvbGRlciB9IGZyb20gXCIuL3R5cGVDb25maWcvaW5zdGFuY2VIb2xkZXIuanNcIjtcbmltcG9ydCB7IE1pbmRpUHJvdmlkZXIgfSBmcm9tIFwiLi9taW5kaVByb3ZpZGVyLmpzXCI7XG5pbXBvcnQgeyBJbmplY3RvciB9IGZyb20gXCIuL2luamVjdG9yLmpzXCI7XG5pbXBvcnQgeyBUeXBlQ29uZmlnIH0gZnJvbSBcIi4vdHlwZUNvbmZpZy90eXBlQ29uZmlnLmpzXCI7XG5cbmNvbnN0IExPRyA9IG5ldyBMb2dnZXIoXCJNaW5kaUluamVjdG9yXCIpO1xuXG5leHBvcnQgY2xhc3MgTWluZGlJbmplY3RvciBleHRlbmRzIEluamVjdG9yIHtcblxuICAgIHN0YXRpYyBpbmplY3QodGFyZ2V0LCBjb25maWcpIHtcbiAgICAgICAgcmV0dXJuIElOSkVDVE9SLmluamVjdFRhcmdldCh0YXJnZXQsIGNvbmZpZyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQHJldHVybnMge01pbmRpSW5qZWN0b3J9XG4gICAgICovXG4gICAgc3RhdGljIGdldEluc3RhbmNlKCkge1xuICAgICAgICByZXR1cm4gSU5KRUNUT1I7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogSGVscGVyIG1ldGhvZCBmb3IgaW5qZWN0aW5nIGZpZWxkcyBpbiB0YXJnZXQgb2JqZWN0XG4gICAgICogXG4gICAgICogQHBhcmFtIHthbnl9IHRhcmdldE9iamVjdCBcbiAgICAgKiBAcGFyYW0ge0NvbmZpZ30gY29uZmlnIFxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBkZXB0aFxuICAgICAqIEByZXR1cm5zIHtQcm9taXNlfVxuICAgICAqL1xuICAgIGFzeW5jIGluamVjdFRhcmdldCh0YXJnZXRPYmplY3QsIGNvbmZpZywgZGVwdGggPSAwKSB7XG4gICAgICAgIGlmICghdGFyZ2V0T2JqZWN0KSB7XG4gICAgICAgICAgICB0aHJvdyBFcnJvcihcIk1pc3NpbmcgdGFyZ2V0IG9iamVjdFwiKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIWNvbmZpZykge1xuICAgICAgICAgICAgdGhyb3cgRXJyb3IoXCJNaXNzaW5nIGNvbmZpZ1wiKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIWNvbmZpZy5pc0ZpbmFsaXplZCgpKSB7XG4gICAgICAgICAgICB0aHJvdyBFcnJvcihcIkNvbmZpZyBub3QgZmluYWxpemVkXCIpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChkZXB0aCA+IDEwKSB7XG4gICAgICAgICAgICB0aHJvdyBFcnJvcihcIkluamVjdGlvbiBzdHJ1Y3R1cmUgdG9vIGRlZXBcIik7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgaW5qZWN0b3IgPSB0aGlzO1xuXG4gICAgICAgIGF3YWl0IEFycmF5VXRpbHMucHJvbWlzZUNoYWluKE9iamVjdC5rZXlzKHRhcmdldE9iamVjdCksIChmaWVsZE5hbWUpID0+IHtcbiAgICAgICAgICAgICAgICByZXR1cm4gTWluZGlJbmplY3Rvci5pbmplY3RQcm9wZXJ0eSh0YXJnZXRPYmplY3QsIGZpZWxkTmFtZSwgY29uZmlnLCBkZXB0aCwgaW5qZWN0b3IpO1xuICAgICAgICB9KTtcbiAgICAgICAgYXdhaXQgSW5zdGFuY2VQcm9jZXNzb3JFeGVjdXRvci5leGVjdXRlKHRhcmdldE9iamVjdCwgY29uZmlnKTtcbiAgICAgICAgcmV0dXJuIHRhcmdldE9iamVjdDtcblxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSB0YXJnZXRPYmplY3QgXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IGZpZWxkTmFtZSBcbiAgICAgKiBAcGFyYW0ge0NvbmZpZ30gY29uZmlnIFxuICAgICAqIEBwYXJhbSB7TnVtYmVyfSBkZXB0aCBcbiAgICAgKiBAcGFyYW0ge0luamVjdG9yfSBpbmplY3RvclxuICAgICAqIEByZXR1cm5zIHtQcm9taXNlfVxuICAgICAqL1xuICAgIHN0YXRpYyBpbmplY3RQcm9wZXJ0eSh0YXJnZXRPYmplY3QsIGZpZWxkTmFtZSwgY29uZmlnLCBkZXB0aCwgaW5qZWN0b3IpIHtcbiAgICAgICAgY29uc3QgaW5qZWN0aW9uUG9pbnQgPSB0YXJnZXRPYmplY3RbZmllbGROYW1lXTsgICAgICAgIFxuICAgICAgICBpZighKGluamVjdGlvblBvaW50IGluc3RhbmNlb2YgSW5qZWN0aW9uUG9pbnQpKSB7XG4gICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGluamVjdGlvblBvaW50LnR5cGUgPT09IEluamVjdGlvblBvaW50LlBST1ZJREVSX1RZUEUpIHtcbiAgICAgICAgICAgIE1pbmRpSW5qZWN0b3IuaW5qZWN0UHJvcGVydHlQcm92aWRlcih0YXJnZXRPYmplY3QsIGZpZWxkTmFtZSwgY29uZmlnLCBpbmplY3Rvcik7XG4gICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIE1pbmRpSW5qZWN0b3IuaW5qZWN0UHJvcGVydHlJbnN0YW5jZSh0YXJnZXRPYmplY3QsIGZpZWxkTmFtZSwgY29uZmlnLCBkZXB0aCwgaW5qZWN0b3IpO1xuICAgICAgICBcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gdGFyZ2V0T2JqZWN0IFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWVsZE5hbWUgXG4gICAgICogQHBhcmFtIHtDb25maWd9IGNvbmZpZyBcbiAgICAgKiBAcGFyYW0ge0luamVjdG9yfSBpbmplY3RvclxuICAgICAqL1xuICAgIHN0YXRpYyBpbmplY3RQcm9wZXJ0eVByb3ZpZGVyKHRhcmdldE9iamVjdCwgZmllbGROYW1lLCBjb25maWcsIGluamVjdG9yKSB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBAdHlwZSB7SW5qZWN0aW9uUG9pbnR9XG4gICAgICAgICAqL1xuICAgICAgICBjb25zdCBpbmplY3Rpb25Qb2ludCA9IHRhcmdldE9iamVjdFtmaWVsZE5hbWVdO1xuXG4gICAgICAgIC8qKiBAdHlwZSB7VHlwZUNvbmZpZ30gKi9cbiAgICAgICAgY29uc3QgdHlwZUNvbmZpZyA9IE1pbmRpSW5qZWN0b3IuZ2V0VHlwZUNvbmZpZyhpbmplY3Rpb25Qb2ludC5uYW1lLCBpbmplY3Rpb25Qb2ludC5jbGFzc1JlZmVyZW5jZSwgY29uZmlnKTtcblxuICAgICAgICBpZiAoIXR5cGVDb25maWcpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHRhcmdldE9iamVjdFtmaWVsZE5hbWVdID0gbmV3IE1pbmRpUHJvdmlkZXIodHlwZUNvbmZpZywgaW5qZWN0b3IsIGNvbmZpZywgaW5qZWN0aW9uUG9pbnQucGFyYW1ldGVycyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHRhcmdldE9iamVjdCBcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmllbGROYW1lIFxuICAgICAqIEBwYXJhbSB7Q29uZmlnfSBjb25maWcgXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGRlcHRoIFxuICAgICAqIEBwYXJhbSB7SW5qZWN0b3J9IGluamVjdG9yXG4gICAgICogQHJldHVybnMge1Byb21pc2V9XG4gICAgICovXG4gICAgc3RhdGljIGluamVjdFByb3BlcnR5SW5zdGFuY2UodGFyZ2V0T2JqZWN0LCBmaWVsZE5hbWUsIGNvbmZpZywgZGVwdGgsIGluamVjdG9yKSB7XG4gICAgICAgIGxldCBpbmplY3RQcm9taXNlID0gUHJvbWlzZS5yZXNvbHZlKCk7XG4gICAgICAgIC8qKiBAdHlwZSB7SW5qZWN0aW9uUG9pbnR9ICovXG4gICAgICAgIGNvbnN0IGluamVjdGlvblBvaW50ID0gdGFyZ2V0T2JqZWN0W2ZpZWxkTmFtZV07XG5cbiAgICAgICAgLyoqIEB0eXBlIHtUeXBlQ29uZmlnfSAqL1xuICAgICAgICBjb25zdCB0eXBlQ29uZmlnID0gTWluZGlJbmplY3Rvci5nZXRUeXBlQ29uZmlnKGluamVjdGlvblBvaW50Lm5hbWUsIGluamVjdGlvblBvaW50LmNsYXNzUmVmZXJlbmNlLCBjb25maWcpO1xuXG5cbiAgICAgICAgaWYgKCF0eXBlQ29uZmlnKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvKiogQHR5cGUge0luc3RhbmNlSG9sZGVyfSAqL1xuICAgICAgICBjb25zdCBpbnN0YW5jZUhvbGRlciA9IHR5cGVDb25maWcuaW5zdGFuY2VIb2xkZXIoaW5qZWN0aW9uUG9pbnQucGFyYW1ldGVycyk7XG5cbiAgICAgICAgaWYgKGluc3RhbmNlSG9sZGVyLnR5cGUgPT09IEluc3RhbmNlSG9sZGVyLk5FV19JTlNUQU5DRSkge1xuICAgICAgICAgICAgaW5qZWN0UHJvbWlzZSA9IGluamVjdG9yLmluamVjdFRhcmdldChpbnN0YW5jZUhvbGRlci5pbnN0YW5jZSwgY29uZmlnLCBkZXB0aCsrKTtcbiAgICAgICAgfVxuICAgICAgICB0YXJnZXRPYmplY3RbZmllbGROYW1lXSA9IGluc3RhbmNlSG9sZGVyLmluc3RhbmNlO1xuICAgICAgICByZXR1cm4gaW5qZWN0UHJvbWlzZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbmFtZSBcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gdHlwZSBcbiAgICAgKiBAcGFyYW0ge0NvbmZpZ30gY29uZmlnIFxuICAgICAqIEByZXR1cm5zIHtUeXBlQ29uZmlnfVxuICAgICAqL1xuICAgIHN0YXRpYyBnZXRUeXBlQ29uZmlnKG5hbWUsIGNsYXNzUmVmZXJlbmNlLCBjb25maWcpIHtcbiAgICAgICAgY29uc3QgdHlwZUNvbmZpZyA9IENvbmZpZ0FjY2Vzc29yLnR5cGVDb25maWdCeU5hbWUobmFtZSwgY29uZmlnKTtcbiAgICAgICAgaWYgKHR5cGVDb25maWcpIHtcbiAgICAgICAgICAgIHJldHVybiB0eXBlQ29uZmlnO1xuICAgICAgICB9XG4gICAgICAgIExPRy5lcnJvcihgTm8gdHlwZSBjb25maWcgZm91bmQgZm9yICR7bmFtZX0gYW5kIGNsYXNzUmVmZXJlbmNlIGRvZXMgbm90IGV4dGVuZCBBdXRvQ29uZmlnYCk7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxufVxuXG5jb25zdCBJTkpFQ1RPUiA9IG5ldyBNaW5kaUluamVjdG9yKCk7IiwiZXhwb3J0IGNsYXNzIEluc3RhbmNlUHJvY2Vzc29yIHtcblxuICAgIC8qKlxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBpbnN0YW5jZSBcbiAgICAgKiBAcmV0dXJuIHtQcm9taXNlfVxuICAgICAqL1xuICAgIHByb2Nlc3MoaW5zdGFuY2UpIHtcbiAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xuICAgIH1cblxufSIsImltcG9ydCB7IE1hcCB9IGZyb20gXCJjb3JldXRpbF92MVwiO1xuaW1wb3J0IHsgQ29uZmlnIH0gZnJvbSBcIi4uL2NvbmZpZy5qc1wiO1xuaW1wb3J0IHsgVHlwZUNvbmZpZyB9IGZyb20gXCIuLi90eXBlQ29uZmlnL3R5cGVDb25maWcuanNcIjtcblxuZXhwb3J0IGNsYXNzIENvbmZpZ1Byb2Nlc3NvciB7XG5cbiAgICAvKipcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge0NvbmZpZ30gY29uZmlnIFxuICAgICAqIEBwYXJhbSB7TWFwPFR5cGVDb25maWc+fSBjb25maWdFbnRyaWVzTWFwIFxuICAgICAqL1xuICAgIHByb2Nlc3NDb25maWcoY29uZmlnLCBjb25maWdFbnRyaWVzTWFwKSB7XG4gICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKTtcbiAgICB9XG5cbn0iLCJpbXBvcnQgeyBBcnJheVV0aWxzLCBMb2dnZXIsIE1hcFV0aWxzIH0gZnJvbSBcImNvcmV1dGlsX3YxXCI7XG5pbXBvcnQgeyBUeXBlQ29uZmlnIH0gZnJvbSBcIi4vdHlwZUNvbmZpZy90eXBlQ29uZmlnLmpzXCI7XG5pbXBvcnQgeyBDb25maWdQcm9jZXNzb3JFeGVjdXRvciB9IGZyb20gXCIuL2NvbmZpZ1Byb2Nlc3Nvci9jb25maWdQcm9jZXNzb3JFeGVjdXRvci5qc1wiO1xuaW1wb3J0IHsgU2luZ2xldG9uQ29uZmlnIH0gZnJvbSBcIi4vdHlwZUNvbmZpZy9zaW5nbGV0b25Db25maWcuanNcIjtcbmltcG9ydCB7IENvbmZpZyB9IGZyb20gXCIuL2NvbmZpZy5qc1wiO1xuaW1wb3J0IHsgTWluZGlJbmplY3RvciB9IGZyb20gXCIuL21pbmRpSW5qZWN0b3IuanNcIjtcbmltcG9ydCB7IEluc3RhbmNlUHJvY2Vzc29yIH0gZnJvbSBcIi4vaW5zdGFuY2VQcm9jZXNzb3IvaW5zdGFuY2VQcm9jZXNzb3IuanNcIjtcbmltcG9ydCB7IENvbmZpZ1Byb2Nlc3NvciB9IGZyb20gXCIuL2NvbmZpZ1Byb2Nlc3Nvci9jb25maWdQcm9jZXNzb3IuanNcIjtcblxuY29uc3QgTE9HID0gbmV3IExvZ2dlcihcIkNvbmZpZ1wiKTtcblxuZXhwb3J0IGNsYXNzIE1pbmRpQ29uZmlnIGV4dGVuZHMgQ29uZmlnIHtcblxuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICBzdXBlcigpO1xuXG4gICAgICAgIC8qKiBAdHlwZSB7Qm9vbGVhbn0gKi9cbiAgICAgICAgdGhpcy5maW5hbGl6ZWQgPSBmYWxzZTtcblxuICAgICAgICAvKiogQHR5cGUge01hcDxUeXBlQ29uZmlnPn0gKi9cbiAgICAgICAgdGhpcy5jb25maWdFbnRyaWVzID0gbmV3IE1hcCgpO1xuXG4gICAgICAgIC8qKiBAdHlwZSB7QXJyYXl9ICovXG4gICAgICAgIHRoaXMuY29uZmlnUHJvY2Vzc29ycyA9IG5ldyBBcnJheSgpO1xuXG4gICAgICAgIC8qKiBAdHlwZSB7QXJyYXl9ICovXG4gICAgICAgIHRoaXMuaW5zdGFuY2VQcm9jZXNzb3JzID0gbmV3IEFycmF5KCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogXG4gICAgICogQHBhcmFtIHtDb25maWd9IGNvbmZpZ1xuICAgICAqIEByZXR1cm5zIHtNaW5kaUNvbmZpZ31cbiAgICAgKi9cbiAgICBtZXJnZShjb25maWcpIHtcbiAgICAgICAgdGhpcy5maW5hbGl6ZWQgPSB0cnVlO1xuXG4gICAgICAgIHRoaXMuY29uZmlnRW50cmllcyA9IE1hcFV0aWxzXG4gICAgICAgICAgICAubWVyZ2UodGhpcy5jb25maWdFbnRyaWVzLCBjb25maWcuY29uZmlnRW50cmllcyk7XG4gICAgICAgIHRoaXMuY29uZmlnUHJvY2Vzc29ycyA9IEFycmF5VXRpbHNcbiAgICAgICAgICAgIC5tZXJnZSh0aGlzLmNvbmZpZ1Byb2Nlc3NvcnMsIGNvbmZpZy5jb25maWdQcm9jZXNzb3JzKTtcbiAgICAgICAgdGhpcy5pbnN0YW5jZVByb2Nlc3NvcnMgPSBBcnJheVV0aWxzXG4gICAgICAgICAgICAubWVyZ2UodGhpcy5pbnN0YW5jZVByb2Nlc3NvcnMsIGNvbmZpZy5pbnN0YW5jZVByb2Nlc3NvcnMpO1xuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7VHlwZUNvbmZpZ30gdHlwZUNvbmZpZ1xuICAgICAqIEByZXR1cm5zIHtNaW5kaUNvbmZpZ31cbiAgICAgKi9cbiAgICBhZGRUeXBlQ29uZmlnKHR5cGVDb25maWcpIHtcbiAgICAgICAgdGhpcy5maW5hbGl6ZWQgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5jb25maWdFbnRyaWVzLnNldCh0eXBlQ29uZmlnLm5hbWUsIHR5cGVDb25maWcpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge0NvbmZpZ1Byb2Nlc3Nvcn0gY29uZmlnUHJvY2Vzc29yXG4gICAgICogQHJldHVybnMge01pbmRpQ29uZmlnfVxuICAgICAqL1xuICAgIGFkZENvbmZpZ1Byb2Nlc3Nvcihjb25maWdQcm9jZXNzb3IpIHtcbiAgICAgICAgdGhpcy5jb25maWdQcm9jZXNzb3JzID0gQXJyYXlVdGlscy5hZGQodGhpcy5jb25maWdQcm9jZXNzb3JzLCBjb25maWdQcm9jZXNzb3IubmFtZSk7XG4gICAgICAgIHJldHVybiB0aGlzLmFkZFR5cGVDb25maWcoU2luZ2xldG9uQ29uZmlnLnVubmFtZWQoY29uZmlnUHJvY2Vzc29yKSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogXG4gICAgICogQHBhcmFtIHtJbnN0YW5jZVByb2Nlc3Nvcn0gaW5zdGFuY2VQcm9jZXNzb3JcbiAgICAgKiBAcmV0dXJucyB7TWluZGlDb25maWd9XG4gICAgICovXG4gICAgYWRkSW5zdGFuY2VQcm9jZXNzb3IoaW5zdGFuY2VQcm9jZXNzb3IpIHtcbiAgICAgICAgdGhpcy5pbnN0YW5jZVByb2Nlc3NvcnMgPSBBcnJheVV0aWxzLmFkZCh0aGlzLmluc3RhbmNlUHJvY2Vzc29ycywgaW5zdGFuY2VQcm9jZXNzb3IubmFtZSk7XG4gICAgICAgIHJldHVybiB0aGlzLmFkZFR5cGVDb25maWcoU2luZ2xldG9uQ29uZmlnLnVubmFtZWQoaW5zdGFuY2VQcm9jZXNzb3IpKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge0FycmF5PFR5cGVDb25maWc+fSB0eXBlQ29uZmlnQXJyYXlcbiAgICAgKiBAcmV0dXJuIHtNaW5kaUNvbmZpZ31cbiAgICAgKi9cbiAgICBhZGRBbGxUeXBlQ29uZmlnKHR5cGVDb25maWdBcnJheSkge1xuICAgICAgICB0aGlzLmZpbmFsaXplZCA9IGZhbHNlO1xuICAgICAgICB0eXBlQ29uZmlnQXJyYXkuZm9yRWFjaCgodHlwZUNvbmZpZykgPT4ge1xuICAgICAgICAgICAgdGhpcy5jb25maWdFbnRyaWVzLnNldCh0eXBlQ29uZmlnLm5hbWUsIHR5cGVDb25maWcpO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogXG4gICAgICogQHBhcmFtIHtBcnJheTxuZXcoKSA9PiBDb25maWdQcm9jZXNzb3I+fSBjb25maWdQcm9jZXNzb3JBcnJheVxuICAgICAqIEByZXR1cm4ge01pbmRpQ29uZmlnfVxuICAgICAqL1xuICAgIGFkZEFsbENvbmZpZ1Byb2Nlc3Nvcihjb25maWdQcm9jZXNzb3JBcnJheSkge1xuICAgICAgICBjb25maWdQcm9jZXNzb3JBcnJheS5mb3JFYWNoKChjb25maWdQcm9jZXNzb3IpID0+IHtcbiAgICAgICAgICAgIHRoaXMuY29uZmlnUHJvY2Vzc29ycyA9IEFycmF5VXRpbHMuYWRkKHRoaXMuY29uZmlnUHJvY2Vzc29ycywgY29uZmlnUHJvY2Vzc29yLm5hbWUpO1xuICAgICAgICAgICAgdGhpcy5hZGRUeXBlQ29uZmlnKFNpbmdsZXRvbkNvbmZpZy51bm5hbWVkKGNvbmZpZ1Byb2Nlc3NvcikpO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogXG4gICAgICogQHBhcmFtIHtBcnJheTxuZXcoKSA9PiBJbnN0YW5jZVByb2Nlc3Nvcj59IGluc3RhbmNlUHJvY2Vzc29yQXJyYXkgXG4gICAgICogQHJldHVybiB7TWluZGlDb25maWd9XG4gICAgICovXG4gICAgYWRkQWxsSW5zdGFuY2VQcm9jZXNzb3IoaW5zdGFuY2VQcm9jZXNzb3JBcnJheSkge1xuICAgICAgICBpbnN0YW5jZVByb2Nlc3NvckFycmF5LmZvckVhY2goKGluc3RhbmNlUHJvY2Vzc29yKSA9PiB7XG4gICAgICAgICAgICB0aGlzLmluc3RhbmNlUHJvY2Vzc29ycyA9IEFycmF5VXRpbHMuYWRkKHRoaXMuaW5zdGFuY2VQcm9jZXNzb3JzLCBpbnN0YW5jZVByb2Nlc3Nvci5uYW1lKTtcbiAgICAgICAgICAgIHRoaXMuYWRkVHlwZUNvbmZpZyhTaW5nbGV0b25Db25maWcudW5uYW1lZChpbnN0YW5jZVByb2Nlc3NvcikpO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAgICovXG4gICAgaXNGaW5hbGl6ZWQoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmZpbmFsaXplZDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAcmV0dXJucyB7UHJvbWlzZX1cbiAgICAgKi9cbiAgICBmaW5hbGl6ZSgpIHtcbiAgICAgICAgdGhpcy5maW5hbGl6ZWQgPSB0cnVlO1xuICAgICAgICByZXR1cm4gQ29uZmlnUHJvY2Vzc29yRXhlY3V0b3IuZXhlY3V0ZSh0aGlzLmNvbmZpZ1Byb2Nlc3NvcnMsIE1pbmRpSW5qZWN0b3IuZ2V0SW5zdGFuY2UoKSwgdGhpcyk7XG4gICAgfVxuXG59IiwiaW1wb3J0IHsgTG9nZ2VyIH0gZnJvbSBcImNvcmV1dGlsX3YxXCI7XG5pbXBvcnQgeyBJbnN0YW5jZVByb2Nlc3NvciB9IGZyb20gXCIuL2luc3RhbmNlUHJvY2Vzc29yLmpzXCI7XG5cbmNvbnN0IExPRyA9IG5ldyBMb2dnZXIoXCJJbnN0YW5jZVBvc3RDb25maWdUcmlnZ2VyXCIpO1xuXG4vKipcbiAqIEluc3RhbmNlIHByb2Nlc3NvciB3aGljaCBjYWxscyBwb3N0Q29uZmlnIG9uIG9iamVjdHMgYWZ0ZXIgY29uZmlnUHJvY2Vzc29ycyBhcmUgZmluaXNoZWRcbiAqL1xuZXhwb3J0IGNsYXNzIEluc3RhbmNlUG9zdENvbmZpZ1RyaWdnZXIgZXh0ZW5kcyBJbnN0YW5jZVByb2Nlc3NvciB7XG5cbiAgICAvKipcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gaW5zdGFuY2UgXG4gICAgICogQHJldHVybiB7UHJvbWlzZX1cbiAgICAgKi9cbiAgICBwcm9jZXNzKGluc3RhbmNlKSB7XG4gICAgICAgIGxldCByZXNwb25zZSA9IG51bGw7XG4gICAgICAgIGlmKGluc3RhbmNlLnBvc3RDb25maWcpIHtcbiAgICAgICAgICAgIHJlc3BvbnNlID0gaW5zdGFuY2UucG9zdENvbmZpZygpO1xuICAgICAgICB9XG4gICAgICAgIGlmICghcmVzcG9uc2UpIHtcbiAgICAgICAgICAgIHJlc3BvbnNlID0gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KSA9PiB7IHJlc29sdmUoKTsgfSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFyZXNwb25zZSBpbnN0YW5jZW9mIFByb21pc2UpIHtcbiAgICAgICAgICAgIHRocm93IFwicG9zdENvbmZpZygpIG11c3QgcmV0dXJuIGVpdGhlciB1bmRlZmluZWQgb3IgbnVsbCBvciBhIFByb21pc2VcIlxuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXNwb25zZTtcbiAgICB9XG5cbn0iLCJpbXBvcnQgeyBUeXBlQ29uZmlnIH0gZnJvbSBcIi4vdHlwZUNvbmZpZy5qc1wiO1xuXG5leHBvcnQgY2xhc3MgUG9vbENvbmZpZyBleHRlbmRzIFR5cGVDb25maWcge1xuXG4gICAgc3RhdGljIG5hbWVkKG5hbWUsIGNsYXNzUmVmZXJlbmNlLCBwb29sU2l6ZSkge1xuICAgICAgICByZXR1cm4gbmV3IFBvb2xDb25maWcobmFtZSwgY2xhc3NSZWZlcmVuY2UsIHBvb2xTaXplKTtcbiAgICB9XG5cbiAgICBzdGF0aWMgdW5uYW1lZChjbGFzc1JlZmVyZW5jZSwgcG9vbFNpemUpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBQb29sQ29uZmlnKGNsYXNzUmVmZXJlbmNlLm5hbWUsIGNsYXNzUmVmZXJlbmNlLCBwb29sU2l6ZSk7XG4gICAgfVxuXG4gICAgY29uc3RydWN0b3IobmFtZSwgY2xhc3NSZWZlcmVuY2UsIHBvb2xTaXplKSB7XG4gICAgICAgIHN1cGVyKG5hbWUsIGNsYXNzUmVmZXJlbmNlKTtcbiAgICAgICAgdGhpcy5wb29sU2l6ZSA9IHBvb2xTaXplO1xuICAgIH1cblxuICAgIGluc3RhbmNlSG9sZGVyKHBhcmFtZXRlcnMgPSBbXSkge1xuXG4gICAgfVxuXG59IiwiaW1wb3J0IHsgVHlwZUNvbmZpZyB9IGZyb20gXCIuL3R5cGVDb25maWcuanNcIjtcbmltcG9ydCB7IEluc3RhbmNlSG9sZGVyIH0gZnJvbSBcIi4vaW5zdGFuY2VIb2xkZXIuanNcIjtcblxuZXhwb3J0IGNsYXNzIFByb3RvdHlwZUNvbmZpZyBleHRlbmRzIFR5cGVDb25maWcge1xuXG4gICAgc3RhdGljIG5hbWVkKG5hbWUsIGNsYXNzUmVmZXJlbmNlKSB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvdG90eXBlQ29uZmlnKG5hbWUsIGNsYXNzUmVmZXJlbmNlKTtcbiAgICB9XG5cbiAgICBzdGF0aWMgdW5uYW1lZChjbGFzc1JlZmVyZW5jZSkge1xuICAgICAgICByZXR1cm4gbmV3IFByb3RvdHlwZUNvbmZpZyhjbGFzc1JlZmVyZW5jZS5uYW1lLCBjbGFzc1JlZmVyZW5jZSk7XG4gICAgfVxuXG4gICAgY29uc3RydWN0b3IobmFtZSwgY2xhc3NSZWZlcmVuY2UpIHtcbiAgICAgICAgc3VwZXIobmFtZSwgY2xhc3NSZWZlcmVuY2UpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBwYXJhbSB7YXJyYXl9IHBhcmFtZXRlcnMgdGhlIHBhcmFtZXRlcnMgdG8gdXNlIGZvciB0aGUgY29uc3RydWN0b3JcbiAgICAgKi9cbiAgICBpbnN0YW5jZUhvbGRlcihwYXJhbWV0ZXJzID0gW10pIHtcbiAgICAgICAgbGV0IGluc3RhbmNlID0gbnVsbDtcbiAgICAgICAgaWYocGFyYW1ldGVycyAmJiBwYXJhbWV0ZXJzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGluc3RhbmNlID0gbmV3IHRoaXMuY2xhc3NSZWZlcmVuY2UoLi4ucGFyYW1ldGVycyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpbnN0YW5jZSA9IG5ldyB0aGlzLmNsYXNzUmVmZXJlbmNlKCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIEluc3RhbmNlSG9sZGVyLmhvbGRlcldpdGhOZXdJbnN0YW5jZShpbnN0YW5jZSk7XG4gICAgfVxuXG5cbn0iLCJpbXBvcnQgeyBUeXBlQ29uZmlnIH0gZnJvbSBcIi4vdHlwZUNvbmZpZy5qc1wiO1xuXG5leHBvcnQgY2xhc3MgVHlwZUNvbmZpZ1BhY2sge1xuXG4gICAgc3RhdGljIF9pbnN0YW5jZTtcblxuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICAvKiogQHR5cGUge01hcDxTdHJpbmcsIE1hcDxTdHJpbmcsIFR5cGVDb25maWc+Pn0gKi9cbiAgICAgICAgdGhpcy50eXBlQ29uZmlnUGFja01hcCA9IG5ldyBNYXAoKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBcbiAgICAgKiBAcmV0dXJucyB7VHlwZUNvbmZpZ1BhY2t9XG4gICAgICovXG4gICAgc3RhdGljIGluc3RhbmNlKCkge1xuICAgICAgICBpZiAoIVR5cGVDb25maWdQYWNrLl9pbnN0YW5jZSkge1xuICAgICAgICAgICAgVHlwZUNvbmZpZ1BhY2suX2luc3RhbmNlID0gbmV3IFR5cGVDb25maWdQYWNrKCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIFR5cGVDb25maWdQYWNrLl9pbnN0YW5jZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcGFja05hbWUgXG4gICAgICogQHBhcmFtIHtUeXBlQ29uZmlnfSB0eXBlQ29uZmlnIFxuICAgICAqL1xuICAgIGFkZFR5cGVDb25maWcocGFja05hbWUsIHR5cGVDb25maWcpIHtcbiAgICAgICAgaWYgKCF0aGlzLnR5cGVDb25maWdQYWNrTWFwLmhhcyhwYWNrTmFtZSkpIHtcbiAgICAgICAgICAgIHRoaXMudHlwZUNvbmZpZ1BhY2tNYXAuc2V0KHBhY2tOYW1lLCBuZXcgTWFwKCkpO1xuICAgICAgICB9XG4gICAgICAgIGlmICghdGhpcy50eXBlQ29uZmlnUGFja01hcC5nZXQocGFja05hbWUpLmhhcyh0eXBlQ29uZmlnLm5hbWUpKSB7XG4gICAgICAgICAgICB0aGlzLnR5cGVDb25maWdQYWNrTWFwLmdldChwYWNrTmFtZSkuc2V0KHR5cGVDb25maWcubmFtZSwgdHlwZUNvbmZpZyk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcGFja05hbWUgXG4gICAgICogQHJldHVybnMge0FycmF5PFR5cGVDb25maWc+fVxuICAgICAqL1xuICAgIGdldENvbmZpZ0FycmF5QnlQYWNrTmFtZShwYWNrTmFtZSkgeyBcbiAgICAgICAgaWYgKHRoaXMudHlwZUNvbmZpZ1BhY2tNYXAuaGFzKHBhY2tOYW1lKSkge1xuICAgICAgICAgICAgcmV0dXJuIEFycmF5LmZyb20odGhpcy50eXBlQ29uZmlnUGFja01hcC5nZXQocGFja05hbWUpLnZhbHVlcygpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gW107XG4gICAgfVxuXG59Il0sIm5hbWVzIjpbIkxvZ2dlciIsIkxPRyIsIkFycmF5VXRpbHMiLCJNYXBVdGlscyJdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQU8sTUFBTSxNQUFNLENBQUM7QUFDcEI7QUFDQSxJQUFJLFdBQVcsR0FBRztBQUNsQjtBQUNBLFFBQVEsSUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJLENBQUM7QUFDbEM7QUFDQTtBQUNBLFFBQVEsSUFBSSxDQUFDLGdCQUFnQixHQUFHLElBQUksQ0FBQztBQUNyQztBQUNBO0FBQ0EsUUFBUSxJQUFJLENBQUMsa0JBQWtCLEdBQUcsSUFBSSxDQUFDO0FBQ3ZDLEtBQUs7QUFDTDtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQUksUUFBUSxHQUFHO0FBQ2Y7QUFDQSxLQUFLO0FBQ0w7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFJLFdBQVcsR0FBRztBQUNsQixRQUFRLE9BQU8sS0FBSyxDQUFDO0FBQ3JCLEtBQUs7QUFDTDs7QUMxQk8sTUFBTSxjQUFjLENBQUM7QUFDNUI7QUFDQSxJQUFJLFdBQVcsWUFBWSxHQUFHLEVBQUUsT0FBTyxDQUFDLENBQUMsRUFBRTtBQUMzQztBQUNBLElBQUksV0FBVyxpQkFBaUIsR0FBRyxFQUFFLE9BQU8sQ0FBQyxDQUFDLEVBQUU7QUFDaEQ7QUFDQSxJQUFJLE9BQU8scUJBQXFCLENBQUMsUUFBUSxFQUFFO0FBQzNDLFFBQVEsT0FBTyxJQUFJLGNBQWMsQ0FBQyxRQUFRLEVBQUUsY0FBYyxDQUFDLFlBQVksQ0FBQyxDQUFDO0FBQ3pFLEtBQUs7QUFD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
