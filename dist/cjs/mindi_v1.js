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
        const configProcessorClassNameList = new coreutil_v1.List(configProcessorClassNameArray);
        return configProcessorClassNameList.promiseChain((configProcessorClassName, parent) => {
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
        const instanceProcessorList = new coreutil_v1.List(config.instanceProcessors);
        return instanceProcessorList.promiseChain((processorName, parent) => {
            /** @type {TypeConfig} */
            const typeConfig = ConfigAccessor.typeConfigByName(processorName, config);

            /** @type {InstanceHolder} */
            const processorHolder = typeConfig.instanceHolder();

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
        const objectFieldNames = new coreutil_v1.List(Object.keys(targetObject));

        await objectFieldNames.promiseChain((fieldName, parent) => {
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWluZGlfdjEuanMiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9taW5kaS9jb25maWcuanMiLCIuLi8uLi9zcmMvbWluZGkvdHlwZUNvbmZpZy9pbnN0YW5jZUhvbGRlci5qcyIsIi4uLy4uL3NyYy9taW5kaS90eXBlQ29uZmlnL3R5cGVDb25maWcuanMiLCIuLi8uLi9zcmMvbWluZGkvY29uZmlnQWNjZXNzb3IuanMiLCIuLi8uLi9zcmMvbWluZGkvaW5qZWN0b3IuanMiLCIuLi8uLi9zcmMvbWluZGkvY29uZmlnUHJvY2Vzc29yL2NvbmZpZ1Byb2Nlc3NvckV4ZWN1dG9yLmpzIiwiLi4vLi4vc3JjL21pbmRpL3R5cGVDb25maWcvc2luZ2xldG9uQ29uZmlnLmpzIiwiLi4vLi4vc3JjL21pbmRpL2FwaS9wcm92aWRlci5qcyIsIi4uLy4uL3NyYy9taW5kaS9hcGkvaW5qZWN0aW9uUG9pbnQuanMiLCIuLi8uLi9zcmMvbWluZGkvaW5zdGFuY2VQcm9jZXNzb3IvaW5zdGFuY2VQcm9jZXNzb3IuanMiLCIuLi8uLi9zcmMvbWluZGkvaW5zdGFuY2VQcm9jZXNzb3IvaW5zdGFuY2VQcm9jZXNzb3JFeGVjdXRvci5qcyIsIi4uLy4uL3NyYy9taW5kaS9taW5kaVByb3ZpZGVyLmpzIiwiLi4vLi4vc3JjL21pbmRpL21pbmRpSW5qZWN0b3IuanMiLCIuLi8uLi9zcmMvbWluZGkvY29uZmlnUHJvY2Vzc29yL2NvbmZpZ1Byb2Nlc3Nvci5qcyIsIi4uLy4uL3NyYy9taW5kaS9taW5kaUNvbmZpZy5qcyIsIi4uLy4uL3NyYy9taW5kaS9pbnN0YW5jZVByb2Nlc3Nvci9pbnN0YW5jZVBvc3RDb25maWdUcmlnZ2VyLmpzIiwiLi4vLi4vc3JjL21pbmRpL3R5cGVDb25maWcvcG9vbENvbmZpZy5qcyIsIi4uLy4uL3NyYy9taW5kaS90eXBlQ29uZmlnL3Byb3RvdHlwZUNvbmZpZy5qcyIsIi4uLy4uL3NyYy9taW5kaS90eXBlQ29uZmlnL3R5cGVDb25maWdQYWNrLmpzIl0sInNvdXJjZXNDb250ZW50IjpbImV4cG9ydCBjbGFzcyBDb25maWcge1xuXG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIC8qKiBAdHlwZSB7TWFwPGFueSxhbnk+fSAqL1xuICAgICAgICB0aGlzLmNvbmZpZ0VudHJpZXMgPSBudWxsO1xuXG4gICAgICAgIC8qKiBAdHlwZSB7QXJyYXk8YW55Pn0gKi9cbiAgICAgICAgdGhpcy5jb25maWdQcm9jZXNzb3JzID0gbnVsbDtcblxuICAgICAgICAvKiogQHR5cGUge0FycmF5PGFueT59ICovXG4gICAgICAgIHRoaXMuaW5zdGFuY2VQcm9jZXNzb3JzID0gbnVsbDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAcmV0dXJucyB7UHJvbWlzZX1cbiAgICAgKi9cbiAgICBmaW5hbGl6ZSgpIHtcblxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgICAqL1xuICAgIGlzRmluYWxpemVkKCkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxufSIsImV4cG9ydCBjbGFzcyBJbnN0YW5jZUhvbGRlciB7XG5cbiAgICBzdGF0aWMgZ2V0IE5FV19JTlNUQU5DRSgpIHsgcmV0dXJuIDA7IH1cblxuICAgIHN0YXRpYyBnZXQgRVhJU1RJTkdfSU5TVEFOQ0UoKSB7IHJldHVybiAxOyB9XG5cbiAgICBzdGF0aWMgaG9sZGVyV2l0aE5ld0luc3RhbmNlKGluc3RhbmNlKSB7XG4gICAgICAgIHJldHVybiBuZXcgSW5zdGFuY2VIb2xkZXIoaW5zdGFuY2UsIEluc3RhbmNlSG9sZGVyLk5FV19JTlNUQU5DRSk7XG4gICAgfVxuXG4gICAgc3RhdGljIGhvbGRlcldpdGhFeGlzdGluZ0luc3RhbmNlKGluc3RhbmNlKSB7XG4gICAgICAgIHJldHVybiBuZXcgSW5zdGFuY2VIb2xkZXIoaW5zdGFuY2UsIEluc3RhbmNlSG9sZGVyLkVYSVNUSU5HX0lOU1RBTkNFKTtcbiAgICB9XG5cbiAgICBjb25zdHJ1Y3RvcihpbnN0YW5jZSwgdHlwZSkge1xuICAgICAgICB0aGlzLmluc3RhbmNlID0gaW5zdGFuY2U7XG4gICAgICAgIHRoaXMudHlwZSA9IHR5cGU7XG4gICAgfVxuXG59IiwiaW1wb3J0IHsgSW5zdGFuY2VIb2xkZXIgfSBmcm9tIFwiLi9pbnN0YW5jZUhvbGRlci5qc1wiO1xuXG5leHBvcnQgY2xhc3MgVHlwZUNvbmZpZyB7XG5cbiAgICBzdGF0aWMgZ2V0IE5FVygpIHsgcmV0dXJuIFwiTkVXXCI7IH1cbiAgICBzdGF0aWMgZ2V0IENPTkZJR1VSRUQoKSB7IHJldHVybiBcIkNPTkZJR1VSRURcIjsgfVxuXG4gICAgY29uc3RydWN0b3IobmFtZSwgY2xhc3NSZWZlcmVuY2UpIHtcbiAgICAgICAgdGhpcy5uYW1lID0gbmFtZTtcbiAgICAgICAgdGhpcy5jbGFzc1JlZmVyZW5jZSA9IGNsYXNzUmVmZXJlbmNlO1xuICAgICAgICB0aGlzLnN0YWdlID0gVHlwZUNvbmZpZy5ORVc7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogXG4gICAgICogQHBhcmFtIHthcnJheX0gcGFyYW1ldGVycyBcbiAgICAgKiBAcmV0dXJucyB7SW5zdGFuY2VIb2xkZXJ9XG4gICAgICovXG4gICAgaW5zdGFuY2VIb2xkZXIocGFyYW1ldGVycyA9IFtdKSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxufSIsImltcG9ydCB7IENvbmZpZyB9IGZyb20gXCIuL2NvbmZpZy5qc1wiO1xuaW1wb3J0IHsgTG9nZ2VyIH0gZnJvbSBcImNvcmV1dGlsX3YxXCI7XG5pbXBvcnQgeyBUeXBlQ29uZmlnIH0gZnJvbSBcIi4vdHlwZUNvbmZpZy90eXBlQ29uZmlnLmpzXCI7XG5cbmNvbnN0IExPRyA9IG5ldyBMb2dnZXIoXCJDb25maWdBY2Nlc3NvclwiKTtcblxuLyoqXG4gKiBVdGlsaXRpZXMgZm9yIGFjY2Vzc2luZyBhIENvbmZpZyBvYmplY3RcbiAqL1xuZXhwb3J0IGNsYXNzIENvbmZpZ0FjY2Vzc29yIHtcblxuICAgIC8qKlxuICAgICAqIEdldCB0aGUgdHlwZSBjb25maWcgYnkgY2xhc3MgbmFtZSBpbiB0aGUgY29uZmlnXG4gICAgICogXG4gICAgICogQHBhcmFtIHtDb25maWd9IGNvbmZpZyBcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbmFtZSBcbiAgICAgKiBAcmV0dXJucyB7VHlwZUNvbmZpZ31cbiAgICAgKi9cbiAgICBzdGF0aWMgdHlwZUNvbmZpZ0J5TmFtZShuYW1lLCBjb25maWcpIHtcbiAgICAgICAgbGV0IGNvbmZpZ0VudHJ5ID0gbnVsbDtcbiAgICAgICAgY29uZmlnLmNvbmZpZ0VudHJpZXMuZm9yRWFjaCgodmFsdWUsIGtleSkgPT4ge1xuICAgICAgICAgICAgaWYoa2V5ID09PSBuYW1lKSB7XG4gICAgICAgICAgICAgICAgY29uZmlnRW50cnkgPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gY29uZmlnRW50cnk7XG4gICAgfVxuXG59IiwiZXhwb3J0IGNsYXNzIEluamVjdG9yIHtcblxuXG4gICAgLyoqXG4gICAgICogSGVscGVyIG1ldGhvZCBmb3IgaW5qZWN0aW5nIGZpZWxkcyBpbiB0YXJnZXQgb2JqZWN0XG4gICAgICogXG4gICAgICogQHBhcmFtIHthbnl9IHRhcmdldE9iamVjdCBcbiAgICAgKiBAcGFyYW0ge0NvbmZpZ30gY29uZmlnIFxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBkZXB0aFxuICAgICAqIEByZXR1cm5zIHtQcm9taXNlfVxuICAgICAqL1xuICAgIGluamVjdFRhcmdldCh0YXJnZXQsIGNvbmZpZywgZGVwdGggPSAwKSB7XG5cbiAgICB9XG5cbn0iLCJpbXBvcnQgeyBMb2dnZXIsIExpc3QgfSBmcm9tIFwiY29yZXV0aWxfdjFcIjtcbmltcG9ydCB7IENvbmZpZyB9IGZyb20gXCIuLi9jb25maWcuanNcIjtcbmltcG9ydCB7IENvbmZpZ0FjY2Vzc29yIH0gZnJvbSBcIi4uL2NvbmZpZ0FjY2Vzc29yLmpzXCI7XG5pbXBvcnQgeyBJbmplY3RvciB9IGZyb20gXCIuLi9pbmplY3Rvci5qc1wiO1xuaW1wb3J0IHsgSW5zdGFuY2VIb2xkZXIgfSBmcm9tIFwiLi4vdHlwZUNvbmZpZy9pbnN0YW5jZUhvbGRlci5qc1wiO1xuaW1wb3J0IHsgVHlwZUNvbmZpZyB9IGZyb20gXCIuLi90eXBlQ29uZmlnL3R5cGVDb25maWcuanNcIjtcblxuY29uc3QgTE9HID0gbmV3IExvZ2dlcihcIkNvbmZpZ1Byb2Nlc3NvckV4ZWN1dG9yXCIpO1xuXG4vKipcbiAqIEV4ZWN1dGVzIHRoZSBwcm92aWRlZCBjb25maWcgcHJvY2Vzc29ycyBvbiB0aGUgcHJvdmlkZWQgY29uZmlnIHJlZ2lzdHJ5XG4gKiBSZXR1cm5zIGEgbGlzdCBvZiBwcm9taXNlcyBmb3Igd2hlbiB0aGUgY29uZmlnIHByb2Nlc3NvcnMgaGFzIGNvbXBsZXRlZCBydW5uaW5nXG4gKiBcbiAqIEEgY29uZmlnIHByb2Nlc3NvciByZWFkcyB0aGUgY29uZmlnIGFuZCBwZXJmb3JtcyBhbnkgbmVjZXNzYXJ5IGFjdGlvbnMgYmFzZWQgb25cbiAqIGNsYXNzIGFuZCB0eXBlIGluZm9ybWF0aW9uLiBBIGNvbmZpZyBwcm9jZXNzb3IgZG9lcyBub3Qgb3BlcmF0ZSBvbiBtYW5hZ2VkIGluc3RhbmNlc1xuICovXG5leHBvcnQgY2xhc3MgQ29uZmlnUHJvY2Vzc29yRXhlY3V0b3Ige1xuICAgIFxuICAgIC8qKlxuICAgICAqIEBwYXJhbSB7QXJyYXk8U3RyaW5nPn0gY29uZmlnUHJvY2Vzc29yQ2xhc3NOYW1lQXJyYXlcbiAgICAgKiBAcGFyYW0ge0luamVjdG9yfSBpbmplY3RvclxuICAgICAqIEBwYXJhbSB7Q29uZmlnfSBjb25maWdcbiAgICAgKiBAcmV0dXJucyB7UHJvbWlzZX0gcHJvbWlzZSB3aGljaCBpcyByZXNvbHZlZCB3aGVuIGFsbCBjb25maWcgcHJvY2Vzc29ycyBhcmUgcmVzb2x2ZWRcbiAgICAgKi9cbiAgICBzdGF0aWMgZXhlY3V0ZShjb25maWdQcm9jZXNzb3JDbGFzc05hbWVBcnJheSwgaW5qZWN0b3IsIGNvbmZpZykge1xuICAgICAgICBjb25zdCBjb25maWdQcm9jZXNzb3JDbGFzc05hbWVMaXN0ID0gbmV3IExpc3QoY29uZmlnUHJvY2Vzc29yQ2xhc3NOYW1lQXJyYXkpO1xuICAgICAgICByZXR1cm4gY29uZmlnUHJvY2Vzc29yQ2xhc3NOYW1lTGlzdC5wcm9taXNlQ2hhaW4oKGNvbmZpZ1Byb2Nlc3NvckNsYXNzTmFtZSwgcGFyZW50KSA9PiB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmVDb25maWdQcm9jZXNzb3JFeGVjdXRlZCwgcmVqZWN0KSA9PiB7XG5cbiAgICAgICAgICAgICAgICBsZXQgdGFyZ2V0SW5qZWN0ZWRQcm9taXNlID0gUHJvbWlzZS5yZXNvbHZlKCk7XG5cbiAgICAgICAgICAgICAgICAvKiogIEB0eXBlIHtUeXBlQ29uZmlnfSAqL1xuICAgICAgICAgICAgICAgIGNvbnN0IHR5cGVDb25maWcgPSBDb25maWdBY2Nlc3Nvci50eXBlQ29uZmlnQnlOYW1lKGNvbmZpZ1Byb2Nlc3NvckNsYXNzTmFtZSwgY29uZmlnKTtcblxuICAgICAgICAgICAgICAgIGlmICghdHlwZUNvbmZpZykge1xuICAgICAgICAgICAgICAgICAgICBMT0cuZXJyb3IoYE5vIHR5cGUgY29uZmlnIGZvdW5kIGZvciAke2NvbmZpZ1Byb2Nlc3NvckNsYXNzTmFtZX1gKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8qKiAgQHR5cGUge0luc3RhbmNlSG9sZGVyfSAqL1xuICAgICAgICAgICAgICAgIGNvbnN0IHByb2Nlc3NvckhvbGRlciA9IHR5cGVDb25maWcuaW5zdGFuY2VIb2xkZXIoKTtcblxuICAgICAgICAgICAgICAgIGlmKHByb2Nlc3NvckhvbGRlci50eXBlID09PSBJbnN0YW5jZUhvbGRlci5ORVdfSU5TVEFOQ0UpIHtcbiAgICAgICAgICAgICAgICAgICAgdGFyZ2V0SW5qZWN0ZWRQcm9taXNlID0gaW5qZWN0b3IuaW5qZWN0VGFyZ2V0KHByb2Nlc3NvckhvbGRlci5pbnN0YW5jZSwgY29uZmlnKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB0YXJnZXRJbmplY3RlZFByb21pc2UudGhlbigoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRvQ29uZmlndXJlTWFwID0gQ29uZmlnUHJvY2Vzc29yRXhlY3V0b3IucHJlcGFyZVVuY29uZmlndXJlZENvbmZpZ0VudHJpZXMoY29uZmlnLmNvbmZpZ0VudHJpZXMpO1xuICAgICAgICAgICAgICAgICAgICBwcm9jZXNzb3JIb2xkZXIuaW5zdGFuY2UucHJvY2Vzc0NvbmZpZyhjb25maWcsIHRvQ29uZmlndXJlTWFwKS50aGVuKCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmVDb25maWdQcm9jZXNzb3JFeGVjdXRlZCgpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7TWFwPHN0cmluZywgVHlwZUNvbmZpZz59IGNvbmZpZ0VudHJpZXMgXG4gICAgICogQHJldHVybiB7TWFwPHN0cmluZywgVHlwZUNvbmZpZz59XG4gICAgICovXG4gICAgc3RhdGljIHByZXBhcmVVbmNvbmZpZ3VyZWRDb25maWdFbnRyaWVzKGNvbmZpZ0VudHJpZXMpIHtcbiAgICAgICAgLyoqIEB0eXBlIHtNYXA8VHlwZUNvbmZpZz59ICovXG4gICAgICAgIGNvbnN0IHVuY29uZmlndXJlZENvbmZpZ0VudHJpZXMgPSBuZXcgTWFwKCk7XG5cbiAgICAgICAgY29uZmlnRW50cmllcy5mb3JFYWNoKCh2YWx1ZSwga2V5KSA9PiB7XG5cbiAgICAgICAgICAgIC8qKiBAdHlwZSB7VHlwZUNvbmZpZ30gKi9cbiAgICAgICAgICAgIGNvbnN0IGNvbmZpZ0VudHJ5ID0gdmFsdWU7XG5cbiAgICAgICAgICAgIGlmKGNvbmZpZ0VudHJ5LnN0YWdlID09PSBUeXBlQ29uZmlnLk5FVykge1xuICAgICAgICAgICAgICAgIHVuY29uZmlndXJlZENvbmZpZ0VudHJpZXMuc2V0KGtleSwgY29uZmlnRW50cnkpO1xuICAgICAgICAgICAgICAgIGNvbmZpZ0VudHJ5LnN0YWdlID0gVHlwZUNvbmZpZy5DT05GSUdVUkVEO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICByZXR1cm4gdW5jb25maWd1cmVkQ29uZmlnRW50cmllcztcbiAgICB9XG5cbn0iLCJpbXBvcnQgeyBUeXBlQ29uZmlnIH0gZnJvbSBcIi4vdHlwZUNvbmZpZy5qc1wiO1xuaW1wb3J0IHsgTG9nZ2VyIH0gZnJvbSBcImNvcmV1dGlsX3YxXCI7XG5pbXBvcnQgeyBJbnN0YW5jZUhvbGRlciB9IGZyb20gXCIuL2luc3RhbmNlSG9sZGVyLmpzXCI7XG5cbmNvbnN0IExPRyA9IG5ldyBMb2dnZXIoXCJTaW5nbGV0b25Db25maWdcIik7XG5cbmV4cG9ydCBjbGFzcyBTaW5nbGV0b25Db25maWcgZXh0ZW5kcyBUeXBlQ29uZmlnIHtcblxuICAgIHN0YXRpYyBuYW1lZChuYW1lLCBjbGFzc1JlZmVyZW5jZSkge1xuICAgICAgICByZXR1cm4gbmV3IFNpbmdsZXRvbkNvbmZpZyhuYW1lLCBjbGFzc1JlZmVyZW5jZSk7XG4gICAgfVxuXG4gICAgc3RhdGljIHVubmFtZWQoY2xhc3NSZWZlcmVuY2UpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBTaW5nbGV0b25Db25maWcoY2xhc3NSZWZlcmVuY2UubmFtZSwgY2xhc3NSZWZlcmVuY2UpO1xuICAgIH1cblxuICAgIGNvbnN0cnVjdG9yKG5hbWUsIGNsYXNzUmVmZXJlbmNlKSB7XG4gICAgICAgIHN1cGVyKG5hbWUsIGNsYXNzUmVmZXJlbmNlKTtcbiAgICB9XG5cbiAgICBpbnN0YW5jZUhvbGRlcihwYXJhbWV0ZXJzID0gW10pIHtcbiAgICAgICAgaWYgKCF0aGlzLmluc3RhbmNlKSB7XG4gICAgICAgICAgICBpZihwYXJhbWV0ZXJzICYmIHBhcmFtZXRlcnMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIHRoaXMuaW5zdGFuY2UgPSBuZXcgdGhpcy5jbGFzc1JlZmVyZW5jZSguLi5wYXJhbWV0ZXJzKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5pbnN0YW5jZSA9IG5ldyB0aGlzLmNsYXNzUmVmZXJlbmNlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gSW5zdGFuY2VIb2xkZXIuaG9sZGVyV2l0aE5ld0luc3RhbmNlKHRoaXMuaW5zdGFuY2UpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBJbnN0YW5jZUhvbGRlci5ob2xkZXJXaXRoRXhpc3RpbmdJbnN0YW5jZSh0aGlzLmluc3RhbmNlKTtcbiAgICB9XG5cbn0iLCJpbXBvcnQgeyBMb2dnZXIgfSBmcm9tIFwiY29yZXV0aWxfdjFcIjtcblxuY29uc3QgTE9HID0gbmV3IExvZ2dlcihcIlByb3ZpZGVyXCIpO1xuXG4vKipcbiAqIEB0ZW1wbGF0ZSBUXG4gKi9cbmV4cG9ydCBjbGFzcyBQcm92aWRlciB7XG5cbiAgICAvKipcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBwYXJhbWV0ZXJzIFxuICAgICAqIEByZXR1cm5zIHtQcm9taXNlPFQ+fVxuICAgICAqL1xuICAgIGdldChwYXJhbWV0ZXJzID0gW10pIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG59IiwiaW1wb3J0IHsgUHJvdmlkZXIgfSBmcm9tIFwiLi9wcm92aWRlci5qc1wiO1xuXG5leHBvcnQgY2xhc3MgSW5qZWN0aW9uUG9pbnQge1xuXG4gICAgc3RhdGljIGdldCBJTlNUQU5DRV9UWVBFKCkgeyByZXR1cm4gMDsgfSBcbiAgICBzdGF0aWMgZ2V0IFBST1ZJREVSX1RZUEUoKSB7IHJldHVybiAxOyB9IFxuXG4gICAgLyoqXG4gICAgICogQHRlbXBsYXRlIFRcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbmFtZSBcbiAgICAgKiBAcGFyYW0ge25ldygpID0+IFR9IGNsYXNzUmVmZXJlbmNlIFxuICAgICAqIEBwYXJhbSB7YXJyYXl9IHBhcmFtZXRlcnMgXG4gICAgICogQHJldHVybnMge1R9XG4gICAgICovXG4gICAgc3RhdGljIGluc3RhbmNlQnlOYW1lKG5hbWUsIGNsYXNzUmVmZXJlbmNlLCBwYXJhbWV0ZXJzID0gW10pIHtcbiAgICAgICAgcmV0dXJuIG5ldyBJbmplY3Rpb25Qb2ludChuYW1lLCBjbGFzc1JlZmVyZW5jZSwgSW5qZWN0aW9uUG9pbnQuSU5TVEFOQ0VfVFlQRSwgcGFyYW1ldGVycyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQHRlbXBsYXRlIFRcbiAgICAgKiBAcGFyYW0ge25ldygpID0+IFR9IGNsYXNzUmVmZXJlbmNlIFxuICAgICAqIEBwYXJhbSB7YXJyYXl9IHBhcmFtZXRlcnMgXG4gICAgICogQHJldHVybnMge1R9XG4gICAgICovXG4gICAgc3RhdGljIGluc3RhbmNlKGNsYXNzUmVmZXJlbmNlLCBwYXJhbWV0ZXJzID0gW10pIHtcbiAgICAgICAgcmV0dXJuIG5ldyBJbmplY3Rpb25Qb2ludChjbGFzc1JlZmVyZW5jZS5uYW1lLCBjbGFzc1JlZmVyZW5jZSwgSW5qZWN0aW9uUG9pbnQuSU5TVEFOQ0VfVFlQRSwgcGFyYW1ldGVycyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQHRlbXBsYXRlIFRcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbmFtZSBcbiAgICAgKiBAcGFyYW0ge25ldygpID0+IFR9IGNsYXNzUmVmZXJlbmNlIFxuICAgICAqIEByZXR1cm5zIHtQcm92aWRlcjxUPn1cbiAgICAgKi9cbiAgICBzdGF0aWMgcHJvdmlkZXJCeU5hbWUobmFtZSwgY2xhc3NSZWZlcmVuY2UpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBJbmplY3Rpb25Qb2ludChuYW1lLCBjbGFzc1JlZmVyZW5jZSwgSW5qZWN0aW9uUG9pbnQuUFJPVklERVJfVFlQRSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQHRlbXBsYXRlIFRcbiAgICAgKiBAcGFyYW0ge25ldygpID0+IFR9IGNsYXNzUmVmZXJlbmNlIFxuICAgICAqIEByZXR1cm5zIHtQcm92aWRlcjxUPn1cbiAgICAgKi9cbiAgICBzdGF0aWMgcHJvdmlkZXIoY2xhc3NSZWZlcmVuY2UpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBJbmplY3Rpb25Qb2ludChjbGFzc1JlZmVyZW5jZS5uYW1lLCBjbGFzc1JlZmVyZW5jZSwgSW5qZWN0aW9uUG9pbnQuUFJPVklERVJfVFlQRSk7XG4gICAgfVxuXG4gICAgY29uc3RydWN0b3IobmFtZSwgY2xhc3NSZWZlcmVuY2UsIHR5cGUgPSBJbmplY3Rpb25Qb2ludC5JTlNUQU5DRV9UWVBFLCBwYXJhbWV0ZXJzID0gbnVsbCkge1xuICAgICAgICB0aGlzLm5hbWUgPSBuYW1lO1xuICAgICAgICB0aGlzLmNsYXNzUmVmZXJlbmNlID0gY2xhc3NSZWZlcmVuY2U7XG4gICAgICAgIHRoaXMudHlwZSA9IHR5cGU7XG4gICAgICAgIHRoaXMucGFyYW1ldGVycyA9IHBhcmFtZXRlcnM7XG4gICAgfVxuXG59IiwiZXhwb3J0IGNsYXNzIEluc3RhbmNlUHJvY2Vzc29yIHtcblxuICAgIC8qKlxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBpbnN0YW5jZSBcbiAgICAgKiBAcmV0dXJuIHtQcm9taXNlfVxuICAgICAqL1xuICAgIHByb2Nlc3MoaW5zdGFuY2UpIHtcbiAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xuICAgIH1cblxufSIsImltcG9ydCB7IExvZ2dlciwgTGlzdCB9IGZyb20gXCJjb3JldXRpbF92MVwiO1xuaW1wb3J0IHsgQ29uZmlnQWNjZXNzb3IgfSBmcm9tIFwiLi4vY29uZmlnQWNjZXNzb3IuanNcIjtcbmltcG9ydCB7IENvbmZpZyB9IGZyb20gXCIuLi9jb25maWcuanNcIjtcbmltcG9ydCB7IFR5cGVDb25maWcgfSBmcm9tIFwiLi4vdHlwZUNvbmZpZy90eXBlQ29uZmlnLmpzXCI7XG5pbXBvcnQgeyBJbnN0YW5jZUhvbGRlciB9IGZyb20gXCIuLi90eXBlQ29uZmlnL2luc3RhbmNlSG9sZGVyLmpzXCI7XG5pbXBvcnQgeyBJbnN0YW5jZVByb2Nlc3NvciB9IGZyb20gXCIuL2luc3RhbmNlUHJvY2Vzc29yLmpzXCI7XG5cbmNvbnN0IExPRyA9IG5ldyBMb2dnZXIoXCJJbnN0YW5jZVByb2Nlc3NvckV4ZWN1dG9yXCIpO1xuXG4vKipcbiAqIEV4ZWN1dGVzIHRoZSBjb25maWdzIGluc3RhbmNlIHByb2Nlc3NvcnMgb24gdGhlIHByb3ZpZGVkIGluc3RhbmNlXG4gKiBSZXR1cm5zIGEgcHJvbWlzZSBmb3Igd2hlbiB0aGUgaW5zdGFuY2UgcHJvY2Vzc29ycyBoYXMgY29tcGxldGVkIHJ1bm5pbmdcbiAqIFxuICogSW5zdGFuY2UgcHJvY2Vzc29ycyBwZXJmb3JtIG9wZXJhdGlvbnMgb24gbWFuYWdlZCBpbnN0YW5jZXMgYWZ0ZXIgdGhleSBoYXZlIGJlZW4gaW5zdGFuc2lhdGVkXG4gKi9cbmV4cG9ydCBjbGFzcyBJbnN0YW5jZVByb2Nlc3NvckV4ZWN1dG9yIHtcblxuICAgIC8qKlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBpbnN0YW5jZSB0aGUgaW5zdGFuY2UgdG8gcHJvY2Vzc1xuICAgICAqIEBwYXJhbSB7Q29uZmlnfSBjb25maWdcbiAgICAgKiBAcmV0dXJucyB7UHJvbWlzZX1cbiAgICAgKi9cbiAgICBzdGF0aWMgZXhlY3V0ZShpbnN0YW5jZSwgY29uZmlnKSB7XG4gICAgICAgIGNvbnN0IGluc3RhbmNlUHJvY2Vzc29yTGlzdCA9IG5ldyBMaXN0KGNvbmZpZy5pbnN0YW5jZVByb2Nlc3NvcnMpO1xuICAgICAgICByZXR1cm4gaW5zdGFuY2VQcm9jZXNzb3JMaXN0LnByb21pc2VDaGFpbigocHJvY2Vzc29yTmFtZSwgcGFyZW50KSA9PiB7XG4gICAgICAgICAgICAvKiogQHR5cGUge1R5cGVDb25maWd9ICovXG4gICAgICAgICAgICBjb25zdCB0eXBlQ29uZmlnID0gQ29uZmlnQWNjZXNzb3IudHlwZUNvbmZpZ0J5TmFtZShwcm9jZXNzb3JOYW1lLCBjb25maWcpO1xuXG4gICAgICAgICAgICAvKiogQHR5cGUge0luc3RhbmNlSG9sZGVyfSAqL1xuICAgICAgICAgICAgY29uc3QgcHJvY2Vzc29ySG9sZGVyID0gdHlwZUNvbmZpZy5pbnN0YW5jZUhvbGRlcigpO1xuXG4gICAgICAgICAgICByZXR1cm4gcHJvY2Vzc29ySG9sZGVyLmluc3RhbmNlLnByb2Nlc3MoaW5zdGFuY2UpO1xuICAgICAgICB9LCB0aGlzKTtcbiAgICB9XG5cbn0iLCJpbXBvcnQgeyBQcm92aWRlciB9IGZyb20gXCIuL2FwaS9wcm92aWRlci5qc1wiO1xuaW1wb3J0IHsgVHlwZUNvbmZpZyB9IGZyb20gXCIuL3R5cGVDb25maWcvdHlwZUNvbmZpZy5qc1wiO1xuaW1wb3J0IHsgSW5zdGFuY2VIb2xkZXIgfSBmcm9tIFwiLi90eXBlQ29uZmlnL2luc3RhbmNlSG9sZGVyLmpzXCI7XG5pbXBvcnQgeyBJbmplY3RvciB9IGZyb20gXCIuL2luamVjdG9yLmpzXCI7XG5pbXBvcnQgeyBDb25maWcgfSBmcm9tIFwiLi9jb25maWcuanNcIjtcblxuLyoqXG4gKiBAdGVtcGxhdGUgVFxuICovXG5leHBvcnQgY2xhc3MgTWluZGlQcm92aWRlciBleHRlbmRzIFByb3ZpZGVyIHtcblxuICAgIC8qKlxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7VHlwZUNvbmZpZ30gdHlwZUNvbmZpZyBcbiAgICAgKiBAcGFyYW0ge0luamVjdG9yfSBpbmplY3RvclxuICAgICAqIEBwYXJhbSB7Q29uZmlnfSBjb25maWdcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3Rvcih0eXBlQ29uZmlnLCBpbmplY3RvciwgY29uZmlnKSB7XG5cbiAgICAgICAgc3VwZXIoKTtcblxuICAgICAgICAvKiogQHR5cGUge1R5cGVDb25maWd9ICovXG4gICAgICAgIHRoaXMudHlwZUNvbmZpZyA9IHR5cGVDb25maWc7XG5cbiAgICAgICAgLyoqIEB0eXBlIHtJbmplY3Rvcn0gKi9cbiAgICAgICAgdGhpcy5pbmplY3RvciA9IGluamVjdG9yO1xuXG4gICAgICAgIC8qKiBAdHlwZSB7Q29uZmlnfSAqL1xuICAgICAgICB0aGlzLmNvbmZpZyA9IGNvbmZpZztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBwYXJhbWV0ZXJzIFxuICAgICAqIEByZXR1cm5zIHtQcm9taXNlPFQ+fVxuICAgICAqL1xuICAgIGdldChwYXJhbWV0ZXJzID0gW10pIHtcblxuICAgICAgICAvKiogQHR5cGUge0luc3RhbmNlSG9sZGVyfSAqL1xuICAgICAgICBjb25zdCBpbnN0YW5jZUhvbGRlciA9IHRoaXMudHlwZUNvbmZpZy5pbnN0YW5jZUhvbGRlcihwYXJhbWV0ZXJzKTtcblxuICAgICAgICBpZiAoaW5zdGFuY2VIb2xkZXIudHlwZSA9PT0gSW5zdGFuY2VIb2xkZXIuTkVXX0lOU1RBTkNFKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5pbmplY3Rvci5pbmplY3RUYXJnZXQoaW5zdGFuY2VIb2xkZXIuaW5zdGFuY2UsIHRoaXMuY29uZmlnKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKGluc3RhbmNlSG9sZGVyLmluc3RhbmNlKTtcbiAgICB9XG5cbn0iLCJpbXBvcnQgeyBMaXN0LCBMb2dnZXIgfSBmcm9tIFwiY29yZXV0aWxfdjFcIjtcbmltcG9ydCB7IENvbmZpZyB9IGZyb20gXCIuL2NvbmZpZy5qc1wiO1xuaW1wb3J0IHsgQ29uZmlnQWNjZXNzb3IgfSBmcm9tIFwiLi9jb25maWdBY2Nlc3Nvci5qc1wiO1xuaW1wb3J0IHsgSW5qZWN0aW9uUG9pbnQgfSBmcm9tIFwiLi9hcGkvaW5qZWN0aW9uUG9pbnQuanNcIlxuaW1wb3J0IHsgSW5zdGFuY2VQcm9jZXNzb3JFeGVjdXRvciB9IGZyb20gXCIuL2luc3RhbmNlUHJvY2Vzc29yL2luc3RhbmNlUHJvY2Vzc29yRXhlY3V0b3IuanNcIjtcbmltcG9ydCB7IEluc3RhbmNlSG9sZGVyIH0gZnJvbSBcIi4vdHlwZUNvbmZpZy9pbnN0YW5jZUhvbGRlci5qc1wiO1xuaW1wb3J0IHsgTWluZGlQcm92aWRlciB9IGZyb20gXCIuL21pbmRpUHJvdmlkZXIuanNcIjtcbmltcG9ydCB7IEluamVjdG9yIH0gZnJvbSBcIi4vaW5qZWN0b3IuanNcIjtcbmltcG9ydCB7IFR5cGVDb25maWcgfSBmcm9tIFwiLi90eXBlQ29uZmlnL3R5cGVDb25maWcuanNcIjtcblxuY29uc3QgTE9HID0gbmV3IExvZ2dlcihcIk1pbmRpSW5qZWN0b3JcIik7XG5cbmV4cG9ydCBjbGFzcyBNaW5kaUluamVjdG9yIGV4dGVuZHMgSW5qZWN0b3Ige1xuXG4gICAgc3RhdGljIGluamVjdCh0YXJnZXQsIGNvbmZpZykge1xuICAgICAgICByZXR1cm4gSU5KRUNUT1IuaW5qZWN0VGFyZ2V0KHRhcmdldCwgY29uZmlnKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAcmV0dXJucyB7TWluZGlJbmplY3Rvcn1cbiAgICAgKi9cbiAgICBzdGF0aWMgZ2V0SW5zdGFuY2UoKSB7XG4gICAgICAgIHJldHVybiBJTkpFQ1RPUjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBIZWxwZXIgbWV0aG9kIGZvciBpbmplY3RpbmcgZmllbGRzIGluIHRhcmdldCBvYmplY3RcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge2FueX0gdGFyZ2V0T2JqZWN0IFxuICAgICAqIEBwYXJhbSB7Q29uZmlnfSBjb25maWcgXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGRlcHRoXG4gICAgICogQHJldHVybnMge1Byb21pc2V9XG4gICAgICovXG4gICAgYXN5bmMgaW5qZWN0VGFyZ2V0KHRhcmdldE9iamVjdCwgY29uZmlnLCBkZXB0aCA9IDApIHtcbiAgICAgICAgaWYgKCF0YXJnZXRPYmplY3QpIHtcbiAgICAgICAgICAgIHRocm93IEVycm9yKFwiTWlzc2luZyB0YXJnZXQgb2JqZWN0XCIpO1xuICAgICAgICB9XG4gICAgICAgIGlmICghY29uZmlnKSB7XG4gICAgICAgICAgICB0aHJvdyBFcnJvcihcIk1pc3NpbmcgY29uZmlnXCIpO1xuICAgICAgICB9XG4gICAgICAgIGlmICghY29uZmlnLmlzRmluYWxpemVkKCkpIHtcbiAgICAgICAgICAgIHRocm93IEVycm9yKFwiQ29uZmlnIG5vdCBmaW5hbGl6ZWRcIik7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRlcHRoID4gMTApIHtcbiAgICAgICAgICAgIHRocm93IEVycm9yKFwiSW5qZWN0aW9uIHN0cnVjdHVyZSB0b28gZGVlcFwiKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBpbmplY3RvciA9IHRoaXM7XG4gICAgICAgIGNvbnN0IG9iamVjdEZpZWxkTmFtZXMgPSBuZXcgTGlzdChPYmplY3Qua2V5cyh0YXJnZXRPYmplY3QpKTtcblxuICAgICAgICBhd2FpdCBvYmplY3RGaWVsZE5hbWVzLnByb21pc2VDaGFpbigoZmllbGROYW1lLCBwYXJlbnQpID0+IHtcbiAgICAgICAgICAgICAgICByZXR1cm4gTWluZGlJbmplY3Rvci5pbmplY3RQcm9wZXJ0eSh0YXJnZXRPYmplY3QsIGZpZWxkTmFtZSwgY29uZmlnLCBkZXB0aCwgaW5qZWN0b3IpO1xuICAgICAgICB9KTtcbiAgICAgICAgYXdhaXQgSW5zdGFuY2VQcm9jZXNzb3JFeGVjdXRvci5leGVjdXRlKHRhcmdldE9iamVjdCwgY29uZmlnKTtcbiAgICAgICAgcmV0dXJuIHRhcmdldE9iamVjdDtcblxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSB0YXJnZXRPYmplY3QgXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IGZpZWxkTmFtZSBcbiAgICAgKiBAcGFyYW0ge0NvbmZpZ30gY29uZmlnIFxuICAgICAqIEBwYXJhbSB7TnVtYmVyfSBkZXB0aCBcbiAgICAgKiBAcGFyYW0ge0luamVjdG9yfSBpbmplY3RvclxuICAgICAqIEByZXR1cm5zIHtQcm9taXNlfVxuICAgICAqL1xuICAgIHN0YXRpYyBpbmplY3RQcm9wZXJ0eSh0YXJnZXRPYmplY3QsIGZpZWxkTmFtZSwgY29uZmlnLCBkZXB0aCwgaW5qZWN0b3IpIHtcbiAgICAgICAgY29uc3QgaW5qZWN0aW9uUG9pbnQgPSB0YXJnZXRPYmplY3RbZmllbGROYW1lXTsgICAgICAgIFxuICAgICAgICBpZighKGluamVjdGlvblBvaW50IGluc3RhbmNlb2YgSW5qZWN0aW9uUG9pbnQpKSB7XG4gICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGluamVjdGlvblBvaW50LnR5cGUgPT09IEluamVjdGlvblBvaW50LlBST1ZJREVSX1RZUEUpIHtcbiAgICAgICAgICAgIE1pbmRpSW5qZWN0b3IuaW5qZWN0UHJvcGVydHlQcm92aWRlcih0YXJnZXRPYmplY3QsIGZpZWxkTmFtZSwgY29uZmlnLCBpbmplY3Rvcik7XG4gICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIE1pbmRpSW5qZWN0b3IuaW5qZWN0UHJvcGVydHlJbnN0YW5jZSh0YXJnZXRPYmplY3QsIGZpZWxkTmFtZSwgY29uZmlnLCBkZXB0aCwgaW5qZWN0b3IpO1xuICAgICAgICBcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gdGFyZ2V0T2JqZWN0IFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWVsZE5hbWUgXG4gICAgICogQHBhcmFtIHtDb25maWd9IGNvbmZpZyBcbiAgICAgKiBAcGFyYW0ge0luamVjdG9yfSBpbmplY3RvclxuICAgICAqL1xuICAgIHN0YXRpYyBpbmplY3RQcm9wZXJ0eVByb3ZpZGVyKHRhcmdldE9iamVjdCwgZmllbGROYW1lLCBjb25maWcsIGluamVjdG9yKSB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBAdHlwZSB7SW5qZWN0aW9uUG9pbnR9XG4gICAgICAgICAqL1xuICAgICAgICBjb25zdCBpbmplY3Rpb25Qb2ludCA9IHRhcmdldE9iamVjdFtmaWVsZE5hbWVdO1xuXG4gICAgICAgIC8qKiBAdHlwZSB7VHlwZUNvbmZpZ30gKi9cbiAgICAgICAgY29uc3QgdHlwZUNvbmZpZyA9IE1pbmRpSW5qZWN0b3IuZ2V0VHlwZUNvbmZpZyhpbmplY3Rpb25Qb2ludC5uYW1lLCBpbmplY3Rpb25Qb2ludC5jbGFzc1JlZmVyZW5jZSwgY29uZmlnKTtcblxuICAgICAgICBpZiAoIXR5cGVDb25maWcpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHRhcmdldE9iamVjdFtmaWVsZE5hbWVdID0gbmV3IE1pbmRpUHJvdmlkZXIodHlwZUNvbmZpZywgaW5qZWN0b3IsIGNvbmZpZyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHRhcmdldE9iamVjdCBcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmllbGROYW1lIFxuICAgICAqIEBwYXJhbSB7Q29uZmlnfSBjb25maWcgXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGRlcHRoIFxuICAgICAqIEBwYXJhbSB7SW5qZWN0b3J9IGluamVjdG9yXG4gICAgICogQHJldHVybnMge1Byb21pc2V9XG4gICAgICovXG4gICAgc3RhdGljIGluamVjdFByb3BlcnR5SW5zdGFuY2UodGFyZ2V0T2JqZWN0LCBmaWVsZE5hbWUsIGNvbmZpZywgZGVwdGgsIGluamVjdG9yKSB7XG4gICAgICAgIGxldCBpbmplY3RQcm9taXNlID0gUHJvbWlzZS5yZXNvbHZlKCk7XG4gICAgICAgIC8qKiBAdHlwZSB7SW5qZWN0aW9uUG9pbnR9ICovXG4gICAgICAgIGNvbnN0IGluamVjdGlvblBvaW50ID0gdGFyZ2V0T2JqZWN0W2ZpZWxkTmFtZV07XG5cbiAgICAgICAgLyoqIEB0eXBlIHtUeXBlQ29uZmlnfSAqL1xuICAgICAgICBjb25zdCB0eXBlQ29uZmlnID0gTWluZGlJbmplY3Rvci5nZXRUeXBlQ29uZmlnKGluamVjdGlvblBvaW50Lm5hbWUsIGluamVjdGlvblBvaW50LmNsYXNzUmVmZXJlbmNlLCBjb25maWcpO1xuXG5cbiAgICAgICAgaWYgKCF0eXBlQ29uZmlnKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvKiogQHR5cGUge0luc3RhbmNlSG9sZGVyfSAqL1xuICAgICAgICBjb25zdCBpbnN0YW5jZUhvbGRlciA9IHR5cGVDb25maWcuaW5zdGFuY2VIb2xkZXIoaW5qZWN0aW9uUG9pbnQucGFyYW1ldGVycyk7XG5cbiAgICAgICAgaWYgKGluc3RhbmNlSG9sZGVyLnR5cGUgPT09IEluc3RhbmNlSG9sZGVyLk5FV19JTlNUQU5DRSkge1xuICAgICAgICAgICAgaW5qZWN0UHJvbWlzZSA9IGluamVjdG9yLmluamVjdFRhcmdldChpbnN0YW5jZUhvbGRlci5pbnN0YW5jZSwgY29uZmlnLCBkZXB0aCsrKTtcbiAgICAgICAgfVxuICAgICAgICB0YXJnZXRPYmplY3RbZmllbGROYW1lXSA9IGluc3RhbmNlSG9sZGVyLmluc3RhbmNlO1xuICAgICAgICByZXR1cm4gaW5qZWN0UHJvbWlzZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbmFtZSBcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gdHlwZSBcbiAgICAgKiBAcGFyYW0ge0NvbmZpZ30gY29uZmlnIFxuICAgICAqIEByZXR1cm5zIHtUeXBlQ29uZmlnfVxuICAgICAqL1xuICAgIHN0YXRpYyBnZXRUeXBlQ29uZmlnKG5hbWUsIGNsYXNzUmVmZXJlbmNlLCBjb25maWcpIHtcbiAgICAgICAgY29uc3QgdHlwZUNvbmZpZyA9IENvbmZpZ0FjY2Vzc29yLnR5cGVDb25maWdCeU5hbWUobmFtZSwgY29uZmlnKTtcbiAgICAgICAgaWYgKHR5cGVDb25maWcpIHtcbiAgICAgICAgICAgIHJldHVybiB0eXBlQ29uZmlnO1xuICAgICAgICB9XG4gICAgICAgIExPRy5lcnJvcihgTm8gdHlwZSBjb25maWcgZm91bmQgZm9yICR7bmFtZX0gYW5kIGNsYXNzUmVmZXJlbmNlIGRvZXMgbm90IGV4dGVuZCBBdXRvQ29uZmlnYCk7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxufVxuXG5jb25zdCBJTkpFQ1RPUiA9IG5ldyBNaW5kaUluamVjdG9yKCk7IiwiaW1wb3J0IHsgTWFwIH0gZnJvbSBcImNvcmV1dGlsX3YxXCI7XG5pbXBvcnQgeyBDb25maWcgfSBmcm9tIFwiLi4vY29uZmlnLmpzXCI7XG5pbXBvcnQgeyBUeXBlQ29uZmlnIH0gZnJvbSBcIi4uL3R5cGVDb25maWcvdHlwZUNvbmZpZy5qc1wiO1xuXG5leHBvcnQgY2xhc3MgQ29uZmlnUHJvY2Vzc29yIHtcblxuICAgIC8qKlxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7Q29uZmlnfSBjb25maWcgXG4gICAgICogQHBhcmFtIHtNYXA8VHlwZUNvbmZpZz59IGNvbmZpZ0VudHJpZXNNYXAgXG4gICAgICovXG4gICAgcHJvY2Vzc0NvbmZpZyhjb25maWcsIGNvbmZpZ0VudHJpZXNNYXApIHtcbiAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xuICAgIH1cblxufSIsImltcG9ydCB7IEFycmF5VXRpbHMsIExvZ2dlciwgTWFwVXRpbHMgfSBmcm9tIFwiY29yZXV0aWxfdjFcIjtcbmltcG9ydCB7IFR5cGVDb25maWcgfSBmcm9tIFwiLi90eXBlQ29uZmlnL3R5cGVDb25maWcuanNcIjtcbmltcG9ydCB7IENvbmZpZ1Byb2Nlc3NvckV4ZWN1dG9yIH0gZnJvbSBcIi4vY29uZmlnUHJvY2Vzc29yL2NvbmZpZ1Byb2Nlc3NvckV4ZWN1dG9yLmpzXCI7XG5pbXBvcnQgeyBTaW5nbGV0b25Db25maWcgfSBmcm9tIFwiLi90eXBlQ29uZmlnL3NpbmdsZXRvbkNvbmZpZy5qc1wiO1xuaW1wb3J0IHsgQ29uZmlnIH0gZnJvbSBcIi4vY29uZmlnLmpzXCI7XG5pbXBvcnQgeyBNaW5kaUluamVjdG9yIH0gZnJvbSBcIi4vbWluZGlJbmplY3Rvci5qc1wiO1xuaW1wb3J0IHsgSW5zdGFuY2VQcm9jZXNzb3IgfSBmcm9tIFwiLi9pbnN0YW5jZVByb2Nlc3Nvci9pbnN0YW5jZVByb2Nlc3Nvci5qc1wiO1xuaW1wb3J0IHsgQ29uZmlnUHJvY2Vzc29yIH0gZnJvbSBcIi4vY29uZmlnUHJvY2Vzc29yL2NvbmZpZ1Byb2Nlc3Nvci5qc1wiO1xuXG5jb25zdCBMT0cgPSBuZXcgTG9nZ2VyKFwiQ29uZmlnXCIpO1xuXG5leHBvcnQgY2xhc3MgTWluZGlDb25maWcgZXh0ZW5kcyBDb25maWcge1xuXG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHN1cGVyKCk7XG5cbiAgICAgICAgLyoqIEB0eXBlIHtCb29sZWFufSAqL1xuICAgICAgICB0aGlzLmZpbmFsaXplZCA9IGZhbHNlO1xuXG4gICAgICAgIC8qKiBAdHlwZSB7TWFwPFR5cGVDb25maWc+fSAqL1xuICAgICAgICB0aGlzLmNvbmZpZ0VudHJpZXMgPSBuZXcgTWFwKCk7XG5cbiAgICAgICAgLyoqIEB0eXBlIHtBcnJheX0gKi9cbiAgICAgICAgdGhpcy5jb25maWdQcm9jZXNzb3JzID0gbmV3IEFycmF5KCk7XG5cbiAgICAgICAgLyoqIEB0eXBlIHtBcnJheX0gKi9cbiAgICAgICAgdGhpcy5pbnN0YW5jZVByb2Nlc3NvcnMgPSBuZXcgQXJyYXkoKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge0NvbmZpZ30gY29uZmlnXG4gICAgICogQHJldHVybnMge01pbmRpQ29uZmlnfVxuICAgICAqL1xuICAgIG1lcmdlKGNvbmZpZykge1xuICAgICAgICB0aGlzLmZpbmFsaXplZCA9IHRydWU7XG5cbiAgICAgICAgdGhpcy5jb25maWdFbnRyaWVzID0gTWFwVXRpbHNcbiAgICAgICAgICAgIC5tZXJnZSh0aGlzLmNvbmZpZ0VudHJpZXMsIGNvbmZpZy5jb25maWdFbnRyaWVzKTtcbiAgICAgICAgdGhpcy5jb25maWdQcm9jZXNzb3JzID0gQXJyYXlVdGlsc1xuICAgICAgICAgICAgLm1lcmdlKHRoaXMuY29uZmlnUHJvY2Vzc29ycywgY29uZmlnLmNvbmZpZ1Byb2Nlc3NvcnMpO1xuICAgICAgICB0aGlzLmluc3RhbmNlUHJvY2Vzc29ycyA9IEFycmF5VXRpbHNcbiAgICAgICAgICAgIC5tZXJnZSh0aGlzLmluc3RhbmNlUHJvY2Vzc29ycywgY29uZmlnLmluc3RhbmNlUHJvY2Vzc29ycyk7XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogXG4gICAgICogQHBhcmFtIHtUeXBlQ29uZmlnfSB0eXBlQ29uZmlnXG4gICAgICogQHJldHVybnMge01pbmRpQ29uZmlnfVxuICAgICAqL1xuICAgIGFkZFR5cGVDb25maWcodHlwZUNvbmZpZykge1xuICAgICAgICB0aGlzLmZpbmFsaXplZCA9IGZhbHNlO1xuICAgICAgICB0aGlzLmNvbmZpZ0VudHJpZXMuc2V0KHR5cGVDb25maWcubmFtZSwgdHlwZUNvbmZpZyk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7Q29uZmlnUHJvY2Vzc29yfSBjb25maWdQcm9jZXNzb3JcbiAgICAgKiBAcmV0dXJucyB7TWluZGlDb25maWd9XG4gICAgICovXG4gICAgYWRkQ29uZmlnUHJvY2Vzc29yKGNvbmZpZ1Byb2Nlc3Nvcikge1xuICAgICAgICB0aGlzLmNvbmZpZ1Byb2Nlc3NvcnMgPSBBcnJheVV0aWxzLmFkZCh0aGlzLmNvbmZpZ1Byb2Nlc3NvcnMsIGNvbmZpZ1Byb2Nlc3Nvci5uYW1lKTtcbiAgICAgICAgcmV0dXJuIHRoaXMuYWRkVHlwZUNvbmZpZyhTaW5nbGV0b25Db25maWcudW5uYW1lZChjb25maWdQcm9jZXNzb3IpKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge0luc3RhbmNlUHJvY2Vzc29yfSBpbnN0YW5jZVByb2Nlc3NvclxuICAgICAqIEByZXR1cm5zIHtNaW5kaUNvbmZpZ31cbiAgICAgKi9cbiAgICBhZGRJbnN0YW5jZVByb2Nlc3NvcihpbnN0YW5jZVByb2Nlc3Nvcikge1xuICAgICAgICB0aGlzLmluc3RhbmNlUHJvY2Vzc29ycyA9IEFycmF5VXRpbHMuYWRkKHRoaXMuaW5zdGFuY2VQcm9jZXNzb3JzLCBpbnN0YW5jZVByb2Nlc3Nvci5uYW1lKTtcbiAgICAgICAgcmV0dXJuIHRoaXMuYWRkVHlwZUNvbmZpZyhTaW5nbGV0b25Db25maWcudW5uYW1lZChpbnN0YW5jZVByb2Nlc3NvcikpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7QXJyYXk8VHlwZUNvbmZpZz59IHR5cGVDb25maWdBcnJheVxuICAgICAqIEByZXR1cm4ge01pbmRpQ29uZmlnfVxuICAgICAqL1xuICAgIGFkZEFsbFR5cGVDb25maWcodHlwZUNvbmZpZ0FycmF5KSB7XG4gICAgICAgIHRoaXMuZmluYWxpemVkID0gZmFsc2U7XG4gICAgICAgIHR5cGVDb25maWdBcnJheS5mb3JFYWNoKCh0eXBlQ29uZmlnKSA9PiB7XG4gICAgICAgICAgICB0aGlzLmNvbmZpZ0VudHJpZXMuc2V0KHR5cGVDb25maWcubmFtZSwgdHlwZUNvbmZpZyk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge0FycmF5PG5ldygpID0+IENvbmZpZ1Byb2Nlc3Nvcj59IGNvbmZpZ1Byb2Nlc3NvckFycmF5XG4gICAgICogQHJldHVybiB7TWluZGlDb25maWd9XG4gICAgICovXG4gICAgYWRkQWxsQ29uZmlnUHJvY2Vzc29yKGNvbmZpZ1Byb2Nlc3NvckFycmF5KSB7XG4gICAgICAgIGNvbmZpZ1Byb2Nlc3NvckFycmF5LmZvckVhY2goKGNvbmZpZ1Byb2Nlc3NvcikgPT4ge1xuICAgICAgICAgICAgdGhpcy5jb25maWdQcm9jZXNzb3JzID0gQXJyYXlVdGlscy5hZGQodGhpcy5jb25maWdQcm9jZXNzb3JzLCBjb25maWdQcm9jZXNzb3IubmFtZSk7XG4gICAgICAgICAgICB0aGlzLmFkZFR5cGVDb25maWcoU2luZ2xldG9uQ29uZmlnLnVubmFtZWQoY29uZmlnUHJvY2Vzc29yKSk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge0FycmF5PG5ldygpID0+IEluc3RhbmNlUHJvY2Vzc29yPn0gaW5zdGFuY2VQcm9jZXNzb3JBcnJheSBcbiAgICAgKiBAcmV0dXJuIHtNaW5kaUNvbmZpZ31cbiAgICAgKi9cbiAgICBhZGRBbGxJbnN0YW5jZVByb2Nlc3NvcihpbnN0YW5jZVByb2Nlc3NvckFycmF5KSB7XG4gICAgICAgIGluc3RhbmNlUHJvY2Vzc29yQXJyYXkuZm9yRWFjaCgoaW5zdGFuY2VQcm9jZXNzb3IpID0+IHtcbiAgICAgICAgICAgIHRoaXMuaW5zdGFuY2VQcm9jZXNzb3JzID0gQXJyYXlVdGlscy5hZGQodGhpcy5pbnN0YW5jZVByb2Nlc3NvcnMsIGluc3RhbmNlUHJvY2Vzc29yLm5hbWUpO1xuICAgICAgICAgICAgdGhpcy5hZGRUeXBlQ29uZmlnKFNpbmdsZXRvbkNvbmZpZy51bm5hbWVkKGluc3RhbmNlUHJvY2Vzc29yKSk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAgICAgKi9cbiAgICBpc0ZpbmFsaXplZCgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZmluYWxpemVkO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEByZXR1cm5zIHtQcm9taXNlfVxuICAgICAqL1xuICAgIGZpbmFsaXplKCkge1xuICAgICAgICB0aGlzLmZpbmFsaXplZCA9IHRydWU7XG4gICAgICAgIHJldHVybiBDb25maWdQcm9jZXNzb3JFeGVjdXRvci5leGVjdXRlKHRoaXMuY29uZmlnUHJvY2Vzc29ycywgTWluZGlJbmplY3Rvci5nZXRJbnN0YW5jZSgpLCB0aGlzKTtcbiAgICB9XG5cbn0iLCJpbXBvcnQgeyBMb2dnZXIgfSBmcm9tIFwiY29yZXV0aWxfdjFcIjtcbmltcG9ydCB7IEluc3RhbmNlUHJvY2Vzc29yIH0gZnJvbSBcIi4vaW5zdGFuY2VQcm9jZXNzb3IuanNcIjtcblxuY29uc3QgTE9HID0gbmV3IExvZ2dlcihcIkluc3RhbmNlUG9zdENvbmZpZ1RyaWdnZXJcIik7XG5cbi8qKlxuICogSW5zdGFuY2UgcHJvY2Vzc29yIHdoaWNoIGNhbGxzIHBvc3RDb25maWcgb24gb2JqZWN0cyBhZnRlciBjb25maWdQcm9jZXNzb3JzIGFyZSBmaW5pc2hlZFxuICovXG5leHBvcnQgY2xhc3MgSW5zdGFuY2VQb3N0Q29uZmlnVHJpZ2dlciBleHRlbmRzIEluc3RhbmNlUHJvY2Vzc29yIHtcblxuICAgIC8qKlxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBpbnN0YW5jZSBcbiAgICAgKiBAcmV0dXJuIHtQcm9taXNlfVxuICAgICAqL1xuICAgIHByb2Nlc3MoaW5zdGFuY2UpIHtcbiAgICAgICAgbGV0IHJlc3BvbnNlID0gbnVsbDtcbiAgICAgICAgaWYoaW5zdGFuY2UucG9zdENvbmZpZykge1xuICAgICAgICAgICAgcmVzcG9uc2UgPSBpbnN0YW5jZS5wb3N0Q29uZmlnKCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFyZXNwb25zZSkge1xuICAgICAgICAgICAgcmVzcG9uc2UgPSBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpID0+IHsgcmVzb2x2ZSgpOyB9KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIXJlc3BvbnNlIGluc3RhbmNlb2YgUHJvbWlzZSkge1xuICAgICAgICAgICAgdGhyb3cgXCJwb3N0Q29uZmlnKCkgbXVzdCByZXR1cm4gZWl0aGVyIHVuZGVmaW5lZCBvciBudWxsIG9yIGEgUHJvbWlzZVwiXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3BvbnNlO1xuICAgIH1cblxufSIsImltcG9ydCB7IFR5cGVDb25maWcgfSBmcm9tIFwiLi90eXBlQ29uZmlnLmpzXCI7XG5cbmV4cG9ydCBjbGFzcyBQb29sQ29uZmlnIGV4dGVuZHMgVHlwZUNvbmZpZyB7XG5cbiAgICBzdGF0aWMgbmFtZWQobmFtZSwgY2xhc3NSZWZlcmVuY2UsIHBvb2xTaXplKSB7XG4gICAgICAgIHJldHVybiBuZXcgUG9vbENvbmZpZyhuYW1lLCBjbGFzc1JlZmVyZW5jZSwgcG9vbFNpemUpO1xuICAgIH1cblxuICAgIHN0YXRpYyB1bm5hbWVkKGNsYXNzUmVmZXJlbmNlLCBwb29sU2l6ZSkge1xuICAgICAgICByZXR1cm4gbmV3IFBvb2xDb25maWcoY2xhc3NSZWZlcmVuY2UubmFtZSwgY2xhc3NSZWZlcmVuY2UsIHBvb2xTaXplKTtcbiAgICB9XG5cbiAgICBjb25zdHJ1Y3RvcihuYW1lLCBjbGFzc1JlZmVyZW5jZSwgcG9vbFNpemUpIHtcbiAgICAgICAgc3VwZXIobmFtZSwgY2xhc3NSZWZlcmVuY2UpO1xuICAgICAgICB0aGlzLnBvb2xTaXplID0gcG9vbFNpemU7XG4gICAgfVxuXG4gICAgaW5zdGFuY2VIb2xkZXIocGFyYW1ldGVycyA9IFtdKSB7XG5cbiAgICB9XG5cbn0iLCJpbXBvcnQgeyBUeXBlQ29uZmlnIH0gZnJvbSBcIi4vdHlwZUNvbmZpZy5qc1wiO1xuaW1wb3J0IHsgSW5zdGFuY2VIb2xkZXIgfSBmcm9tIFwiLi9pbnN0YW5jZUhvbGRlci5qc1wiO1xuXG5leHBvcnQgY2xhc3MgUHJvdG90eXBlQ29uZmlnIGV4dGVuZHMgVHlwZUNvbmZpZyB7XG5cbiAgICBzdGF0aWMgbmFtZWQobmFtZSwgY2xhc3NSZWZlcmVuY2UpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm90b3R5cGVDb25maWcobmFtZSwgY2xhc3NSZWZlcmVuY2UpO1xuICAgIH1cblxuICAgIHN0YXRpYyB1bm5hbWVkKGNsYXNzUmVmZXJlbmNlKSB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvdG90eXBlQ29uZmlnKGNsYXNzUmVmZXJlbmNlLm5hbWUsIGNsYXNzUmVmZXJlbmNlKTtcbiAgICB9XG5cbiAgICBjb25zdHJ1Y3RvcihuYW1lLCBjbGFzc1JlZmVyZW5jZSkge1xuICAgICAgICBzdXBlcihuYW1lLCBjbGFzc1JlZmVyZW5jZSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQHBhcmFtIHthcnJheX0gcGFyYW1ldGVycyB0aGUgcGFyYW1ldGVycyB0byB1c2UgZm9yIHRoZSBjb25zdHJ1Y3RvclxuICAgICAqL1xuICAgIGluc3RhbmNlSG9sZGVyKHBhcmFtZXRlcnMgPSBbXSkge1xuICAgICAgICBsZXQgaW5zdGFuY2UgPSBudWxsO1xuICAgICAgICBpZihwYXJhbWV0ZXJzICYmIHBhcmFtZXRlcnMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgaW5zdGFuY2UgPSBuZXcgdGhpcy5jbGFzc1JlZmVyZW5jZSguLi5wYXJhbWV0ZXJzKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGluc3RhbmNlID0gbmV3IHRoaXMuY2xhc3NSZWZlcmVuY2UoKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gSW5zdGFuY2VIb2xkZXIuaG9sZGVyV2l0aE5ld0luc3RhbmNlKGluc3RhbmNlKTtcbiAgICB9XG5cblxufSIsImltcG9ydCB7IFR5cGVDb25maWcgfSBmcm9tIFwiLi90eXBlQ29uZmlnLmpzXCI7XG5cbmV4cG9ydCBjbGFzcyBUeXBlQ29uZmlnUGFjayB7XG5cbiAgICBzdGF0aWMgX2luc3RhbmNlO1xuXG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIC8qKiBAdHlwZSB7TWFwPFN0cmluZywgTWFwPFN0cmluZywgVHlwZUNvbmZpZz4+fSAqL1xuICAgICAgICB0aGlzLnR5cGVDb25maWdQYWNrTWFwID0gbmV3IE1hcCgpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFxuICAgICAqIEByZXR1cm5zIHtUeXBlQ29uZmlnUGFja31cbiAgICAgKi9cbiAgICBzdGF0aWMgaW5zdGFuY2UoKSB7XG4gICAgICAgIGlmICghVHlwZUNvbmZpZ1BhY2suX2luc3RhbmNlKSB7XG4gICAgICAgICAgICBUeXBlQ29uZmlnUGFjay5faW5zdGFuY2UgPSBuZXcgVHlwZUNvbmZpZ1BhY2soKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gVHlwZUNvbmZpZ1BhY2suX2luc3RhbmNlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwYWNrTmFtZSBcbiAgICAgKiBAcGFyYW0ge1R5cGVDb25maWd9IHR5cGVDb25maWcgXG4gICAgICovXG4gICAgYWRkVHlwZUNvbmZpZyhwYWNrTmFtZSwgdHlwZUNvbmZpZykge1xuICAgICAgICBpZiAoIXRoaXMudHlwZUNvbmZpZ1BhY2tNYXAuaGFzKHBhY2tOYW1lKSkge1xuICAgICAgICAgICAgdGhpcy50eXBlQ29uZmlnUGFja01hcC5zZXQocGFja05hbWUsIG5ldyBNYXAoKSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCF0aGlzLnR5cGVDb25maWdQYWNrTWFwLmdldChwYWNrTmFtZSkuaGFzKHR5cGVDb25maWcubmFtZSkpIHtcbiAgICAgICAgICAgIHRoaXMudHlwZUNvbmZpZ1BhY2tNYXAuZ2V0KHBhY2tOYW1lKS5zZXQodHlwZUNvbmZpZy5uYW1lLCB0eXBlQ29uZmlnKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwYWNrTmFtZSBcbiAgICAgKiBAcmV0dXJucyB7QXJyYXk8VHlwZUNvbmZpZz59XG4gICAgICovXG4gICAgZ2V0Q29uZmlnQXJyYXlCeVBhY2tOYW1lKHBhY2tOYW1lKSB7IFxuICAgICAgICBpZiAodGhpcy50eXBlQ29uZmlnUGFja01hcC5oYXMocGFja05hbWUpKSB7XG4gICAgICAgICAgICByZXR1cm4gQXJyYXkuZnJvbSh0aGlzLnR5cGVDb25maWdQYWNrTWFwLmdldChwYWNrTmFtZSkudmFsdWVzKCkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBbXTtcbiAgICB9XG5cbn0iXSwibmFtZXMiOlsiTG9nZ2VyIiwiTE9HIiwiTGlzdCIsIk1hcFV0aWxzIiwiQXJyYXlVdGlscyJdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQU8sTUFBTSxNQUFNLENBQUM7QUFDcEI7QUFDQSxJQUFJLFdBQVcsR0FBRztBQUNsQjtBQUNBLFFBQVEsSUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJLENBQUM7QUFDbEM7QUFDQTtBQUNBLFFBQVEsSUFBSSxDQUFDLGdCQUFnQixHQUFHLElBQUksQ0FBQztBQUNyQztBQUNBO0FBQ0EsUUFBUSxJQUFJLENBQUMsa0JBQWtCLEdBQUcsSUFBSSxDQUFDO0FBQ3ZDLEtBQUs7QUFDTDtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQUksUUFBUSxHQUFHO0FBQ2Y7QUFDQSxLQUFLO0FBQ0w7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFJLFdBQVcsR0FBRztBQUNsQixRQUFRLE9BQU8sS0FBSyxDQUFDO0FBQ3JCLEtBQUs7QUFDTDs7QUMxQk8sTUFBTSxjQUFjLENBQUM7QUFDNUI7QUFDQSxJQUFJLFdBQVcsWUFBWSxHQUFHLEVBQUUsT0FBTyxDQUFDLENBQUMsRUFBRTtBQUMzQztBQUNBLElBQUksV0FBVyxpQkFBaUIsR0FBRyxFQUFFLE9BQU8sQ0FBQyxDQUFDLEVBQUU7QUFDaEQ7QUFDQSxJQUFJLE9BQU8scUJBQXFCLENBQUMsUUFBUSxFQUFFO0FBQzNDLFFBQVEsT0FBTyxJQUFJLGNBQWMsQ0FBQyxRQUFRLEVBQUUsY0FBYyxDQUFDLFlBQVksQ0FBQyxDQUFDO0FBQ3pFLEtBQUs7QUFDTDtBQUNBLElBQUksT0FBTywwQkFBMEIsQ0FBQyxRQUFRLEVBQUU7QUFDaEQsUUFBUSxPQUFPLElBQUksY0FBYyxDQUFDLFFBQVEsRUFBRSxjQUFjLENBQUMsaUJBQWlCLENBQUMsQ0FBQztBQUM5RSxLQUFLO0FBQ0w7QUFDQSxJQUFJLFdBQVcsQ0FBQyxRQUFRLEVBQUUsSUFBSSxFQUFFO0FBQ2hDLFFBQVEsSUFBSSxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUM7QUFDakMsUUFBUSxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQztBQUN6QixLQUFLO0FBQ0w7QUFDQTs7QUNqQk8sTUFBTSxVQUFVLENBQUM7QUFDeEI7QUFDQSxJQUFJLFdBQVcsR0FBRyxHQUFHLEVBQUUsT0FBTyxLQUFLLENBQUMsRUFBRTtBQUN0QyxJQUFJLFdBQVcsVUFBVSxHQUFHLEVBQUUsT0FBTyxZQUFZLENBQUMsRUFBRTtBQUNwRDtBQUNBLElBQUksV0FBVyxDQUFDLElBQUksRUFBRSxjQUFjLEVBQUU7QUFDdEMsUUFBUSxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQztBQUN6QixRQUFRLElBQUksQ0FBQyxjQUFjLEdBQUcsY0FBYyxDQUFDO0FBQzdDLFFBQVEsSUFBSSxDQUFDLEtBQUssR0FBRyxVQUFVLENBQUMsR0FBRyxDQUFDO0FBQ3BDLEtBQUs7QUFDTDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFJLGNBQWMsQ0FBQyxVQUFVLEdBQUcsRUFBRSxFQUFFO0FBQ3BDLFFBQVEsT0FBTyxJQUFJLENBQUM7QUFDcEIsS0FBSztBQUNMO0FBQ0E7O0FDbEJZLElBQUlBLGtCQUFNLENBQUMsZ0JBQWdCLEVBQUU7QUFDekM7QUFDQTtBQUNBO0FBQ0E7QUFDTyxNQUFNLGNBQWMsQ0FBQztBQUM1QjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBSSxPQUFPLGdCQUFnQixDQUFDLElBQUksRUFBRSxNQUFNLEVBQUU7QUFDMUMsUUFBUSxJQUFJLFdBQVcsR0FBRyxJQUFJLENBQUM7QUFDL0IsUUFBUSxNQUFNLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEtBQUssRUFBRSxHQUFHLEtBQUs7QUFDckQsWUFBWSxHQUFHLEdBQUcsS0FBSyxJQUFJLEVBQUU7QUFDN0IsZ0JBQWdCLFdBQVcsR0FBRyxLQUFLLENBQUM7QUFDcEMsZ0JBQWdCLE9BQU8sS0FBSyxDQUFDO0FBQzdCLGFBQWE7QUFDYixTQUFTLENBQUMsQ0FBQztBQUNYLFFBQVEsT0FBTyxXQUFXLENBQUM7QUFDM0IsS0FBSztBQUNMO0FBQ0E7O0FDN0JPLE1BQU0sUUFBUSxDQUFDO0FBQ3RCO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBSSxZQUFZLENBQUMsTUFBTSxFQUFFLE1BQU0sRUFBRSxLQUFLLEdBQUcsQ0FBQyxFQUFFO0FBQzVDO0FBQ0EsS0FBSztBQUNMO0FBQ0E7O0FDUkEsTUFBTUMsS0FBRyxHQUFHLElBQUlELGtCQUFNLENBQUMseUJBQXlCLENBQUMsQ0FBQztBQUNsRDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ08sTUFBTSx1QkFBdUIsQ0FBQztBQUNyQztBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQUksT0FBTyxPQUFPLENBQUMsNkJBQTZCLEVBQUUsUUFBUSxFQUFFLE1BQU0sRUFBRTtBQUNwRSxRQUFRLE1BQU0sNEJBQTRCLEdBQUcsSUFBSUUsZ0JBQUksQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDO0FBQ3JGLFFBQVEsT0FBTyw0QkFBNEIsQ0FBQyxZQUFZLENBQUMsQ0FBQyx3QkFBd0IsRUFBRSxNQUFNLEtBQUs7QUFDL0YsWUFBWSxPQUFPLElBQUksT0FBTyxDQUFDLENBQUMsOEJBQThCLEVBQUUsTUFBTSxLQUFLO0FBQzNFO0FBQ0EsZ0JBQWdCLElBQUkscUJBQXFCLEdBQUcsT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDO0FBQzlEO0FBQ0E7QUFDQSxnQkFBZ0IsTUFBTSxVQUFVLEdBQUcsY0FBYyxDQUFDLGdCQUFnQixDQUFDLHdCQUF3QixFQUFFLE1BQU0sQ0FBQyxDQUFDO0FBQ3JHO0FBQ0EsZ0JBQWdCLElBQUksQ0FBQyxVQUFVLEVBQUU7QUFDakMsb0JBQW9CRCxLQUFHLENBQUMsS0FBSyxDQUFDLENBQUMseUJBQXlCLEVBQUUsd0JBQXdCLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDdEYsb0JBQW9CLE9BQU87QUFDM0IsaUJBQWlCO0FBQ2pCO0FBQ0E7QUFDQSxnQkFBZ0IsTUFBTSxlQUFlLEdBQUcsVUFBVSxDQUFDLGNBQWMsRUFBRSxDQUFDO0FBQ3BFO0FBQ0EsZ0JBQWdCLEdBQUcsZUFBZSxDQUFDLElBQUksS0FBSyxjQUFjLENBQUMsWUFBWSxFQUFFO0FBQ3pFLG9CQUFvQixxQkFBcUIsR0FBRyxRQUFRLENBQUMsWUFBWSxDQUFDLGVBQWUsQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDLENBQUM7QUFDcEcsaUJBQWlCO0FBQ2pCO0FBQ0EsZ0JBQWdCLHFCQUFxQixDQUFDLElBQUksQ0FBQyxNQUFNO0FBQ2pELG9CQUFvQixNQUFNLGNBQWMsR0FBRyx1QkFBdUIsQ0FBQyxnQ0FBZ0MsQ0FBQyxNQUFNLENBQUMsYUFBYSxDQUFDLENBQUM7QUFDMUgsb0JBQW9CLGVBQWUsQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLE1BQU0sRUFBRSxjQUFjLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTTtBQUM5Rix3QkFBd0IsOEJBQThCLEVBQUUsQ0FBQztBQUN6RCxxQkFBcUIsQ0FBQyxDQUFDO0FBQ3ZCLGlCQUFpQixDQUFDLENBQUM7QUFDbkIsYUFBYSxDQUFDLENBQUM7QUFDZixTQUFTLENBQUM7QUFDVixLQUFLO0FBQ0w7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBSSxPQUFPLGdDQUFnQyxDQUFDLGFBQWEsRUFBRTtBQUMzRDtBQUNBLFFBQVEsTUFBTSx5QkFBeUIsR0FBRyxJQUFJLEdBQUcsRUFBRSxDQUFDO0FBQ3BEO0FBQ0EsUUFBUSxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUMsS0FBSyxFQUFFLEdBQUcsS0FBSztBQUM5QztBQUNBO0FBQ0EsWUFBWSxNQUFNLFdBQVcsR0FBRyxLQUFLLENBQUM7QUFDdEM7QUFDQSxZQUFZLEdBQUcsV0FBVyxDQUFDLEtBQUssS0FBSyxVQUFVLENBQUMsR0FBRyxFQUFFO0FBQ3JELGdCQUFnQix5QkFBeUIsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLFdBQVcsQ0FBQyxDQUFDO0FBQ2hFLGdCQUFnQixXQUFXLENBQUMsS0FBSyxHQUFHLFVBQVUsQ0FBQyxVQUFVLENBQUM7QUFDMUQsYUFBYTtBQUNiLFNBQVMsQ0FBQyxDQUFDO0FBQ1g7QUFDQSxRQUFRLE9BQU8seUJBQXlCLENBQUM7QUFDekMsS0FBSztBQUNMO0FBQ0E7O0FDM0VZLElBQUlELGtCQUFNLENBQUMsaUJBQWlCLEVBQUU7QUFDMUM7QUFDTyxNQUFNLGVBQWUsU0FBUyxVQUFVLENBQUM7QUFDaEQ7QUFDQSxJQUFJLE9BQU8sS0FBSyxDQUFDLElBQUksRUFBRSxjQUFjLEVBQUU7QUFDdkMsUUFBUSxPQUFPLElBQUksZUFBZSxDQUFDLElBQUksRUFBRSxjQUFjLENBQUMsQ0FBQztBQUN6RCxLQUFLO0FBQ0w7QUFDQSxJQUFJLE9BQU8sT0FBTyxDQUFDLGNBQWMsRUFBRTtBQUNuQyxRQUFRLE9BQU8sSUFBSSxlQUFlLENBQUMsY0FBYyxDQUFDLElBQUksRUFBRSxjQUFjLENBQUMsQ0FBQztBQUN4RSxLQUFLO0FBQ0w7QUFDQSxJQUFJLFdBQVcsQ0FBQyxJQUFJLEVBQUUsY0FBYyxFQUFFO0FBQ3RDLFFBQVEsS0FBSyxDQUFDLElBQUksRUFBRSxjQUFjLENBQUMsQ0FBQztBQUNwQyxLQUFLO0FBQ0w7QUFDQSxJQUFJLGNBQWMsQ0FBQyxVQUFVLEdBQUcsRUFBRSxFQUFFO0FBQ3BDLFFBQVEsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUU7QUFDNUIsWUFBWSxHQUFHLFVBQVUsSUFBSSxVQUFVLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtBQUNwRCxnQkFBZ0IsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxVQUFVLENBQUMsQ0FBQztBQUN2RSxhQUFhLE1BQU07QUFDbkIsZ0JBQWdCLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7QUFDMUQsYUFBYTtBQUNiLFlBQVksT0FBTyxjQUFjLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQ3ZFLFNBQVM7QUFDVCxRQUFRLE9BQU8sY0FBYyxDQUFDLDBCQUEwQixDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUN4RSxLQUFLO0FBQ0w7QUFDQTs7QUM5QlksSUFBSUEsa0JBQU0sQ0FBQyxVQUFVLEVBQUU7QUFDbkM7QUFDQTtBQUNBO0FBQ0E7QUFDTyxNQUFNLFFBQVEsQ0FBQztBQUN0QjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFJLEdBQUcsQ0FBQyxVQUFVLEdBQUcsRUFBRSxFQUFFO0FBQ3pCLFFBQVEsT0FBTyxJQUFJLENBQUM7QUFDcEIsS0FBSztBQUNMO0FBQ0E7O0FDaEJPLE1BQU0sY0FBYyxDQUFDO0FBQzVCO0FBQ0EsSUFBSSxXQUFXLGFBQWEsR0FBRyxFQUFFLE9BQU8sQ0FBQyxDQUFDLEVBQUU7QUFDNUMsSUFBSSxXQUFXLGFBQWEsR0FBRyxFQUFFLE9BQU8sQ0FBQyxDQUFDLEVBQUU7QUFDNUM7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQUksT0FBTyxjQUFjLENBQUMsSUFBSSxFQUFFLGNBQWMsRUFBRSxVQUFVLEdBQUcsRUFBRSxFQUFFO0FBQ2pFLFFBQVEsT0FBTyxJQUFJLGNBQWMsQ0FBQyxJQUFJLEVBQUUsY0FBYyxFQUFFLGNBQWMsQ0FBQyxhQUFhLEVBQUUsVUFBVSxDQUFDLENBQUM7QUFDbEcsS0FBSztBQUNMO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBSSxPQUFPLFFBQVEsQ0FBQyxjQUFjLEVBQUUsVUFBVSxHQUFHLEVBQUUsRUFBRTtBQUNyRCxRQUFRLE9BQU8sSUFBSSxjQUFjLENBQUMsY0FBYyxDQUFDLElBQUksRUFBRSxjQUFjLEVBQUUsY0FBYyxDQUFDLGFBQWEsRUFBRSxVQUFVLENBQUMsQ0FBQztBQUNqSCxLQUFLO0FBQ0w7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFJLE9BQU8sY0FBYyxDQUFDLElBQUksRUFBRSxjQUFjLEVBQUU7QUFDaEQsUUFBUSxPQUFPLElBQUksY0FBYyxDQUFDLElBQUksRUFBRSxjQUFjLEVBQUUsY0FBYyxDQUFDLGFBQWEsQ0FBQyxDQUFDO0FBQ3RGLEtBQUs7QUFDTDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFJLE9BQU8sUUFBUSxDQUFDLGNBQWMsRUFBRTtBQUNwQyxRQUFRLE9BQU8sSUFBSSxjQUFjLENBQUMsY0FBYyxDQUFDLElBQUksRUFBRSxjQUFjLEVBQUUsY0FBYyxDQUFDLGFBQWEsQ0FBQyxDQUFDO0FBQ3JHLEtBQUs7QUFDTDtBQUNBLElBQUksV0FBVyxDQUFDLElBQUksRUFBRSxjQUFjLEVBQUUsSUFBSSxHQUFHLGNBQWMsQ0FBQyxhQUFhLEVBQUUsVUFBVSxHQUFHLElBQUksRUFBRTtBQUM5RixRQUFRLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO0FBQ3pCLFFBQVEsSUFBSSxDQUFDLGNBQWMsR0FBRyxjQUFjLENBQUM7QUFDN0MsUUFBUSxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQztBQUN6QixRQUFRLElBQUksQ0FBQyxVQUFVLEdBQUcsVUFBVSxDQUFDO0FBQ3JDLEtBQUs7QUFDTDtBQUNBOztBQ3RETyxNQUFNLGlCQUFpQixDQUFDO0FBQy9CO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQUksT0FBTyxDQUFDLFFBQVEsRUFBRTtBQUN0QixRQUFRLE9BQU8sT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDO0FBQ2pDLEtBQUs7QUFDTDtBQUNBOztBQ0pZLElBQUlBLGtCQUFNLENBQUMsMkJBQTJCLEVBQUU7QUFDcEQ7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDTyxNQUFNLHlCQUF5QixDQUFDO0FBQ3ZDO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQUksT0FBTyxPQUFPLENBQUMsUUFBUSxFQUFFLE1BQU0sRUFBRTtBQUNyQyxRQUFRLE1BQU0scUJBQXFCLEdBQUcsSUFBSUUsZ0JBQUksQ0FBQyxNQUFNLENBQUMsa0JBQWtCLENBQUMsQ0FBQztBQUMxRSxRQUFRLE9BQU8scUJBQXFCLENBQUMsWUFBWSxDQUFDLENBQUMsYUFBYSxFQUFFLE1BQU0sS0FBSztBQUM3RTtBQUNBLFlBQVksTUFBTSxVQUFVLEdBQUcsY0FBYyxDQUFDLGdCQUFnQixDQUFDLGFBQWEsRUFBRSxNQUFNLENBQUMsQ0FBQztBQUN0RjtBQUNBO0FBQ0EsWUFBWSxNQUFNLGVBQWUsR0FBRyxVQUFVLENBQUMsY0FBYyxFQUFFLENBQUM7QUFDaEU7QUFDQSxZQUFZLE9BQU8sZUFBZSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDOUQsU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFDO0FBQ2pCLEtBQUs7QUFDTDtBQUNBOztBQzdCQTtBQUNBO0FBQ0E7QUFDTyxNQUFNLGFBQWEsU0FBUyxRQUFRLENBQUM7QUFDNUM7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFJLFdBQVcsQ0FBQyxVQUFVLEVBQUUsUUFBUSxFQUFFLE1BQU0sRUFBRTtBQUM5QztBQUNBLFFBQVEsS0FBSyxFQUFFLENBQUM7QUFDaEI7QUFDQTtBQUNBLFFBQVEsSUFBSSxDQUFDLFVBQVUsR0FBRyxVQUFVLENBQUM7QUFDckM7QUFDQTtBQUNBLFFBQVEsSUFBSSxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUM7QUFDakM7QUFDQTtBQUNBLFFBQVEsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUM7QUFDN0IsS0FBSztBQUNMO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQUksR0FBRyxDQUFDLFVBQVUsR0FBRyxFQUFFLEVBQUU7QUFDekI7QUFDQTtBQUNBLFFBQVEsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxjQUFjLENBQUMsVUFBVSxDQUFDLENBQUM7QUFDMUU7QUFDQSxRQUFRLElBQUksY0FBYyxDQUFDLElBQUksS0FBSyxjQUFjLENBQUMsWUFBWSxFQUFFO0FBQ2pFLFlBQVksT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FBQyxjQUFjLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUNwRixTQUFTO0FBQ1QsUUFBUSxPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQ3hELEtBQUs7QUFDTDtBQUNBOztBQ3JDQSxNQUFNLEdBQUcsR0FBRyxJQUFJRixrQkFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDO0FBQ3hDO0FBQ08sTUFBTSxhQUFhLFNBQVMsUUFBUSxDQUFDO0FBQzVDO0FBQ0EsSUFBSSxPQUFPLE1BQU0sQ0FBQyxNQUFNLEVBQUUsTUFBTSxFQUFFO0FBQ2xDLFFBQVEsT0FBTyxRQUFRLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQztBQUNyRCxLQUFLO0FBQ0w7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFJLE9BQU8sV0FBVyxHQUFHO0FBQ3pCLFFBQVEsT0FBTyxRQUFRLENBQUM7QUFDeEIsS0FBSztBQUNMO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQUksTUFBTSxZQUFZLENBQUMsWUFBWSxFQUFFLE1BQU0sRUFBRSxLQUFLLEdBQUcsQ0FBQyxFQUFFO0FBQ3hELFFBQVEsSUFBSSxDQUFDLFlBQVksRUFBRTtBQUMzQixZQUFZLE1BQU0sS0FBSyxDQUFDLHVCQUF1QixDQUFDLENBQUM7QUFDakQsU0FBUztBQUNULFFBQVEsSUFBSSxDQUFDLE1BQU0sRUFBRTtBQUNyQixZQUFZLE1BQU0sS0FBSyxDQUFDLGdCQUFnQixDQUFDLENBQUM7QUFDMUMsU0FBUztBQUNULFFBQVEsSUFBSSxDQUFDLE1BQU0sQ0FBQyxXQUFXLEVBQUUsRUFBRTtBQUNuQyxZQUFZLE1BQU0sS0FBSyxDQUFDLHNCQUFzQixDQUFDLENBQUM7QUFDaEQsU0FBUztBQUNULFFBQVEsSUFBSSxLQUFLLEdBQUcsRUFBRSxFQUFFO0FBQ3hCLFlBQVksTUFBTSxLQUFLLENBQUMsOEJBQThCLENBQUMsQ0FBQztBQUN4RCxTQUFTO0FBQ1QsUUFBUSxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUM7QUFDOUIsUUFBUSxNQUFNLGdCQUFnQixHQUFHLElBQUlFLGdCQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDO0FBQ3JFO0FBQ0EsUUFBUSxNQUFNLGdCQUFnQixDQUFDLFlBQVksQ0FBQyxDQUFDLFNBQVMsRUFBRSxNQUFNLEtBQUs7QUFDbkUsZ0JBQWdCLE9BQU8sYUFBYSxDQUFDLGNBQWMsQ0FBQyxZQUFZLEVBQUUsU0FBUyxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsUUFBUSxDQUFDLENBQUM7QUFDdEcsU0FBUyxDQUFDLENBQUM7QUFDWCxRQUFRLE1BQU0seUJBQXlCLENBQUMsT0FBTyxDQUFDLFlBQVksRUFBRSxNQUFNLENBQUMsQ0FBQztBQUN0RSxRQUFRLE9BQU8sWUFBWSxDQUFDO0FBQzVCO0FBQ0EsS0FBSztBQUNMO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQUksT0FBTyxjQUFjLENBQUMsWUFBWSxFQUFFLFNBQVMsRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRTtBQUM1RSxRQUFRLE1BQU0sY0FBYyxHQUFHLFlBQVksQ0FBQyxTQUFTLENBQUMsQ0FBQztBQUN2RCxRQUFRLEdBQUcsRUFBRSxjQUFjLFlBQVksY0FBYyxDQUFDLEVBQUU7QUFDeEQsWUFBWSxPQUFPLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQztBQUNyQyxTQUFTO0FBQ1QsUUFBUSxJQUFJLGNBQWMsQ0FBQyxJQUFJLEtBQUssY0FBYyxDQUFDLGFBQWEsRUFBRTtBQUNsRSxZQUFZLGFBQWEsQ0FBQyxzQkFBc0IsQ0FBQyxZQUFZLEVBQUUsU0FBUyxFQUFFLE1BQU0sRUFBRSxRQUFRLENBQUMsQ0FBQztBQUM1RixZQUFZLE9BQU8sT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDO0FBQ3JDLFNBQVM7QUFDVCxRQUFRLE9BQU8sYUFBYSxDQUFDLHNCQUFzQixDQUFDLFlBQVksRUFBRSxTQUFTLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxRQUFRLENBQUMsQ0FBQztBQUN0RztBQUNBLEtBQUs7QUFDTDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQUksT0FBTyxzQkFBc0IsQ0FBQyxZQUFZLEVBQUUsU0FBUyxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUU7QUFDN0U7QUFDQTtBQUNBO0FBQ0EsUUFBUSxNQUFNLGNBQWMsR0FBRyxZQUFZLENBQUMsU0FBUyxDQUFDLENBQUM7QUFDdkQ7QUFDQTtBQUNBLFFBQVEsTUFBTSxVQUFVLEdBQUcsYUFBYSxDQUFDLGFBQWEsQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFLGNBQWMsQ0FBQyxjQUFjLEVBQUUsTUFBTSxDQUFDLENBQUM7QUFDbkg7QUFDQSxRQUFRLElBQUksQ0FBQyxVQUFVLEVBQUU7QUFDekIsWUFBWSxPQUFPO0FBQ25CLFNBQVM7QUFDVDtBQUNBLFFBQVEsWUFBWSxDQUFDLFNBQVMsQ0FBQyxHQUFHLElBQUksYUFBYSxDQUFDLFVBQVUsRUFBRSxRQUFRLEVBQUUsTUFBTSxDQUFDLENBQUM7QUFDbEYsS0FBSztBQUNMO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQUksT0FBTyxzQkFBc0IsQ0FBQyxZQUFZLEVBQUUsU0FBUyxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFO0FBQ3BGLFFBQVEsSUFBSSxhQUFhLEdBQUcsT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDO0FBQzlDO0FBQ0EsUUFBUSxNQUFNLGNBQWMsR0FBRyxZQUFZLENBQUMsU0FBUyxDQUFDLENBQUM7QUFDdkQ7QUFDQTtBQUNBLFFBQVEsTUFBTSxVQUFVLEdBQUcsYUFBYSxDQUFDLGFBQWEsQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFLGNBQWMsQ0FBQyxjQUFjLEVBQUUsTUFBTSxDQUFDLENBQUM7QUFDbkg7QUFDQTtBQUNBLFFBQVEsSUFBSSxDQUFDLFVBQVUsRUFBRTtBQUN6QixZQUFZLE9BQU87QUFDbkIsU0FBUztBQUNUO0FBQ0E7QUFDQSxRQUFRLE1BQU0sY0FBYyxHQUFHLFVBQVUsQ0FBQyxjQUFjLENBQUMsY0FBYyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQ3BGO0FBQ0EsUUFBUSxJQUFJLGNBQWMsQ0FBQyxJQUFJLEtBQUssY0FBYyxDQUFDLFlBQVksRUFBRTtBQUNqRSxZQUFZLGFBQWEsR0FBRyxRQUFRLENBQUMsWUFBWSxDQUFDLGNBQWMsQ0FBQyxRQUFRLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUM7QUFDNUYsU0FBUztBQUNULFFBQVEsWUFBWSxDQUFDLFNBQVMsQ0FBQyxHQUFHLGNBQWMsQ0FBQyxRQUFRLENBQUM7QUFDMUQsUUFBUSxPQUFPLGFBQWEsQ0FBQztBQUM3QixLQUFLO0FBQ0w7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQUksT0FBTyxhQUFhLENBQUMsSUFBSSxFQUFFLGNBQWMsRUFBRSxNQUFNLEVBQUU7QUFDdkQsUUFBUSxNQUFNLFVBQVUsR0FBRyxjQUFjLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxDQUFDO0FBQ3pFLFFBQVEsSUFBSSxVQUFVLEVBQUU7QUFDeEIsWUFBWSxPQUFPLFVBQVUsQ0FBQztBQUM5QixTQUFTO0FBQ1QsUUFBUSxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMseUJBQXlCLEVBQUUsSUFBSSxDQUFDLDhDQUE4QyxDQUFDLENBQUMsQ0FBQztBQUNwRyxRQUFRLE9BQU8sSUFBSSxDQUFDO0FBQ3BCLEtBQUs7QUFDTDtBQUNBLENBQUM7QUFDRDtBQUNBLE1BQU0sUUFBUSxHQUFHLElBQUksYUFBYSxFQUFFOztBQ2pKN0IsTUFBTSxlQUFlLENBQUM7QUFDN0I7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBSSxhQUFhLENBQUMsTUFBTSxFQUFFLGdCQUFnQixFQUFFO0FBQzVDLFFBQVEsT0FBTyxPQUFPLENBQUMsT0FBTyxFQUFFLENBQUM7QUFDakMsS0FBSztBQUNMO0FBQ0E7O0FDTlksSUFBSUYsa0JBQU0sQ0FBQyxRQUFRLEVBQUU7QUFDakM7QUFDTyxNQUFNLFdBQVcsU0FBUyxNQUFNLENBQUM7QUFDeEM7QUFDQSxJQUFJLFdBQVcsR0FBRztBQUNsQixRQUFRLEtBQUssRUFBRSxDQUFDO0FBQ2hCO0FBQ0E7QUFDQSxRQUFRLElBQUksQ0FBQyxTQUFTLEdBQUcsS0FBSyxDQUFDO0FBQy9CO0FBQ0E7QUFDQSxRQUFRLElBQUksQ0FBQyxhQUFhLEdBQUcsSUFBSSxHQUFHLEVBQUUsQ0FBQztBQUN2QztBQUNBO0FBQ0EsUUFBUSxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsSUFBSSxLQUFLLEVBQUUsQ0FBQztBQUM1QztBQUNBO0FBQ0EsUUFBUSxJQUFJLENBQUMsa0JBQWtCLEdBQUcsSUFBSSxLQUFLLEVBQUUsQ0FBQztBQUM5QyxLQUFLO0FBQ0w7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBSSxLQUFLLENBQUMsTUFBTSxFQUFFO0FBQ2xCLFFBQVEsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUM7QUFDOUI7QUFDQSxRQUFRLElBQUksQ0FBQyxhQUFhLEdBQUdHLG9CQUFRO0FBQ3JDLGFBQWEsS0FBSyxDQUFDLElBQUksQ0FBQyxhQUFhLEVBQUUsTUFBTSxDQUFDLGFBQWEsQ0FBQyxDQUFDO0FBQzdELFFBQVEsSUFBSSxDQUFDLGdCQUFnQixHQUFHQyxzQkFBVTtBQUMxQyxhQUFhLEtBQUssQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsTUFBTSxDQUFDLGdCQUFnQixDQUFDLENBQUM7QUFDbkUsUUFBUSxJQUFJLENBQUMsa0JBQWtCLEdBQUdBLHNCQUFVO0FBQzVDLGFBQWEsS0FBSyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxNQUFNLENBQUMsa0JBQWtCLENBQUMsQ0FBQztBQUN2RTtBQUNBLFFBQVEsT0FBTyxJQUFJLENBQUM7QUFDcEIsS0FBSztBQUNMO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQUksYUFBYSxDQUFDLFVBQVUsRUFBRTtBQUM5QixRQUFRLElBQUksQ0FBQyxTQUFTLEdBQUcsS0FBSyxDQUFDO0FBQy9CLFFBQVEsSUFBSSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRSxVQUFVLENBQUMsQ0FBQztBQUM1RCxRQUFRLE9BQU8sSUFBSSxDQUFDO0FBQ3BCLEtBQUs7QUFDTDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFJLGtCQUFrQixDQUFDLGVBQWUsRUFBRTtBQUN4QyxRQUFRLElBQUksQ0FBQyxnQkFBZ0IsR0FBR0Esc0JBQVUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLGdCQUFnQixFQUFFLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUM1RixRQUFRLE9BQU8sSUFBSSxDQUFDLGFBQWEsQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUM7QUFDNUUsS0FBSztBQUNMO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQUksb0JBQW9CLENBQUMsaUJBQWlCLEVBQUU7QUFDNUMsUUFBUSxJQUFJLENBQUMsa0JBQWtCLEdBQUdBLHNCQUFVLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUNsRyxRQUFRLE9BQU8sSUFBSSxDQUFDLGFBQWEsQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQztBQUM5RSxLQUFLO0FBQ0w7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBSSxnQkFBZ0IsQ0FBQyxlQUFlLEVBQUU7QUFDdEMsUUFBUSxJQUFJLENBQUMsU0FBUyxHQUFHLEtBQUssQ0FBQztBQUMvQixRQUFRLGVBQWUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxVQUFVLEtBQUs7QUFDaEQsWUFBWSxJQUFJLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLFVBQVUsQ0FBQyxDQUFDO0FBQ2hFLFNBQVMsQ0FBQyxDQUFDO0FBQ1gsUUFBUSxPQUFPLElBQUksQ0FBQztBQUNwQixLQUFLO0FBQ0w7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBSSxxQkFBcUIsQ0FBQyxvQkFBb0IsRUFBRTtBQUNoRCxRQUFRLG9CQUFvQixDQUFDLE9BQU8sQ0FBQyxDQUFDLGVBQWUsS0FBSztBQUMxRCxZQUFZLElBQUksQ0FBQyxnQkFBZ0IsR0FBR0Esc0JBQVUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLGdCQUFnQixFQUFFLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUNoRyxZQUFZLElBQUksQ0FBQyxhQUFhLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDO0FBQ3pFLFNBQVMsQ0FBQyxDQUFDO0FBQ1gsUUFBUSxPQUFPLElBQUksQ0FBQztBQUNwQixLQUFLO0FBQ0w7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBSSx1QkFBdUIsQ0FBQyxzQkFBc0IsRUFBRTtBQUNwRCxRQUFRLHNCQUFzQixDQUFDLE9BQU8sQ0FBQyxDQUFDLGlCQUFpQixLQUFLO0FBQzlELFlBQVksSUFBSSxDQUFDLGtCQUFrQixHQUFHQSxzQkFBVSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLEVBQUUsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDdEcsWUFBWSxJQUFJLENBQUMsYUFBYSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDO0FBQzNFLFNBQVMsQ0FBQyxDQUFDO0FBQ1gsUUFBUSxPQUFPLElBQUksQ0FBQztBQUNwQixLQUFLO0FBQ0w7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFJLFdBQVcsR0FBRztBQUNsQixRQUFRLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQztBQUM5QixLQUFLO0FBQ0w7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFJLFFBQVEsR0FBRztBQUNmLFFBQVEsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUM7QUFDOUIsUUFBUSxPQUFPLHVCQUF1QixDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsYUFBYSxDQUFDLFdBQVcsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDO0FBQ3pHLEtBQUs7QUFDTDtBQUNBOztBQ2pJWSxJQUFJSixrQkFBTSxDQUFDLDJCQUEyQixFQUFFO0FBQ3BEO0FBQ0E7QUFDQTtBQUNBO0FBQ08sTUFBTSx5QkFBeUIsU0FBUyxpQkFBaUIsQ0FBQztBQUNqRTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFJLE9BQU8sQ0FBQyxRQUFRLEVBQUU7QUFDdEIsUUFBUSxJQUFJLFFBQVEsR0FBRyxJQUFJLENBQUM7QUFDNUIsUUFBUSxHQUFHLFFBQVEsQ0FBQyxVQUFVLEVBQUU7QUFDaEMsWUFBWSxRQUFRLEdBQUcsUUFBUSxDQUFDLFVBQVUsRUFBRSxDQUFDO0FBQzdDLFNBQVM7QUFDVCxRQUFRLElBQUksQ0FBQyxRQUFRLEVBQUU7QUFDdkIsWUFBWSxRQUFRLEdBQUcsSUFBSSxPQUFPLENBQUMsQ0FBQyxPQUFPLENBQUMsTUFBTSxLQUFLLEVBQUUsT0FBTyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7QUFDdkUsU0FBUztBQUNULFFBQVEsSUFBSSxDQUFDLFFBQVEsWUFBWSxPQUFPLEVBQUU7QUFDMUMsWUFBWSxNQUFNLGdFQUFnRTtBQUNsRixTQUFTO0FBQ1QsUUFBUSxPQUFPLFFBQVEsQ0FBQztBQUN4QixLQUFLO0FBQ0w7QUFDQTs7QUMzQk8sTUFBTSxVQUFVLFNBQVMsVUFBVSxDQUFDO0FBQzNDO0FBQ0EsSUFBSSxPQUFPLEtBQUssQ0FBQyxJQUFJLEVBQUUsY0FBYyxFQUFFLFFBQVEsRUFBRTtBQUNqRCxRQUFRLE9BQU8sSUFBSSxVQUFVLENBQUMsSUFBSSxFQUFFLGNBQWMsRUFBRSxRQUFRLENBQUMsQ0FBQztBQUM5RCxLQUFLO0FBQ0w7QUFDQSxJQUFJLE9BQU8sT0FBTyxDQUFDLGNBQWMsRUFBRSxRQUFRLEVBQUU7QUFDN0MsUUFBUSxPQUFPLElBQUksVUFBVSxDQUFDLGNBQWMsQ0FBQyxJQUFJLEVBQUUsY0FBYyxFQUFFLFFBQVEsQ0FBQyxDQUFDO0FBQzdFLEtBQUs7QUFDTDtBQUNBLElBQUksV0FBVyxDQUFDLElBQUksRUFBRSxjQUFjLEVBQUUsUUFBUSxFQUFFO0FBQ2hELFFBQVEsS0FBSyxDQUFDLElBQUksRUFBRSxjQUFjLENBQUMsQ0FBQztBQUNwQyxRQUFRLElBQUksQ0FBQyxRQUFRLEdBQUcsUUFBUSxDQUFDO0FBQ2pDLEtBQUs7QUFDTDtBQUNBLElBQUksY0FBYyxDQUFDLFVBQVUsR0FBRyxFQUFFLEVBQUU7QUFDcEM7QUFDQSxLQUFLO0FBQ0w7QUFDQTs7QUNsQk8sTUFBTSxlQUFlLFNBQVMsVUFBVSxDQUFDO0FBQ2hEO0FBQ0EsSUFBSSxPQUFPLEtBQUssQ0FBQyxJQUFJLEVBQUUsY0FBYyxFQUFFO0FBQ3ZDLFFBQVEsT0FBTyxJQUFJLGVBQWUsQ0FBQyxJQUFJLEVBQUUsY0FBYyxDQUFDLENBQUM7QUFDekQsS0FBSztBQUNMO0FBQ0EsSUFBSSxPQUFPLE9BQU8sQ0FBQyxjQUFjLEVBQUU7QUFDbkMsUUFBUSxPQUFPLElBQUksZUFBZSxDQUFDLGNBQWMsQ0FBQyxJQUFJLEVBQUUsY0FBYyxDQUFDLENBQUM7QUFDeEUsS0FBSztBQUNMO0FBQ0EsSUFBSSxXQUFXLENBQUMsSUFBSSxFQUFFLGNBQWMsRUFBRTtBQUN0QyxRQUFRLEtBQUssQ0FBQyxJQUFJLEVBQUUsY0FBYyxDQUFDLENBQUM7QUFDcEMsS0FBSztBQUNMO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBSSxjQUFjLENBQUMsVUFBVSxHQUFHLEVBQUUsRUFBRTtBQUNwQyxRQUFRLElBQUksUUFBUSxHQUFHLElBQUksQ0FBQztBQUM1QixRQUFRLEdBQUcsVUFBVSxJQUFJLFVBQVUsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO0FBQ2hELFlBQVksUUFBUSxHQUFHLElBQUksSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLFVBQVUsQ0FBQyxDQUFDO0FBQzlELFNBQVMsTUFBTTtBQUNmLFlBQVksUUFBUSxHQUFHLElBQUksSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO0FBQ2pELFNBQVM7QUFDVCxRQUFRLE9BQU8sY0FBYyxDQUFDLHFCQUFxQixDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQzlELEtBQUs7QUFDTDtBQUNBO0FBQ0E7O0FDN0JPLE1BQU0sY0FBYyxDQUFDO0FBQzVCO0FBQ0EsSUFBSSxPQUFPLFNBQVMsQ0FBQztBQUNyQjtBQUNBLElBQUksV0FBVyxHQUFHO0FBQ2xCO0FBQ0EsUUFBUSxJQUFJLENBQUMsaUJBQWlCLEdBQUcsSUFBSSxHQUFHLEVBQUUsQ0FBQztBQUMzQyxLQUFLO0FBQ0w7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQUksT0FBTyxRQUFRLEdBQUc7QUFDdEIsUUFBUSxJQUFJLENBQUMsY0FBYyxDQUFDLFNBQVMsRUFBRTtBQUN2QyxZQUFZLGNBQWMsQ0FBQyxTQUFTLEdBQUcsSUFBSSxjQUFjLEVBQUUsQ0FBQztBQUM1RCxTQUFTO0FBQ1QsUUFBUSxPQUFPLGNBQWMsQ0FBQyxTQUFTLENBQUM7QUFDeEMsS0FBSztBQUNMO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQUksYUFBYSxDQUFDLFFBQVEsRUFBRSxVQUFVLEVBQUU7QUFDeEMsUUFBUSxJQUFJLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsRUFBRTtBQUNuRCxZQUFZLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLElBQUksR0FBRyxFQUFFLENBQUMsQ0FBQztBQUM1RCxTQUFTO0FBQ1QsUUFBUSxJQUFJLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxFQUFFO0FBQ3hFLFlBQVksSUFBSSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRSxVQUFVLENBQUMsQ0FBQztBQUNsRixTQUFTO0FBQ1QsS0FBSztBQUNMO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQUksd0JBQXdCLENBQUMsUUFBUSxFQUFFO0FBQ3ZDLFFBQVEsSUFBSSxJQUFJLENBQUMsaUJBQWlCLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxFQUFFO0FBQ2xELFlBQVksT0FBTyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQztBQUM3RSxTQUFTO0FBQ1QsUUFBUSxPQUFPLEVBQUUsQ0FBQztBQUNsQixLQUFLO0FBQ0w7QUFDQTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OzsifQ==
