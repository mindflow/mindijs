import { Logger, List, Map } from './coreutil_v1.js';

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

const LOG = new Logger("ConfigAccessor");

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

const LOG$1 = new Logger("Provider");

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

const LOG$2 = new Logger("InstanceProcessorExecutor");

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

const LOG$3 = new Logger("MindiInjector");

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
        const objectFieldNames = new List(Object.keys(targetObject));

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

const LOG$4 = new Logger("ConfigProcessorExecutor");

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

const LOG$5 = new Logger("SingletonConfig");

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

const LOG$6 = new Logger("Config");

class MindiConfig extends Config {

    constructor() {
        super();

        /** @type {Boolean} */
        this.finalized = false;

        /** @type {Map<TypeConfig>} */
        this.configEntries = new Map();

        /** @type {List<String>} */
        this.configProcessors = new List();

        /** @type {List<String>} */
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWluZGlfdjEuanMiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9taW5kaS9jb25maWcuanMiLCIuLi8uLi9zcmMvbWluZGkvdHlwZUNvbmZpZy9pbnN0YW5jZUhvbGRlci5qcyIsIi4uLy4uL3NyYy9taW5kaS90eXBlQ29uZmlnL3R5cGVDb25maWcuanMiLCIuLi8uLi9zcmMvbWluZGkvY29uZmlnQWNjZXNzb3IuanMiLCIuLi8uLi9zcmMvbWluZGkvaW5qZWN0b3IuanMiLCIuLi8uLi9zcmMvbWluZGkvYXBpL3Byb3ZpZGVyLmpzIiwiLi4vLi4vc3JjL21pbmRpL2FwaS9pbmplY3Rpb25Qb2ludC5qcyIsIi4uLy4uL3NyYy9taW5kaS9pbnN0YW5jZVByb2Nlc3Nvci9pbnN0YW5jZVByb2Nlc3NvckV4ZWN1dG9yLmpzIiwiLi4vLi4vc3JjL21pbmRpL21pbmRpUHJvdmlkZXIuanMiLCIuLi8uLi9zcmMvbWluZGkvbWluZGlJbmplY3Rvci5qcyIsIi4uLy4uL3NyYy9taW5kaS9jb25maWdQcm9jZXNzb3IvY29uZmlnUHJvY2Vzc29yRXhlY3V0b3IuanMiLCIuLi8uLi9zcmMvbWluZGkvdHlwZUNvbmZpZy9zaW5nbGV0b25Db25maWcuanMiLCIuLi8uLi9zcmMvbWluZGkvaW5zdGFuY2VQcm9jZXNzb3IvaW5zdGFuY2VQcm9jZXNzb3IuanMiLCIuLi8uLi9zcmMvbWluZGkvY29uZmlnUHJvY2Vzc29yL2NvbmZpZ1Byb2Nlc3Nvci5qcyIsIi4uLy4uL3NyYy9taW5kaS9taW5kaUNvbmZpZy5qcyIsIi4uLy4uL3NyYy9taW5kaS9pbnN0YW5jZVByb2Nlc3Nvci9pbnN0YW5jZVBvc3RDb25maWdUcmlnZ2VyLmpzIiwiLi4vLi4vc3JjL21pbmRpL3R5cGVDb25maWcvcG9vbENvbmZpZy5qcyIsIi4uLy4uL3NyYy9taW5kaS90eXBlQ29uZmlnL3Byb3RvdHlwZUNvbmZpZy5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyJleHBvcnQgY2xhc3MgQ29uZmlnIHtcblxuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICAvKiogQHR5cGUge01hcH0gKi9cbiAgICAgICAgdGhpcy5jb25maWdFbnRyaWVzID0gbnVsbDtcblxuICAgICAgICAvKiogQHR5cGUge0xpc3R9ICovXG4gICAgICAgIHRoaXMuY29uZmlnUHJvY2Vzc29ycyA9IG51bGw7XG5cbiAgICAgICAgLyoqIEB0eXBlIHtMaXN0fSAqL1xuICAgICAgICB0aGlzLmluc3RhbmNlUHJvY2Vzc29ycyA9IG51bGw7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQHJldHVybnMge1Byb21pc2V9XG4gICAgICovXG4gICAgZmluYWxpemUoKSB7XG5cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAgICAgKi9cbiAgICBpc0ZpbmFsaXplZCgpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbn0iLCJleHBvcnQgY2xhc3MgSW5zdGFuY2VIb2xkZXIge1xuXG4gICAgc3RhdGljIGdldCBORVdfSU5TVEFOQ0UoKSB7IHJldHVybiAwOyB9XG5cbiAgICBzdGF0aWMgZ2V0IEVYSVNUSU5HX0lOU1RBTkNFKCkgeyByZXR1cm4gMTsgfVxuXG4gICAgc3RhdGljIGhvbGRlcldpdGhOZXdJbnN0YW5jZShpbnN0YW5jZSkge1xuICAgICAgICByZXR1cm4gbmV3IEluc3RhbmNlSG9sZGVyKGluc3RhbmNlLCBJbnN0YW5jZUhvbGRlci5ORVdfSU5TVEFOQ0UpO1xuICAgIH1cblxuICAgIHN0YXRpYyBob2xkZXJXaXRoRXhpc3RpbmdJbnN0YW5jZShpbnN0YW5jZSkge1xuICAgICAgICByZXR1cm4gbmV3IEluc3RhbmNlSG9sZGVyKGluc3RhbmNlLCBJbnN0YW5jZUhvbGRlci5FWElTVElOR19JTlNUQU5DRSk7XG4gICAgfVxuXG4gICAgY29uc3RydWN0b3IoaW5zdGFuY2UsIHR5cGUpIHtcbiAgICAgICAgdGhpcy5pbnN0YW5jZSA9IGluc3RhbmNlO1xuICAgICAgICB0aGlzLnR5cGUgPSB0eXBlO1xuICAgIH1cblxufSIsImV4cG9ydCBjbGFzcyBUeXBlQ29uZmlnIHtcblxuICAgIHN0YXRpYyBnZXQgTkVXKCkgeyByZXR1cm4gXCJORVdcIjsgfVxuICAgIHN0YXRpYyBnZXQgQ09ORklHVVJFRCgpIHsgcmV0dXJuIFwiQ09ORklHVVJFRFwiOyB9XG5cbiAgICBjb25zdHJ1Y3RvcihuYW1lLCBjbGFzc1JlZmVyZW5jZSkge1xuICAgICAgICB0aGlzLm5hbWUgPSBuYW1lO1xuICAgICAgICB0aGlzLmNsYXNzUmVmZXJlbmNlID0gY2xhc3NSZWZlcmVuY2U7XG4gICAgICAgIHRoaXMuc3RhZ2UgPSBUeXBlQ29uZmlnLk5FVztcbiAgICB9XG5cbiAgICBpbnN0YW5jZUhvbGRlcihwYXJhbWV0ZXJzID0gW10pIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG59IiwiaW1wb3J0IHsgQ29uZmlnIH0gZnJvbSBcIi4vY29uZmlnLmpzXCI7XG5pbXBvcnQgeyBMb2dnZXIgfSBmcm9tIFwiY29yZXV0aWxfdjFcIjtcbmltcG9ydCB7IEluc3RhbmNlSG9sZGVyIH0gZnJvbSBcIi4vdHlwZUNvbmZpZy9pbnN0YW5jZUhvbGRlci5qc1wiO1xuaW1wb3J0IHsgVHlwZUNvbmZpZyB9IGZyb20gXCIuL3R5cGVDb25maWcvdHlwZUNvbmZpZy5qc1wiO1xuXG5jb25zdCBMT0cgPSBuZXcgTG9nZ2VyKFwiQ29uZmlnQWNjZXNzb3JcIik7XG5cbi8qKlxuICogVXRpbGl0aWVzIGZvciBhY2Nlc3NpbmcgYSBDb25maWcgb2JqZWN0XG4gKi9cbmV4cG9ydCBjbGFzcyBDb25maWdBY2Nlc3NvciB7XG5cbiAgICAvKipcbiAgICAgKiBHZXQgYW4gaW5zdGFuY2UgYnkgY2xhc3MgbmFtZSBpbiB0aGUgY29uZmlnXG4gICAgICogXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG5hbWUgXG4gICAgICogQHBhcmFtIHtDb25maWd9IGNvbmZpZyBcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBwYXJhbWV0ZXJzXG4gICAgICogQHJldHVybnMge0luc3RhbmNlSG9sZGVyfVxuICAgICAqL1xuICAgIHN0YXRpYyBpbnN0YW5jZUhvbGRlcihuYW1lLCBjb25maWcsIHBhcmFtZXRlcnMgPSBbXSkge1xuICAgICAgICBjb25zdCB0eXBlQ29uZmlnID0gdGhpcy50eXBlQ29uZmlnQnlOYW1lKG5hbWUsIGNvbmZpZyk7XG4gICAgICAgIGlmKHR5cGVDb25maWcgPT09IG51bGwpIHtcbiAgICAgICAgICAgIExPRy5lcnJvcihcIk5vIHR5cGVjb25maWcgZm91bmQgZm9yIFwiICsgbmFtZSk7XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBpbnN0YW5jZUhvbGRlciA9IHR5cGVDb25maWcuaW5zdGFuY2VIb2xkZXIocGFyYW1ldGVycyk7XG4gICAgICAgIGlmKCFpbnN0YW5jZUhvbGRlcikge1xuICAgICAgICAgICAgTE9HLmVycm9yKFwiTm8gb2JqZWN0IGZvdW5kIGZvciBcIiArIG5hbWUpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBpbnN0YW5jZUhvbGRlcjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgdGhlIHR5cGUgY29uZmlnIGJ5IGNsYXNzIG5hbWUgaW4gdGhlIGNvbmZpZ1xuICAgICAqIFxuICAgICAqIEBwYXJhbSB7Q29uZmlnfSBjb25maWcgXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG5hbWUgXG4gICAgICogQHJldHVybnMge1R5cGVDb25maWd9XG4gICAgICovXG4gICAgc3RhdGljIHR5cGVDb25maWdCeU5hbWUobmFtZSwgY29uZmlnKSB7XG4gICAgICAgIGxldCBjb25maWdFbnRyeSA9IG51bGw7XG4gICAgICAgIGNvbmZpZy5jb25maWdFbnRyaWVzLmZvckVhY2goKGtleSwgdmFsdWUsIHBhcmVudCkgPT4ge1xuICAgICAgICAgICAgaWYoa2V5ID09PSBuYW1lKSB7XG4gICAgICAgICAgICAgICAgY29uZmlnRW50cnkgPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfSwgdGhpcyk7XG4gICAgICAgIGlmKCFjb25maWdFbnRyeSkge1xuICAgICAgICAgICAgTE9HLmVycm9yKFwiTm8gY29uZmlnIGVudHJ5IGZvdW5kIGZvciBcIiArIG5hbWUpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBjb25maWdFbnRyeTtcbiAgICB9XG5cbn0iLCJleHBvcnQgY2xhc3MgSW5qZWN0b3Ige1xuXG5cbiAgICAvKipcbiAgICAgKiBIZWxwZXIgbWV0aG9kIGZvciBpbmplY3RpbmcgZmllbGRzIGluIHRhcmdldCBvYmplY3RcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge2FueX0gdGFyZ2V0T2JqZWN0IFxuICAgICAqIEBwYXJhbSB7Q29uZmlnfSBjb25maWcgXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGRlcHRoXG4gICAgICogQHJldHVybnMge1Byb21pc2V9XG4gICAgICovXG4gICAgaW5qZWN0VGFyZ2V0KHRhcmdldCwgY29uZmlnLCBkZXB0aCA9IDApIHtcblxuICAgIH1cblxufSIsImltcG9ydCB7IExvZ2dlciB9IGZyb20gXCJjb3JldXRpbF92MVwiO1xuXG5jb25zdCBMT0cgPSBuZXcgTG9nZ2VyKFwiUHJvdmlkZXJcIik7XG5cbi8qKlxuICogQHRlbXBsYXRlIFRcbiAqL1xuZXhwb3J0IGNsYXNzIFByb3ZpZGVyIHtcblxuICAgIC8qKlxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7QXJyYXl9IHBhcmFtZXRlcnMgXG4gICAgICogQHJldHVybnMge1Byb21pc2U8VD59XG4gICAgICovXG4gICAgZ2V0KHBhcmFtZXRlcnMgPSBbXSkge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbn0iLCJpbXBvcnQgeyBQcm92aWRlciB9IGZyb20gXCIuL3Byb3ZpZGVyLmpzXCI7XG5cbmV4cG9ydCBjbGFzcyBJbmplY3Rpb25Qb2ludCB7XG5cbiAgICBzdGF0aWMgZ2V0IElOU1RBTkNFX1RZUEUoKSB7IHJldHVybiAwOyB9IFxuICAgIHN0YXRpYyBnZXQgUFJPVklERVJfVFlQRSgpIHsgcmV0dXJuIDE7IH0gXG5cbiAgICAvKipcbiAgICAgKiBAdGVtcGxhdGUgVFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBuYW1lIFxuICAgICAqIEBwYXJhbSB7bmV3KCkgPT4gVH0gY2xhc3NSZWZlcmVuY2UgXG4gICAgICogQHBhcmFtIHthcnJheX0gcGFyYW1ldGVycyBcbiAgICAgKiBAcmV0dXJucyB7VH1cbiAgICAgKi9cbiAgICBzdGF0aWMgaW5zdGFuY2VCeU5hbWUobmFtZSwgY2xhc3NSZWZlcmVuY2UsIHBhcmFtZXRlcnMgPSBbXSkge1xuICAgICAgICByZXR1cm4gbmV3IEluamVjdGlvblBvaW50KG5hbWUsIGNsYXNzUmVmZXJlbmNlLCBJbmplY3Rpb25Qb2ludC5JTlNUQU5DRV9UWVBFLCBwYXJhbWV0ZXJzKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAdGVtcGxhdGUgVFxuICAgICAqIEBwYXJhbSB7bmV3KCkgPT4gVH0gY2xhc3NSZWZlcmVuY2UgXG4gICAgICogQHBhcmFtIHthcnJheX0gcGFyYW1ldGVycyBcbiAgICAgKiBAcmV0dXJucyB7VH1cbiAgICAgKi9cbiAgICBzdGF0aWMgaW5zdGFuY2UoY2xhc3NSZWZlcmVuY2UsIHBhcmFtZXRlcnMgPSBbXSkge1xuICAgICAgICByZXR1cm4gbmV3IEluamVjdGlvblBvaW50KGNsYXNzUmVmZXJlbmNlLm5hbWUsIGNsYXNzUmVmZXJlbmNlLCBJbmplY3Rpb25Qb2ludC5JTlNUQU5DRV9UWVBFLCBwYXJhbWV0ZXJzKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAdGVtcGxhdGUgVFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBuYW1lIFxuICAgICAqIEBwYXJhbSB7bmV3KCkgPT4gVH0gY2xhc3NSZWZlcmVuY2UgXG4gICAgICogQHJldHVybnMge1Byb3ZpZGVyPFQ+fVxuICAgICAqL1xuICAgIHN0YXRpYyBwcm92aWRlckJ5TmFtZShuYW1lLCBjbGFzc1JlZmVyZW5jZSkge1xuICAgICAgICByZXR1cm4gbmV3IEluamVjdGlvblBvaW50KG5hbWUsIGNsYXNzUmVmZXJlbmNlLCBJbmplY3Rpb25Qb2ludC5QUk9WSURFUl9UWVBFKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAdGVtcGxhdGUgVFxuICAgICAqIEBwYXJhbSB7bmV3KCkgPT4gVH0gY2xhc3NSZWZlcmVuY2UgXG4gICAgICogQHJldHVybnMge1Byb3ZpZGVyPFQ+fVxuICAgICAqL1xuICAgIHN0YXRpYyBwcm92aWRlcihjbGFzc1JlZmVyZW5jZSkge1xuICAgICAgICByZXR1cm4gbmV3IEluamVjdGlvblBvaW50KGNsYXNzUmVmZXJlbmNlLm5hbWUsIGNsYXNzUmVmZXJlbmNlLCBJbmplY3Rpb25Qb2ludC5QUk9WSURFUl9UWVBFKTtcbiAgICB9XG5cbiAgICBjb25zdHJ1Y3RvcihuYW1lLCBjbGFzc1JlZmVyZW5jZSwgdHlwZSA9IEluamVjdGlvblBvaW50LklOU1RBTkNFX1RZUEUsIHBhcmFtZXRlcnMgPSBudWxsKSB7XG4gICAgICAgIHRoaXMubmFtZSA9IG5hbWU7XG4gICAgICAgIHRoaXMuY2xhc3NSZWZlcmVuY2UgPSBjbGFzc1JlZmVyZW5jZTtcbiAgICAgICAgdGhpcy50eXBlID0gdHlwZTtcbiAgICAgICAgdGhpcy5wYXJhbWV0ZXJzID0gcGFyYW1ldGVycztcbiAgICB9XG5cbn0iLCJpbXBvcnQgeyBMb2dnZXIsIExpc3QgfSBmcm9tIFwiY29yZXV0aWxfdjFcIjtcbmltcG9ydCB7IENvbmZpZ0FjY2Vzc29yIH0gZnJvbSBcIi4uL2NvbmZpZ0FjY2Vzc29yLmpzXCI7XG5pbXBvcnQgeyBDb25maWcgfSBmcm9tIFwiLi4vY29uZmlnLmpzXCI7XG5cbmNvbnN0IExPRyA9IG5ldyBMb2dnZXIoXCJJbnN0YW5jZVByb2Nlc3NvckV4ZWN1dG9yXCIpO1xuXG4vKipcbiAqIEV4ZWN1dGVzIHRoZSBjb25maWdzIGluc3RhbmNlIHByb2Nlc3NvcnMgb24gdGhlIHByb3ZpZGVkIGluc3RhbmNlXG4gKiBSZXR1cm5zIGEgcHJvbWlzZSBmb3Igd2hlbiB0aGUgaW5zdGFuY2UgcHJvY2Vzc29ycyBoYXMgY29tcGxldGVkIHJ1bm5pbmdcbiAqIFxuICogSW5zdGFuY2UgcHJvY2Vzc29ycyBwZXJmb3JtIG9wZXJhdGlvbnMgb24gbWFuYWdlZCBpbnN0YW5jZXMgYWZ0ZXIgdGhleSBoYXZlIGJlZW4gaW5zdGFuc2lhdGVkXG4gKi9cbmV4cG9ydCBjbGFzcyBJbnN0YW5jZVByb2Nlc3NvckV4ZWN1dG9yIHtcblxuICAgIC8qKlxuICAgICAqIEBwYXJhbSB7TGlzdH0gaW5zdGFuY2VQcm9jZXNzb3JMaXN0IHRoZSBpbnN0YW5jZSBwcm9jZXNzb3JzXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGluc3RhbmNlIHRoZSBpbnN0YW5jZSB0byBwcm9jZXNzXG4gICAgICogQHBhcmFtIHtDb25maWd9IGNvbmZpZ1xuICAgICAqIEByZXR1cm5zIHtQcm9taXNlfVxuICAgICAqL1xuICAgIHN0YXRpYyBleGVjdXRlKGluc3RhbmNlLCBjb25maWcpIHtcbiAgICAgICAgcmV0dXJuIGNvbmZpZy5pbnN0YW5jZVByb2Nlc3NvcnMucHJvbWlzZUNoYWluKChwcm9jZXNzb3JOYW1lLCBwYXJlbnQpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHByb2Nlc3NvckhvbGRlciA9IENvbmZpZ0FjY2Vzc29yLmluc3RhbmNlSG9sZGVyKHByb2Nlc3Nvck5hbWUsIGNvbmZpZyk7XG4gICAgICAgICAgICByZXR1cm4gcHJvY2Vzc29ySG9sZGVyLmluc3RhbmNlLnByb2Nlc3MoaW5zdGFuY2UpO1xuICAgICAgICB9LCB0aGlzKTtcbiAgICB9XG5cbn0iLCJpbXBvcnQgeyBQcm92aWRlciB9IGZyb20gXCIuL2FwaS9wcm92aWRlci5qc1wiO1xuaW1wb3J0IHsgVHlwZUNvbmZpZyB9IGZyb20gXCIuL3R5cGVDb25maWcvdHlwZUNvbmZpZy5qc1wiO1xuaW1wb3J0IHsgSW5zdGFuY2VIb2xkZXIgfSBmcm9tIFwiLi90eXBlQ29uZmlnL2luc3RhbmNlSG9sZGVyLmpzXCI7XG5pbXBvcnQgeyBJbmplY3RvciB9IGZyb20gXCIuL2luamVjdG9yLmpzXCI7XG5pbXBvcnQgeyBDb25maWcgfSBmcm9tIFwiLi9jb25maWcuanNcIjtcbmltcG9ydCB7IENvbmZpZ0FjY2Vzc29yIH0gZnJvbSBcIi4vY29uZmlnQWNjZXNzb3IuanNcIjtcblxuLyoqXG4gKiBAdGVtcGxhdGUgVFxuICovXG5leHBvcnQgY2xhc3MgTWluZGlQcm92aWRlciBleHRlbmRzIFByb3ZpZGVyIHtcblxuICAgIC8qKlxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7VHlwZUNvbmZpZ30gdHlwZUNvbmZpZyBcbiAgICAgKiBAcGFyYW0ge0luamVjdG9yfSBpbmplY3RvclxuICAgICAqIEBwYXJhbSB7Q29uZmlnfSBjb25maWdcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3Rvcih0eXBlQ29uZmlnLCBpbmplY3RvciwgY29uZmlnKSB7XG5cbiAgICAgICAgc3VwZXIoKTtcblxuICAgICAgICAvKiogQHR5cGUge1R5cGVDb25maWd9ICovXG4gICAgICAgIHRoaXMudHlwZUNvbmZpZyA9IHR5cGVDb25maWc7XG5cbiAgICAgICAgLyoqIEB0eXBlIHtJbmplY3Rvcn0gKi9cbiAgICAgICAgdGhpcy5pbmplY3RvciA9IGluamVjdG9yO1xuXG4gICAgICAgIC8qKiBAdHlwZSB7Q29uZmlnfSAqL1xuICAgICAgICB0aGlzLmNvbmZpZyA9IGNvbmZpZztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBwYXJhbWV0ZXJzIFxuICAgICAqIEByZXR1cm5zIHtQcm9taXNlPFQ+fVxuICAgICAqL1xuICAgIGdldChwYXJhbWV0ZXJzID0gW10pIHtcbiAgICAgICAgLyoqIEB0eXBlIHtJbnN0YW5jZUhvbGRlcn0gKi9cbiAgICAgICAgY29uc3QgaW5zdGFuY2VIb2xkZXIgPSBDb25maWdBY2Nlc3Nvci5pbnN0YW5jZUhvbGRlcih0aGlzLnR5cGVDb25maWcubmFtZSwgdGhpcy5jb25maWcsIHBhcmFtZXRlcnMpO1xuICAgICAgICBpZiAoaW5zdGFuY2VIb2xkZXIudHlwZSA9PT0gSW5zdGFuY2VIb2xkZXIuTkVXX0lOU1RBTkNFKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5pbmplY3Rvci5pbmplY3RUYXJnZXQoaW5zdGFuY2VIb2xkZXIuaW5zdGFuY2UsIHRoaXMuY29uZmlnKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKGluc3RhbmNlSG9sZGVyLmluc3RhbmNlKTtcbiAgICB9XG5cbn0iLCJpbXBvcnQgeyBMaXN0LCBMb2dnZXIgfSBmcm9tIFwiY29yZXV0aWxfdjFcIjtcbmltcG9ydCB7IENvbmZpZyB9IGZyb20gXCIuL2NvbmZpZy5qc1wiO1xuaW1wb3J0IHsgQ29uZmlnQWNjZXNzb3IgfSBmcm9tIFwiLi9jb25maWdBY2Nlc3Nvci5qc1wiO1xuaW1wb3J0IHsgSW5qZWN0aW9uUG9pbnQgfSBmcm9tIFwiLi9hcGkvaW5qZWN0aW9uUG9pbnQuanNcIlxuaW1wb3J0IHsgSW5zdGFuY2VQcm9jZXNzb3JFeGVjdXRvciB9IGZyb20gXCIuL2luc3RhbmNlUHJvY2Vzc29yL2luc3RhbmNlUHJvY2Vzc29yRXhlY3V0b3IuanNcIjtcbmltcG9ydCB7IEluc3RhbmNlSG9sZGVyIH0gZnJvbSBcIi4vdHlwZUNvbmZpZy9pbnN0YW5jZUhvbGRlci5qc1wiO1xuaW1wb3J0IHsgTWluZGlQcm92aWRlciB9IGZyb20gXCIuL21pbmRpUHJvdmlkZXIuanNcIjtcbmltcG9ydCB7IEluamVjdG9yIH0gZnJvbSBcIi4vaW5qZWN0b3IuanNcIjtcblxuY29uc3QgTE9HID0gbmV3IExvZ2dlcihcIk1pbmRpSW5qZWN0b3JcIik7XG5cbmV4cG9ydCBjbGFzcyBNaW5kaUluamVjdG9yIGV4dGVuZHMgSW5qZWN0b3Ige1xuXG4gICAgc3RhdGljIGluamVjdCh0YXJnZXQsIGNvbmZpZykge1xuICAgICAgICByZXR1cm4gSU5KRUNUT1IuaW5qZWN0VGFyZ2V0KHRhcmdldCwgY29uZmlnKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAcmV0dXJucyB7TWluZGlJbmplY3Rvcn1cbiAgICAgKi9cbiAgICBzdGF0aWMgZ2V0SW5zdGFuY2UoKSB7XG4gICAgICAgIHJldHVybiBJTkpFQ1RPUjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBIZWxwZXIgbWV0aG9kIGZvciBpbmplY3RpbmcgZmllbGRzIGluIHRhcmdldCBvYmplY3RcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge2FueX0gdGFyZ2V0T2JqZWN0IFxuICAgICAqIEBwYXJhbSB7Q29uZmlnfSBjb25maWcgXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGRlcHRoXG4gICAgICogQHJldHVybnMge1Byb21pc2V9XG4gICAgICovXG4gICAgYXN5bmMgaW5qZWN0VGFyZ2V0KHRhcmdldE9iamVjdCwgY29uZmlnLCBkZXB0aCA9IDApIHtcbiAgICAgICAgaWYgKCF0YXJnZXRPYmplY3QpIHtcbiAgICAgICAgICAgIHRocm93IEVycm9yKFwiTWlzc2luZyB0YXJnZXQgb2JqZWN0XCIpO1xuICAgICAgICB9XG4gICAgICAgIGlmICghY29uZmlnKSB7XG4gICAgICAgICAgICB0aHJvdyBFcnJvcihcIk1pc3NpbmcgY29uZmlnXCIpO1xuICAgICAgICB9XG4gICAgICAgIGlmICghY29uZmlnLmlzRmluYWxpemVkKCkpIHtcbiAgICAgICAgICAgIHRocm93IEVycm9yKFwiQ29uZmlnIG5vdCBmaW5hbGl6ZWRcIik7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRlcHRoID4gMTApIHtcbiAgICAgICAgICAgIHRocm93IEVycm9yKFwiSW5qZWN0aW9uIHN0cnVjdHVyZSB0b28gZGVlcFwiKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBpbmplY3RvciA9IHRoaXM7XG4gICAgICAgIGNvbnN0IG9iamVjdEZpZWxkTmFtZXMgPSBuZXcgTGlzdChPYmplY3Qua2V5cyh0YXJnZXRPYmplY3QpKTtcblxuICAgICAgICBhd2FpdCBvYmplY3RGaWVsZE5hbWVzLnByb21pc2VDaGFpbigoZmllbGROYW1lLCBwYXJlbnQpID0+IHtcbiAgICAgICAgICAgICAgICByZXR1cm4gTWluZGlJbmplY3Rvci5pbmplY3RQcm9wZXJ0eSh0YXJnZXRPYmplY3QsIGZpZWxkTmFtZSwgY29uZmlnLCBkZXB0aCwgaW5qZWN0b3IpO1xuICAgICAgICB9KTtcbiAgICAgICAgYXdhaXQgSW5zdGFuY2VQcm9jZXNzb3JFeGVjdXRvci5leGVjdXRlKHRhcmdldE9iamVjdCwgY29uZmlnKTtcbiAgICAgICAgcmV0dXJuIHRhcmdldE9iamVjdDtcblxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSB0YXJnZXRPYmplY3QgXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IGZpZWxkTmFtZSBcbiAgICAgKiBAcGFyYW0ge0NvbmZpZ30gY29uZmlnIFxuICAgICAqIEBwYXJhbSB7TnVtYmVyfSBkZXB0aCBcbiAgICAgKiBAcGFyYW0ge0luamVjdG9yfSBpbmplY3RvclxuICAgICAqIEByZXR1cm5zIHtQcm9taXNlfVxuICAgICAqL1xuICAgIHN0YXRpYyBpbmplY3RQcm9wZXJ0eSh0YXJnZXRPYmplY3QsIGZpZWxkTmFtZSwgY29uZmlnLCBkZXB0aCwgaW5qZWN0b3IpIHtcbiAgICAgICAgY29uc3QgaW5qZWN0aW9uUG9pbnQgPSB0YXJnZXRPYmplY3RbZmllbGROYW1lXTsgICAgICAgIFxuICAgICAgICBpZighKGluamVjdGlvblBvaW50IGluc3RhbmNlb2YgSW5qZWN0aW9uUG9pbnQpKSB7XG4gICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGluamVjdGlvblBvaW50LnR5cGUgPT09IEluamVjdGlvblBvaW50LlBST1ZJREVSX1RZUEUpIHtcbiAgICAgICAgICAgIE1pbmRpSW5qZWN0b3IuaW5qZWN0UHJvcGVydHlQcm92aWRlcih0YXJnZXRPYmplY3QsIGZpZWxkTmFtZSwgY29uZmlnLCBpbmplY3Rvcik7XG4gICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIE1pbmRpSW5qZWN0b3IuaW5qZWN0UHJvcGVydHlJbnN0YW5jZSh0YXJnZXRPYmplY3QsIGZpZWxkTmFtZSwgY29uZmlnLCBkZXB0aCwgaW5qZWN0b3IpO1xuICAgICAgICBcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gdGFyZ2V0T2JqZWN0IFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWVsZE5hbWUgXG4gICAgICogQHBhcmFtIHtDb25maWd9IGNvbmZpZyBcbiAgICAgKiBAcGFyYW0ge0luamVjdG9yfSBpbmplY3RvclxuICAgICAqL1xuICAgIHN0YXRpYyBpbmplY3RQcm9wZXJ0eVByb3ZpZGVyKHRhcmdldE9iamVjdCwgZmllbGROYW1lLCBjb25maWcsIGluamVjdG9yKSB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBAdHlwZSB7SW5qZWN0aW9uUG9pbnR9XG4gICAgICAgICAqL1xuICAgICAgICBjb25zdCBpbmplY3Rpb25Qb2ludCA9IHRhcmdldE9iamVjdFtmaWVsZE5hbWVdO1xuICAgICAgICBjb25zdCB0eXBlQ29uZmlnID0gQ29uZmlnQWNjZXNzb3IudHlwZUNvbmZpZ0J5TmFtZShpbmplY3Rpb25Qb2ludC5uYW1lLCBjb25maWcpO1xuICAgICAgICB0YXJnZXRPYmplY3RbZmllbGROYW1lXSA9IG5ldyBNaW5kaVByb3ZpZGVyKHR5cGVDb25maWcsIGluamVjdG9yLCBjb25maWcpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSB0YXJnZXRPYmplY3QgXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpZWxkTmFtZSBcbiAgICAgKiBAcGFyYW0ge0NvbmZpZ30gY29uZmlnIFxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBkZXB0aCBcbiAgICAgKiBAcGFyYW0ge0luamVjdG9yfSBpbmplY3RvclxuICAgICAqIEByZXR1cm5zIHtQcm9taXNlfVxuICAgICAqL1xuICAgIHN0YXRpYyBpbmplY3RQcm9wZXJ0eUluc3RhbmNlKHRhcmdldE9iamVjdCwgZmllbGROYW1lLCBjb25maWcsIGRlcHRoLCBpbmplY3Rvcikge1xuICAgICAgICBsZXQgaW5qZWN0UHJvbWlzZSA9IFByb21pc2UucmVzb2x2ZSgpO1xuICAgICAgICAvKiogQHR5cGUge0luamVjdGlvblBvaW50fSAqL1xuICAgICAgICBjb25zdCBpbmplY3Rpb25Qb2ludCA9IHRhcmdldE9iamVjdFtmaWVsZE5hbWVdO1xuICAgICAgICBjb25zdCBpbnN0YW5jZUhvbGRlciA9IENvbmZpZ0FjY2Vzc29yLmluc3RhbmNlSG9sZGVyKGluamVjdGlvblBvaW50Lm5hbWUsIGNvbmZpZywgaW5qZWN0aW9uUG9pbnQucGFyYW1ldGVycyk7XG4gICAgICAgIGlmIChpbnN0YW5jZUhvbGRlci50eXBlID09PSBJbnN0YW5jZUhvbGRlci5ORVdfSU5TVEFOQ0UpIHtcbiAgICAgICAgICAgIGluamVjdFByb21pc2UgPSBpbmplY3Rvci5pbmplY3RUYXJnZXQoaW5zdGFuY2VIb2xkZXIuaW5zdGFuY2UsIGNvbmZpZywgZGVwdGgrKyk7XG4gICAgICAgIH1cbiAgICAgICAgdGFyZ2V0T2JqZWN0W2ZpZWxkTmFtZV0gPSBpbnN0YW5jZUhvbGRlci5pbnN0YW5jZTtcbiAgICAgICAgcmV0dXJuIGluamVjdFByb21pc2U7XG4gICAgfVxuXG59XG5cbmNvbnN0IElOSkVDVE9SID0gbmV3IE1pbmRpSW5qZWN0b3IoKTsiLCJpbXBvcnQgeyBNYXAsIExvZ2dlciwgTGlzdCB9IGZyb20gXCJjb3JldXRpbF92MVwiO1xuaW1wb3J0IHsgQ29uZmlnIH0gZnJvbSBcIi4uL2NvbmZpZy5qc1wiO1xuaW1wb3J0IHsgQ29uZmlnQWNjZXNzb3IgfSBmcm9tIFwiLi4vY29uZmlnQWNjZXNzb3IuanNcIjtcbmltcG9ydCB7IEluamVjdG9yIH0gZnJvbSBcIi4uL2luamVjdG9yLmpzXCI7XG5pbXBvcnQgeyBJbnN0YW5jZUhvbGRlciB9IGZyb20gXCIuLi90eXBlQ29uZmlnL2luc3RhbmNlSG9sZGVyLmpzXCI7XG5pbXBvcnQgeyBUeXBlQ29uZmlnIH0gZnJvbSBcIi4uL3R5cGVDb25maWcvdHlwZUNvbmZpZy5qc1wiO1xuXG5jb25zdCBMT0cgPSBuZXcgTG9nZ2VyKFwiQ29uZmlnUHJvY2Vzc29yRXhlY3V0b3JcIik7XG5cbi8qKlxuICogRXhlY3V0ZXMgdGhlIHByb3ZpZGVkIGNvbmZpZyBwcm9jZXNzb3JzIG9uIHRoZSBwcm92aWRlZCBjb25maWcgcmVnaXN0cnlcbiAqIFJldHVybnMgYSBsaXN0IG9mIHByb21pc2VzIGZvciB3aGVuIHRoZSBjb25maWcgcHJvY2Vzc29ycyBoYXMgY29tcGxldGVkIHJ1bm5pbmdcbiAqIFxuICogQSBjb25maWcgcHJvY2Vzc29yIHJlYWRzIHRoZSBjb25maWcgYW5kIHBlcmZvcm1zIGFueSBuZWNlc3NhcnkgYWN0aW9ucyBiYXNlZCBvblxuICogY2xhc3MgYW5kIHR5cGUgaW5mb3JtYXRpb24uIEEgY29uZmlnIHByb2Nlc3NvciBkb2VzIG5vdCBvcGVyYXRlIG9uIG1hbmFnZWQgaW5zdGFuY2VzXG4gKi9cbmV4cG9ydCBjbGFzcyBDb25maWdQcm9jZXNzb3JFeGVjdXRvciB7XG4gICAgXG4gICAgLyoqXG4gICAgICogQHBhcmFtIHtMaXN0PFN0cmluZz59IGNvbmZpZ1Byb2Nlc3NvckNsYXNzTmFtZUxpc3RcbiAgICAgKiBAcGFyYW0ge0luamVjdG9yfSBpbmplY3RvclxuICAgICAqIEBwYXJhbSB7Q29uZmlnfSBjb25maWdcbiAgICAgKiBAcmV0dXJucyB7UHJvbWlzZX0gcHJvbWlzZSB3aGljaCBpcyByZXNvbHZlZCB3aGVuIGFsbCBjb25maWcgcHJvY2Vzc29ycyBhcmUgcmVzb2x2ZWRcbiAgICAgKi9cbiAgICBzdGF0aWMgZXhlY3V0ZShjb25maWdQcm9jZXNzb3JDbGFzc05hbWVMaXN0LCBpbmplY3RvciwgY29uZmlnKSB7XG4gICAgICAgIHJldHVybiBjb25maWdQcm9jZXNzb3JDbGFzc05hbWVMaXN0LnByb21pc2VDaGFpbigoY29uZmlnUHJvY2Vzc29yQ2xhc3NOYW1lLCBwYXJlbnQpID0+IHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZUNvbmZpZ1Byb2Nlc3NvckV4ZWN1dGVkLCByZWplY3QpID0+IHtcblxuICAgICAgICAgICAgICAgIGxldCB0YXJnZXRJbmplY3RlZFByb21pc2UgPSBQcm9taXNlLnJlc29sdmUoKTtcblxuICAgICAgICAgICAgICAgIC8qKiAgQHR5cGUge0luc3RhbmNlSG9sZGVyfSAqL1xuICAgICAgICAgICAgICAgIGNvbnN0IHByb2Nlc3NvckhvbGRlciA9IENvbmZpZ0FjY2Vzc29yLmluc3RhbmNlSG9sZGVyKGNvbmZpZ1Byb2Nlc3NvckNsYXNzTmFtZSwgY29uZmlnKTtcbiAgICAgICAgICAgICAgICBpZihwcm9jZXNzb3JIb2xkZXIudHlwZSA9PT0gSW5zdGFuY2VIb2xkZXIuTkVXX0lOU1RBTkNFKSB7XG4gICAgICAgICAgICAgICAgICAgIHRhcmdldEluamVjdGVkUHJvbWlzZSA9IGluamVjdG9yLmluamVjdFRhcmdldChwcm9jZXNzb3JIb2xkZXIuaW5zdGFuY2UsIGNvbmZpZyk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgdGFyZ2V0SW5qZWN0ZWRQcm9taXNlLnRoZW4oKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB0b0NvbmZpZ3VyZU1hcCA9IENvbmZpZ1Byb2Nlc3NvckV4ZWN1dG9yLnByZXBhcmVVbmNvbmZpZ3VyZWRDb25maWdFbnRyaWVzKGNvbmZpZy5jb25maWdFbnRyaWVzKTtcbiAgICAgICAgICAgICAgICAgICAgcHJvY2Vzc29ySG9sZGVyLmluc3RhbmNlLnByb2Nlc3NDb25maWcoY29uZmlnLCB0b0NvbmZpZ3VyZU1hcCkudGhlbigoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlQ29uZmlnUHJvY2Vzc29yRXhlY3V0ZWQoKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSlcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge01hcDxUeXBlQ29uZmlnPn0gY29uZmlnRW50cmllcyBcbiAgICAgKiBAcmV0dXJuIHtNYXA8VHlwZUNvbmZpZz59XG4gICAgICovXG4gICAgc3RhdGljIHByZXBhcmVVbmNvbmZpZ3VyZWRDb25maWdFbnRyaWVzKGNvbmZpZ0VudHJpZXMpIHtcbiAgICAgICAgLyoqIEB0eXBlIHtNYXA8VHlwZUNvbmZpZz59ICovXG4gICAgICAgIGNvbnN0IHVuY29uZmlndXJlZENvbmZpZ0VudHJpZXMgPSBuZXcgTWFwKCk7XG5cbiAgICAgICAgY29uZmlnRW50cmllcy5mb3JFYWNoKChrZXksIHZhbHVlLCBwYXJlbnQpID0+IHtcblxuICAgICAgICAgICAgLyoqIEB0eXBlIHtUeXBlQ29uZmlnfSAqL1xuICAgICAgICAgICAgY29uc3QgY29uZmlnRW50cnkgPSB2YWx1ZTtcblxuICAgICAgICAgICAgaWYoY29uZmlnRW50cnkuc3RhZ2UgPT09IFR5cGVDb25maWcuTkVXKSB7XG4gICAgICAgICAgICAgICAgdW5jb25maWd1cmVkQ29uZmlnRW50cmllcy5zZXQoa2V5LCBjb25maWdFbnRyeSk7XG4gICAgICAgICAgICAgICAgY29uZmlnRW50cnkuc3RhZ2UgPSBUeXBlQ29uZmlnLkNPTkZJR1VSRUQ7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9LCB0aGlzKTtcblxuICAgICAgICByZXR1cm4gdW5jb25maWd1cmVkQ29uZmlnRW50cmllcztcbiAgICB9XG5cbn0iLCJpbXBvcnQgeyBUeXBlQ29uZmlnIH0gZnJvbSBcIi4vdHlwZUNvbmZpZy5qc1wiO1xuaW1wb3J0IHsgTG9nZ2VyIH0gZnJvbSBcImNvcmV1dGlsX3YxXCI7XG5pbXBvcnQgeyBJbnN0YW5jZUhvbGRlciB9IGZyb20gXCIuL2luc3RhbmNlSG9sZGVyLmpzXCI7XG5cbmNvbnN0IExPRyA9IG5ldyBMb2dnZXIoXCJTaW5nbGV0b25Db25maWdcIik7XG5cbmV4cG9ydCBjbGFzcyBTaW5nbGV0b25Db25maWcgZXh0ZW5kcyBUeXBlQ29uZmlnIHtcblxuICAgIHN0YXRpYyBuYW1lZChuYW1lLCBjbGFzc1JlZmVyZW5jZSkge1xuICAgICAgICByZXR1cm4gbmV3IFNpbmdsZXRvbkNvbmZpZyhuYW1lLCBjbGFzc1JlZmVyZW5jZSk7XG4gICAgfVxuXG4gICAgc3RhdGljIHVubmFtZWQoY2xhc3NSZWZlcmVuY2UpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBTaW5nbGV0b25Db25maWcoY2xhc3NSZWZlcmVuY2UubmFtZSwgY2xhc3NSZWZlcmVuY2UpO1xuICAgIH1cblxuICAgIGNvbnN0cnVjdG9yKG5hbWUsIGNsYXNzUmVmZXJlbmNlKSB7XG4gICAgICAgIHN1cGVyKG5hbWUsIGNsYXNzUmVmZXJlbmNlKTtcbiAgICB9XG5cbiAgICBpbnN0YW5jZUhvbGRlcihwYXJhbWV0ZXJzID0gW10pIHtcbiAgICAgICAgaWYgKCF0aGlzLmluc3RhbmNlKSB7XG4gICAgICAgICAgICBpZihwYXJhbWV0ZXJzICYmIHBhcmFtZXRlcnMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIHRoaXMuaW5zdGFuY2UgPSBuZXcgdGhpcy5jbGFzc1JlZmVyZW5jZSguLi5wYXJhbWV0ZXJzKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5pbnN0YW5jZSA9IG5ldyB0aGlzLmNsYXNzUmVmZXJlbmNlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gSW5zdGFuY2VIb2xkZXIuaG9sZGVyV2l0aE5ld0luc3RhbmNlKHRoaXMuaW5zdGFuY2UpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBJbnN0YW5jZUhvbGRlci5ob2xkZXJXaXRoRXhpc3RpbmdJbnN0YW5jZSh0aGlzLmluc3RhbmNlKTtcbiAgICB9XG5cbn0iLCJleHBvcnQgY2xhc3MgSW5zdGFuY2VQcm9jZXNzb3Ige1xuXG4gICAgLyoqXG4gICAgICogXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGluc3RhbmNlIFxuICAgICAqIEByZXR1cm4ge1Byb21pc2V9XG4gICAgICovXG4gICAgcHJvY2VzcyhpbnN0YW5jZSkge1xuICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG4gICAgfVxuXG59IiwiaW1wb3J0IHsgTWFwIH0gZnJvbSBcImNvcmV1dGlsX3YxXCI7XG5pbXBvcnQgeyBDb25maWcgfSBmcm9tIFwiLi4vY29uZmlnLmpzXCI7XG5pbXBvcnQgeyBUeXBlQ29uZmlnIH0gZnJvbSBcIi4uL3R5cGVDb25maWcvdHlwZUNvbmZpZy5qc1wiO1xuXG5leHBvcnQgY2xhc3MgQ29uZmlnUHJvY2Vzc29yIHtcblxuICAgIC8qKlxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7Q29uZmlnfSBjb25maWcgXG4gICAgICogQHBhcmFtIHtNYXA8VHlwZUNvbmZpZz59IGNvbmZpZ0VudHJpZXNNYXAgXG4gICAgICovXG4gICAgcHJvY2Vzc0NvbmZpZyhjb25maWcsIGNvbmZpZ0VudHJpZXNNYXApIHtcbiAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xuICAgIH1cblxufSIsImltcG9ydCB7IE1hcCwgTGlzdCwgTG9nZ2VyIH0gZnJvbSBcImNvcmV1dGlsX3YxXCI7XG5pbXBvcnQgeyBUeXBlQ29uZmlnIH0gZnJvbSBcIi4vdHlwZUNvbmZpZy90eXBlQ29uZmlnLmpzXCI7XG5pbXBvcnQgeyBDb25maWdQcm9jZXNzb3JFeGVjdXRvciB9IGZyb20gXCIuL2NvbmZpZ1Byb2Nlc3Nvci9jb25maWdQcm9jZXNzb3JFeGVjdXRvci5qc1wiO1xuaW1wb3J0IHsgU2luZ2xldG9uQ29uZmlnIH0gZnJvbSBcIi4vdHlwZUNvbmZpZy9zaW5nbGV0b25Db25maWcuanNcIjtcbmltcG9ydCB7IENvbmZpZyB9IGZyb20gXCIuL2NvbmZpZy5qc1wiO1xuaW1wb3J0IHsgTWluZGlJbmplY3RvciB9IGZyb20gXCIuL21pbmRpSW5qZWN0b3IuanNcIjtcbmltcG9ydCB7IEluc3RhbmNlUHJvY2Vzc29yIH0gZnJvbSBcIi4vaW5zdGFuY2VQcm9jZXNzb3IvaW5zdGFuY2VQcm9jZXNzb3IuanNcIjtcbmltcG9ydCB7IENvbmZpZ1Byb2Nlc3NvciB9IGZyb20gXCIuL2NvbmZpZ1Byb2Nlc3Nvci9jb25maWdQcm9jZXNzb3IuanNcIjtcblxuY29uc3QgTE9HID0gbmV3IExvZ2dlcihcIkNvbmZpZ1wiKTtcblxuZXhwb3J0IGNsYXNzIE1pbmRpQ29uZmlnIGV4dGVuZHMgQ29uZmlnIHtcblxuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICBzdXBlcigpO1xuXG4gICAgICAgIC8qKiBAdHlwZSB7Qm9vbGVhbn0gKi9cbiAgICAgICAgdGhpcy5maW5hbGl6ZWQgPSBmYWxzZTtcblxuICAgICAgICAvKiogQHR5cGUge01hcDxUeXBlQ29uZmlnPn0gKi9cbiAgICAgICAgdGhpcy5jb25maWdFbnRyaWVzID0gbmV3IE1hcCgpO1xuXG4gICAgICAgIC8qKiBAdHlwZSB7TGlzdDxTdHJpbmc+fSAqL1xuICAgICAgICB0aGlzLmNvbmZpZ1Byb2Nlc3NvcnMgPSBuZXcgTGlzdCgpO1xuXG4gICAgICAgIC8qKiBAdHlwZSB7TGlzdDxTdHJpbmc+fSAqL1xuICAgICAgICB0aGlzLmluc3RhbmNlUHJvY2Vzc29ycyA9IG5ldyBMaXN0KCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogXG4gICAgICogQHBhcmFtIHtDb25maWd9IGNvbmZpZ1xuICAgICAqIEByZXR1cm5zIHtNaW5kaUNvbmZpZ31cbiAgICAgKi9cbiAgICBtZXJnZShjb25maWcpIHtcbiAgICAgICAgdGhpcy5maW5hbGl6ZWQgPSB0cnVlO1xuXG5cbiAgICAgICAgY29uc3QgbmV3Q29uZmlnRW50cmllcyA9IG5ldyBNYXAoKTtcbiAgICAgICAgbmV3Q29uZmlnRW50cmllcy5hZGRBbGwodGhpcy5jb25maWdFbnRyaWVzKTtcbiAgICAgICAgbmV3Q29uZmlnRW50cmllcy5hZGRBbGwoY29uZmlnLmNvbmZpZ0VudHJpZXMpO1xuXG4gICAgICAgIGNvbnN0IG5ld0NvbmZpZ1Byb2Nlc3NvcnMgPSBuZXcgTGlzdCgpO1xuICAgICAgICBuZXdDb25maWdQcm9jZXNzb3JzLmFkZEFsbCh0aGlzLmNvbmZpZ1Byb2Nlc3NvcnMpO1xuICAgICAgICBuZXdDb25maWdQcm9jZXNzb3JzLmFkZEFsbChjb25maWcuY29uZmlnUHJvY2Vzc29ycyk7XG5cbiAgICAgICAgY29uc3QgbmV3SW5zdGFuY2VQcm9jZXNzb3JzID0gbmV3IExpc3QoKTtcbiAgICAgICAgbmV3SW5zdGFuY2VQcm9jZXNzb3JzLmFkZEFsbCh0aGlzLmluc3RhbmNlUHJvY2Vzc29ycyk7XG4gICAgICAgIG5ld0luc3RhbmNlUHJvY2Vzc29ycy5hZGRBbGwoY29uZmlnLmluc3RhbmNlUHJvY2Vzc29ycyk7XG5cbiAgICAgICAgLyoqIEB0eXBlIHtNYXB9ICovXG4gICAgICAgIHRoaXMuY29uZmlnRW50cmllcyA9IG5ld0NvbmZpZ0VudHJpZXM7XG4gICAgICAgIHRoaXMuY29uZmlnUHJvY2Vzc29ycyA9IG5ld0NvbmZpZ1Byb2Nlc3NvcnM7XG4gICAgICAgIHRoaXMuaW5zdGFuY2VQcm9jZXNzb3JzID0gbmV3SW5zdGFuY2VQcm9jZXNzb3JzO1xuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7VHlwZUNvbmZpZ30gdHlwZUNvbmZpZ1xuICAgICAqIEByZXR1cm5zIHtNaW5kaUNvbmZpZ31cbiAgICAgKi9cbiAgICBhZGRUeXBlQ29uZmlnKHR5cGVDb25maWcpIHtcbiAgICAgICAgdGhpcy5maW5hbGl6ZWQgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5jb25maWdFbnRyaWVzLnNldCh0eXBlQ29uZmlnLm5hbWUsIHR5cGVDb25maWcpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge0NvbmZpZ1Byb2Nlc3Nvcn0gY29uZmlnUHJvY2Vzc29yXG4gICAgICogQHJldHVybnMge01pbmRpQ29uZmlnfVxuICAgICAqL1xuICAgIGFkZENvbmZpZ1Byb2Nlc3Nvcihjb25maWdQcm9jZXNzb3IpIHtcbiAgICAgICAgdGhpcy5jb25maWdQcm9jZXNzb3JzLmFkZChjb25maWdQcm9jZXNzb3IubmFtZSk7XG4gICAgICAgIHJldHVybiB0aGlzLmFkZFR5cGVDb25maWcoU2luZ2xldG9uQ29uZmlnLnVubmFtZWQoY29uZmlnUHJvY2Vzc29yKSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogXG4gICAgICogQHBhcmFtIHtJbnN0YW5jZVByb2Nlc3Nvcn0gaW5zdGFuY2VQcm9jZXNzb3JcbiAgICAgKiBAcmV0dXJucyB7TWluZGlDb25maWd9XG4gICAgICovXG4gICAgYWRkSW5zdGFuY2VQcm9jZXNzb3IoaW5zdGFuY2VQcm9jZXNzb3IpIHtcbiAgICAgICAgdGhpcy5pbnN0YW5jZVByb2Nlc3NvcnMuYWRkKGluc3RhbmNlUHJvY2Vzc29yLm5hbWUpO1xuICAgICAgICByZXR1cm4gdGhpcy5hZGRUeXBlQ29uZmlnKFNpbmdsZXRvbkNvbmZpZy51bm5hbWVkKGluc3RhbmNlUHJvY2Vzc29yKSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogXG4gICAgICogQHBhcmFtIHtMaXN0PFR5cGVDb25maWc+fSB0eXBlQ29uZmlnTGlzdFxuICAgICAqIEByZXR1cm4ge01pbmRpQ29uZmlnfVxuICAgICAqL1xuICAgIGFkZEFsbFR5cGVDb25maWcodHlwZUNvbmZpZ0xpc3QpIHtcbiAgICAgICAgdGhpcy5maW5hbGl6ZWQgPSBmYWxzZTtcbiAgICAgICAgdHlwZUNvbmZpZ0xpc3QuZm9yRWFjaCgodHlwZUNvbmZpZyxwYXJlbnQpID0+IHtcbiAgICAgICAgICAgIHRoaXMuY29uZmlnRW50cmllcy5zZXQodHlwZUNvbmZpZy5uYW1lLCB0eXBlQ29uZmlnKTtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9LCB0aGlzKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogXG4gICAgICogQHBhcmFtIHtMaXN0PG5ldygpID0+IENvbmZpZ1Byb2Nlc3Nvcj59IGNvbmZpZ1Byb2Nlc3Nvckxpc3RcbiAgICAgKiBAcmV0dXJuIHtNaW5kaUNvbmZpZ31cbiAgICAgKi9cbiAgICBhZGRBbGxDb25maWdQcm9jZXNzb3IoY29uZmlnUHJvY2Vzc29yTGlzdCkge1xuICAgICAgICBjb25maWdQcm9jZXNzb3JMaXN0LmZvckVhY2goKGNvbmZpZ1Byb2Nlc3NvcixwYXJlbnQpID0+IHtcbiAgICAgICAgICAgIHRoaXMuY29uZmlnUHJvY2Vzc29ycy5hZGQoY29uZmlnUHJvY2Vzc29yLm5hbWUpO1xuICAgICAgICAgICAgdGhpcy5hZGRUeXBlQ29uZmlnKFNpbmdsZXRvbkNvbmZpZy51bm5hbWVkKGNvbmZpZ1Byb2Nlc3NvcikpO1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH0sIHRoaXMpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge0xpc3Q8bmV3KCkgPT4gSW5zdGFuY2VQcm9jZXNzb3J9IGluc3RhbmNlUHJvY2Vzc29yTGlzdCBcbiAgICAgKiBAcmV0dXJuIHtNaW5kaUNvbmZpZ31cbiAgICAgKi9cbiAgICBhZGRBbGxJbnN0YW5jZVByb2Nlc3NvcihpbnN0YW5jZVByb2Nlc3Nvckxpc3QpIHtcbiAgICAgICAgaW5zdGFuY2VQcm9jZXNzb3JMaXN0LmZvckVhY2goKGluc3RhbmNlUHJvY2Vzc29yLHBhcmVudCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5pbnN0YW5jZVByb2Nlc3NvcnMuYWRkKGluc3RhbmNlUHJvY2Vzc29yLm5hbWUpO1xuICAgICAgICAgICAgdGhpcy5hZGRUeXBlQ29uZmlnKFNpbmdsZXRvbkNvbmZpZy51bm5hbWVkKGluc3RhbmNlUHJvY2Vzc29yKSk7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfSwgdGhpcyk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgICAqL1xuICAgIGlzRmluYWxpemVkKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5maW5hbGl6ZWQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQHJldHVybnMge1Byb21pc2V9XG4gICAgICovXG4gICAgZmluYWxpemUoKSB7XG4gICAgICAgIHRoaXMuZmluYWxpemVkID0gdHJ1ZTtcbiAgICAgICAgcmV0dXJuIENvbmZpZ1Byb2Nlc3NvckV4ZWN1dG9yLmV4ZWN1dGUodGhpcy5jb25maWdQcm9jZXNzb3JzLCBNaW5kaUluamVjdG9yLmdldEluc3RhbmNlKCksIHRoaXMpO1xuICAgIH1cblxufSIsImltcG9ydCB7IExvZ2dlciB9IGZyb20gXCJjb3JldXRpbF92MVwiO1xuaW1wb3J0IHsgSW5zdGFuY2VQcm9jZXNzb3IgfSBmcm9tIFwiLi9pbnN0YW5jZVByb2Nlc3Nvci5qc1wiO1xuXG5jb25zdCBMT0cgPSBuZXcgTG9nZ2VyKFwiSW5zdGFuY2VQb3N0Q29uZmlnVHJpZ2dlclwiKTtcblxuLyoqXG4gKiBJbnN0YW5jZSBwcm9jZXNzb3Igd2hpY2ggY2FsbHMgcG9zdENvbmZpZyBvbiBvYmplY3RzIGFmdGVyIGNvbmZpZ1Byb2Nlc3NvcnMgYXJlIGZpbmlzaGVkXG4gKi9cbmV4cG9ydCBjbGFzcyBJbnN0YW5jZVBvc3RDb25maWdUcmlnZ2VyIGV4dGVuZHMgSW5zdGFuY2VQcm9jZXNzb3Ige1xuXG4gICAgLyoqXG4gICAgICogXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGluc3RhbmNlIFxuICAgICAqIEByZXR1cm4ge1Byb21pc2V9XG4gICAgICovXG4gICAgcHJvY2VzcyhpbnN0YW5jZSkge1xuICAgICAgICBsZXQgcmVzcG9uc2UgPSBudWxsO1xuICAgICAgICBpZihpbnN0YW5jZS5wb3N0Q29uZmlnKSB7XG4gICAgICAgICAgICByZXNwb25zZSA9IGluc3RhbmNlLnBvc3RDb25maWcoKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIXJlc3BvbnNlKSB7XG4gICAgICAgICAgICByZXNwb25zZSA9IG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCkgPT4geyByZXNvbHZlKCk7IH0pO1xuICAgICAgICB9XG4gICAgICAgIGlmICghcmVzcG9uc2UgaW5zdGFuY2VvZiBQcm9taXNlKSB7XG4gICAgICAgICAgICB0aHJvdyBcInBvc3RDb25maWcoKSBtdXN0IHJldHVybiBlaXRoZXIgdW5kZWZpbmVkIG9yIG51bGwgb3IgYSBQcm9taXNlXCJcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzcG9uc2U7XG4gICAgfVxuXG59IiwiaW1wb3J0IHsgVHlwZUNvbmZpZyB9IGZyb20gXCIuL3R5cGVDb25maWcuanNcIjtcblxuZXhwb3J0IGNsYXNzIFBvb2xDb25maWcgZXh0ZW5kcyBUeXBlQ29uZmlnIHtcblxuICAgIHN0YXRpYyBuYW1lZChuYW1lLCBjbGFzc1JlZmVyZW5jZSwgcG9vbFNpemUpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBQb29sQ29uZmlnKG5hbWUsIGNsYXNzUmVmZXJlbmNlLCBwb29sU2l6ZSk7XG4gICAgfVxuXG4gICAgc3RhdGljIHVubmFtZWQoY2xhc3NSZWZlcmVuY2UsIHBvb2xTaXplKSB7XG4gICAgICAgIHJldHVybiBuZXcgUG9vbENvbmZpZyhjbGFzc1JlZmVyZW5jZS5uYW1lLCBjbGFzc1JlZmVyZW5jZSwgcG9vbFNpemUpO1xuICAgIH1cblxuICAgIGNvbnN0cnVjdG9yKG5hbWUsIGNsYXNzUmVmZXJlbmNlLCBwb29sU2l6ZSkge1xuICAgICAgICBzdXBlcihuYW1lLCBjbGFzc1JlZmVyZW5jZSk7XG4gICAgICAgIHRoaXMucG9vbFNpemUgPSBwb29sU2l6ZTtcbiAgICB9XG5cbiAgICBpbnN0YW5jZUhvbGRlcihwYXJhbWV0ZXJzID0gW10pIHtcblxuICAgIH1cblxufSIsImltcG9ydCB7IFR5cGVDb25maWcgfSBmcm9tIFwiLi90eXBlQ29uZmlnLmpzXCI7XG5pbXBvcnQgeyBJbnN0YW5jZUhvbGRlciB9IGZyb20gXCIuL2luc3RhbmNlSG9sZGVyLmpzXCI7XG5cbmV4cG9ydCBjbGFzcyBQcm90b3R5cGVDb25maWcgZXh0ZW5kcyBUeXBlQ29uZmlnIHtcblxuICAgIHN0YXRpYyBuYW1lZChuYW1lLCBjbGFzc1JlZmVyZW5jZSkge1xuICAgICAgICByZXR1cm4gbmV3IFByb3RvdHlwZUNvbmZpZyhuYW1lLCBjbGFzc1JlZmVyZW5jZSk7XG4gICAgfVxuXG4gICAgc3RhdGljIHVubmFtZWQoY2xhc3NSZWZlcmVuY2UpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm90b3R5cGVDb25maWcoY2xhc3NSZWZlcmVuY2UubmFtZSwgY2xhc3NSZWZlcmVuY2UpO1xuICAgIH1cblxuICAgIGNvbnN0cnVjdG9yKG5hbWUsIGNsYXNzUmVmZXJlbmNlKSB7XG4gICAgICAgIHN1cGVyKG5hbWUsIGNsYXNzUmVmZXJlbmNlKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAcGFyYW0ge2FycmF5fSBwYXJhbWV0ZXJzIHRoZSBwYXJhbWV0ZXJzIHRvIHVzZSBmb3IgdGhlIGNvbnN0cnVjdG9yXG4gICAgICovXG4gICAgaW5zdGFuY2VIb2xkZXIocGFyYW1ldGVycyA9IFtdKSB7XG4gICAgICAgIGxldCBpbnN0YW5jZSA9IG51bGw7XG4gICAgICAgIGlmKHBhcmFtZXRlcnMgJiYgcGFyYW1ldGVycy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBpbnN0YW5jZSA9IG5ldyB0aGlzLmNsYXNzUmVmZXJlbmNlKC4uLnBhcmFtZXRlcnMpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaW5zdGFuY2UgPSBuZXcgdGhpcy5jbGFzc1JlZmVyZW5jZSgpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBJbnN0YW5jZUhvbGRlci5ob2xkZXJXaXRoTmV3SW5zdGFuY2UoaW5zdGFuY2UpO1xuICAgIH1cblxuXG59Il0sIm5hbWVzIjpbIkxPRyJdLCJtYXBwaW5ncyI6Ijs7QUFBTyxNQUFNLE1BQU0sQ0FBQztBQUNwQjtBQUNBLElBQUksV0FBVyxHQUFHO0FBQ2xCO0FBQ0EsUUFBUSxJQUFJLENBQUMsYUFBYSxHQUFHLElBQUksQ0FBQztBQUNsQztBQUNBO0FBQ0EsUUFBUSxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsSUFBSSxDQUFDO0FBQ3JDO0FBQ0E7QUFDQSxRQUFRLElBQUksQ0FBQyxrQkFBa0IsR0FBRyxJQUFJLENBQUM7QUFDdkMsS0FBSztBQUNMO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBSSxRQUFRLEdBQUc7QUFDZjtBQUNBLEtBQUs7QUFDTDtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQUksV0FBVyxHQUFHO0FBQ2xCLFFBQVEsT0FBTyxLQUFLLENBQUM7QUFDckIsS0FBSztBQUNMOztBQzFCTyxNQUFNLGNBQWMsQ0FBQztBQUM1QjtBQUNBLElBQUksV0FBVyxZQUFZLEdBQUcsRUFBRSxPQUFPLENBQUMsQ0FBQyxFQUFFO0FBQzNDO0FBQ0EsSUFBSSxXQUFXLGlCQUFpQixHQUFHLEVBQUUsT0FBTyxDQUFDLENBQUMsRUFBRTtBQUNoRDtBQUNBLElBQUksT0FBTyxxQkFBcUIsQ0FBQyxRQUFRLEVBQUU7QUFDM0MsUUFBUSxPQUFPLElBQUksY0FBYyxDQUFDLFFBQVEsRUFBRSxjQUFjLENBQUMsWUFBWSxDQUFDLENBQUM7QUFDekUsS0FBSztBQUNMO0FBQ0EsSUFBSSxPQUFPLDBCQUEwQixDQUFDLFFBQVEsRUFBRTtBQUNoRCxRQUFRLE9BQU8sSUFBSSxjQUFjLENBQUMsUUFBUSxFQUFFLGNBQWMsQ0FBQyxpQkFBaUIsQ0FBQyxD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
