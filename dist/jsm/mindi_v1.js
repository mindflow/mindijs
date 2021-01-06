import { Logger, Map, List } from './coreutil_v1.js';

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

/**
 * Utilities for accessing a Config object
 */

const LOG = new Logger("ConfigAccessor");

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

const LOG$1 = new Logger("ConfigProcessorExecutor");

/**
 * Executes the provided config processors on the provided config registry
 * Returns a list of promises for when the config processors has completed running
 * 
 * A config processor reads the config and performs any necessary actions based on
 * class and type information. A config processor does not operate on managed instances
 */
class ConfigProcessorExecutor {
    
    /**
     * @param {List} configProcessorClassNameList
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
        const unconfiguredConfigEntries = new Map();

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

const LOG$2 = new Logger("SingletonConfig");

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

const LOG$3 = new Logger("Provider");

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

const LOG$4 = new Logger("InstanceProcessorExecutor");

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

const LOG$5 = new Logger("MindiInjector");

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
        const objectFieldNames = new List(Object.keys(targetObject));
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

const LOG$6 = new Logger("Config");

class MindiConfig extends Config {

    constructor() {
        super();
        this.finalized = false;
        /** @type {Map} */
        this.configEntries = new Map();
        this.configProcessors = new List();
        this.instanceProcessors = new List();
    }

    /**
     * 
     * @param {Config} config
     * @returns {MindiConfig}
     */
    merge(config) {
        this.finalized = true;
        const newConfigEntries = new Map();
        newConfigEntries.addAll(this.configEntries);
        newConfigEntries.addAll(config.configEntries);

        const newConfigProcessors = new List();
        newConfigProcessors.addAll(this.configProcessors);
        newConfigProcessors.addAll(config.configProcessors);

        const newInstanceProcessors = new List();
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
     * @param {List} typeConfigList
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
     * @param {List} configProcessorList
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
     * @param {List} instanceProcessorList 
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

const LOG$7 = new Logger("InstancePostConfigTrigger");

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

export { Config, ConfigAccessor, ConfigProcessor, ConfigProcessorExecutor, InjectionPoint, Injector, InstanceHolder, InstancePostConfigTrigger, InstanceProcessor, InstanceProcessorExecutor, MindiConfig, MindiInjector, MindiProvider, PoolConfig, PrototypeConfig, Provider, SingletonConfig, TypeConfig };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWluZGlfdjEuanMiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9taW5kaS9jb25maWcuanMiLCIuLi8uLi9zcmMvbWluZGkvdHlwZUNvbmZpZy9pbnN0YW5jZUhvbGRlci5qcyIsIi4uLy4uL3NyYy9taW5kaS90eXBlQ29uZmlnL3R5cGVDb25maWcuanMiLCIuLi8uLi9zcmMvbWluZGkvY29uZmlnQWNjZXNzb3IuanMiLCIuLi8uLi9zcmMvbWluZGkvaW5qZWN0b3IuanMiLCIuLi8uLi9zcmMvbWluZGkvY29uZmlnUHJvY2Vzc29yL2NvbmZpZ1Byb2Nlc3NvckV4ZWN1dG9yLmpzIiwiLi4vLi4vc3JjL21pbmRpL3R5cGVDb25maWcvc2luZ2xldG9uQ29uZmlnLmpzIiwiLi4vLi4vc3JjL21pbmRpL2FwaS9wcm92aWRlci5qcyIsIi4uLy4uL3NyYy9taW5kaS9hcGkvaW5qZWN0aW9uUG9pbnQuanMiLCIuLi8uLi9zcmMvbWluZGkvaW5zdGFuY2VQcm9jZXNzb3IvaW5zdGFuY2VQcm9jZXNzb3JFeGVjdXRvci5qcyIsIi4uLy4uL3NyYy9taW5kaS9taW5kaVByb3ZpZGVyLmpzIiwiLi4vLi4vc3JjL21pbmRpL21pbmRpSW5qZWN0b3IuanMiLCIuLi8uLi9zcmMvbWluZGkvaW5zdGFuY2VQcm9jZXNzb3IvaW5zdGFuY2VQcm9jZXNzb3IuanMiLCIuLi8uLi9zcmMvbWluZGkvY29uZmlnUHJvY2Vzc29yL2NvbmZpZ1Byb2Nlc3Nvci5qcyIsIi4uLy4uL3NyYy9taW5kaS9taW5kaUNvbmZpZy5qcyIsIi4uLy4uL3NyYy9taW5kaS9pbnN0YW5jZVByb2Nlc3Nvci9pbnN0YW5jZVBvc3RDb25maWdUcmlnZ2VyLmpzIiwiLi4vLi4vc3JjL21pbmRpL3R5cGVDb25maWcvcG9vbENvbmZpZy5qcyIsIi4uLy4uL3NyYy9taW5kaS90eXBlQ29uZmlnL3Byb3RvdHlwZUNvbmZpZy5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyJleHBvcnQgY2xhc3MgQ29uZmlnIHtcclxuXHJcbiAgICBjb25zdHJ1Y3RvcigpIHtcclxuICAgICAgICAvKiogQHR5cGUge01hcH0gKi9cclxuICAgICAgICB0aGlzLmNvbmZpZ0VudHJpZXMgPSBudWxsO1xyXG5cclxuICAgICAgICAvKiogQHR5cGUge0xpc3R9ICovXHJcbiAgICAgICAgdGhpcy5jb25maWdQcm9jZXNzb3JzID0gbnVsbDtcclxuXHJcbiAgICAgICAgLyoqIEB0eXBlIHtMaXN0fSAqL1xyXG4gICAgICAgIHRoaXMuaW5zdGFuY2VQcm9jZXNzb3JzID0gbnVsbDtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIEByZXR1cm5zIHtQcm9taXNlfVxyXG4gICAgICovXHJcbiAgICBmaW5hbGl6ZSgpIHtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cclxuICAgICAqL1xyXG4gICAgaXNGaW5hbGl6ZWQoKSB7XHJcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG59IiwiZXhwb3J0IGNsYXNzIEluc3RhbmNlSG9sZGVyIHtcclxuXHJcbiAgICBzdGF0aWMgZ2V0IE5FV19JTlNUQU5DRSgpIHsgcmV0dXJuIDA7IH1cclxuXHJcbiAgICBzdGF0aWMgZ2V0IEVYSVNUSU5HX0lOU1RBTkNFKCkgeyByZXR1cm4gMTsgfVxyXG5cclxuICAgIHN0YXRpYyBob2xkZXJXaXRoTmV3SW5zdGFuY2UoaW5zdGFuY2UpIHtcclxuICAgICAgICByZXR1cm4gbmV3IEluc3RhbmNlSG9sZGVyKGluc3RhbmNlLCBJbnN0YW5jZUhvbGRlci5ORVdfSU5TVEFOQ0UpO1xyXG4gICAgfVxyXG5cclxuICAgIHN0YXRpYyBob2xkZXJXaXRoRXhpc3RpbmdJbnN0YW5jZShpbnN0YW5jZSkge1xyXG4gICAgICAgIHJldHVybiBuZXcgSW5zdGFuY2VIb2xkZXIoaW5zdGFuY2UsIEluc3RhbmNlSG9sZGVyLkVYSVNUSU5HX0lOU1RBTkNFKTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdHJ1Y3RvcihpbnN0YW5jZSwgdHlwZSkge1xyXG4gICAgICAgIHRoaXMuaW5zdGFuY2UgPSBpbnN0YW5jZTtcclxuICAgICAgICB0aGlzLnR5cGUgPSB0eXBlO1xyXG4gICAgfVxyXG5cclxufSIsImV4cG9ydCBjbGFzcyBUeXBlQ29uZmlnIHtcclxuXHJcbiAgICBzdGF0aWMgZ2V0IE5FVygpIHsgcmV0dXJuIFwiTkVXXCI7IH1cclxuICAgIHN0YXRpYyBnZXQgQ09ORklHVVJFRCgpIHsgcmV0dXJuIFwiQ09ORklHVVJFRFwiOyB9XHJcblxyXG4gICAgY29uc3RydWN0b3IobmFtZSwgY2xhc3NSZWZlcmVuY2UpIHtcclxuICAgICAgICB0aGlzLm5hbWUgPSBuYW1lO1xyXG4gICAgICAgIHRoaXMuY2xhc3NSZWZlcmVuY2UgPSBjbGFzc1JlZmVyZW5jZTtcclxuICAgICAgICB0aGlzLnN0YWdlID0gVHlwZUNvbmZpZy5ORVc7XHJcbiAgICB9XHJcblxyXG4gICAgaW5zdGFuY2VIb2xkZXIocGFyYW1ldGVycyA9IFtdKSB7XHJcbiAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICB9XHJcblxyXG59IiwiaW1wb3J0IHsgQ29uZmlnIH0gZnJvbSBcIi4vY29uZmlnLmpzXCI7XHJcbmltcG9ydCB7IExvZ2dlciB9IGZyb20gXCJjb3JldXRpbF92MVwiO1xyXG5pbXBvcnQgeyBJbnN0YW5jZUhvbGRlciB9IGZyb20gXCIuL3R5cGVDb25maWcvaW5zdGFuY2VIb2xkZXIuanNcIjtcclxuaW1wb3J0IHsgVHlwZUNvbmZpZyB9IGZyb20gXCIuL3R5cGVDb25maWcvdHlwZUNvbmZpZy5qc1wiO1xyXG5cclxuLyoqXHJcbiAqIFV0aWxpdGllcyBmb3IgYWNjZXNzaW5nIGEgQ29uZmlnIG9iamVjdFxyXG4gKi9cclxuXHJcbmNvbnN0IExPRyA9IG5ldyBMb2dnZXIoXCJDb25maWdBY2Nlc3NvclwiKTtcclxuXHJcbmV4cG9ydCBjbGFzcyBDb25maWdBY2Nlc3NvciB7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBHZXQgYW4gaW5zdGFuY2UgYnkgY2xhc3MgbmFtZSBpbiB0aGUgY29uZmlnXHJcbiAgICAgKiBcclxuICAgICAqIEBwYXJhbSB7Q29uZmlnfSBjb25maWcgXHJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbmFtZSBcclxuICAgICAqIEBwYXJhbSB7QXJyYXl9IHBhcmFtZXRlcnNcclxuICAgICAqIEByZXR1cm5zIHtJbnN0YW5jZUhvbGRlcn1cclxuICAgICAqL1xyXG4gICAgc3RhdGljIGluc3RhbmNlSG9sZGVyKG5hbWUsIGNvbmZpZywgcGFyYW1ldGVycyA9IFtdKSB7XHJcbiAgICAgICAgY29uc3QgdHlwZUNvbmZpZyA9IHRoaXMudHlwZUNvbmZpZ0J5TmFtZShuYW1lLCBjb25maWcpO1xyXG4gICAgICAgIGlmKHR5cGVDb25maWcgPT09IG51bGwpIHtcclxuICAgICAgICAgICAgTE9HLmVycm9yKFwiTm8gdHlwZWNvbmZpZyBmb3VuZCBmb3IgXCIgKyBuYW1lKTtcclxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNvbnN0IGluc3RhbmNlSG9sZGVyID0gdHlwZUNvbmZpZy5pbnN0YW5jZUhvbGRlcihwYXJhbWV0ZXJzKTtcclxuICAgICAgICBpZighaW5zdGFuY2VIb2xkZXIpIHtcclxuICAgICAgICAgICAgTE9HLmVycm9yKFwiTm8gb2JqZWN0IGZvdW5kIGZvciBcIiArIG5hbWUpO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gaW5zdGFuY2VIb2xkZXI7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBHZXQgdGhlIHR5cGUgY29uZmlnIGJ5IGNsYXNzIG5hbWUgaW4gdGhlIGNvbmZpZ1xyXG4gICAgICogXHJcbiAgICAgKiBAcGFyYW0ge0NvbmZpZ30gY29uZmlnIFxyXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG5hbWUgXHJcbiAgICAgKiBAcmV0dXJucyB7VHlwZUNvbmZpZ31cclxuICAgICAqL1xyXG4gICAgc3RhdGljIHR5cGVDb25maWdCeU5hbWUobmFtZSwgY29uZmlnKSB7XHJcbiAgICAgICAgbGV0IGNvbmZpZ0VudHJ5ID0gbnVsbDtcclxuICAgICAgICBjb25maWcuY29uZmlnRW50cmllcy5mb3JFYWNoKChrZXksIHZhbHVlLCBwYXJlbnQpID0+IHtcclxuICAgICAgICAgICAgaWYoa2V5ID09PSBuYW1lKSB7XHJcbiAgICAgICAgICAgICAgICBjb25maWdFbnRyeSA9IHZhbHVlO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgIH0sIHRoaXMpO1xyXG4gICAgICAgIGlmKCFjb25maWdFbnRyeSkge1xyXG4gICAgICAgICAgICBMT0cuZXJyb3IoXCJObyBjb25maWcgZW50cnkgZm91bmQgZm9yIFwiICsgbmFtZSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBjb25maWdFbnRyeTtcclxuICAgIH1cclxuXHJcbn0iLCJleHBvcnQgY2xhc3MgSW5qZWN0b3Ige1xyXG5cclxuXHJcbiAgICAvKipcclxuICAgICAqIEhlbHBlciBtZXRob2QgZm9yIGluamVjdGluZyBmaWVsZHMgaW4gdGFyZ2V0IG9iamVjdFxyXG4gICAgICogXHJcbiAgICAgKiBAcGFyYW0ge2FueX0gdGFyZ2V0T2JqZWN0IFxyXG4gICAgICogQHBhcmFtIHtDb25maWd9IGNvbmZpZyBcclxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBkZXB0aFxyXG4gICAgICogQHJldHVybnMge1Byb21pc2V9XHJcbiAgICAgKi9cclxuICAgIGluamVjdFRhcmdldCh0YXJnZXQsIGNvbmZpZywgZGVwdGggPSAwKSB7XHJcblxyXG4gICAgfVxyXG5cclxufSIsImltcG9ydCB7IE1hcCwgTG9nZ2VyLCBMaXN0IH0gZnJvbSBcImNvcmV1dGlsX3YxXCI7XHJcbmltcG9ydCB7IENvbmZpZyB9IGZyb20gXCIuLi9jb25maWcuanNcIjtcclxuaW1wb3J0IHsgQ29uZmlnQWNjZXNzb3IgfSBmcm9tIFwiLi4vY29uZmlnQWNjZXNzb3IuanNcIjtcclxuaW1wb3J0IHsgSW5qZWN0b3IgfSBmcm9tIFwiLi4vaW5qZWN0b3IuanNcIjtcclxuaW1wb3J0IHsgSW5zdGFuY2VIb2xkZXIgfSBmcm9tIFwiLi4vdHlwZUNvbmZpZy9pbnN0YW5jZUhvbGRlci5qc1wiO1xyXG5pbXBvcnQgeyBUeXBlQ29uZmlnIH0gZnJvbSBcIi4uL3R5cGVDb25maWcvdHlwZUNvbmZpZy5qc1wiO1xyXG5cclxuY29uc3QgTE9HID0gbmV3IExvZ2dlcihcIkNvbmZpZ1Byb2Nlc3NvckV4ZWN1dG9yXCIpO1xyXG5cclxuLyoqXHJcbiAqIEV4ZWN1dGVzIHRoZSBwcm92aWRlZCBjb25maWcgcHJvY2Vzc29ycyBvbiB0aGUgcHJvdmlkZWQgY29uZmlnIHJlZ2lzdHJ5XHJcbiAqIFJldHVybnMgYSBsaXN0IG9mIHByb21pc2VzIGZvciB3aGVuIHRoZSBjb25maWcgcHJvY2Vzc29ycyBoYXMgY29tcGxldGVkIHJ1bm5pbmdcclxuICogXHJcbiAqIEEgY29uZmlnIHByb2Nlc3NvciByZWFkcyB0aGUgY29uZmlnIGFuZCBwZXJmb3JtcyBhbnkgbmVjZXNzYXJ5IGFjdGlvbnMgYmFzZWQgb25cclxuICogY2xhc3MgYW5kIHR5cGUgaW5mb3JtYXRpb24uIEEgY29uZmlnIHByb2Nlc3NvciBkb2VzIG5vdCBvcGVyYXRlIG9uIG1hbmFnZWQgaW5zdGFuY2VzXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgQ29uZmlnUHJvY2Vzc29yRXhlY3V0b3Ige1xyXG4gICAgXHJcbiAgICAvKipcclxuICAgICAqIEBwYXJhbSB7TGlzdH0gY29uZmlnUHJvY2Vzc29yQ2xhc3NOYW1lTGlzdFxyXG4gICAgICogQHBhcmFtIHtJbmplY3Rvcn0gaW5qZWN0b3JcclxuICAgICAqIEBwYXJhbSB7Q29uZmlnfSBjb25maWdcclxuICAgICAqIEByZXR1cm5zIHtQcm9taXNlfSBwcm9taXNlIHdoaWNoIGlzIHJlc29sdmVkIHdoZW4gYWxsIGNvbmZpZyBwcm9jZXNzb3JzIGFyZSByZXNvbHZlZFxyXG4gICAgICovXHJcbiAgICBzdGF0aWMgZXhlY3V0ZShjb25maWdQcm9jZXNzb3JDbGFzc05hbWVMaXN0LCBpbmplY3RvciwgY29uZmlnKSB7XHJcbiAgICAgICAgcmV0dXJuIGNvbmZpZ1Byb2Nlc3NvckNsYXNzTmFtZUxpc3QucHJvbWlzZUNoYWluKChjb25maWdQcm9jZXNzb3JDbGFzc05hbWUsIHBhcmVudCkgPT4ge1xyXG4gICAgICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmVDb25maWdQcm9jZXNzb3JFeGVjdXRlZCwgcmVqZWN0KSA9PiB7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IHRhcmdldEluamVjdGVkUHJvbWlzZSA9IFByb21pc2UucmVzb2x2ZSgpO1xyXG5cclxuICAgICAgICAgICAgICAgIC8qKiAgQHR5cGUge0luc3RhbmNlSG9sZGVyfSAqL1xyXG4gICAgICAgICAgICAgICAgY29uc3QgcHJvY2Vzc29ySG9sZGVyID0gQ29uZmlnQWNjZXNzb3IuaW5zdGFuY2VIb2xkZXIoY29uZmlnUHJvY2Vzc29yQ2xhc3NOYW1lLCBjb25maWcpO1xyXG4gICAgICAgICAgICAgICAgaWYocHJvY2Vzc29ySG9sZGVyLnR5cGUgPT09IEluc3RhbmNlSG9sZGVyLk5FV19JTlNUQU5DRSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRhcmdldEluamVjdGVkUHJvbWlzZSA9IGluamVjdG9yLmluamVjdFRhcmdldChwcm9jZXNzb3JIb2xkZXIuaW5zdGFuY2UsIGNvbmZpZyk7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgdGFyZ2V0SW5qZWN0ZWRQcm9taXNlLnRoZW4oKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRvQ29uZmlndXJlTWFwID0gQ29uZmlnUHJvY2Vzc29yRXhlY3V0b3IucHJlcGFyZVVuY29uZmlndXJlZENvbmZpZ0VudHJpZXMoY29uZmlnLmNvbmZpZ0VudHJpZXMpO1xyXG4gICAgICAgICAgICAgICAgICAgIHByb2Nlc3NvckhvbGRlci5pbnN0YW5jZS5wcm9jZXNzQ29uZmlnKGNvbmZpZywgdG9Db25maWd1cmVNYXApLnRoZW4oKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlQ29uZmlnUHJvY2Vzc29yRXhlY3V0ZWQoKTtcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9KVxyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogXHJcbiAgICAgKiBAcGFyYW0ge01hcH0gY29uZmlnRW50cmllcyBcclxuICAgICAqIEByZXR1cm4ge01hcH1cclxuICAgICAqL1xyXG4gICAgc3RhdGljIHByZXBhcmVVbmNvbmZpZ3VyZWRDb25maWdFbnRyaWVzKGNvbmZpZ0VudHJpZXMpIHtcclxuICAgICAgICBjb25zdCB1bmNvbmZpZ3VyZWRDb25maWdFbnRyaWVzID0gbmV3IE1hcCgpO1xyXG5cclxuICAgICAgICBjb25maWdFbnRyaWVzLmZvckVhY2goKGtleSwgdmFsdWUsIHBhcmVudCkgPT4ge1xyXG5cclxuICAgICAgICAgICAgLyoqIEB0eXBlIHtUeXBlQ29uZmlnfSAqL1xyXG4gICAgICAgICAgICBjb25zdCBjb25maWdFbnRyeSA9IHZhbHVlO1xyXG5cclxuICAgICAgICAgICAgaWYoY29uZmlnRW50cnkuc3RhZ2UgPT09IFR5cGVDb25maWcuTkVXKSB7XHJcbiAgICAgICAgICAgICAgICB1bmNvbmZpZ3VyZWRDb25maWdFbnRyaWVzLnNldChrZXksIGNvbmZpZ0VudHJ5KTtcclxuICAgICAgICAgICAgICAgIGNvbmZpZ0VudHJ5LnN0YWdlID0gVHlwZUNvbmZpZy5DT05GSUdVUkVEO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICB9LCB0aGlzKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHVuY29uZmlndXJlZENvbmZpZ0VudHJpZXM7XHJcbiAgICB9XHJcblxyXG59IiwiaW1wb3J0IHsgVHlwZUNvbmZpZyB9IGZyb20gXCIuL3R5cGVDb25maWcuanNcIjtcclxuaW1wb3J0IHsgTG9nZ2VyIH0gZnJvbSBcImNvcmV1dGlsX3YxXCI7XHJcbmltcG9ydCB7IEluc3RhbmNlSG9sZGVyIH0gZnJvbSBcIi4vaW5zdGFuY2VIb2xkZXIuanNcIjtcclxuXHJcbmNvbnN0IExPRyA9IG5ldyBMb2dnZXIoXCJTaW5nbGV0b25Db25maWdcIik7XHJcblxyXG5leHBvcnQgY2xhc3MgU2luZ2xldG9uQ29uZmlnIGV4dGVuZHMgVHlwZUNvbmZpZyB7XHJcblxyXG4gICAgc3RhdGljIG5hbWVkKG5hbWUsIGNsYXNzUmVmZXJlbmNlKSB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBTaW5nbGV0b25Db25maWcobmFtZSwgY2xhc3NSZWZlcmVuY2UpO1xyXG4gICAgfVxyXG5cclxuICAgIHN0YXRpYyB1bm5hbWVkKGNsYXNzUmVmZXJlbmNlKSB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBTaW5nbGV0b25Db25maWcoY2xhc3NSZWZlcmVuY2UubmFtZSwgY2xhc3NSZWZlcmVuY2UpO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0cnVjdG9yKG5hbWUsIGNsYXNzUmVmZXJlbmNlKSB7XHJcbiAgICAgICAgc3VwZXIobmFtZSwgY2xhc3NSZWZlcmVuY2UpO1xyXG4gICAgfVxyXG5cclxuICAgIGluc3RhbmNlSG9sZGVyKHBhcmFtZXRlcnMgPSBbXSkge1xyXG4gICAgICAgIGlmICghdGhpcy5pbnN0YW5jZSkge1xyXG4gICAgICAgICAgICBpZihwYXJhbWV0ZXJzICYmIHBhcmFtZXRlcnMubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5pbnN0YW5jZSA9IG5ldyB0aGlzLmNsYXNzUmVmZXJlbmNlKC4uLnBhcmFtZXRlcnMpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5pbnN0YW5jZSA9IG5ldyB0aGlzLmNsYXNzUmVmZXJlbmNlKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIEluc3RhbmNlSG9sZGVyLmhvbGRlcldpdGhOZXdJbnN0YW5jZSh0aGlzLmluc3RhbmNlKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIEluc3RhbmNlSG9sZGVyLmhvbGRlcldpdGhFeGlzdGluZ0luc3RhbmNlKHRoaXMuaW5zdGFuY2UpO1xyXG4gICAgfVxyXG5cclxufSIsImltcG9ydCB7IExvZ2dlciB9IGZyb20gXCJjb3JldXRpbF92MVwiO1xyXG5cclxuY29uc3QgTE9HID0gbmV3IExvZ2dlcihcIlByb3ZpZGVyXCIpO1xyXG5cclxuLyoqXHJcbiAqIEB0ZW1wbGF0ZSBUXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgUHJvdmlkZXIge1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogXHJcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBwYXJhbWV0ZXJzIFxyXG4gICAgICogQHJldHVybnMge1Byb21pc2U8VD59XHJcbiAgICAgKi9cclxuICAgIGdldChwYXJhbWV0ZXJzID0gW10pIHtcclxuICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgIH1cclxuXHJcbn0iLCJpbXBvcnQgeyBQcm92aWRlciB9IGZyb20gXCIuL3Byb3ZpZGVyLmpzXCI7XHJcblxyXG5leHBvcnQgY2xhc3MgSW5qZWN0aW9uUG9pbnQge1xyXG5cclxuICAgIHN0YXRpYyBnZXQgSU5TVEFOQ0VfVFlQRSgpIHsgcmV0dXJuIDA7IH0gXHJcbiAgICBzdGF0aWMgZ2V0IFBST1ZJREVSX1RZUEUoKSB7IHJldHVybiAxOyB9IFxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQHRlbXBsYXRlIFRcclxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBuYW1lIFxyXG4gICAgICogQHBhcmFtIHtuZXcoKSA9PiBUfSBjbGFzc1JlZmVyZW5jZSBcclxuICAgICAqIEBwYXJhbSB7YXJyYXl9IHBhcmFtZXRlcnMgXHJcbiAgICAgKiBAcmV0dXJucyB7VH1cclxuICAgICAqL1xyXG4gICAgc3RhdGljIGluc3RhbmNlQnlOYW1lKG5hbWUsIGNsYXNzUmVmZXJlbmNlLCBwYXJhbWV0ZXJzID0gW10pIHtcclxuICAgICAgICByZXR1cm4gbmV3IEluamVjdGlvblBvaW50KG5hbWUsIGNsYXNzUmVmZXJlbmNlLCBJbmplY3Rpb25Qb2ludC5JTlNUQU5DRV9UWVBFLCBwYXJhbWV0ZXJzKTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIEB0ZW1wbGF0ZSBUXHJcbiAgICAgKiBAcGFyYW0ge25ldygpID0+IFR9IGNsYXNzUmVmZXJlbmNlIFxyXG4gICAgICogQHBhcmFtIHthcnJheX0gcGFyYW1ldGVycyBcclxuICAgICAqIEByZXR1cm5zIHtUfVxyXG4gICAgICovXHJcbiAgICBzdGF0aWMgaW5zdGFuY2UoY2xhc3NSZWZlcmVuY2UsIHBhcmFtZXRlcnMgPSBbXSkge1xyXG4gICAgICAgIHJldHVybiBuZXcgSW5qZWN0aW9uUG9pbnQoY2xhc3NSZWZlcmVuY2UubmFtZSwgY2xhc3NSZWZlcmVuY2UsIEluamVjdGlvblBvaW50LklOU1RBTkNFX1RZUEUsIHBhcmFtZXRlcnMpO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQHRlbXBsYXRlIFRcclxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBuYW1lIFxyXG4gICAgICogQHBhcmFtIHtuZXcoKSA9PiBUfSBjbGFzc1JlZmVyZW5jZSBcclxuICAgICAqIEByZXR1cm5zIHtQcm92aWRlcjxUPn1cclxuICAgICAqL1xyXG4gICAgc3RhdGljIHByb3ZpZGVyQnlOYW1lKG5hbWUsIGNsYXNzUmVmZXJlbmNlKSB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBJbmplY3Rpb25Qb2ludChuYW1lLCBjbGFzc1JlZmVyZW5jZSwgSW5qZWN0aW9uUG9pbnQuUFJPVklERVJfVFlQRSk7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBAdGVtcGxhdGUgVFxyXG4gICAgICogQHBhcmFtIHtuZXcoKSA9PiBUfSBjbGFzc1JlZmVyZW5jZSBcclxuICAgICAqIEByZXR1cm5zIHtQcm92aWRlcjxUPn1cclxuICAgICAqL1xyXG4gICAgc3RhdGljIHByb3ZpZGVyKGNsYXNzUmVmZXJlbmNlKSB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBJbmplY3Rpb25Qb2ludChjbGFzc1JlZmVyZW5jZS5uYW1lLCBjbGFzc1JlZmVyZW5jZSwgSW5qZWN0aW9uUG9pbnQuUFJPVklERVJfVFlQRSk7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3RydWN0b3IobmFtZSwgY2xhc3NSZWZlcmVuY2UsIHR5cGUgPSBJbmplY3Rpb25Qb2ludC5JTlNUQU5DRV9UWVBFLCBwYXJhbWV0ZXJzID0gbnVsbCkge1xyXG4gICAgICAgIHRoaXMubmFtZSA9IG5hbWU7XHJcbiAgICAgICAgdGhpcy5jbGFzc1JlZmVyZW5jZSA9IGNsYXNzUmVmZXJlbmNlO1xyXG4gICAgICAgIHRoaXMudHlwZSA9IHR5cGU7XHJcbiAgICAgICAgdGhpcy5wYXJhbWV0ZXJzID0gcGFyYW1ldGVycztcclxuICAgIH1cclxuXHJcbn0iLCJpbXBvcnQgeyBMb2dnZXIsIExpc3QgfSBmcm9tIFwiY29yZXV0aWxfdjFcIjtcclxuaW1wb3J0IHsgQ29uZmlnQWNjZXNzb3IgfSBmcm9tIFwiLi4vY29uZmlnQWNjZXNzb3IuanNcIjtcclxuaW1wb3J0IHsgQ29uZmlnIH0gZnJvbSBcIi4uL2NvbmZpZy5qc1wiO1xyXG5cclxuY29uc3QgTE9HID0gbmV3IExvZ2dlcihcIkluc3RhbmNlUHJvY2Vzc29yRXhlY3V0b3JcIik7XHJcblxyXG4vKipcclxuICogRXhlY3V0ZXMgdGhlIGNvbmZpZ3MgaW5zdGFuY2UgcHJvY2Vzc29ycyBvbiB0aGUgcHJvdmlkZWQgaW5zdGFuY2VcclxuICogUmV0dXJucyBhIHByb21pc2UgZm9yIHdoZW4gdGhlIGluc3RhbmNlIHByb2Nlc3NvcnMgaGFzIGNvbXBsZXRlZCBydW5uaW5nXHJcbiAqIFxyXG4gKiBJbnN0YW5jZSBwcm9jZXNzb3JzIHBlcmZvcm0gb3BlcmF0aW9ucyBvbiBtYW5hZ2VkIGluc3RhbmNlcyBhZnRlciB0aGV5IGhhdmUgYmVlbiBpbnN0YW5zaWF0ZWRcclxuICovXHJcbmV4cG9ydCBjbGFzcyBJbnN0YW5jZVByb2Nlc3NvckV4ZWN1dG9yIHtcclxuXHJcbiAgICAvKipcclxuICAgICAqIEBwYXJhbSB7TGlzdH0gaW5zdGFuY2VQcm9jZXNzb3JMaXN0IHRoZSBpbnN0YW5jZSBwcm9jZXNzb3JzXHJcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gaW5zdGFuY2UgdGhlIGluc3RhbmNlIHRvIHByb2Nlc3NcclxuICAgICAqIEBwYXJhbSB7Q29uZmlnfSBjb25maWdcclxuICAgICAqIEByZXR1cm5zIHtQcm9taXNlfVxyXG4gICAgICovXHJcbiAgICBzdGF0aWMgZXhlY3V0ZShpbnN0YW5jZSwgY29uZmlnKSB7XHJcbiAgICAgICAgcmV0dXJuIGNvbmZpZy5pbnN0YW5jZVByb2Nlc3NvcnMucHJvbWlzZUNoYWluKChwcm9jZXNzb3JOYW1lLCBwYXJlbnQpID0+IHtcclxuICAgICAgICAgICAgY29uc3QgcHJvY2Vzc29ySG9sZGVyID0gQ29uZmlnQWNjZXNzb3IuaW5zdGFuY2VIb2xkZXIocHJvY2Vzc29yTmFtZSwgY29uZmlnKTtcclxuICAgICAgICAgICAgcmV0dXJuIHByb2Nlc3NvckhvbGRlci5pbnN0YW5jZS5wcm9jZXNzKGluc3RhbmNlKTtcclxuICAgICAgICB9LCB0aGlzKTtcclxuICAgIH1cclxuXHJcbn0iLCJpbXBvcnQgeyBQcm92aWRlciB9IGZyb20gXCIuL2FwaS9wcm92aWRlci5qc1wiO1xyXG5pbXBvcnQgeyBUeXBlQ29uZmlnIH0gZnJvbSBcIi4vdHlwZUNvbmZpZy90eXBlQ29uZmlnLmpzXCI7XHJcbmltcG9ydCB7IEluc3RhbmNlSG9sZGVyIH0gZnJvbSBcIi4vdHlwZUNvbmZpZy9pbnN0YW5jZUhvbGRlci5qc1wiO1xyXG5pbXBvcnQgeyBJbmplY3RvciB9IGZyb20gXCIuL2luamVjdG9yLmpzXCI7XHJcbmltcG9ydCB7IENvbmZpZyB9IGZyb20gXCIuL2NvbmZpZy5qc1wiO1xyXG5pbXBvcnQgeyBDb25maWdBY2Nlc3NvciB9IGZyb20gXCIuL2NvbmZpZ0FjY2Vzc29yLmpzXCI7XHJcblxyXG4vKipcclxuICogQHRlbXBsYXRlIFRcclxuICovXHJcbmV4cG9ydCBjbGFzcyBNaW5kaVByb3ZpZGVyIGV4dGVuZHMgUHJvdmlkZXIge1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogXHJcbiAgICAgKiBAcGFyYW0ge1R5cGVDb25maWd9IHR5cGVDb25maWcgXHJcbiAgICAgKiBAcGFyYW0ge0luamVjdG9yfSBpbmplY3RvclxyXG4gICAgICogQHBhcmFtIHtDb25maWd9IGNvbmZpZ1xyXG4gICAgICovXHJcbiAgICBjb25zdHJ1Y3Rvcih0eXBlQ29uZmlnLCBpbmplY3RvciwgY29uZmlnKSB7XHJcblxyXG4gICAgICAgIHN1cGVyKCk7XHJcblxyXG4gICAgICAgIC8qKiBAdHlwZSB7VHlwZUNvbmZpZ30gKi9cclxuICAgICAgICB0aGlzLnR5cGVDb25maWcgPSB0eXBlQ29uZmlnO1xyXG5cclxuICAgICAgICAvKiogQHR5cGUge0luamVjdG9yfSAqL1xyXG4gICAgICAgIHRoaXMuaW5qZWN0b3IgPSBpbmplY3RvcjtcclxuXHJcbiAgICAgICAgLyoqIEB0eXBlIHtDb25maWd9ICovXHJcbiAgICAgICAgdGhpcy5jb25maWcgPSBjb25maWc7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBcclxuICAgICAqIEBwYXJhbSB7QXJyYXl9IHBhcmFtZXRlcnMgXHJcbiAgICAgKiBAcmV0dXJucyB7UHJvbWlzZTxUPn1cclxuICAgICAqL1xyXG4gICAgZ2V0KHBhcmFtZXRlcnMgPSBbXSkge1xyXG4gICAgICAgIC8qKiBAdHlwZSB7SW5zdGFuY2VIb2xkZXJ9ICovXHJcbiAgICAgICAgY29uc3QgaW5zdGFuY2VIb2xkZXIgPSBDb25maWdBY2Nlc3Nvci5pbnN0YW5jZUhvbGRlcih0aGlzLnR5cGVDb25maWcubmFtZSwgdGhpcy5jb25maWcsIHBhcmFtZXRlcnMpO1xyXG4gICAgICAgIGlmIChpbnN0YW5jZUhvbGRlci50eXBlID09PSBJbnN0YW5jZUhvbGRlci5ORVdfSU5TVEFOQ0UpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuaW5qZWN0b3IuaW5qZWN0VGFyZ2V0KGluc3RhbmNlSG9sZGVyLmluc3RhbmNlLCB0aGlzLmNvbmZpZyk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoaW5zdGFuY2VIb2xkZXIuaW5zdGFuY2UpO1xyXG4gICAgfVxyXG5cclxufSIsImltcG9ydCB7IExpc3QsIExvZ2dlciB9IGZyb20gXCJjb3JldXRpbF92MVwiO1xyXG5pbXBvcnQgeyBDb25maWcgfSBmcm9tIFwiLi9jb25maWcuanNcIjtcclxuaW1wb3J0IHsgQ29uZmlnQWNjZXNzb3IgfSBmcm9tIFwiLi9jb25maWdBY2Nlc3Nvci5qc1wiO1xyXG5pbXBvcnQgeyBJbmplY3Rpb25Qb2ludCB9IGZyb20gXCIuL2FwaS9pbmplY3Rpb25Qb2ludC5qc1wiXHJcbmltcG9ydCB7IEluc3RhbmNlUHJvY2Vzc29yRXhlY3V0b3IgfSBmcm9tIFwiLi9pbnN0YW5jZVByb2Nlc3Nvci9pbnN0YW5jZVByb2Nlc3NvckV4ZWN1dG9yLmpzXCI7XHJcbmltcG9ydCB7IEluc3RhbmNlSG9sZGVyIH0gZnJvbSBcIi4vdHlwZUNvbmZpZy9pbnN0YW5jZUhvbGRlci5qc1wiO1xyXG5pbXBvcnQgeyBNaW5kaVByb3ZpZGVyIH0gZnJvbSBcIi4vbWluZGlQcm92aWRlci5qc1wiO1xyXG5pbXBvcnQgeyBJbmplY3RvciB9IGZyb20gXCIuL2luamVjdG9yLmpzXCI7XHJcblxyXG5jb25zdCBMT0cgPSBuZXcgTG9nZ2VyKFwiTWluZGlJbmplY3RvclwiKTtcclxuXHJcbmV4cG9ydCBjbGFzcyBNaW5kaUluamVjdG9yIGV4dGVuZHMgSW5qZWN0b3Ige1xyXG5cclxuICAgIHN0YXRpYyBpbmplY3QodGFyZ2V0LCBjb25maWcpIHtcclxuICAgICAgICByZXR1cm4gSU5KRUNUT1IuaW5qZWN0VGFyZ2V0KHRhcmdldCwgY29uZmlnKTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIEByZXR1cm5zIHtNaW5kaUluamVjdG9yfVxyXG4gICAgICovXHJcbiAgICBzdGF0aWMgZ2V0SW5zdGFuY2UoKSB7XHJcbiAgICAgICAgcmV0dXJuIElOSkVDVE9SO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogSGVscGVyIG1ldGhvZCBmb3IgaW5qZWN0aW5nIGZpZWxkcyBpbiB0YXJnZXQgb2JqZWN0XHJcbiAgICAgKiBcclxuICAgICAqIEBwYXJhbSB7YW55fSB0YXJnZXRPYmplY3QgXHJcbiAgICAgKiBAcGFyYW0ge0NvbmZpZ30gY29uZmlnIFxyXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGRlcHRoXHJcbiAgICAgKiBAcmV0dXJucyB7UHJvbWlzZX1cclxuICAgICAqL1xyXG4gICAgaW5qZWN0VGFyZ2V0KHRhcmdldE9iamVjdCwgY29uZmlnLCBkZXB0aCA9IDApIHtcclxuICAgICAgICBpZiAoIXRhcmdldE9iamVjdCkge1xyXG4gICAgICAgICAgICB0aHJvdyBFcnJvcihcIk1pc3NpbmcgdGFyZ2V0IG9iamVjdFwiKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKCFjb25maWcpIHtcclxuICAgICAgICAgICAgdGhyb3cgRXJyb3IoXCJNaXNzaW5nIGNvbmZpZ1wiKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKCFjb25maWcuaXNGaW5hbGl6ZWQoKSkge1xyXG4gICAgICAgICAgICB0aHJvdyBFcnJvcihcIkNvbmZpZyBub3QgZmluYWxpemVkXCIpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoZGVwdGggPiAxMCkge1xyXG4gICAgICAgICAgICB0aHJvdyBFcnJvcihcIkluamVjdGlvbiBzdHJ1Y3R1cmUgdG9vIGRlZXBcIik7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNvbnN0IGluamVjdG9yID0gdGhpcztcclxuICAgICAgICBjb25zdCBvYmplY3RGaWVsZE5hbWVzID0gbmV3IExpc3QoT2JqZWN0LmtleXModGFyZ2V0T2JqZWN0KSk7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcclxuICAgICAgICAgICAgcmV0dXJuIG9iamVjdEZpZWxkTmFtZXMucHJvbWlzZUNoYWluKChmaWVsZE5hbWUsIHBhcmVudCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIE1pbmRpSW5qZWN0b3IuaW5qZWN0UHJvcGVydHkodGFyZ2V0T2JqZWN0LCBmaWVsZE5hbWUsIGNvbmZpZywgZGVwdGgsIGluamVjdG9yKTtcclxuICAgICAgICAgICAgfSkudGhlbigoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBJbnN0YW5jZVByb2Nlc3NvckV4ZWN1dG9yLmV4ZWN1dGUodGFyZ2V0T2JqZWN0LCBjb25maWcpLnRoZW4oKCkgPT57XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh0YXJnZXRPYmplY3QpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pXHJcblxyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHRhcmdldE9iamVjdCBcclxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBmaWVsZE5hbWUgXHJcbiAgICAgKiBAcGFyYW0ge0NvbmZpZ30gY29uZmlnIFxyXG4gICAgICogQHBhcmFtIHtOdW1iZXJ9IGRlcHRoIFxyXG4gICAgICogQHBhcmFtIHtJbmplY3Rvcn0gaW5qZWN0b3JcclxuICAgICAqIEByZXR1cm5zIHtQcm9taXNlfVxyXG4gICAgICovXHJcbiAgICBzdGF0aWMgaW5qZWN0UHJvcGVydHkodGFyZ2V0T2JqZWN0LCBmaWVsZE5hbWUsIGNvbmZpZywgZGVwdGgsIGluamVjdG9yKSB7XHJcbiAgICAgICAgY29uc3QgaW5qZWN0aW9uUG9pbnQgPSB0YXJnZXRPYmplY3RbZmllbGROYW1lXTsgICAgICAgIFxyXG4gICAgICAgIGlmKCEoaW5qZWN0aW9uUG9pbnQgaW5zdGFuY2VvZiBJbmplY3Rpb25Qb2ludCkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoaW5qZWN0aW9uUG9pbnQudHlwZSA9PT0gSW5qZWN0aW9uUG9pbnQuUFJPVklERVJfVFlQRSkge1xyXG4gICAgICAgICAgICBNaW5kaUluamVjdG9yLmluamVjdFByb3BlcnR5UHJvdmlkZXIodGFyZ2V0T2JqZWN0LCBmaWVsZE5hbWUsIGNvbmZpZywgaW5qZWN0b3IpO1xyXG4gICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBNaW5kaUluamVjdG9yLmluamVjdFByb3BlcnR5SW5zdGFuY2UodGFyZ2V0T2JqZWN0LCBmaWVsZE5hbWUsIGNvbmZpZywgZGVwdGgsIGluamVjdG9yKTtcclxuICAgICAgICBcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSB0YXJnZXRPYmplY3QgXHJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmllbGROYW1lIFxyXG4gICAgICogQHBhcmFtIHtDb25maWd9IGNvbmZpZyBcclxuICAgICAqIEBwYXJhbSB7SW5qZWN0b3J9IGluamVjdG9yXHJcbiAgICAgKi9cclxuICAgIHN0YXRpYyBpbmplY3RQcm9wZXJ0eVByb3ZpZGVyKHRhcmdldE9iamVjdCwgZmllbGROYW1lLCBjb25maWcsIGluamVjdG9yKSB7XHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogQHR5cGUge0luamVjdGlvblBvaW50fVxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIGNvbnN0IGluamVjdGlvblBvaW50ID0gdGFyZ2V0T2JqZWN0W2ZpZWxkTmFtZV07XHJcbiAgICAgICAgY29uc3QgdHlwZUNvbmZpZyA9IENvbmZpZ0FjY2Vzc29yLnR5cGVDb25maWdCeU5hbWUoaW5qZWN0aW9uUG9pbnQubmFtZSwgY29uZmlnKTtcclxuICAgICAgICB0YXJnZXRPYmplY3RbZmllbGROYW1lXSA9IG5ldyBNaW5kaVByb3ZpZGVyKHR5cGVDb25maWcsIGluamVjdG9yLCBjb25maWcpO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHRhcmdldE9iamVjdCBcclxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWVsZE5hbWUgXHJcbiAgICAgKiBAcGFyYW0ge0NvbmZpZ30gY29uZmlnIFxyXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGRlcHRoIFxyXG4gICAgICogQHBhcmFtIHtJbmplY3Rvcn0gaW5qZWN0b3JcclxuICAgICAqIEByZXR1cm5zIHtQcm9taXNlfVxyXG4gICAgICovXHJcbiAgICBzdGF0aWMgaW5qZWN0UHJvcGVydHlJbnN0YW5jZSh0YXJnZXRPYmplY3QsIGZpZWxkTmFtZSwgY29uZmlnLCBkZXB0aCwgaW5qZWN0b3IpIHtcclxuICAgICAgICBsZXQgaW5qZWN0UHJvbWlzZSA9IFByb21pc2UucmVzb2x2ZSgpO1xyXG4gICAgICAgIC8qKiBAdHlwZSB7SW5qZWN0aW9uUG9pbnR9ICovXHJcbiAgICAgICAgY29uc3QgaW5qZWN0aW9uUG9pbnQgPSB0YXJnZXRPYmplY3RbZmllbGROYW1lXTtcclxuICAgICAgICBjb25zdCBpbnN0YW5jZUhvbGRlciA9IENvbmZpZ0FjY2Vzc29yLmluc3RhbmNlSG9sZGVyKGluamVjdGlvblBvaW50Lm5hbWUsIGNvbmZpZywgaW5qZWN0aW9uUG9pbnQucGFyYW1ldGVycyk7XHJcbiAgICAgICAgaWYgKGluc3RhbmNlSG9sZGVyLnR5cGUgPT09IEluc3RhbmNlSG9sZGVyLk5FV19JTlNUQU5DRSkge1xyXG4gICAgICAgICAgICBpbmplY3RQcm9taXNlID0gaW5qZWN0b3IuaW5qZWN0VGFyZ2V0KGluc3RhbmNlSG9sZGVyLmluc3RhbmNlLCBjb25maWcsIGRlcHRoKyspO1xyXG4gICAgICAgIH1cclxuICAgICAgICB0YXJnZXRPYmplY3RbZmllbGROYW1lXSA9IGluc3RhbmNlSG9sZGVyLmluc3RhbmNlO1xyXG4gICAgICAgIHJldHVybiBpbmplY3RQcm9taXNlO1xyXG4gICAgfVxyXG5cclxufVxyXG5cclxuY29uc3QgSU5KRUNUT1IgPSBuZXcgTWluZGlJbmplY3RvcigpOyIsImV4cG9ydCBjbGFzcyBJbnN0YW5jZVByb2Nlc3NvciB7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBcclxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBpbnN0YW5jZSBcclxuICAgICAqIEByZXR1cm4ge1Byb21pc2V9XHJcbiAgICAgKi9cclxuICAgIHByb2Nlc3MoaW5zdGFuY2UpIHtcclxuICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XHJcbiAgICB9XHJcblxyXG59IiwiaW1wb3J0IHsgTWFwIH0gZnJvbSBcImNvcmV1dGlsX3YxXCI7XHJcbmltcG9ydCB7IENvbmZpZyB9IGZyb20gXCIuLi9jb25maWcuanNcIjtcclxuXHJcbmV4cG9ydCBjbGFzcyBDb25maWdQcm9jZXNzb3Ige1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogXHJcbiAgICAgKiBAcGFyYW0ge0NvbmZpZ30gY29uZmlnIFxyXG4gICAgICogQHBhcmFtIHtNYXB9IGNvbmZpZ0VudHJpZXNNYXAgXHJcbiAgICAgKi9cclxuICAgIHByb2Nlc3NDb25maWcoY29uZmlnLCBjb25maWdFbnRyaWVzTWFwKSB7XHJcbiAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xyXG4gICAgfVxyXG5cclxufSIsImltcG9ydCB7IE1hcCwgTGlzdCwgTG9nZ2VyIH0gZnJvbSBcImNvcmV1dGlsX3YxXCI7XHJcbmltcG9ydCB7IFR5cGVDb25maWcgfSBmcm9tIFwiLi90eXBlQ29uZmlnL3R5cGVDb25maWcuanNcIjtcclxuaW1wb3J0IHsgQ29uZmlnUHJvY2Vzc29yRXhlY3V0b3IgfSBmcm9tIFwiLi9jb25maWdQcm9jZXNzb3IvY29uZmlnUHJvY2Vzc29yRXhlY3V0b3IuanNcIjtcclxuaW1wb3J0IHsgU2luZ2xldG9uQ29uZmlnIH0gZnJvbSBcIi4vdHlwZUNvbmZpZy9zaW5nbGV0b25Db25maWcuanNcIjtcclxuaW1wb3J0IHsgQ29uZmlnIH0gZnJvbSBcIi4vY29uZmlnLmpzXCI7XHJcbmltcG9ydCB7IE1pbmRpSW5qZWN0b3IgfSBmcm9tIFwiLi9taW5kaUluamVjdG9yLmpzXCI7XHJcbmltcG9ydCB7IEluc3RhbmNlUHJvY2Vzc29yIH0gZnJvbSBcIi4vaW5zdGFuY2VQcm9jZXNzb3IvaW5zdGFuY2VQcm9jZXNzb3IuanNcIjtcclxuaW1wb3J0IHsgQ29uZmlnUHJvY2Vzc29yIH0gZnJvbSBcIi4vY29uZmlnUHJvY2Vzc29yL2NvbmZpZ1Byb2Nlc3Nvci5qc1wiO1xyXG5cclxuY29uc3QgTE9HID0gbmV3IExvZ2dlcihcIkNvbmZpZ1wiKTtcclxuXHJcbmV4cG9ydCBjbGFzcyBNaW5kaUNvbmZpZyBleHRlbmRzIENvbmZpZyB7XHJcblxyXG4gICAgY29uc3RydWN0b3IoKSB7XHJcbiAgICAgICAgc3VwZXIoKTtcclxuICAgICAgICB0aGlzLmZpbmFsaXplZCA9IGZhbHNlO1xyXG4gICAgICAgIC8qKiBAdHlwZSB7TWFwfSAqL1xyXG4gICAgICAgIHRoaXMuY29uZmlnRW50cmllcyA9IG5ldyBNYXAoKTtcclxuICAgICAgICB0aGlzLmNvbmZpZ1Byb2Nlc3NvcnMgPSBuZXcgTGlzdCgpO1xyXG4gICAgICAgIHRoaXMuaW5zdGFuY2VQcm9jZXNzb3JzID0gbmV3IExpc3QoKTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIFxyXG4gICAgICogQHBhcmFtIHtDb25maWd9IGNvbmZpZ1xyXG4gICAgICogQHJldHVybnMge01pbmRpQ29uZmlnfVxyXG4gICAgICovXHJcbiAgICBtZXJnZShjb25maWcpIHtcclxuICAgICAgICB0aGlzLmZpbmFsaXplZCA9IHRydWU7XHJcbiAgICAgICAgY29uc3QgbmV3Q29uZmlnRW50cmllcyA9IG5ldyBNYXAoKTtcclxuICAgICAgICBuZXdDb25maWdFbnRyaWVzLmFkZEFsbCh0aGlzLmNvbmZpZ0VudHJpZXMpO1xyXG4gICAgICAgIG5ld0NvbmZpZ0VudHJpZXMuYWRkQWxsKGNvbmZpZy5jb25maWdFbnRyaWVzKTtcclxuXHJcbiAgICAgICAgY29uc3QgbmV3Q29uZmlnUHJvY2Vzc29ycyA9IG5ldyBMaXN0KCk7XHJcbiAgICAgICAgbmV3Q29uZmlnUHJvY2Vzc29ycy5hZGRBbGwodGhpcy5jb25maWdQcm9jZXNzb3JzKTtcclxuICAgICAgICBuZXdDb25maWdQcm9jZXNzb3JzLmFkZEFsbChjb25maWcuY29uZmlnUHJvY2Vzc29ycyk7XHJcblxyXG4gICAgICAgIGNvbnN0IG5ld0luc3RhbmNlUHJvY2Vzc29ycyA9IG5ldyBMaXN0KCk7XHJcbiAgICAgICAgbmV3SW5zdGFuY2VQcm9jZXNzb3JzLmFkZEFsbCh0aGlzLmluc3RhbmNlUHJvY2Vzc29ycyk7XHJcbiAgICAgICAgbmV3SW5zdGFuY2VQcm9jZXNzb3JzLmFkZEFsbChjb25maWcuaW5zdGFuY2VQcm9jZXNzb3JzKTtcclxuXHJcbiAgICAgICAgLyoqIEB0eXBlIHtNYXB9ICovXHJcbiAgICAgICAgdGhpcy5jb25maWdFbnRyaWVzID0gbmV3Q29uZmlnRW50cmllcztcclxuICAgICAgICB0aGlzLmNvbmZpZ1Byb2Nlc3NvcnMgPSBuZXdDb25maWdQcm9jZXNzb3JzO1xyXG4gICAgICAgIHRoaXMuaW5zdGFuY2VQcm9jZXNzb3JzID0gbmV3SW5zdGFuY2VQcm9jZXNzb3JzO1xyXG5cclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIFxyXG4gICAgICogQHBhcmFtIHtUeXBlQ29uZmlnfSB0eXBlQ29uZmlnXHJcbiAgICAgKiBAcmV0dXJucyB7TWluZGlDb25maWd9XHJcbiAgICAgKi9cclxuICAgIGFkZFR5cGVDb25maWcodHlwZUNvbmZpZykge1xyXG4gICAgICAgIHRoaXMuZmluYWxpemVkID0gZmFsc2U7XHJcbiAgICAgICAgdGhpcy5jb25maWdFbnRyaWVzLnNldCh0eXBlQ29uZmlnLm5hbWUsIHR5cGVDb25maWcpO1xyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogXHJcbiAgICAgKiBAcGFyYW0ge0NvbmZpZ1Byb2Nlc3Nvcn0gY29uZmlnUHJvY2Vzc29yXHJcbiAgICAgKiBAcmV0dXJucyB7TWluZGlDb25maWd9XHJcbiAgICAgKi9cclxuICAgIGFkZENvbmZpZ1Byb2Nlc3Nvcihjb25maWdQcm9jZXNzb3IpIHtcclxuICAgICAgICB0aGlzLmNvbmZpZ1Byb2Nlc3NvcnMuYWRkKGNvbmZpZ1Byb2Nlc3Nvci5uYW1lKTtcclxuICAgICAgICByZXR1cm4gdGhpcy5hZGRUeXBlQ29uZmlnKFNpbmdsZXRvbkNvbmZpZy51bm5hbWVkKGNvbmZpZ1Byb2Nlc3NvcikpO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogXHJcbiAgICAgKiBAcGFyYW0ge0luc3RhbmNlUHJvY2Vzc29yfSBpbnN0YW5jZVByb2Nlc3NvclxyXG4gICAgICogQHJldHVybnMge01pbmRpQ29uZmlnfVxyXG4gICAgICovXHJcbiAgICBhZGRJbnN0YW5jZVByb2Nlc3NvcihpbnN0YW5jZVByb2Nlc3Nvcikge1xyXG4gICAgICAgIHRoaXMuaW5zdGFuY2VQcm9jZXNzb3JzLmFkZChpbnN0YW5jZVByb2Nlc3Nvci5uYW1lKTtcclxuICAgICAgICByZXR1cm4gdGhpcy5hZGRUeXBlQ29uZmlnKFNpbmdsZXRvbkNvbmZpZy51bm5hbWVkKGluc3RhbmNlUHJvY2Vzc29yKSk7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBcclxuICAgICAqIEBwYXJhbSB7TGlzdH0gdHlwZUNvbmZpZ0xpc3RcclxuICAgICAqIEByZXR1cm4ge01pbmRpQ29uZmlnfVxyXG4gICAgICovXHJcbiAgICBhZGRBbGxUeXBlQ29uZmlnKHR5cGVDb25maWdMaXN0KSB7XHJcbiAgICAgICAgdGhpcy5maW5hbGl6ZWQgPSBmYWxzZTtcclxuICAgICAgICB0eXBlQ29uZmlnTGlzdC5mb3JFYWNoKCh0eXBlQ29uZmlnLHBhcmVudCkgPT4ge1xyXG4gICAgICAgICAgICB0aGlzLmNvbmZpZ0VudHJpZXMuc2V0KHR5cGVDb25maWcubmFtZSwgdHlwZUNvbmZpZyk7XHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgIH0sIHRoaXMpO1xyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogXHJcbiAgICAgKiBAcGFyYW0ge0xpc3R9IGNvbmZpZ1Byb2Nlc3Nvckxpc3RcclxuICAgICAqIEByZXR1cm4ge01pbmRpQ29uZmlnfVxyXG4gICAgICovXHJcbiAgICBhZGRBbGxDb25maWdQcm9jZXNzb3IoY29uZmlnUHJvY2Vzc29yTGlzdCkge1xyXG4gICAgICAgIGNvbmZpZ1Byb2Nlc3Nvckxpc3QuZm9yRWFjaCgoY29uZmlnUHJvY2Vzc29yLHBhcmVudCkgPT4ge1xyXG4gICAgICAgICAgICB0aGlzLmNvbmZpZ1Byb2Nlc3NvcnMuYWRkKGNvbmZpZ1Byb2Nlc3Nvci5uYW1lKTtcclxuICAgICAgICAgICAgdGhpcy5hZGRUeXBlQ29uZmlnKFNpbmdsZXRvbkNvbmZpZy51bm5hbWVkKGNvbmZpZ1Byb2Nlc3NvcikpO1xyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICB9LCB0aGlzKTtcclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIFxyXG4gICAgICogQHBhcmFtIHtMaXN0fSBpbnN0YW5jZVByb2Nlc3Nvckxpc3QgXHJcbiAgICAgKiBAcmV0dXJuIHtNaW5kaUNvbmZpZ31cclxuICAgICAqL1xyXG4gICAgYWRkQWxsSW5zdGFuY2VQcm9jZXNzb3IoaW5zdGFuY2VQcm9jZXNzb3JMaXN0KSB7XHJcbiAgICAgICAgaW5zdGFuY2VQcm9jZXNzb3JMaXN0LmZvckVhY2goKGluc3RhbmNlUHJvY2Vzc29yLHBhcmVudCkgPT4ge1xyXG4gICAgICAgICAgICB0aGlzLmluc3RhbmNlUHJvY2Vzc29ycy5hZGQoaW5zdGFuY2VQcm9jZXNzb3IubmFtZSk7XHJcbiAgICAgICAgICAgIHRoaXMuYWRkVHlwZUNvbmZpZyhTaW5nbGV0b25Db25maWcudW5uYW1lZChpbnN0YW5jZVByb2Nlc3NvcikpO1xyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICB9LCB0aGlzKTtcclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIEByZXR1cm5zIHtCb29sZWFufVxyXG4gICAgICovXHJcbiAgICBpc0ZpbmFsaXplZCgpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5maW5hbGl6ZWQ7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBAcmV0dXJucyB7UHJvbWlzZX1cclxuICAgICAqL1xyXG4gICAgZmluYWxpemUoKSB7XHJcbiAgICAgICAgdGhpcy5maW5hbGl6ZWQgPSB0cnVlO1xyXG4gICAgICAgIHJldHVybiBDb25maWdQcm9jZXNzb3JFeGVjdXRvci5leGVjdXRlKHRoaXMuY29uZmlnUHJvY2Vzc29ycywgTWluZGlJbmplY3Rvci5nZXRJbnN0YW5jZSgpLCB0aGlzKTtcclxuICAgIH1cclxuXHJcbn0iLCJpbXBvcnQgeyBMb2dnZXIgfSBmcm9tIFwiY29yZXV0aWxfdjFcIjtcclxuaW1wb3J0IHsgSW5zdGFuY2VQcm9jZXNzb3IgfSBmcm9tIFwiLi9pbnN0YW5jZVByb2Nlc3Nvci5qc1wiO1xyXG5cclxuY29uc3QgTE9HID0gbmV3IExvZ2dlcihcIkluc3RhbmNlUG9zdENvbmZpZ1RyaWdnZXJcIik7XHJcblxyXG4vKipcclxuICogSW5zdGFuY2UgcHJvY2Vzc29yIHdoaWNoIGNhbGxzIHBvc3RDb25maWcgb24gb2JqZWN0cyBhZnRlciBjb25maWdQcm9jZXNzb3JzIGFyZSBmaW5pc2hlZFxyXG4gKi9cclxuZXhwb3J0IGNsYXNzIEluc3RhbmNlUG9zdENvbmZpZ1RyaWdnZXIgZXh0ZW5kcyBJbnN0YW5jZVByb2Nlc3NvciB7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBcclxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBpbnN0YW5jZSBcclxuICAgICAqIEByZXR1cm4ge1Byb21pc2V9XHJcbiAgICAgKi9cclxuICAgIHByb2Nlc3MoaW5zdGFuY2UpIHtcclxuICAgICAgICBsZXQgcmVzcG9uc2UgPSBudWxsO1xyXG4gICAgICAgIGlmKGluc3RhbmNlLnBvc3RDb25maWcpIHtcclxuICAgICAgICAgICAgcmVzcG9uc2UgPSBpbnN0YW5jZS5wb3N0Q29uZmlnKCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICghcmVzcG9uc2UpIHtcclxuICAgICAgICAgICAgcmVzcG9uc2UgPSBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpID0+IHsgcmVzb2x2ZSgpOyB9KTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKCFyZXNwb25zZSBpbnN0YW5jZW9mIFByb21pc2UpIHtcclxuICAgICAgICAgICAgdGhyb3cgXCJwb3N0Q29uZmlnKCkgbXVzdCByZXR1cm4gZWl0aGVyIHVuZGVmaW5lZCBvciBudWxsIG9yIGEgUHJvbWlzZVwiXHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiByZXNwb25zZTtcclxuICAgIH1cclxuXHJcbn0iLCJpbXBvcnQgeyBUeXBlQ29uZmlnIH0gZnJvbSBcIi4vdHlwZUNvbmZpZy5qc1wiO1xyXG5cclxuZXhwb3J0IGNsYXNzIFBvb2xDb25maWcgZXh0ZW5kcyBUeXBlQ29uZmlnIHtcclxuXHJcbiAgICBzdGF0aWMgbmFtZWQobmFtZSwgY2xhc3NSZWZlcmVuY2UsIHBvb2xTaXplKSB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBQb29sQ29uZmlnKG5hbWUsIGNsYXNzUmVmZXJlbmNlLCBwb29sU2l6ZSk7XHJcbiAgICB9XHJcblxyXG4gICAgc3RhdGljIHVubmFtZWQoY2xhc3NSZWZlcmVuY2UsIHBvb2xTaXplKSB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBQb29sQ29uZmlnKGNsYXNzUmVmZXJlbmNlLm5hbWUsIGNsYXNzUmVmZXJlbmNlLCBwb29sU2l6ZSk7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3RydWN0b3IobmFtZSwgY2xhc3NSZWZlcmVuY2UsIHBvb2xTaXplKSB7XHJcbiAgICAgICAgc3VwZXIobmFtZSwgY2xhc3NSZWZlcmVuY2UpO1xyXG4gICAgICAgIHRoaXMucG9vbFNpemUgPSBwb29sU2l6ZTtcclxuICAgIH1cclxuXHJcbiAgICBpbnN0YW5jZUhvbGRlcihwYXJhbWV0ZXJzID0gW10pIHtcclxuXHJcbiAgICB9XHJcblxyXG59IiwiaW1wb3J0IHsgVHlwZUNvbmZpZyB9IGZyb20gXCIuL3R5cGVDb25maWcuanNcIjtcclxuaW1wb3J0IHsgSW5zdGFuY2VIb2xkZXIgfSBmcm9tIFwiLi9pbnN0YW5jZUhvbGRlci5qc1wiO1xyXG5cclxuZXhwb3J0IGNsYXNzIFByb3RvdHlwZUNvbmZpZyBleHRlbmRzIFR5cGVDb25maWcge1xyXG5cclxuICAgIHN0YXRpYyBuYW1lZChuYW1lLCBjbGFzc1JlZmVyZW5jZSkge1xyXG4gICAgICAgIHJldHVybiBuZXcgUHJvdG90eXBlQ29uZmlnKG5hbWUsIGNsYXNzUmVmZXJlbmNlKTtcclxuICAgIH1cclxuXHJcbiAgICBzdGF0aWMgdW5uYW1lZChjbGFzc1JlZmVyZW5jZSkge1xyXG4gICAgICAgIHJldHVybiBuZXcgUHJvdG90eXBlQ29uZmlnKGNsYXNzUmVmZXJlbmNlLm5hbWUsIGNsYXNzUmVmZXJlbmNlKTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdHJ1Y3RvcihuYW1lLCBjbGFzc1JlZmVyZW5jZSkge1xyXG4gICAgICAgIHN1cGVyKG5hbWUsIGNsYXNzUmVmZXJlbmNlKTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIEBwYXJhbSB7YXJyYXl9IHBhcmFtZXRlcnMgdGhlIHBhcmFtZXRlcnMgdG8gdXNlIGZvciB0aGUgY29uc3RydWN0b3JcclxuICAgICAqL1xyXG4gICAgaW5zdGFuY2VIb2xkZXIocGFyYW1ldGVycyA9IFtdKSB7XHJcbiAgICAgICAgbGV0IGluc3RhbmNlID0gbnVsbDtcclxuICAgICAgICBpZihwYXJhbWV0ZXJzICYmIHBhcmFtZXRlcnMubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICBpbnN0YW5jZSA9IG5ldyB0aGlzLmNsYXNzUmVmZXJlbmNlKC4uLnBhcmFtZXRlcnMpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGluc3RhbmNlID0gbmV3IHRoaXMuY2xhc3NSZWZlcmVuY2UoKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIEluc3RhbmNlSG9sZGVyLmhvbGRlcldpdGhOZXdJbnN0YW5jZShpbnN0YW5jZSk7XHJcbiAgICB9XHJcblxyXG5cclxufSJdLCJuYW1lcyI6WyJMT0ciXSwibWFwcGluZ3MiOiI7O0FBQU8sTUFBTSxNQUFNLENBQUM7QUFDcEI7QUFDQSxJQUFJLFdBQVcsR0FBRztBQUNsQjtBQUNBLFFBQVEsSUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJLENBQUM7QUFDbEM7QUFDQTtBQUNBLFFBQVEsSUFBSSxDQUFDLGdCQUFnQixHQUFHLElBQUksQ0FBQztBQUNyQztBQUNBO0FBQ0EsUUFBUSxJQUFJLENBQUMsa0JBQWtCLEdBQUcsSUFBSSxDQUFDO0FBQ3ZDLEtBQUs7QUFDTDtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQUksUUFBUSxHQUFHO0FBQ2Y7QUFDQSxLQUFLO0FBQ0w7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFJLFdBQVcsR0FBRztBQUNsQixRQUFRLE9BQU8sS0FBSyxDQUFD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
