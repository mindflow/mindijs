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
        const instanceHolder = this.typeConfig.instanceHolder(parameters);

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWluZGlfdjEuanMiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9taW5kaS9jb25maWcuanMiLCIuLi8uLi9zcmMvbWluZGkvdHlwZUNvbmZpZy9pbnN0YW5jZUhvbGRlci5qcyIsIi4uLy4uL3NyYy9taW5kaS90eXBlQ29uZmlnL3R5cGVDb25maWcuanMiLCIuLi8uLi9zcmMvbWluZGkvY29uZmlnQWNjZXNzb3IuanMiLCIuLi8uLi9zcmMvbWluZGkvaW5qZWN0b3IuanMiLCIuLi8uLi9zcmMvbWluZGkvY29uZmlnUHJvY2Vzc29yL2NvbmZpZ1Byb2Nlc3NvckV4ZWN1dG9yLmpzIiwiLi4vLi4vc3JjL21pbmRpL3R5cGVDb25maWcvc2luZ2xldG9uQ29uZmlnLmpzIiwiLi4vLi4vc3JjL21pbmRpL2FwaS9wcm92aWRlci5qcyIsIi4uLy4uL3NyYy9taW5kaS9hcGkvaW5qZWN0aW9uUG9pbnQuanMiLCIuLi8uLi9zcmMvbWluZGkvaW5zdGFuY2VQcm9jZXNzb3IvaW5zdGFuY2VQcm9jZXNzb3JFeGVjdXRvci5qcyIsIi4uLy4uL3NyYy9taW5kaS9taW5kaVByb3ZpZGVyLmpzIiwiLi4vLi4vc3JjL21pbmRpL21pbmRpSW5qZWN0b3IuanMiLCIuLi8uLi9zcmMvbWluZGkvaW5zdGFuY2VQcm9jZXNzb3IvaW5zdGFuY2VQcm9jZXNzb3IuanMiLCIuLi8uLi9zcmMvbWluZGkvY29uZmlnUHJvY2Vzc29yL2NvbmZpZ1Byb2Nlc3Nvci5qcyIsIi4uLy4uL3NyYy9taW5kaS9taW5kaUNvbmZpZy5qcyIsIi4uLy4uL3NyYy9taW5kaS9pbnN0YW5jZVByb2Nlc3Nvci9pbnN0YW5jZVBvc3RDb25maWdUcmlnZ2VyLmpzIiwiLi4vLi4vc3JjL21pbmRpL3R5cGVDb25maWcvcG9vbENvbmZpZy5qcyIsIi4uLy4uL3NyYy9taW5kaS90eXBlQ29uZmlnL3Byb3RvdHlwZUNvbmZpZy5qcyIsIi4uLy4uL3NyYy9taW5kaS90eXBlQ29uZmlnL3R5cGVDb25maWdQYWNrLmpzIl0sInNvdXJjZXNDb250ZW50IjpbImV4cG9ydCBjbGFzcyBDb25maWcge1xuXG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIC8qKiBAdHlwZSB7TWFwPGFueSxhbnk+fSAqL1xuICAgICAgICB0aGlzLmNvbmZpZ0VudHJpZXMgPSBudWxsO1xuXG4gICAgICAgIC8qKiBAdHlwZSB7QXJyYXk8YW55Pn0gKi9cbiAgICAgICAgdGhpcy5jb25maWdQcm9jZXNzb3JzID0gbnVsbDtcblxuICAgICAgICAvKiogQHR5cGUge0FycmF5PGFueT59ICovXG4gICAgICAgIHRoaXMuaW5zdGFuY2VQcm9jZXNzb3JzID0gbnVsbDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAcmV0dXJucyB7UHJvbWlzZX1cbiAgICAgKi9cbiAgICBmaW5hbGl6ZSgpIHtcblxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgICAqL1xuICAgIGlzRmluYWxpemVkKCkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxufSIsImV4cG9ydCBjbGFzcyBJbnN0YW5jZUhvbGRlciB7XG5cbiAgICBzdGF0aWMgZ2V0IE5FV19JTlNUQU5DRSgpIHsgcmV0dXJuIDA7IH1cblxuICAgIHN0YXRpYyBnZXQgRVhJU1RJTkdfSU5TVEFOQ0UoKSB7IHJldHVybiAxOyB9XG5cbiAgICBzdGF0aWMgaG9sZGVyV2l0aE5ld0luc3RhbmNlKGluc3RhbmNlKSB7XG4gICAgICAgIHJldHVybiBuZXcgSW5zdGFuY2VIb2xkZXIoaW5zdGFuY2UsIEluc3RhbmNlSG9sZGVyLk5FV19JTlNUQU5DRSk7XG4gICAgfVxuXG4gICAgc3RhdGljIGhvbGRlcldpdGhFeGlzdGluZ0luc3RhbmNlKGluc3RhbmNlKSB7XG4gICAgICAgIHJldHVybiBuZXcgSW5zdGFuY2VIb2xkZXIoaW5zdGFuY2UsIEluc3RhbmNlSG9sZGVyLkVYSVNUSU5HX0lOU1RBTkNFKTtcbiAgICB9XG5cbiAgICBjb25zdHJ1Y3RvcihpbnN0YW5jZSwgdHlwZSkge1xuICAgICAgICB0aGlzLmluc3RhbmNlID0gaW5zdGFuY2U7XG4gICAgICAgIHRoaXMudHlwZSA9IHR5cGU7XG4gICAgfVxuXG59IiwiaW1wb3J0IHsgSW5zdGFuY2VIb2xkZXIgfSBmcm9tIFwiLi9pbnN0YW5jZUhvbGRlci5qc1wiO1xuXG5leHBvcnQgY2xhc3MgVHlwZUNvbmZpZyB7XG5cbiAgICBzdGF0aWMgZ2V0IE5FVygpIHsgcmV0dXJuIFwiTkVXXCI7IH1cbiAgICBzdGF0aWMgZ2V0IENPTkZJR1VSRUQoKSB7IHJldHVybiBcIkNPTkZJR1VSRURcIjsgfVxuXG4gICAgY29uc3RydWN0b3IobmFtZSwgY2xhc3NSZWZlcmVuY2UpIHtcbiAgICAgICAgdGhpcy5uYW1lID0gbmFtZTtcbiAgICAgICAgdGhpcy5jbGFzc1JlZmVyZW5jZSA9IGNsYXNzUmVmZXJlbmNlO1xuICAgICAgICB0aGlzLnN0YWdlID0gVHlwZUNvbmZpZy5ORVc7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogXG4gICAgICogQHBhcmFtIHthcnJheX0gcGFyYW1ldGVycyBcbiAgICAgKiBAcmV0dXJucyB7SW5zdGFuY2VIb2xkZXJ9XG4gICAgICovXG4gICAgaW5zdGFuY2VIb2xkZXIocGFyYW1ldGVycyA9IFtdKSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxufSIsImltcG9ydCB7IENvbmZpZyB9IGZyb20gXCIuL2NvbmZpZy5qc1wiO1xuaW1wb3J0IHsgTG9nZ2VyIH0gZnJvbSBcImNvcmV1dGlsX3YxXCI7XG5pbXBvcnQgeyBUeXBlQ29uZmlnIH0gZnJvbSBcIi4vdHlwZUNvbmZpZy90eXBlQ29uZmlnLmpzXCI7XG5cbmNvbnN0IExPRyA9IG5ldyBMb2dnZXIoXCJDb25maWdBY2Nlc3NvclwiKTtcblxuLyoqXG4gKiBVdGlsaXRpZXMgZm9yIGFjY2Vzc2luZyBhIENvbmZpZyBvYmplY3RcbiAqL1xuZXhwb3J0IGNsYXNzIENvbmZpZ0FjY2Vzc29yIHtcblxuICAgIC8qKlxuICAgICAqIEdldCB0aGUgdHlwZSBjb25maWcgYnkgY2xhc3MgbmFtZSBpbiB0aGUgY29uZmlnXG4gICAgICogXG4gICAgICogQHBhcmFtIHtDb25maWd9IGNvbmZpZyBcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbmFtZSBcbiAgICAgKiBAcmV0dXJucyB7VHlwZUNvbmZpZ31cbiAgICAgKi9cbiAgICBzdGF0aWMgdHlwZUNvbmZpZ0J5TmFtZShuYW1lLCBjb25maWcpIHtcbiAgICAgICAgbGV0IGNvbmZpZ0VudHJ5ID0gbnVsbDtcbiAgICAgICAgY29uZmlnLmNvbmZpZ0VudHJpZXMuZm9yRWFjaCgodmFsdWUsIGtleSkgPT4ge1xuICAgICAgICAgICAgaWYoa2V5ID09PSBuYW1lKSB7XG4gICAgICAgICAgICAgICAgY29uZmlnRW50cnkgPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gY29uZmlnRW50cnk7XG4gICAgfVxuXG59IiwiZXhwb3J0IGNsYXNzIEluamVjdG9yIHtcblxuXG4gICAgLyoqXG4gICAgICogSGVscGVyIG1ldGhvZCBmb3IgaW5qZWN0aW5nIGZpZWxkcyBpbiB0YXJnZXQgb2JqZWN0XG4gICAgICogXG4gICAgICogQHBhcmFtIHthbnl9IHRhcmdldE9iamVjdCBcbiAgICAgKiBAcGFyYW0ge0NvbmZpZ30gY29uZmlnIFxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBkZXB0aFxuICAgICAqIEByZXR1cm5zIHtQcm9taXNlfVxuICAgICAqL1xuICAgIGluamVjdFRhcmdldCh0YXJnZXQsIGNvbmZpZywgZGVwdGggPSAwKSB7XG5cbiAgICB9XG5cbn0iLCJpbXBvcnQgeyBMb2dnZXIsIEFycmF5VXRpbHMgfSBmcm9tIFwiY29yZXV0aWxfdjFcIjtcbmltcG9ydCB7IENvbmZpZyB9IGZyb20gXCIuLi9jb25maWcuanNcIjtcbmltcG9ydCB7IENvbmZpZ0FjY2Vzc29yIH0gZnJvbSBcIi4uL2NvbmZpZ0FjY2Vzc29yLmpzXCI7XG5pbXBvcnQgeyBJbmplY3RvciB9IGZyb20gXCIuLi9pbmplY3Rvci5qc1wiO1xuaW1wb3J0IHsgSW5zdGFuY2VIb2xkZXIgfSBmcm9tIFwiLi4vdHlwZUNvbmZpZy9pbnN0YW5jZUhvbGRlci5qc1wiO1xuaW1wb3J0IHsgVHlwZUNvbmZpZyB9IGZyb20gXCIuLi90eXBlQ29uZmlnL3R5cGVDb25maWcuanNcIjtcblxuY29uc3QgTE9HID0gbmV3IExvZ2dlcihcIkNvbmZpZ1Byb2Nlc3NvckV4ZWN1dG9yXCIpO1xuXG4vKipcbiAqIEV4ZWN1dGVzIHRoZSBwcm92aWRlZCBjb25maWcgcHJvY2Vzc29ycyBvbiB0aGUgcHJvdmlkZWQgY29uZmlnIHJlZ2lzdHJ5XG4gKiBSZXR1cm5zIGEgbGlzdCBvZiBwcm9taXNlcyBmb3Igd2hlbiB0aGUgY29uZmlnIHByb2Nlc3NvcnMgaGFzIGNvbXBsZXRlZCBydW5uaW5nXG4gKiBcbiAqIEEgY29uZmlnIHByb2Nlc3NvciByZWFkcyB0aGUgY29uZmlnIGFuZCBwZXJmb3JtcyBhbnkgbmVjZXNzYXJ5IGFjdGlvbnMgYmFzZWQgb25cbiAqIGNsYXNzIGFuZCB0eXBlIGluZm9ybWF0aW9uLiBBIGNvbmZpZyBwcm9jZXNzb3IgZG9lcyBub3Qgb3BlcmF0ZSBvbiBtYW5hZ2VkIGluc3RhbmNlc1xuICovXG5leHBvcnQgY2xhc3MgQ29uZmlnUHJvY2Vzc29yRXhlY3V0b3Ige1xuICAgIFxuICAgIC8qKlxuICAgICAqIEBwYXJhbSB7QXJyYXk8U3RyaW5nPn0gY29uZmlnUHJvY2Vzc29yQ2xhc3NOYW1lQXJyYXlcbiAgICAgKiBAcGFyYW0ge0luamVjdG9yfSBpbmplY3RvclxuICAgICAqIEBwYXJhbSB7Q29uZmlnfSBjb25maWdcbiAgICAgKiBAcmV0dXJucyB7UHJvbWlzZX0gcHJvbWlzZSB3aGljaCBpcyByZXNvbHZlZCB3aGVuIGFsbCBjb25maWcgcHJvY2Vzc29ycyBhcmUgcmVzb2x2ZWRcbiAgICAgKi9cbiAgICBzdGF0aWMgZXhlY3V0ZShjb25maWdQcm9jZXNzb3JDbGFzc05hbWVBcnJheSwgaW5qZWN0b3IsIGNvbmZpZykge1xuICAgICAgICByZXR1cm4gQXJyYXlVdGlscy5wcm9taXNlQ2hhaW4oY29uZmlnUHJvY2Vzc29yQ2xhc3NOYW1lQXJyYXksIChjb25maWdQcm9jZXNzb3JDbGFzc05hbWUpID0+IHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZUNvbmZpZ1Byb2Nlc3NvckV4ZWN1dGVkLCByZWplY3QpID0+IHtcblxuICAgICAgICAgICAgICAgIGxldCB0YXJnZXRJbmplY3RlZFByb21pc2UgPSBQcm9taXNlLnJlc29sdmUoKTtcblxuICAgICAgICAgICAgICAgIC8qKiAgQHR5cGUge1R5cGVDb25maWd9ICovXG4gICAgICAgICAgICAgICAgY29uc3QgdHlwZUNvbmZpZyA9IENvbmZpZ0FjY2Vzc29yLnR5cGVDb25maWdCeU5hbWUoY29uZmlnUHJvY2Vzc29yQ2xhc3NOYW1lLCBjb25maWcpO1xuXG4gICAgICAgICAgICAgICAgaWYgKCF0eXBlQ29uZmlnKSB7XG4gICAgICAgICAgICAgICAgICAgIExPRy5lcnJvcihgTm8gdHlwZSBjb25maWcgZm91bmQgZm9yICR7Y29uZmlnUHJvY2Vzc29yQ2xhc3NOYW1lfWApO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLyoqICBAdHlwZSB7SW5zdGFuY2VIb2xkZXJ9ICovXG4gICAgICAgICAgICAgICAgY29uc3QgcHJvY2Vzc29ySG9sZGVyID0gdHlwZUNvbmZpZy5pbnN0YW5jZUhvbGRlcigpO1xuXG4gICAgICAgICAgICAgICAgaWYocHJvY2Vzc29ySG9sZGVyLnR5cGUgPT09IEluc3RhbmNlSG9sZGVyLk5FV19JTlNUQU5DRSkge1xuICAgICAgICAgICAgICAgICAgICB0YXJnZXRJbmplY3RlZFByb21pc2UgPSBpbmplY3Rvci5pbmplY3RUYXJnZXQocHJvY2Vzc29ySG9sZGVyLmluc3RhbmNlLCBjb25maWcpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHRhcmdldEluamVjdGVkUHJvbWlzZS50aGVuKCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdG9Db25maWd1cmVNYXAgPSBDb25maWdQcm9jZXNzb3JFeGVjdXRvci5wcmVwYXJlVW5jb25maWd1cmVkQ29uZmlnRW50cmllcyhjb25maWcuY29uZmlnRW50cmllcyk7XG4gICAgICAgICAgICAgICAgICAgIHByb2Nlc3NvckhvbGRlci5pbnN0YW5jZS5wcm9jZXNzQ29uZmlnKGNvbmZpZywgdG9Db25maWd1cmVNYXApLnRoZW4oKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZUNvbmZpZ1Byb2Nlc3NvckV4ZWN1dGVkKCk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogXG4gICAgICogQHBhcmFtIHtNYXA8c3RyaW5nLCBUeXBlQ29uZmlnPn0gY29uZmlnRW50cmllcyBcbiAgICAgKiBAcmV0dXJuIHtNYXA8c3RyaW5nLCBUeXBlQ29uZmlnPn1cbiAgICAgKi9cbiAgICBzdGF0aWMgcHJlcGFyZVVuY29uZmlndXJlZENvbmZpZ0VudHJpZXMoY29uZmlnRW50cmllcykge1xuICAgICAgICAvKiogQHR5cGUge01hcDxUeXBlQ29uZmlnPn0gKi9cbiAgICAgICAgY29uc3QgdW5jb25maWd1cmVkQ29uZmlnRW50cmllcyA9IG5ldyBNYXAoKTtcblxuICAgICAgICBjb25maWdFbnRyaWVzLmZvckVhY2goKHZhbHVlLCBrZXkpID0+IHtcblxuICAgICAgICAgICAgLyoqIEB0eXBlIHtUeXBlQ29uZmlnfSAqL1xuICAgICAgICAgICAgY29uc3QgY29uZmlnRW50cnkgPSB2YWx1ZTtcblxuICAgICAgICAgICAgaWYoY29uZmlnRW50cnkuc3RhZ2UgPT09IFR5cGVDb25maWcuTkVXKSB7XG4gICAgICAgICAgICAgICAgdW5jb25maWd1cmVkQ29uZmlnRW50cmllcy5zZXQoa2V5LCBjb25maWdFbnRyeSk7XG4gICAgICAgICAgICAgICAgY29uZmlnRW50cnkuc3RhZ2UgPSBUeXBlQ29uZmlnLkNPTkZJR1VSRUQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJldHVybiB1bmNvbmZpZ3VyZWRDb25maWdFbnRyaWVzO1xuICAgIH1cblxufSIsImltcG9ydCB7IFR5cGVDb25maWcgfSBmcm9tIFwiLi90eXBlQ29uZmlnLmpzXCI7XG5pbXBvcnQgeyBMb2dnZXIgfSBmcm9tIFwiY29yZXV0aWxfdjFcIjtcbmltcG9ydCB7IEluc3RhbmNlSG9sZGVyIH0gZnJvbSBcIi4vaW5zdGFuY2VIb2xkZXIuanNcIjtcblxuY29uc3QgTE9HID0gbmV3IExvZ2dlcihcIlNpbmdsZXRvbkNvbmZpZ1wiKTtcblxuZXhwb3J0IGNsYXNzIFNpbmdsZXRvbkNvbmZpZyBleHRlbmRzIFR5cGVDb25maWcge1xuXG4gICAgc3RhdGljIG5hbWVkKG5hbWUsIGNsYXNzUmVmZXJlbmNlKSB7XG4gICAgICAgIHJldHVybiBuZXcgU2luZ2xldG9uQ29uZmlnKG5hbWUsIGNsYXNzUmVmZXJlbmNlKTtcbiAgICB9XG5cbiAgICBzdGF0aWMgdW5uYW1lZChjbGFzc1JlZmVyZW5jZSkge1xuICAgICAgICByZXR1cm4gbmV3IFNpbmdsZXRvbkNvbmZpZyhjbGFzc1JlZmVyZW5jZS5uYW1lLCBjbGFzc1JlZmVyZW5jZSk7XG4gICAgfVxuXG4gICAgY29uc3RydWN0b3IobmFtZSwgY2xhc3NSZWZlcmVuY2UpIHtcbiAgICAgICAgc3VwZXIobmFtZSwgY2xhc3NSZWZlcmVuY2UpO1xuICAgIH1cblxuICAgIGluc3RhbmNlSG9sZGVyKHBhcmFtZXRlcnMgPSBbXSkge1xuICAgICAgICBpZiAoIXRoaXMuaW5zdGFuY2UpIHtcbiAgICAgICAgICAgIGlmKHBhcmFtZXRlcnMgJiYgcGFyYW1ldGVycy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5pbnN0YW5jZSA9IG5ldyB0aGlzLmNsYXNzUmVmZXJlbmNlKC4uLnBhcmFtZXRlcnMpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLmluc3RhbmNlID0gbmV3IHRoaXMuY2xhc3NSZWZlcmVuY2UoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBJbnN0YW5jZUhvbGRlci5ob2xkZXJXaXRoTmV3SW5zdGFuY2UodGhpcy5pbnN0YW5jZSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIEluc3RhbmNlSG9sZGVyLmhvbGRlcldpdGhFeGlzdGluZ0luc3RhbmNlKHRoaXMuaW5zdGFuY2UpO1xuICAgIH1cblxufSIsImltcG9ydCB7IExvZ2dlciB9IGZyb20gXCJjb3JldXRpbF92MVwiO1xuXG5jb25zdCBMT0cgPSBuZXcgTG9nZ2VyKFwiUHJvdmlkZXJcIik7XG5cbi8qKlxuICogQHRlbXBsYXRlIFRcbiAqL1xuZXhwb3J0IGNsYXNzIFByb3ZpZGVyIHtcblxuICAgIC8qKlxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7QXJyYXl9IHBhcmFtZXRlcnMgXG4gICAgICogQHJldHVybnMge1Byb21pc2U8VD59XG4gICAgICovXG4gICAgZ2V0KHBhcmFtZXRlcnMgPSBbXSkge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbn0iLCJpbXBvcnQgeyBQcm92aWRlciB9IGZyb20gXCIuL3Byb3ZpZGVyLmpzXCI7XG5cbmV4cG9ydCBjbGFzcyBJbmplY3Rpb25Qb2ludCB7XG5cbiAgICBzdGF0aWMgZ2V0IElOU1RBTkNFX1RZUEUoKSB7IHJldHVybiAwOyB9IFxuICAgIHN0YXRpYyBnZXQgUFJPVklERVJfVFlQRSgpIHsgcmV0dXJuIDE7IH0gXG5cbiAgICAvKipcbiAgICAgKiBAdGVtcGxhdGUgVFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBuYW1lIFxuICAgICAqIEBwYXJhbSB7bmV3KCkgPT4gVH0gY2xhc3NSZWZlcmVuY2UgXG4gICAgICogQHBhcmFtIHthcnJheX0gcGFyYW1ldGVycyBcbiAgICAgKiBAcmV0dXJucyB7VH1cbiAgICAgKi9cbiAgICBzdGF0aWMgaW5zdGFuY2VCeU5hbWUobmFtZSwgY2xhc3NSZWZlcmVuY2UsIHBhcmFtZXRlcnMgPSBbXSkge1xuICAgICAgICByZXR1cm4gbmV3IEluamVjdGlvblBvaW50KG5hbWUsIGNsYXNzUmVmZXJlbmNlLCBJbmplY3Rpb25Qb2ludC5JTlNUQU5DRV9UWVBFLCBwYXJhbWV0ZXJzKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAdGVtcGxhdGUgVFxuICAgICAqIEBwYXJhbSB7bmV3KCkgPT4gVH0gY2xhc3NSZWZlcmVuY2UgXG4gICAgICogQHBhcmFtIHthcnJheX0gcGFyYW1ldGVycyBcbiAgICAgKiBAcmV0dXJucyB7VH1cbiAgICAgKi9cbiAgICBzdGF0aWMgaW5zdGFuY2UoY2xhc3NSZWZlcmVuY2UsIHBhcmFtZXRlcnMgPSBbXSkge1xuICAgICAgICByZXR1cm4gbmV3IEluamVjdGlvblBvaW50KGNsYXNzUmVmZXJlbmNlLm5hbWUsIGNsYXNzUmVmZXJlbmNlLCBJbmplY3Rpb25Qb2ludC5JTlNUQU5DRV9UWVBFLCBwYXJhbWV0ZXJzKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAdGVtcGxhdGUgVFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBuYW1lIFxuICAgICAqIEBwYXJhbSB7bmV3KCkgPT4gVH0gY2xhc3NSZWZlcmVuY2UgXG4gICAgICogQHJldHVybnMge1Byb3ZpZGVyPFQ+fVxuICAgICAqL1xuICAgIHN0YXRpYyBwcm92aWRlckJ5TmFtZShuYW1lLCBjbGFzc1JlZmVyZW5jZSkge1xuICAgICAgICByZXR1cm4gbmV3IEluamVjdGlvblBvaW50KG5hbWUsIGNsYXNzUmVmZXJlbmNlLCBJbmplY3Rpb25Qb2ludC5QUk9WSURFUl9UWVBFKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAdGVtcGxhdGUgVFxuICAgICAqIEBwYXJhbSB7bmV3KCkgPT4gVH0gY2xhc3NSZWZlcmVuY2UgXG4gICAgICogQHJldHVybnMge1Byb3ZpZGVyPFQ+fVxuICAgICAqL1xuICAgIHN0YXRpYyBwcm92aWRlcihjbGFzc1JlZmVyZW5jZSkge1xuICAgICAgICByZXR1cm4gbmV3IEluamVjdGlvblBvaW50KGNsYXNzUmVmZXJlbmNlLm5hbWUsIGNsYXNzUmVmZXJlbmNlLCBJbmplY3Rpb25Qb2ludC5QUk9WSURFUl9UWVBFKTtcbiAgICB9XG5cbiAgICBjb25zdHJ1Y3RvcihuYW1lLCBjbGFzc1JlZmVyZW5jZSwgdHlwZSA9IEluamVjdGlvblBvaW50LklOU1RBTkNFX1RZUEUsIHBhcmFtZXRlcnMgPSBudWxsKSB7XG4gICAgICAgIHRoaXMubmFtZSA9IG5hbWU7XG4gICAgICAgIHRoaXMuY2xhc3NSZWZlcmVuY2UgPSBjbGFzc1JlZmVyZW5jZTtcbiAgICAgICAgdGhpcy50eXBlID0gdHlwZTtcbiAgICAgICAgdGhpcy5wYXJhbWV0ZXJzID0gcGFyYW1ldGVycztcbiAgICB9XG5cbn0iLCJpbXBvcnQgeyBMb2dnZXIsIEFycmF5VXRpbHMgfSBmcm9tIFwiY29yZXV0aWxfdjFcIjtcbmltcG9ydCB7IENvbmZpZ0FjY2Vzc29yIH0gZnJvbSBcIi4uL2NvbmZpZ0FjY2Vzc29yLmpzXCI7XG5pbXBvcnQgeyBDb25maWcgfSBmcm9tIFwiLi4vY29uZmlnLmpzXCI7XG5pbXBvcnQgeyBUeXBlQ29uZmlnIH0gZnJvbSBcIi4uL3R5cGVDb25maWcvdHlwZUNvbmZpZy5qc1wiO1xuaW1wb3J0IHsgSW5zdGFuY2VIb2xkZXIgfSBmcm9tIFwiLi4vdHlwZUNvbmZpZy9pbnN0YW5jZUhvbGRlci5qc1wiO1xuXG5jb25zdCBMT0cgPSBuZXcgTG9nZ2VyKFwiSW5zdGFuY2VQcm9jZXNzb3JFeGVjdXRvclwiKTtcblxuLyoqXG4gKiBFeGVjdXRlcyB0aGUgY29uZmlncyBpbnN0YW5jZSBwcm9jZXNzb3JzIG9uIHRoZSBwcm92aWRlZCBpbnN0YW5jZVxuICogUmV0dXJucyBhIHByb21pc2UgZm9yIHdoZW4gdGhlIGluc3RhbmNlIHByb2Nlc3NvcnMgaGFzIGNvbXBsZXRlZCBydW5uaW5nXG4gKiBcbiAqIEluc3RhbmNlIHByb2Nlc3NvcnMgcGVyZm9ybSBvcGVyYXRpb25zIG9uIG1hbmFnZWQgaW5zdGFuY2VzIGFmdGVyIHRoZXkgaGF2ZSBiZWVuIGluc3RhbnNpYXRlZFxuICovXG5leHBvcnQgY2xhc3MgSW5zdGFuY2VQcm9jZXNzb3JFeGVjdXRvciB7XG5cbiAgICAvKipcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gaW5zdGFuY2UgdGhlIGluc3RhbmNlIHRvIHByb2Nlc3NcbiAgICAgKiBAcGFyYW0ge0NvbmZpZ30gY29uZmlnXG4gICAgICogQHJldHVybnMge1Byb21pc2V9XG4gICAgICovXG4gICAgc3RhdGljIGV4ZWN1dGUoaW5zdGFuY2UsIGNvbmZpZykge1xuICAgICAgICByZXR1cm4gQXJyYXlVdGlscy5wcm9taXNlQ2hhaW4oY29uZmlnLmluc3RhbmNlUHJvY2Vzc29ycywgKHByb2Nlc3Nvck5hbWUpID0+IHtcbiAgICAgICAgICAgIC8qKiBAdHlwZSB7VHlwZUNvbmZpZ30gKi9cbiAgICAgICAgICAgIGNvbnN0IHR5cGVDb25maWcgPSBDb25maWdBY2Nlc3Nvci50eXBlQ29uZmlnQnlOYW1lKHByb2Nlc3Nvck5hbWUsIGNvbmZpZyk7XG5cbiAgICAgICAgICAgIC8qKiBAdHlwZSB7SW5zdGFuY2VIb2xkZXJ9ICovXG4gICAgICAgICAgICBjb25zdCBwcm9jZXNzb3JIb2xkZXIgPSB0eXBlQ29uZmlnLmluc3RhbmNlSG9sZGVyKCk7XG5cbiAgICAgICAgICAgIHJldHVybiBwcm9jZXNzb3JIb2xkZXIuaW5zdGFuY2UucHJvY2VzcyhpbnN0YW5jZSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxufSIsImltcG9ydCB7IFByb3ZpZGVyIH0gZnJvbSBcIi4vYXBpL3Byb3ZpZGVyLmpzXCI7XG5pbXBvcnQgeyBUeXBlQ29uZmlnIH0gZnJvbSBcIi4vdHlwZUNvbmZpZy90eXBlQ29uZmlnLmpzXCI7XG5pbXBvcnQgeyBJbnN0YW5jZUhvbGRlciB9IGZyb20gXCIuL3R5cGVDb25maWcvaW5zdGFuY2VIb2xkZXIuanNcIjtcbmltcG9ydCB7IEluamVjdG9yIH0gZnJvbSBcIi4vaW5qZWN0b3IuanNcIjtcbmltcG9ydCB7IENvbmZpZyB9IGZyb20gXCIuL2NvbmZpZy5qc1wiO1xuXG4vKipcbiAqIEB0ZW1wbGF0ZSBUXG4gKi9cbmV4cG9ydCBjbGFzcyBNaW5kaVByb3ZpZGVyIGV4dGVuZHMgUHJvdmlkZXIge1xuXG4gICAgLyoqXG4gICAgICogXG4gICAgICogQHBhcmFtIHtUeXBlQ29uZmlnfSB0eXBlQ29uZmlnIFxuICAgICAqIEBwYXJhbSB7SW5qZWN0b3J9IGluamVjdG9yXG4gICAgICogQHBhcmFtIHtDb25maWd9IGNvbmZpZ1xuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKHR5cGVDb25maWcsIGluamVjdG9yLCBjb25maWcpIHtcblxuICAgICAgICBzdXBlcigpO1xuXG4gICAgICAgIC8qKiBAdHlwZSB7VHlwZUNvbmZpZ30gKi9cbiAgICAgICAgdGhpcy50eXBlQ29uZmlnID0gdHlwZUNvbmZpZztcblxuICAgICAgICAvKiogQHR5cGUge0luamVjdG9yfSAqL1xuICAgICAgICB0aGlzLmluamVjdG9yID0gaW5qZWN0b3I7XG5cbiAgICAgICAgLyoqIEB0eXBlIHtDb25maWd9ICovXG4gICAgICAgIHRoaXMuY29uZmlnID0gY29uZmlnO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7QXJyYXl9IHBhcmFtZXRlcnMgXG4gICAgICogQHJldHVybnMge1Byb21pc2U8VD59XG4gICAgICovXG4gICAgZ2V0KHBhcmFtZXRlcnMgPSBbXSkge1xuXG4gICAgICAgIC8qKiBAdHlwZSB7SW5zdGFuY2VIb2xkZXJ9ICovXG4gICAgICAgIGNvbnN0IGluc3RhbmNlSG9sZGVyID0gdGhpcy50eXBlQ29uZmlnLmluc3RhbmNlSG9sZGVyKHBhcmFtZXRlcnMpO1xuXG4gICAgICAgIGlmIChpbnN0YW5jZUhvbGRlci50eXBlID09PSBJbnN0YW5jZUhvbGRlci5ORVdfSU5TVEFOQ0UpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmluamVjdG9yLmluamVjdFRhcmdldChpbnN0YW5jZUhvbGRlci5pbnN0YW5jZSwgdGhpcy5jb25maWcpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoaW5zdGFuY2VIb2xkZXIuaW5zdGFuY2UpO1xuICAgIH1cblxufSIsImltcG9ydCB7IEFycmF5VXRpbHMsIExvZ2dlciB9IGZyb20gXCJjb3JldXRpbF92MVwiO1xuaW1wb3J0IHsgQ29uZmlnIH0gZnJvbSBcIi4vY29uZmlnLmpzXCI7XG5pbXBvcnQgeyBDb25maWdBY2Nlc3NvciB9IGZyb20gXCIuL2NvbmZpZ0FjY2Vzc29yLmpzXCI7XG5pbXBvcnQgeyBJbmplY3Rpb25Qb2ludCB9IGZyb20gXCIuL2FwaS9pbmplY3Rpb25Qb2ludC5qc1wiXG5pbXBvcnQgeyBJbnN0YW5jZVByb2Nlc3NvckV4ZWN1dG9yIH0gZnJvbSBcIi4vaW5zdGFuY2VQcm9jZXNzb3IvaW5zdGFuY2VQcm9jZXNzb3JFeGVjdXRvci5qc1wiO1xuaW1wb3J0IHsgSW5zdGFuY2VIb2xkZXIgfSBmcm9tIFwiLi90eXBlQ29uZmlnL2luc3RhbmNlSG9sZGVyLmpzXCI7XG5pbXBvcnQgeyBNaW5kaVByb3ZpZGVyIH0gZnJvbSBcIi4vbWluZGlQcm92aWRlci5qc1wiO1xuaW1wb3J0IHsgSW5qZWN0b3IgfSBmcm9tIFwiLi9pbmplY3Rvci5qc1wiO1xuaW1wb3J0IHsgVHlwZUNvbmZpZyB9IGZyb20gXCIuL3R5cGVDb25maWcvdHlwZUNvbmZpZy5qc1wiO1xuXG5jb25zdCBMT0cgPSBuZXcgTG9nZ2VyKFwiTWluZGlJbmplY3RvclwiKTtcblxuZXhwb3J0IGNsYXNzIE1pbmRpSW5qZWN0b3IgZXh0ZW5kcyBJbmplY3RvciB7XG5cbiAgICBzdGF0aWMgaW5qZWN0KHRhcmdldCwgY29uZmlnKSB7XG4gICAgICAgIHJldHVybiBJTkpFQ1RPUi5pbmplY3RUYXJnZXQodGFyZ2V0LCBjb25maWcpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEByZXR1cm5zIHtNaW5kaUluamVjdG9yfVxuICAgICAqL1xuICAgIHN0YXRpYyBnZXRJbnN0YW5jZSgpIHtcbiAgICAgICAgcmV0dXJuIElOSkVDVE9SO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEhlbHBlciBtZXRob2QgZm9yIGluamVjdGluZyBmaWVsZHMgaW4gdGFyZ2V0IG9iamVjdFxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7YW55fSB0YXJnZXRPYmplY3QgXG4gICAgICogQHBhcmFtIHtDb25maWd9IGNvbmZpZyBcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gZGVwdGhcbiAgICAgKiBAcmV0dXJucyB7UHJvbWlzZX1cbiAgICAgKi9cbiAgICBhc3luYyBpbmplY3RUYXJnZXQodGFyZ2V0T2JqZWN0LCBjb25maWcsIGRlcHRoID0gMCkge1xuICAgICAgICBpZiAoIXRhcmdldE9iamVjdCkge1xuICAgICAgICAgICAgdGhyb3cgRXJyb3IoXCJNaXNzaW5nIHRhcmdldCBvYmplY3RcIik7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFjb25maWcpIHtcbiAgICAgICAgICAgIHRocm93IEVycm9yKFwiTWlzc2luZyBjb25maWdcIik7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFjb25maWcuaXNGaW5hbGl6ZWQoKSkge1xuICAgICAgICAgICAgdGhyb3cgRXJyb3IoXCJDb25maWcgbm90IGZpbmFsaXplZFwiKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZGVwdGggPiAxMCkge1xuICAgICAgICAgICAgdGhyb3cgRXJyb3IoXCJJbmplY3Rpb24gc3RydWN0dXJlIHRvbyBkZWVwXCIpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGluamVjdG9yID0gdGhpcztcblxuICAgICAgICBhd2FpdCBBcnJheVV0aWxzLnByb21pc2VDaGFpbihPYmplY3Qua2V5cyh0YXJnZXRPYmplY3QpLCAoZmllbGROYW1lKSA9PiB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIE1pbmRpSW5qZWN0b3IuaW5qZWN0UHJvcGVydHkodGFyZ2V0T2JqZWN0LCBmaWVsZE5hbWUsIGNvbmZpZywgZGVwdGgsIGluamVjdG9yKTtcbiAgICAgICAgfSk7XG4gICAgICAgIGF3YWl0IEluc3RhbmNlUHJvY2Vzc29yRXhlY3V0b3IuZXhlY3V0ZSh0YXJnZXRPYmplY3QsIGNvbmZpZyk7XG4gICAgICAgIHJldHVybiB0YXJnZXRPYmplY3Q7XG5cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gdGFyZ2V0T2JqZWN0IFxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBmaWVsZE5hbWUgXG4gICAgICogQHBhcmFtIHtDb25maWd9IGNvbmZpZyBcbiAgICAgKiBAcGFyYW0ge051bWJlcn0gZGVwdGggXG4gICAgICogQHBhcmFtIHtJbmplY3Rvcn0gaW5qZWN0b3JcbiAgICAgKiBAcmV0dXJucyB7UHJvbWlzZX1cbiAgICAgKi9cbiAgICBzdGF0aWMgaW5qZWN0UHJvcGVydHkodGFyZ2V0T2JqZWN0LCBmaWVsZE5hbWUsIGNvbmZpZywgZGVwdGgsIGluamVjdG9yKSB7XG4gICAgICAgIGNvbnN0IGluamVjdGlvblBvaW50ID0gdGFyZ2V0T2JqZWN0W2ZpZWxkTmFtZV07ICAgICAgICBcbiAgICAgICAgaWYoIShpbmplY3Rpb25Qb2ludCBpbnN0YW5jZW9mIEluamVjdGlvblBvaW50KSkge1xuICAgICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChpbmplY3Rpb25Qb2ludC50eXBlID09PSBJbmplY3Rpb25Qb2ludC5QUk9WSURFUl9UWVBFKSB7XG4gICAgICAgICAgICBNaW5kaUluamVjdG9yLmluamVjdFByb3BlcnR5UHJvdmlkZXIodGFyZ2V0T2JqZWN0LCBmaWVsZE5hbWUsIGNvbmZpZywgaW5qZWN0b3IpO1xuICAgICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBNaW5kaUluamVjdG9yLmluamVjdFByb3BlcnR5SW5zdGFuY2UodGFyZ2V0T2JqZWN0LCBmaWVsZE5hbWUsIGNvbmZpZywgZGVwdGgsIGluamVjdG9yKTtcbiAgICAgICAgXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHRhcmdldE9iamVjdCBcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmllbGROYW1lIFxuICAgICAqIEBwYXJhbSB7Q29uZmlnfSBjb25maWcgXG4gICAgICogQHBhcmFtIHtJbmplY3Rvcn0gaW5qZWN0b3JcbiAgICAgKi9cbiAgICBzdGF0aWMgaW5qZWN0UHJvcGVydHlQcm92aWRlcih0YXJnZXRPYmplY3QsIGZpZWxkTmFtZSwgY29uZmlnLCBpbmplY3Rvcikge1xuICAgICAgICAvKipcbiAgICAgICAgICogQHR5cGUge0luamVjdGlvblBvaW50fVxuICAgICAgICAgKi9cbiAgICAgICAgY29uc3QgaW5qZWN0aW9uUG9pbnQgPSB0YXJnZXRPYmplY3RbZmllbGROYW1lXTtcblxuICAgICAgICAvKiogQHR5cGUge1R5cGVDb25maWd9ICovXG4gICAgICAgIGNvbnN0IHR5cGVDb25maWcgPSBNaW5kaUluamVjdG9yLmdldFR5cGVDb25maWcoaW5qZWN0aW9uUG9pbnQubmFtZSwgaW5qZWN0aW9uUG9pbnQuY2xhc3NSZWZlcmVuY2UsIGNvbmZpZyk7XG5cbiAgICAgICAgaWYgKCF0eXBlQ29uZmlnKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB0YXJnZXRPYmplY3RbZmllbGROYW1lXSA9IG5ldyBNaW5kaVByb3ZpZGVyKHR5cGVDb25maWcsIGluamVjdG9yLCBjb25maWcpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSB0YXJnZXRPYmplY3QgXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpZWxkTmFtZSBcbiAgICAgKiBAcGFyYW0ge0NvbmZpZ30gY29uZmlnIFxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBkZXB0aCBcbiAgICAgKiBAcGFyYW0ge0luamVjdG9yfSBpbmplY3RvclxuICAgICAqIEByZXR1cm5zIHtQcm9taXNlfVxuICAgICAqL1xuICAgIHN0YXRpYyBpbmplY3RQcm9wZXJ0eUluc3RhbmNlKHRhcmdldE9iamVjdCwgZmllbGROYW1lLCBjb25maWcsIGRlcHRoLCBpbmplY3Rvcikge1xuICAgICAgICBsZXQgaW5qZWN0UHJvbWlzZSA9IFByb21pc2UucmVzb2x2ZSgpO1xuICAgICAgICAvKiogQHR5cGUge0luamVjdGlvblBvaW50fSAqL1xuICAgICAgICBjb25zdCBpbmplY3Rpb25Qb2ludCA9IHRhcmdldE9iamVjdFtmaWVsZE5hbWVdO1xuXG4gICAgICAgIC8qKiBAdHlwZSB7VHlwZUNvbmZpZ30gKi9cbiAgICAgICAgY29uc3QgdHlwZUNvbmZpZyA9IE1pbmRpSW5qZWN0b3IuZ2V0VHlwZUNvbmZpZyhpbmplY3Rpb25Qb2ludC5uYW1lLCBpbmplY3Rpb25Qb2ludC5jbGFzc1JlZmVyZW5jZSwgY29uZmlnKTtcblxuXG4gICAgICAgIGlmICghdHlwZUNvbmZpZykge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLyoqIEB0eXBlIHtJbnN0YW5jZUhvbGRlcn0gKi9cbiAgICAgICAgY29uc3QgaW5zdGFuY2VIb2xkZXIgPSB0eXBlQ29uZmlnLmluc3RhbmNlSG9sZGVyKGluamVjdGlvblBvaW50LnBhcmFtZXRlcnMpO1xuXG4gICAgICAgIGlmIChpbnN0YW5jZUhvbGRlci50eXBlID09PSBJbnN0YW5jZUhvbGRlci5ORVdfSU5TVEFOQ0UpIHtcbiAgICAgICAgICAgIGluamVjdFByb21pc2UgPSBpbmplY3Rvci5pbmplY3RUYXJnZXQoaW5zdGFuY2VIb2xkZXIuaW5zdGFuY2UsIGNvbmZpZywgZGVwdGgrKyk7XG4gICAgICAgIH1cbiAgICAgICAgdGFyZ2V0T2JqZWN0W2ZpZWxkTmFtZV0gPSBpbnN0YW5jZUhvbGRlci5pbnN0YW5jZTtcbiAgICAgICAgcmV0dXJuIGluamVjdFByb21pc2U7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG5hbWUgXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHR5cGUgXG4gICAgICogQHBhcmFtIHtDb25maWd9IGNvbmZpZyBcbiAgICAgKiBAcmV0dXJucyB7VHlwZUNvbmZpZ31cbiAgICAgKi9cbiAgICBzdGF0aWMgZ2V0VHlwZUNvbmZpZyhuYW1lLCBjbGFzc1JlZmVyZW5jZSwgY29uZmlnKSB7XG4gICAgICAgIGNvbnN0IHR5cGVDb25maWcgPSBDb25maWdBY2Nlc3Nvci50eXBlQ29uZmlnQnlOYW1lKG5hbWUsIGNvbmZpZyk7XG4gICAgICAgIGlmICh0eXBlQ29uZmlnKSB7XG4gICAgICAgICAgICByZXR1cm4gdHlwZUNvbmZpZztcbiAgICAgICAgfVxuICAgICAgICBMT0cuZXJyb3IoYE5vIHR5cGUgY29uZmlnIGZvdW5kIGZvciAke25hbWV9IGFuZCBjbGFzc1JlZmVyZW5jZSBkb2VzIG5vdCBleHRlbmQgQXV0b0NvbmZpZ2ApO1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbn1cblxuY29uc3QgSU5KRUNUT1IgPSBuZXcgTWluZGlJbmplY3RvcigpOyIsImV4cG9ydCBjbGFzcyBJbnN0YW5jZVByb2Nlc3NvciB7XG5cbiAgICAvKipcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gaW5zdGFuY2UgXG4gICAgICogQHJldHVybiB7UHJvbWlzZX1cbiAgICAgKi9cbiAgICBwcm9jZXNzKGluc3RhbmNlKSB7XG4gICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKTtcbiAgICB9XG5cbn0iLCJpbXBvcnQgeyBNYXAgfSBmcm9tIFwiY29yZXV0aWxfdjFcIjtcbmltcG9ydCB7IENvbmZpZyB9IGZyb20gXCIuLi9jb25maWcuanNcIjtcbmltcG9ydCB7IFR5cGVDb25maWcgfSBmcm9tIFwiLi4vdHlwZUNvbmZpZy90eXBlQ29uZmlnLmpzXCI7XG5cbmV4cG9ydCBjbGFzcyBDb25maWdQcm9jZXNzb3Ige1xuXG4gICAgLyoqXG4gICAgICogXG4gICAgICogQHBhcmFtIHtDb25maWd9IGNvbmZpZyBcbiAgICAgKiBAcGFyYW0ge01hcDxUeXBlQ29uZmlnPn0gY29uZmlnRW50cmllc01hcCBcbiAgICAgKi9cbiAgICBwcm9jZXNzQ29uZmlnKGNvbmZpZywgY29uZmlnRW50cmllc01hcCkge1xuICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG4gICAgfVxuXG59IiwiaW1wb3J0IHsgQXJyYXlVdGlscywgTG9nZ2VyLCBNYXBVdGlscyB9IGZyb20gXCJjb3JldXRpbF92MVwiO1xuaW1wb3J0IHsgVHlwZUNvbmZpZyB9IGZyb20gXCIuL3R5cGVDb25maWcvdHlwZUNvbmZpZy5qc1wiO1xuaW1wb3J0IHsgQ29uZmlnUHJvY2Vzc29yRXhlY3V0b3IgfSBmcm9tIFwiLi9jb25maWdQcm9jZXNzb3IvY29uZmlnUHJvY2Vzc29yRXhlY3V0b3IuanNcIjtcbmltcG9ydCB7IFNpbmdsZXRvbkNvbmZpZyB9IGZyb20gXCIuL3R5cGVDb25maWcvc2luZ2xldG9uQ29uZmlnLmpzXCI7XG5pbXBvcnQgeyBDb25maWcgfSBmcm9tIFwiLi9jb25maWcuanNcIjtcbmltcG9ydCB7IE1pbmRpSW5qZWN0b3IgfSBmcm9tIFwiLi9taW5kaUluamVjdG9yLmpzXCI7XG5pbXBvcnQgeyBJbnN0YW5jZVByb2Nlc3NvciB9IGZyb20gXCIuL2luc3RhbmNlUHJvY2Vzc29yL2luc3RhbmNlUHJvY2Vzc29yLmpzXCI7XG5pbXBvcnQgeyBDb25maWdQcm9jZXNzb3IgfSBmcm9tIFwiLi9jb25maWdQcm9jZXNzb3IvY29uZmlnUHJvY2Vzc29yLmpzXCI7XG5cbmNvbnN0IExPRyA9IG5ldyBMb2dnZXIoXCJDb25maWdcIik7XG5cbmV4cG9ydCBjbGFzcyBNaW5kaUNvbmZpZyBleHRlbmRzIENvbmZpZyB7XG5cbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgc3VwZXIoKTtcblxuICAgICAgICAvKiogQHR5cGUge0Jvb2xlYW59ICovXG4gICAgICAgIHRoaXMuZmluYWxpemVkID0gZmFsc2U7XG5cbiAgICAgICAgLyoqIEB0eXBlIHtNYXA8VHlwZUNvbmZpZz59ICovXG4gICAgICAgIHRoaXMuY29uZmlnRW50cmllcyA9IG5ldyBNYXAoKTtcblxuICAgICAgICAvKiogQHR5cGUge0FycmF5fSAqL1xuICAgICAgICB0aGlzLmNvbmZpZ1Byb2Nlc3NvcnMgPSBuZXcgQXJyYXkoKTtcblxuICAgICAgICAvKiogQHR5cGUge0FycmF5fSAqL1xuICAgICAgICB0aGlzLmluc3RhbmNlUHJvY2Vzc29ycyA9IG5ldyBBcnJheSgpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7Q29uZmlnfSBjb25maWdcbiAgICAgKiBAcmV0dXJucyB7TWluZGlDb25maWd9XG4gICAgICovXG4gICAgbWVyZ2UoY29uZmlnKSB7XG4gICAgICAgIHRoaXMuZmluYWxpemVkID0gdHJ1ZTtcblxuICAgICAgICB0aGlzLmNvbmZpZ0VudHJpZXMgPSBNYXBVdGlsc1xuICAgICAgICAgICAgLm1lcmdlKHRoaXMuY29uZmlnRW50cmllcywgY29uZmlnLmNvbmZpZ0VudHJpZXMpO1xuICAgICAgICB0aGlzLmNvbmZpZ1Byb2Nlc3NvcnMgPSBBcnJheVV0aWxzXG4gICAgICAgICAgICAubWVyZ2UodGhpcy5jb25maWdQcm9jZXNzb3JzLCBjb25maWcuY29uZmlnUHJvY2Vzc29ycyk7XG4gICAgICAgIHRoaXMuaW5zdGFuY2VQcm9jZXNzb3JzID0gQXJyYXlVdGlsc1xuICAgICAgICAgICAgLm1lcmdlKHRoaXMuaW5zdGFuY2VQcm9jZXNzb3JzLCBjb25maWcuaW5zdGFuY2VQcm9jZXNzb3JzKTtcblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge1R5cGVDb25maWd9IHR5cGVDb25maWdcbiAgICAgKiBAcmV0dXJucyB7TWluZGlDb25maWd9XG4gICAgICovXG4gICAgYWRkVHlwZUNvbmZpZyh0eXBlQ29uZmlnKSB7XG4gICAgICAgIHRoaXMuZmluYWxpemVkID0gZmFsc2U7XG4gICAgICAgIHRoaXMuY29uZmlnRW50cmllcy5zZXQodHlwZUNvbmZpZy5uYW1lLCB0eXBlQ29uZmlnKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogXG4gICAgICogQHBhcmFtIHtDb25maWdQcm9jZXNzb3J9IGNvbmZpZ1Byb2Nlc3NvclxuICAgICAqIEByZXR1cm5zIHtNaW5kaUNvbmZpZ31cbiAgICAgKi9cbiAgICBhZGRDb25maWdQcm9jZXNzb3IoY29uZmlnUHJvY2Vzc29yKSB7XG4gICAgICAgIHRoaXMuY29uZmlnUHJvY2Vzc29ycyA9IEFycmF5VXRpbHMuYWRkKHRoaXMuY29uZmlnUHJvY2Vzc29ycywgY29uZmlnUHJvY2Vzc29yLm5hbWUpO1xuICAgICAgICByZXR1cm4gdGhpcy5hZGRUeXBlQ29uZmlnKFNpbmdsZXRvbkNvbmZpZy51bm5hbWVkKGNvbmZpZ1Byb2Nlc3NvcikpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7SW5zdGFuY2VQcm9jZXNzb3J9IGluc3RhbmNlUHJvY2Vzc29yXG4gICAgICogQHJldHVybnMge01pbmRpQ29uZmlnfVxuICAgICAqL1xuICAgIGFkZEluc3RhbmNlUHJvY2Vzc29yKGluc3RhbmNlUHJvY2Vzc29yKSB7XG4gICAgICAgIHRoaXMuaW5zdGFuY2VQcm9jZXNzb3JzID0gQXJyYXlVdGlscy5hZGQodGhpcy5pbnN0YW5jZVByb2Nlc3NvcnMsIGluc3RhbmNlUHJvY2Vzc29yLm5hbWUpO1xuICAgICAgICByZXR1cm4gdGhpcy5hZGRUeXBlQ29uZmlnKFNpbmdsZXRvbkNvbmZpZy51bm5hbWVkKGluc3RhbmNlUHJvY2Vzc29yKSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogXG4gICAgICogQHBhcmFtIHtBcnJheTxUeXBlQ29uZmlnPn0gdHlwZUNvbmZpZ0FycmF5XG4gICAgICogQHJldHVybiB7TWluZGlDb25maWd9XG4gICAgICovXG4gICAgYWRkQWxsVHlwZUNvbmZpZyh0eXBlQ29uZmlnQXJyYXkpIHtcbiAgICAgICAgdGhpcy5maW5hbGl6ZWQgPSBmYWxzZTtcbiAgICAgICAgdHlwZUNvbmZpZ0FycmF5LmZvckVhY2goKHR5cGVDb25maWcpID0+IHtcbiAgICAgICAgICAgIHRoaXMuY29uZmlnRW50cmllcy5zZXQodHlwZUNvbmZpZy5uYW1lLCB0eXBlQ29uZmlnKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7QXJyYXk8bmV3KCkgPT4gQ29uZmlnUHJvY2Vzc29yPn0gY29uZmlnUHJvY2Vzc29yQXJyYXlcbiAgICAgKiBAcmV0dXJuIHtNaW5kaUNvbmZpZ31cbiAgICAgKi9cbiAgICBhZGRBbGxDb25maWdQcm9jZXNzb3IoY29uZmlnUHJvY2Vzc29yQXJyYXkpIHtcbiAgICAgICAgY29uZmlnUHJvY2Vzc29yQXJyYXkuZm9yRWFjaCgoY29uZmlnUHJvY2Vzc29yKSA9PiB7XG4gICAgICAgICAgICB0aGlzLmNvbmZpZ1Byb2Nlc3NvcnMgPSBBcnJheVV0aWxzLmFkZCh0aGlzLmNvbmZpZ1Byb2Nlc3NvcnMsIGNvbmZpZ1Byb2Nlc3Nvci5uYW1lKTtcbiAgICAgICAgICAgIHRoaXMuYWRkVHlwZUNvbmZpZyhTaW5nbGV0b25Db25maWcudW5uYW1lZChjb25maWdQcm9jZXNzb3IpKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7QXJyYXk8bmV3KCkgPT4gSW5zdGFuY2VQcm9jZXNzb3I+fSBpbnN0YW5jZVByb2Nlc3NvckFycmF5IFxuICAgICAqIEByZXR1cm4ge01pbmRpQ29uZmlnfVxuICAgICAqL1xuICAgIGFkZEFsbEluc3RhbmNlUHJvY2Vzc29yKGluc3RhbmNlUHJvY2Vzc29yQXJyYXkpIHtcbiAgICAgICAgaW5zdGFuY2VQcm9jZXNzb3JBcnJheS5mb3JFYWNoKChpbnN0YW5jZVByb2Nlc3NvcikgPT4ge1xuICAgICAgICAgICAgdGhpcy5pbnN0YW5jZVByb2Nlc3NvcnMgPSBBcnJheVV0aWxzLmFkZCh0aGlzLmluc3RhbmNlUHJvY2Vzc29ycywgaW5zdGFuY2VQcm9jZXNzb3IubmFtZSk7XG4gICAgICAgICAgICB0aGlzLmFkZFR5cGVDb25maWcoU2luZ2xldG9uQ29uZmlnLnVubmFtZWQoaW5zdGFuY2VQcm9jZXNzb3IpKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgICAqL1xuICAgIGlzRmluYWxpemVkKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5maW5hbGl6ZWQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQHJldHVybnMge1Byb21pc2V9XG4gICAgICovXG4gICAgZmluYWxpemUoKSB7XG4gICAgICAgIHRoaXMuZmluYWxpemVkID0gdHJ1ZTtcbiAgICAgICAgcmV0dXJuIENvbmZpZ1Byb2Nlc3NvckV4ZWN1dG9yLmV4ZWN1dGUodGhpcy5jb25maWdQcm9jZXNzb3JzLCBNaW5kaUluamVjdG9yLmdldEluc3RhbmNlKCksIHRoaXMpO1xuICAgIH1cblxufSIsImltcG9ydCB7IExvZ2dlciB9IGZyb20gXCJjb3JldXRpbF92MVwiO1xuaW1wb3J0IHsgSW5zdGFuY2VQcm9jZXNzb3IgfSBmcm9tIFwiLi9pbnN0YW5jZVByb2Nlc3Nvci5qc1wiO1xuXG5jb25zdCBMT0cgPSBuZXcgTG9nZ2VyKFwiSW5zdGFuY2VQb3N0Q29uZmlnVHJpZ2dlclwiKTtcblxuLyoqXG4gKiBJbnN0YW5jZSBwcm9jZXNzb3Igd2hpY2ggY2FsbHMgcG9zdENvbmZpZyBvbiBvYmplY3RzIGFmdGVyIGNvbmZpZ1Byb2Nlc3NvcnMgYXJlIGZpbmlzaGVkXG4gKi9cbmV4cG9ydCBjbGFzcyBJbnN0YW5jZVBvc3RDb25maWdUcmlnZ2VyIGV4dGVuZHMgSW5zdGFuY2VQcm9jZXNzb3Ige1xuXG4gICAgLyoqXG4gICAgICogXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGluc3RhbmNlIFxuICAgICAqIEByZXR1cm4ge1Byb21pc2V9XG4gICAgICovXG4gICAgcHJvY2VzcyhpbnN0YW5jZSkge1xuICAgICAgICBsZXQgcmVzcG9uc2UgPSBudWxsO1xuICAgICAgICBpZihpbnN0YW5jZS5wb3N0Q29uZmlnKSB7XG4gICAgICAgICAgICByZXNwb25zZSA9IGluc3RhbmNlLnBvc3RDb25maWcoKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIXJlc3BvbnNlKSB7XG4gICAgICAgICAgICByZXNwb25zZSA9IG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCkgPT4geyByZXNvbHZlKCk7IH0pO1xuICAgICAgICB9XG4gICAgICAgIGlmICghcmVzcG9uc2UgaW5zdGFuY2VvZiBQcm9taXNlKSB7XG4gICAgICAgICAgICB0aHJvdyBcInBvc3RDb25maWcoKSBtdXN0IHJldHVybiBlaXRoZXIgdW5kZWZpbmVkIG9yIG51bGwgb3IgYSBQcm9taXNlXCJcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzcG9uc2U7XG4gICAgfVxuXG59IiwiaW1wb3J0IHsgVHlwZUNvbmZpZyB9IGZyb20gXCIuL3R5cGVDb25maWcuanNcIjtcblxuZXhwb3J0IGNsYXNzIFBvb2xDb25maWcgZXh0ZW5kcyBUeXBlQ29uZmlnIHtcblxuICAgIHN0YXRpYyBuYW1lZChuYW1lLCBjbGFzc1JlZmVyZW5jZSwgcG9vbFNpemUpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBQb29sQ29uZmlnKG5hbWUsIGNsYXNzUmVmZXJlbmNlLCBwb29sU2l6ZSk7XG4gICAgfVxuXG4gICAgc3RhdGljIHVubmFtZWQoY2xhc3NSZWZlcmVuY2UsIHBvb2xTaXplKSB7XG4gICAgICAgIHJldHVybiBuZXcgUG9vbENvbmZpZyhjbGFzc1JlZmVyZW5jZS5uYW1lLCBjbGFzc1JlZmVyZW5jZSwgcG9vbFNpemUpO1xuICAgIH1cblxuICAgIGNvbnN0cnVjdG9yKG5hbWUsIGNsYXNzUmVmZXJlbmNlLCBwb29sU2l6ZSkge1xuICAgICAgICBzdXBlcihuYW1lLCBjbGFzc1JlZmVyZW5jZSk7XG4gICAgICAgIHRoaXMucG9vbFNpemUgPSBwb29sU2l6ZTtcbiAgICB9XG5cbiAgICBpbnN0YW5jZUhvbGRlcihwYXJhbWV0ZXJzID0gW10pIHtcblxuICAgIH1cblxufSIsImltcG9ydCB7IFR5cGVDb25maWcgfSBmcm9tIFwiLi90eXBlQ29uZmlnLmpzXCI7XG5pbXBvcnQgeyBJbnN0YW5jZUhvbGRlciB9IGZyb20gXCIuL2luc3RhbmNlSG9sZGVyLmpzXCI7XG5cbmV4cG9ydCBjbGFzcyBQcm90b3R5cGVDb25maWcgZXh0ZW5kcyBUeXBlQ29uZmlnIHtcblxuICAgIHN0YXRpYyBuYW1lZChuYW1lLCBjbGFzc1JlZmVyZW5jZSkge1xuICAgICAgICByZXR1cm4gbmV3IFByb3RvdHlwZUNvbmZpZyhuYW1lLCBjbGFzc1JlZmVyZW5jZSk7XG4gICAgfVxuXG4gICAgc3RhdGljIHVubmFtZWQoY2xhc3NSZWZlcmVuY2UpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm90b3R5cGVDb25maWcoY2xhc3NSZWZlcmVuY2UubmFtZSwgY2xhc3NSZWZlcmVuY2UpO1xuICAgIH1cblxuICAgIGNvbnN0cnVjdG9yKG5hbWUsIGNsYXNzUmVmZXJlbmNlKSB7XG4gICAgICAgIHN1cGVyKG5hbWUsIGNsYXNzUmVmZXJlbmNlKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAcGFyYW0ge2FycmF5fSBwYXJhbWV0ZXJzIHRoZSBwYXJhbWV0ZXJzIHRvIHVzZSBmb3IgdGhlIGNvbnN0cnVjdG9yXG4gICAgICovXG4gICAgaW5zdGFuY2VIb2xkZXIocGFyYW1ldGVycyA9IFtdKSB7XG4gICAgICAgIGxldCBpbnN0YW5jZSA9IG51bGw7XG4gICAgICAgIGlmKHBhcmFtZXRlcnMgJiYgcGFyYW1ldGVycy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBpbnN0YW5jZSA9IG5ldyB0aGlzLmNsYXNzUmVmZXJlbmNlKC4uLnBhcmFtZXRlcnMpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaW5zdGFuY2UgPSBuZXcgdGhpcy5jbGFzc1JlZmVyZW5jZSgpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBJbnN0YW5jZUhvbGRlci5ob2xkZXJXaXRoTmV3SW5zdGFuY2UoaW5zdGFuY2UpO1xuICAgIH1cblxuXG59IiwiaW1wb3J0IHsgVHlwZUNvbmZpZyB9IGZyb20gXCIuL3R5cGVDb25maWcuanNcIjtcblxuZXhwb3J0IGNsYXNzIFR5cGVDb25maWdQYWNrIHtcblxuICAgIHN0YXRpYyBfaW5zdGFuY2U7XG5cbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgLyoqIEB0eXBlIHtNYXA8U3RyaW5nLCBNYXA8U3RyaW5nLCBUeXBlQ29uZmlnPj59ICovXG4gICAgICAgIHRoaXMudHlwZUNvbmZpZ1BhY2tNYXAgPSBuZXcgTWFwKCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogXG4gICAgICogQHJldHVybnMge1R5cGVDb25maWdQYWNrfVxuICAgICAqL1xuICAgIHN0YXRpYyBpbnN0YW5jZSgpIHtcbiAgICAgICAgaWYgKCFUeXBlQ29uZmlnUGFjay5faW5zdGFuY2UpIHtcbiAgICAgICAgICAgIFR5cGVDb25maWdQYWNrLl9pbnN0YW5jZSA9IG5ldyBUeXBlQ29uZmlnUGFjaygpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBUeXBlQ29uZmlnUGFjay5faW5zdGFuY2U7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHBhY2tOYW1lIFxuICAgICAqIEBwYXJhbSB7VHlwZUNvbmZpZ30gdHlwZUNvbmZpZyBcbiAgICAgKi9cbiAgICBhZGRUeXBlQ29uZmlnKHBhY2tOYW1lLCB0eXBlQ29uZmlnKSB7XG4gICAgICAgIGlmICghdGhpcy50eXBlQ29uZmlnUGFja01hcC5oYXMocGFja05hbWUpKSB7XG4gICAgICAgICAgICB0aGlzLnR5cGVDb25maWdQYWNrTWFwLnNldChwYWNrTmFtZSwgbmV3IE1hcCgpKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIXRoaXMudHlwZUNvbmZpZ1BhY2tNYXAuZ2V0KHBhY2tOYW1lKS5oYXModHlwZUNvbmZpZy5uYW1lKSkge1xuICAgICAgICAgICAgdGhpcy50eXBlQ29uZmlnUGFja01hcC5nZXQocGFja05hbWUpLnNldCh0eXBlQ29uZmlnLm5hbWUsIHR5cGVDb25maWcpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHBhY2tOYW1lIFxuICAgICAqIEByZXR1cm5zIHtBcnJheTxUeXBlQ29uZmlnPn1cbiAgICAgKi9cbiAgICBnZXRDb25maWdBcnJheUJ5UGFja05hbWUocGFja05hbWUpIHsgXG4gICAgICAgIGlmICh0aGlzLnR5cGVDb25maWdQYWNrTWFwLmhhcyhwYWNrTmFtZSkpIHtcbiAgICAgICAgICAgIHJldHVybiBBcnJheS5mcm9tKHRoaXMudHlwZUNvbmZpZ1BhY2tNYXAuZ2V0KHBhY2tOYW1lKS52YWx1ZXMoKSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIFtdO1xuICAgIH1cblxufSJdLCJuYW1lcyI6WyJMb2dnZXIiLCJMT0ciLCJBcnJheVV0aWxzIiwiTWFwVXRpbHMiXSwibWFwcGluZ3MiOiI7Ozs7OztBQUFPLE1BQU0sTUFBTSxDQUFDO0FBQ3BCO0FBQ0EsSUFBSSxXQUFXLEdBQUc7QUFD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
