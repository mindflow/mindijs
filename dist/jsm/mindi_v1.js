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

class Provider {

    /**
     * 
     * @param {Array} parameters 
     * @returns {Promise}
     */
    get(parameters = []) {
        return null;
    }

}

class InjectionPoint {

    static get INSTANCE_TYPE() { return 0; } 
    static get PROVIDER_TYPE() { return 1; } 

    /**
     * 
     * @param {string} name 
     * @param {function} classReference 
     * @param {array} parameters 
     * @returns {object}
     */
    static instanceByName(name, classReference, parameters = []) {
        return new InjectionPoint(name, classReference, InjectionPoint.INSTANCE_TYPE, parameters);
    }

    /**
     * 
     * @param {function} classReference 
     * @param {array} parameters 
     * @returns {object}
     */
    static instance(classReference, parameters = []) {
        return new InjectionPoint(classReference.name, classReference, InjectionPoint.INSTANCE_TYPE, parameters);
    }

    /**
     * 
     * @param {string} name 
     * @param {function} classReference 
     * @returns {Provider}
     */
    static providerByName(name, classReference) {
        return new InjectionPoint(name, classReference, InjectionPoint.PROVIDER_TYPE);
    }

    /**
     * 
     * @param {function} classReference 
     * @returns {Provider}
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
     * @returns {Promise}
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWluZGlfdjEuanMiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9taW5kaS9jb25maWcuanMiLCIuLi8uLi9zcmMvbWluZGkvaW5qZWN0b3IuanMiLCIuLi8uLi9zcmMvbWluZGkvdHlwZUNvbmZpZy9pbnN0YW5jZUhvbGRlci5qcyIsIi4uLy4uL3NyYy9taW5kaS90eXBlQ29uZmlnL3R5cGVDb25maWcuanMiLCIuLi8uLi9zcmMvbWluZGkvY29uZmlnQWNjZXNzb3IuanMiLCIuLi8uLi9zcmMvbWluZGkvY29uZmlnUHJvY2Vzc29yL2NvbmZpZ1Byb2Nlc3NvckV4ZWN1dG9yLmpzIiwiLi4vLi4vc3JjL21pbmRpL3R5cGVDb25maWcvc2luZ2xldG9uQ29uZmlnLmpzIiwiLi4vLi4vc3JjL21pbmRpL2FwaS9wcm92aWRlci5qcyIsIi4uLy4uL3NyYy9taW5kaS9hcGkvaW5qZWN0aW9uUG9pbnQuanMiLCIuLi8uLi9zcmMvbWluZGkvaW5zdGFuY2VQcm9jZXNzb3IvaW5zdGFuY2VQcm9jZXNzb3JFeGVjdXRvci5qcyIsIi4uLy4uL3NyYy9taW5kaS9taW5kaVByb3ZpZGVyLmpzIiwiLi4vLi4vc3JjL21pbmRpL21pbmRpSW5qZWN0b3IuanMiLCIuLi8uLi9zcmMvbWluZGkvaW5zdGFuY2VQcm9jZXNzb3IvaW5zdGFuY2VQcm9jZXNzb3IuanMiLCIuLi8uLi9zcmMvbWluZGkvY29uZmlnUHJvY2Vzc29yL2NvbmZpZ1Byb2Nlc3Nvci5qcyIsIi4uLy4uL3NyYy9taW5kaS9taW5kaUNvbmZpZy5qcyIsIi4uLy4uL3NyYy9taW5kaS9pbnN0YW5jZVByb2Nlc3Nvci9pbnN0YW5jZVBvc3RDb25maWdUcmlnZ2VyLmpzIiwiLi4vLi4vc3JjL21pbmRpL3R5cGVDb25maWcvcG9vbENvbmZpZy5qcyIsIi4uLy4uL3NyYy9taW5kaS90eXBlQ29uZmlnL3Byb3RvdHlwZUNvbmZpZy5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyJleHBvcnQgY2xhc3MgQ29uZmlnIHtcclxuXHJcbiAgICBjb25zdHJ1Y3RvcigpIHtcclxuICAgICAgICAvKiogQHR5cGUge01hcH0gKi9cclxuICAgICAgICB0aGlzLmNvbmZpZ0VudHJpZXMgPSBudWxsO1xyXG5cclxuICAgICAgICAvKiogQHR5cGUge0xpc3R9ICovXHJcbiAgICAgICAgdGhpcy5jb25maWdQcm9jZXNzb3JzID0gbnVsbDtcclxuXHJcbiAgICAgICAgLyoqIEB0eXBlIHtMaXN0fSAqL1xyXG4gICAgICAgIHRoaXMuaW5zdGFuY2VQcm9jZXNzb3JzID0gbnVsbDtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIEByZXR1cm5zIHtQcm9taXNlfVxyXG4gICAgICovXHJcbiAgICBmaW5hbGl6ZSgpIHtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cclxuICAgICAqL1xyXG4gICAgaXNGaW5hbGl6ZWQoKSB7XHJcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG59IiwiZXhwb3J0IGNsYXNzIEluamVjdG9yIHtcclxuXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBIZWxwZXIgbWV0aG9kIGZvciBpbmplY3RpbmcgZmllbGRzIGluIHRhcmdldCBvYmplY3RcclxuICAgICAqIFxyXG4gICAgICogQHBhcmFtIHthbnl9IHRhcmdldE9iamVjdCBcclxuICAgICAqIEBwYXJhbSB7Q29uZmlnfSBjb25maWcgXHJcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gZGVwdGhcclxuICAgICAqIEByZXR1cm5zIHtQcm9taXNlfVxyXG4gICAgICovXHJcbiAgICBpbmplY3RUYXJnZXQodGFyZ2V0LCBjb25maWcsIGRlcHRoID0gMCkge1xyXG5cclxuICAgIH1cclxuXHJcbn0iLCJleHBvcnQgY2xhc3MgSW5zdGFuY2VIb2xkZXIge1xyXG5cclxuICAgIHN0YXRpYyBnZXQgTkVXX0lOU1RBTkNFKCkgeyByZXR1cm4gMDsgfVxyXG5cclxuICAgIHN0YXRpYyBnZXQgRVhJU1RJTkdfSU5TVEFOQ0UoKSB7IHJldHVybiAxOyB9XHJcblxyXG4gICAgc3RhdGljIGhvbGRlcldpdGhOZXdJbnN0YW5jZShpbnN0YW5jZSkge1xyXG4gICAgICAgIHJldHVybiBuZXcgSW5zdGFuY2VIb2xkZXIoaW5zdGFuY2UsIEluc3RhbmNlSG9sZGVyLk5FV19JTlNUQU5DRSk7XHJcbiAgICB9XHJcblxyXG4gICAgc3RhdGljIGhvbGRlcldpdGhFeGlzdGluZ0luc3RhbmNlKGluc3RhbmNlKSB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBJbnN0YW5jZUhvbGRlcihpbnN0YW5jZSwgSW5zdGFuY2VIb2xkZXIuRVhJU1RJTkdfSU5TVEFOQ0UpO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0cnVjdG9yKGluc3RhbmNlLCB0eXBlKSB7XHJcbiAgICAgICAgdGhpcy5pbnN0YW5jZSA9IGluc3RhbmNlO1xyXG4gICAgICAgIHRoaXMudHlwZSA9IHR5cGU7XHJcbiAgICB9XHJcblxyXG59IiwiZXhwb3J0IGNsYXNzIFR5cGVDb25maWcge1xyXG5cclxuICAgIHN0YXRpYyBnZXQgTkVXKCkgeyByZXR1cm4gXCJORVdcIjsgfVxyXG4gICAgc3RhdGljIGdldCBDT05GSUdVUkVEKCkgeyByZXR1cm4gXCJDT05GSUdVUkVEXCI7IH1cclxuXHJcbiAgICBjb25zdHJ1Y3RvcihuYW1lLCBjbGFzc1JlZmVyZW5jZSkge1xyXG4gICAgICAgIHRoaXMubmFtZSA9IG5hbWU7XHJcbiAgICAgICAgdGhpcy5jbGFzc1JlZmVyZW5jZSA9IGNsYXNzUmVmZXJlbmNlO1xyXG4gICAgICAgIHRoaXMuc3RhZ2UgPSBUeXBlQ29uZmlnLk5FVztcclxuICAgIH1cclxuXHJcbiAgICBpbnN0YW5jZUhvbGRlcihwYXJhbWV0ZXJzID0gW10pIHtcclxuICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgIH1cclxuXHJcbn0iLCJpbXBvcnQgeyBDb25maWcgfSBmcm9tIFwiLi9jb25maWcuanNcIjtcclxuaW1wb3J0IHsgTG9nZ2VyIH0gZnJvbSBcImNvcmV1dGlsX3YxXCI7XHJcbmltcG9ydCB7IEluc3RhbmNlSG9sZGVyIH0gZnJvbSBcIi4vdHlwZUNvbmZpZy9pbnN0YW5jZUhvbGRlci5qc1wiO1xyXG5pbXBvcnQgeyBUeXBlQ29uZmlnIH0gZnJvbSBcIi4vdHlwZUNvbmZpZy90eXBlQ29uZmlnLmpzXCI7XHJcblxyXG4vKipcclxuICogVXRpbGl0aWVzIGZvciBhY2Nlc3NpbmcgYSBDb25maWcgb2JqZWN0XHJcbiAqL1xyXG5cclxuY29uc3QgTE9HID0gbmV3IExvZ2dlcihcIkNvbmZpZ0FjY2Vzc29yXCIpO1xyXG5cclxuZXhwb3J0IGNsYXNzIENvbmZpZ0FjY2Vzc29yIHtcclxuXHJcbiAgICAvKipcclxuICAgICAqIEdldCBhbiBpbnN0YW5jZSBieSBjbGFzcyBuYW1lIGluIHRoZSBjb25maWdcclxuICAgICAqIFxyXG4gICAgICogQHBhcmFtIHtDb25maWd9IGNvbmZpZyBcclxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBuYW1lIFxyXG4gICAgICogQHBhcmFtIHtBcnJheX0gcGFyYW1ldGVyc1xyXG4gICAgICogQHJldHVybnMge0luc3RhbmNlSG9sZGVyfVxyXG4gICAgICovXHJcbiAgICBzdGF0aWMgaW5zdGFuY2VIb2xkZXIobmFtZSwgY29uZmlnLCBwYXJhbWV0ZXJzID0gW10pIHtcclxuICAgICAgICBjb25zdCB0eXBlQ29uZmlnID0gdGhpcy50eXBlQ29uZmlnQnlOYW1lKG5hbWUsIGNvbmZpZyk7XHJcbiAgICAgICAgaWYodHlwZUNvbmZpZyA9PT0gbnVsbCkge1xyXG4gICAgICAgICAgICBMT0cuZXJyb3IoXCJObyB0eXBlY29uZmlnIGZvdW5kIGZvciBcIiArIG5hbWUpO1xyXG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICB9XHJcbiAgICAgICAgY29uc3QgaW5zdGFuY2VIb2xkZXIgPSB0eXBlQ29uZmlnLmluc3RhbmNlSG9sZGVyKHBhcmFtZXRlcnMpO1xyXG4gICAgICAgIGlmKCFpbnN0YW5jZUhvbGRlcikge1xyXG4gICAgICAgICAgICBMT0cuZXJyb3IoXCJObyBvYmplY3QgZm91bmQgZm9yIFwiICsgbmFtZSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBpbnN0YW5jZUhvbGRlcjtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIEdldCB0aGUgdHlwZSBjb25maWcgYnkgY2xhc3MgbmFtZSBpbiB0aGUgY29uZmlnXHJcbiAgICAgKiBcclxuICAgICAqIEBwYXJhbSB7Q29uZmlnfSBjb25maWcgXHJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbmFtZSBcclxuICAgICAqIEByZXR1cm5zIHtUeXBlQ29uZmlnfVxyXG4gICAgICovXHJcbiAgICBzdGF0aWMgdHlwZUNvbmZpZ0J5TmFtZShuYW1lLCBjb25maWcpIHtcclxuICAgICAgICBsZXQgY29uZmlnRW50cnkgPSBudWxsO1xyXG4gICAgICAgIGNvbmZpZy5jb25maWdFbnRyaWVzLmZvckVhY2goKGtleSwgdmFsdWUsIHBhcmVudCkgPT4ge1xyXG4gICAgICAgICAgICBpZihrZXkgPT09IG5hbWUpIHtcclxuICAgICAgICAgICAgICAgIGNvbmZpZ0VudHJ5ID0gdmFsdWU7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgfSwgdGhpcyk7XHJcbiAgICAgICAgaWYoIWNvbmZpZ0VudHJ5KSB7XHJcbiAgICAgICAgICAgIExPRy5lcnJvcihcIk5vIGNvbmZpZyBlbnRyeSBmb3VuZCBmb3IgXCIgKyBuYW1lKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGNvbmZpZ0VudHJ5O1xyXG4gICAgfVxyXG5cclxufSIsImltcG9ydCB7IE1hcCwgTG9nZ2VyLCBMaXN0IH0gZnJvbSBcImNvcmV1dGlsX3YxXCI7XHJcbmltcG9ydCB7IENvbmZpZyB9IGZyb20gXCIuLi9jb25maWcuanNcIjtcclxuaW1wb3J0IHsgQ29uZmlnQWNjZXNzb3IgfSBmcm9tIFwiLi4vY29uZmlnQWNjZXNzb3IuanNcIjtcclxuaW1wb3J0IHsgSW5qZWN0b3IgfSBmcm9tIFwiLi4vaW5qZWN0b3IuanNcIjtcclxuaW1wb3J0IHsgSW5zdGFuY2VIb2xkZXIgfSBmcm9tIFwiLi4vdHlwZUNvbmZpZy9pbnN0YW5jZUhvbGRlci5qc1wiO1xyXG5pbXBvcnQgeyBUeXBlQ29uZmlnIH0gZnJvbSBcIi4uL3R5cGVDb25maWcvdHlwZUNvbmZpZy5qc1wiO1xyXG5cclxuY29uc3QgTE9HID0gbmV3IExvZ2dlcihcIkNvbmZpZ1Byb2Nlc3NvckV4ZWN1dG9yXCIpO1xyXG5cclxuLyoqXHJcbiAqIEV4ZWN1dGVzIHRoZSBwcm92aWRlZCBjb25maWcgcHJvY2Vzc29ycyBvbiB0aGUgcHJvdmlkZWQgY29uZmlnIHJlZ2lzdHJ5XHJcbiAqIFJldHVybnMgYSBsaXN0IG9mIHByb21pc2VzIGZvciB3aGVuIHRoZSBjb25maWcgcHJvY2Vzc29ycyBoYXMgY29tcGxldGVkIHJ1bm5pbmdcclxuICogXHJcbiAqIEEgY29uZmlnIHByb2Nlc3NvciByZWFkcyB0aGUgY29uZmlnIGFuZCBwZXJmb3JtcyBhbnkgbmVjZXNzYXJ5IGFjdGlvbnMgYmFzZWQgb25cclxuICogY2xhc3MgYW5kIHR5cGUgaW5mb3JtYXRpb24uIEEgY29uZmlnIHByb2Nlc3NvciBkb2VzIG5vdCBvcGVyYXRlIG9uIG1hbmFnZWQgaW5zdGFuY2VzXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgQ29uZmlnUHJvY2Vzc29yRXhlY3V0b3Ige1xyXG4gICAgXHJcbiAgICAvKipcclxuICAgICAqIEBwYXJhbSB7TGlzdH0gY29uZmlnUHJvY2Vzc29yQ2xhc3NOYW1lTGlzdFxyXG4gICAgICogQHBhcmFtIHtJbmplY3Rvcn0gaW5qZWN0b3JcclxuICAgICAqIEBwYXJhbSB7Q29uZmlnfSBjb25maWdcclxuICAgICAqIEByZXR1cm5zIHtQcm9taXNlfSBwcm9taXNlIHdoaWNoIGlzIHJlc29sdmVkIHdoZW4gYWxsIGNvbmZpZyBwcm9jZXNzb3JzIGFyZSByZXNvbHZlZFxyXG4gICAgICovXHJcbiAgICBzdGF0aWMgZXhlY3V0ZShjb25maWdQcm9jZXNzb3JDbGFzc05hbWVMaXN0LCBpbmplY3RvciwgY29uZmlnKSB7XHJcbiAgICAgICAgcmV0dXJuIGNvbmZpZ1Byb2Nlc3NvckNsYXNzTmFtZUxpc3QucHJvbWlzZUNoYWluKChjb25maWdQcm9jZXNzb3JDbGFzc05hbWUsIHBhcmVudCkgPT4ge1xyXG4gICAgICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmVDb25maWdQcm9jZXNzb3JFeGVjdXRlZCwgcmVqZWN0KSA9PiB7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IHRhcmdldEluamVjdGVkUHJvbWlzZSA9IFByb21pc2UucmVzb2x2ZSgpO1xyXG5cclxuICAgICAgICAgICAgICAgIC8qKiAgQHR5cGUge0luc3RhbmNlSG9sZGVyfSAqL1xyXG4gICAgICAgICAgICAgICAgY29uc3QgcHJvY2Vzc29ySG9sZGVyID0gQ29uZmlnQWNjZXNzb3IuaW5zdGFuY2VIb2xkZXIoY29uZmlnUHJvY2Vzc29yQ2xhc3NOYW1lLCBjb25maWcpO1xyXG4gICAgICAgICAgICAgICAgaWYocHJvY2Vzc29ySG9sZGVyLnR5cGUgPT09IEluc3RhbmNlSG9sZGVyLk5FV19JTlNUQU5DRSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRhcmdldEluamVjdGVkUHJvbWlzZSA9IGluamVjdG9yLmluamVjdFRhcmdldChwcm9jZXNzb3JIb2xkZXIuaW5zdGFuY2UsIGNvbmZpZyk7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgdGFyZ2V0SW5qZWN0ZWRQcm9taXNlLnRoZW4oKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRvQ29uZmlndXJlTWFwID0gQ29uZmlnUHJvY2Vzc29yRXhlY3V0b3IucHJlcGFyZVVuY29uZmlndXJlZENvbmZpZ0VudHJpZXMoY29uZmlnLmNvbmZpZ0VudHJpZXMpO1xyXG4gICAgICAgICAgICAgICAgICAgIHByb2Nlc3NvckhvbGRlci5pbnN0YW5jZS5wcm9jZXNzQ29uZmlnKGNvbmZpZywgdG9Db25maWd1cmVNYXApLnRoZW4oKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlQ29uZmlnUHJvY2Vzc29yRXhlY3V0ZWQoKTtcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9KVxyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogXHJcbiAgICAgKiBAcGFyYW0ge01hcH0gY29uZmlnRW50cmllcyBcclxuICAgICAqIEByZXR1cm4ge01hcH1cclxuICAgICAqL1xyXG4gICAgc3RhdGljIHByZXBhcmVVbmNvbmZpZ3VyZWRDb25maWdFbnRyaWVzKGNvbmZpZ0VudHJpZXMpIHtcclxuICAgICAgICBjb25zdCB1bmNvbmZpZ3VyZWRDb25maWdFbnRyaWVzID0gbmV3IE1hcCgpO1xyXG5cclxuICAgICAgICBjb25maWdFbnRyaWVzLmZvckVhY2goKGtleSwgdmFsdWUsIHBhcmVudCkgPT4ge1xyXG5cclxuICAgICAgICAgICAgLyoqIEB0eXBlIHtUeXBlQ29uZmlnfSAqL1xyXG4gICAgICAgICAgICBjb25zdCBjb25maWdFbnRyeSA9IHZhbHVlO1xyXG5cclxuICAgICAgICAgICAgaWYoY29uZmlnRW50cnkuc3RhZ2UgPT09IFR5cGVDb25maWcuTkVXKSB7XHJcbiAgICAgICAgICAgICAgICB1bmNvbmZpZ3VyZWRDb25maWdFbnRyaWVzLnNldChrZXksIGNvbmZpZ0VudHJ5KTtcclxuICAgICAgICAgICAgICAgIGNvbmZpZ0VudHJ5LnN0YWdlID0gVHlwZUNvbmZpZy5DT05GSUdVUkVEO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICB9LCB0aGlzKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHVuY29uZmlndXJlZENvbmZpZ0VudHJpZXM7XHJcbiAgICB9XHJcblxyXG59IiwiaW1wb3J0IHsgVHlwZUNvbmZpZyB9IGZyb20gXCIuL3R5cGVDb25maWcuanNcIjtcclxuaW1wb3J0IHsgTG9nZ2VyIH0gZnJvbSBcImNvcmV1dGlsX3YxXCI7XHJcbmltcG9ydCB7IEluc3RhbmNlSG9sZGVyIH0gZnJvbSBcIi4vaW5zdGFuY2VIb2xkZXIuanNcIjtcclxuXHJcbmNvbnN0IExPRyA9IG5ldyBMb2dnZXIoXCJTaW5nbGV0b25Db25maWdcIik7XHJcblxyXG5leHBvcnQgY2xhc3MgU2luZ2xldG9uQ29uZmlnIGV4dGVuZHMgVHlwZUNvbmZpZyB7XHJcblxyXG4gICAgc3RhdGljIG5hbWVkKG5hbWUsIGNsYXNzUmVmZXJlbmNlKSB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBTaW5nbGV0b25Db25maWcobmFtZSwgY2xhc3NSZWZlcmVuY2UpO1xyXG4gICAgfVxyXG5cclxuICAgIHN0YXRpYyB1bm5hbWVkKGNsYXNzUmVmZXJlbmNlKSB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBTaW5nbGV0b25Db25maWcoY2xhc3NSZWZlcmVuY2UubmFtZSwgY2xhc3NSZWZlcmVuY2UpO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0cnVjdG9yKG5hbWUsIGNsYXNzUmVmZXJlbmNlKSB7XHJcbiAgICAgICAgc3VwZXIobmFtZSwgY2xhc3NSZWZlcmVuY2UpO1xyXG4gICAgfVxyXG5cclxuICAgIGluc3RhbmNlSG9sZGVyKHBhcmFtZXRlcnMgPSBbXSkge1xyXG4gICAgICAgIGlmICghdGhpcy5pbnN0YW5jZSkge1xyXG4gICAgICAgICAgICBpZihwYXJhbWV0ZXJzICYmIHBhcmFtZXRlcnMubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5pbnN0YW5jZSA9IG5ldyB0aGlzLmNsYXNzUmVmZXJlbmNlKC4uLnBhcmFtZXRlcnMpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5pbnN0YW5jZSA9IG5ldyB0aGlzLmNsYXNzUmVmZXJlbmNlKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIEluc3RhbmNlSG9sZGVyLmhvbGRlcldpdGhOZXdJbnN0YW5jZSh0aGlzLmluc3RhbmNlKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIEluc3RhbmNlSG9sZGVyLmhvbGRlcldpdGhFeGlzdGluZ0luc3RhbmNlKHRoaXMuaW5zdGFuY2UpO1xyXG4gICAgfVxyXG5cclxufSIsImltcG9ydCB7IExvZ2dlciB9IGZyb20gXCJjb3JldXRpbF92MVwiO1xyXG5cclxuY29uc3QgTE9HID0gbmV3IExvZ2dlcihcIlByb3ZpZGVyXCIpO1xyXG5cclxuZXhwb3J0IGNsYXNzIFByb3ZpZGVyIHtcclxuXHJcbiAgICAvKipcclxuICAgICAqIFxyXG4gICAgICogQHBhcmFtIHtBcnJheX0gcGFyYW1ldGVycyBcclxuICAgICAqIEByZXR1cm5zIHtQcm9taXNlfVxyXG4gICAgICovXHJcbiAgICBnZXQocGFyYW1ldGVycyA9IFtdKSB7XHJcbiAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICB9XHJcblxyXG59IiwiaW1wb3J0IHsgUHJvdmlkZXIgfSBmcm9tIFwiLi9wcm92aWRlci5qc1wiO1xyXG5cclxuZXhwb3J0IGNsYXNzIEluamVjdGlvblBvaW50IHtcclxuXHJcbiAgICBzdGF0aWMgZ2V0IElOU1RBTkNFX1RZUEUoKSB7IHJldHVybiAwOyB9IFxyXG4gICAgc3RhdGljIGdldCBQUk9WSURFUl9UWVBFKCkgeyByZXR1cm4gMTsgfSBcclxuXHJcbiAgICAvKipcclxuICAgICAqIFxyXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG5hbWUgXHJcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjbGFzc1JlZmVyZW5jZSBcclxuICAgICAqIEBwYXJhbSB7YXJyYXl9IHBhcmFtZXRlcnMgXHJcbiAgICAgKiBAcmV0dXJucyB7b2JqZWN0fVxyXG4gICAgICovXHJcbiAgICBzdGF0aWMgaW5zdGFuY2VCeU5hbWUobmFtZSwgY2xhc3NSZWZlcmVuY2UsIHBhcmFtZXRlcnMgPSBbXSkge1xyXG4gICAgICAgIHJldHVybiBuZXcgSW5qZWN0aW9uUG9pbnQobmFtZSwgY2xhc3NSZWZlcmVuY2UsIEluamVjdGlvblBvaW50LklOU1RBTkNFX1RZUEUsIHBhcmFtZXRlcnMpO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogXHJcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjbGFzc1JlZmVyZW5jZSBcclxuICAgICAqIEBwYXJhbSB7YXJyYXl9IHBhcmFtZXRlcnMgXHJcbiAgICAgKiBAcmV0dXJucyB7b2JqZWN0fVxyXG4gICAgICovXHJcbiAgICBzdGF0aWMgaW5zdGFuY2UoY2xhc3NSZWZlcmVuY2UsIHBhcmFtZXRlcnMgPSBbXSkge1xyXG4gICAgICAgIHJldHVybiBuZXcgSW5qZWN0aW9uUG9pbnQoY2xhc3NSZWZlcmVuY2UubmFtZSwgY2xhc3NSZWZlcmVuY2UsIEluamVjdGlvblBvaW50LklOU1RBTkNFX1RZUEUsIHBhcmFtZXRlcnMpO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogXHJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbmFtZSBcclxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNsYXNzUmVmZXJlbmNlIFxyXG4gICAgICogQHJldHVybnMge1Byb3ZpZGVyfVxyXG4gICAgICovXHJcbiAgICBzdGF0aWMgcHJvdmlkZXJCeU5hbWUobmFtZSwgY2xhc3NSZWZlcmVuY2UpIHtcclxuICAgICAgICByZXR1cm4gbmV3IEluamVjdGlvblBvaW50KG5hbWUsIGNsYXNzUmVmZXJlbmNlLCBJbmplY3Rpb25Qb2ludC5QUk9WSURFUl9UWVBFKTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIFxyXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2xhc3NSZWZlcmVuY2UgXHJcbiAgICAgKiBAcmV0dXJucyB7UHJvdmlkZXJ9XHJcbiAgICAgKi9cclxuICAgIHN0YXRpYyBwcm92aWRlcihjbGFzc1JlZmVyZW5jZSkge1xyXG4gICAgICAgIHJldHVybiBuZXcgSW5qZWN0aW9uUG9pbnQoY2xhc3NSZWZlcmVuY2UubmFtZSwgY2xhc3NSZWZlcmVuY2UsIEluamVjdGlvblBvaW50LlBST1ZJREVSX1RZUEUpO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0cnVjdG9yKG5hbWUsIGNsYXNzUmVmZXJlbmNlLCB0eXBlID0gSW5qZWN0aW9uUG9pbnQuSU5TVEFOQ0VfVFlQRSwgcGFyYW1ldGVycyA9IG51bGwpIHtcclxuICAgICAgICB0aGlzLm5hbWUgPSBuYW1lO1xyXG4gICAgICAgIHRoaXMuY2xhc3NSZWZlcmVuY2UgPSBjbGFzc1JlZmVyZW5jZTtcclxuICAgICAgICB0aGlzLnR5cGUgPSB0eXBlO1xyXG4gICAgICAgIHRoaXMucGFyYW1ldGVycyA9IHBhcmFtZXRlcnM7XHJcbiAgICB9XHJcblxyXG59IiwiaW1wb3J0IHsgTG9nZ2VyLCBMaXN0IH0gZnJvbSBcImNvcmV1dGlsX3YxXCI7XHJcbmltcG9ydCB7IENvbmZpZ0FjY2Vzc29yIH0gZnJvbSBcIi4uL2NvbmZpZ0FjY2Vzc29yLmpzXCI7XHJcbmltcG9ydCB7IENvbmZpZyB9IGZyb20gXCIuLi9jb25maWcuanNcIjtcclxuXHJcbmNvbnN0IExPRyA9IG5ldyBMb2dnZXIoXCJJbnN0YW5jZVByb2Nlc3NvckV4ZWN1dG9yXCIpO1xyXG5cclxuLyoqXHJcbiAqIEV4ZWN1dGVzIHRoZSBjb25maWdzIGluc3RhbmNlIHByb2Nlc3NvcnMgb24gdGhlIHByb3ZpZGVkIGluc3RhbmNlXHJcbiAqIFJldHVybnMgYSBwcm9taXNlIGZvciB3aGVuIHRoZSBpbnN0YW5jZSBwcm9jZXNzb3JzIGhhcyBjb21wbGV0ZWQgcnVubmluZ1xyXG4gKiBcclxuICogSW5zdGFuY2UgcHJvY2Vzc29ycyBwZXJmb3JtIG9wZXJhdGlvbnMgb24gbWFuYWdlZCBpbnN0YW5jZXMgYWZ0ZXIgdGhleSBoYXZlIGJlZW4gaW5zdGFuc2lhdGVkXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgSW5zdGFuY2VQcm9jZXNzb3JFeGVjdXRvciB7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBAcGFyYW0ge0xpc3R9IGluc3RhbmNlUHJvY2Vzc29yTGlzdCB0aGUgaW5zdGFuY2UgcHJvY2Vzc29yc1xyXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGluc3RhbmNlIHRoZSBpbnN0YW5jZSB0byBwcm9jZXNzXHJcbiAgICAgKiBAcGFyYW0ge0NvbmZpZ30gY29uZmlnXHJcbiAgICAgKiBAcmV0dXJucyB7UHJvbWlzZX1cclxuICAgICAqL1xyXG4gICAgc3RhdGljIGV4ZWN1dGUoaW5zdGFuY2UsIGNvbmZpZykge1xyXG4gICAgICAgIHJldHVybiBjb25maWcuaW5zdGFuY2VQcm9jZXNzb3JzLnByb21pc2VDaGFpbigocHJvY2Vzc29yTmFtZSwgcGFyZW50KSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnN0IHByb2Nlc3NvckhvbGRlciA9IENvbmZpZ0FjY2Vzc29yLmluc3RhbmNlSG9sZGVyKHByb2Nlc3Nvck5hbWUsIGNvbmZpZyk7XHJcbiAgICAgICAgICAgIHJldHVybiBwcm9jZXNzb3JIb2xkZXIuaW5zdGFuY2UucHJvY2VzcyhpbnN0YW5jZSk7XHJcbiAgICAgICAgfSwgdGhpcyk7XHJcbiAgICB9XHJcblxyXG59IiwiaW1wb3J0IHsgUHJvdmlkZXIgfSBmcm9tIFwiLi9hcGkvcHJvdmlkZXIuanNcIjtcclxuaW1wb3J0IHsgVHlwZUNvbmZpZyB9IGZyb20gXCIuL3R5cGVDb25maWcvdHlwZUNvbmZpZy5qc1wiO1xyXG5pbXBvcnQgeyBJbnN0YW5jZUhvbGRlciB9IGZyb20gXCIuL3R5cGVDb25maWcvaW5zdGFuY2VIb2xkZXIuanNcIjtcclxuaW1wb3J0IHsgSW5qZWN0b3IgfSBmcm9tIFwiLi9pbmplY3Rvci5qc1wiO1xyXG5pbXBvcnQgeyBDb25maWcgfSBmcm9tIFwiLi9jb25maWcuanNcIjtcclxuaW1wb3J0IHsgQ29uZmlnQWNjZXNzb3IgfSBmcm9tIFwiLi9jb25maWdBY2Nlc3Nvci5qc1wiO1xyXG5cclxuZXhwb3J0IGNsYXNzIE1pbmRpUHJvdmlkZXIgZXh0ZW5kcyBQcm92aWRlciB7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBcclxuICAgICAqIEBwYXJhbSB7VHlwZUNvbmZpZ30gdHlwZUNvbmZpZyBcclxuICAgICAqIEBwYXJhbSB7SW5qZWN0b3J9IGluamVjdG9yXHJcbiAgICAgKiBAcGFyYW0ge0NvbmZpZ30gY29uZmlnXHJcbiAgICAgKi9cclxuICAgIGNvbnN0cnVjdG9yKHR5cGVDb25maWcsIGluamVjdG9yLCBjb25maWcpIHtcclxuXHJcbiAgICAgICAgc3VwZXIoKTtcclxuXHJcbiAgICAgICAgLyoqIEB0eXBlIHtUeXBlQ29uZmlnfSAqL1xyXG4gICAgICAgIHRoaXMudHlwZUNvbmZpZyA9IHR5cGVDb25maWc7XHJcblxyXG4gICAgICAgIC8qKiBAdHlwZSB7SW5qZWN0b3J9ICovXHJcbiAgICAgICAgdGhpcy5pbmplY3RvciA9IGluamVjdG9yO1xyXG5cclxuICAgICAgICAvKiogQHR5cGUge0NvbmZpZ30gKi9cclxuICAgICAgICB0aGlzLmNvbmZpZyA9IGNvbmZpZztcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIFxyXG4gICAgICogQHBhcmFtIHtBcnJheX0gcGFyYW1ldGVycyBcclxuICAgICAqIEByZXR1cm5zIHtQcm9taXNlfVxyXG4gICAgICovXHJcbiAgICBnZXQocGFyYW1ldGVycyA9IFtdKSB7XHJcbiAgICAgICAgLyoqIEB0eXBlIHtJbnN0YW5jZUhvbGRlcn0gKi9cclxuICAgICAgICBjb25zdCBpbnN0YW5jZUhvbGRlciA9IENvbmZpZ0FjY2Vzc29yLmluc3RhbmNlSG9sZGVyKHRoaXMudHlwZUNvbmZpZy5uYW1lLCB0aGlzLmNvbmZpZywgcGFyYW1ldGVycyk7XHJcbiAgICAgICAgaWYgKGluc3RhbmNlSG9sZGVyLnR5cGUgPT09IEluc3RhbmNlSG9sZGVyLk5FV19JTlNUQU5DRSkge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5pbmplY3Rvci5pbmplY3RUYXJnZXQoaW5zdGFuY2VIb2xkZXIuaW5zdGFuY2UsIHRoaXMuY29uZmlnKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShpbnN0YW5jZUhvbGRlci5pbnN0YW5jZSk7XHJcbiAgICB9XHJcblxyXG59IiwiaW1wb3J0IHsgTGlzdCwgTG9nZ2VyIH0gZnJvbSBcImNvcmV1dGlsX3YxXCI7XHJcbmltcG9ydCB7IENvbmZpZyB9IGZyb20gXCIuL2NvbmZpZy5qc1wiO1xyXG5pbXBvcnQgeyBDb25maWdBY2Nlc3NvciB9IGZyb20gXCIuL2NvbmZpZ0FjY2Vzc29yLmpzXCI7XHJcbmltcG9ydCB7IEluamVjdGlvblBvaW50IH0gZnJvbSBcIi4vYXBpL2luamVjdGlvblBvaW50LmpzXCJcclxuaW1wb3J0IHsgSW5zdGFuY2VQcm9jZXNzb3JFeGVjdXRvciB9IGZyb20gXCIuL2luc3RhbmNlUHJvY2Vzc29yL2luc3RhbmNlUHJvY2Vzc29yRXhlY3V0b3IuanNcIjtcclxuaW1wb3J0IHsgSW5zdGFuY2VIb2xkZXIgfSBmcm9tIFwiLi90eXBlQ29uZmlnL2luc3RhbmNlSG9sZGVyLmpzXCI7XHJcbmltcG9ydCB7IE1pbmRpUHJvdmlkZXIgfSBmcm9tIFwiLi9taW5kaVByb3ZpZGVyLmpzXCI7XHJcbmltcG9ydCB7IEluamVjdG9yIH0gZnJvbSBcIi4vaW5qZWN0b3IuanNcIjtcclxuXHJcbmNvbnN0IExPRyA9IG5ldyBMb2dnZXIoXCJNaW5kaUluamVjdG9yXCIpO1xyXG5cclxuZXhwb3J0IGNsYXNzIE1pbmRpSW5qZWN0b3IgZXh0ZW5kcyBJbmplY3RvciB7XHJcblxyXG4gICAgc3RhdGljIGluamVjdCh0YXJnZXQsIGNvbmZpZykge1xyXG4gICAgICAgIHJldHVybiBJTkpFQ1RPUi5pbmplY3RUYXJnZXQodGFyZ2V0LCBjb25maWcpO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQHJldHVybnMge01pbmRpSW5qZWN0b3J9XHJcbiAgICAgKi9cclxuICAgIHN0YXRpYyBnZXRJbnN0YW5jZSgpIHtcclxuICAgICAgICByZXR1cm4gSU5KRUNUT1I7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBIZWxwZXIgbWV0aG9kIGZvciBpbmplY3RpbmcgZmllbGRzIGluIHRhcmdldCBvYmplY3RcclxuICAgICAqIFxyXG4gICAgICogQHBhcmFtIHthbnl9IHRhcmdldE9iamVjdCBcclxuICAgICAqIEBwYXJhbSB7Q29uZmlnfSBjb25maWcgXHJcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gZGVwdGhcclxuICAgICAqIEByZXR1cm5zIHtQcm9taXNlfVxyXG4gICAgICovXHJcbiAgICBpbmplY3RUYXJnZXQodGFyZ2V0T2JqZWN0LCBjb25maWcsIGRlcHRoID0gMCkge1xyXG4gICAgICAgIGlmICghdGFyZ2V0T2JqZWN0KSB7XHJcbiAgICAgICAgICAgIHRocm93IEVycm9yKFwiTWlzc2luZyB0YXJnZXQgb2JqZWN0XCIpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoIWNvbmZpZykge1xyXG4gICAgICAgICAgICB0aHJvdyBFcnJvcihcIk1pc3NpbmcgY29uZmlnXCIpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoIWNvbmZpZy5pc0ZpbmFsaXplZCgpKSB7XHJcbiAgICAgICAgICAgIHRocm93IEVycm9yKFwiQ29uZmlnIG5vdCBmaW5hbGl6ZWRcIik7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChkZXB0aCA+IDEwKSB7XHJcbiAgICAgICAgICAgIHRocm93IEVycm9yKFwiSW5qZWN0aW9uIHN0cnVjdHVyZSB0b28gZGVlcFwiKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgY29uc3QgaW5qZWN0b3IgPSB0aGlzO1xyXG4gICAgICAgIGNvbnN0IG9iamVjdEZpZWxkTmFtZXMgPSBuZXcgTGlzdChPYmplY3Qua2V5cyh0YXJnZXRPYmplY3QpKTtcclxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xyXG4gICAgICAgICAgICByZXR1cm4gb2JqZWN0RmllbGROYW1lcy5wcm9taXNlQ2hhaW4oKGZpZWxkTmFtZSwgcGFyZW50KSA9PiB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gTWluZGlJbmplY3Rvci5pbmplY3RQcm9wZXJ0eSh0YXJnZXRPYmplY3QsIGZpZWxkTmFtZSwgY29uZmlnLCBkZXB0aCwgaW5qZWN0b3IpO1xyXG4gICAgICAgICAgICB9KS50aGVuKCgpID0+IHtcclxuICAgICAgICAgICAgICAgIEluc3RhbmNlUHJvY2Vzc29yRXhlY3V0b3IuZXhlY3V0ZSh0YXJnZXRPYmplY3QsIGNvbmZpZykudGhlbigoKSA9PntcclxuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHRhcmdldE9iamVjdCk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSlcclxuXHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gdGFyZ2V0T2JqZWN0IFxyXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IGZpZWxkTmFtZSBcclxuICAgICAqIEBwYXJhbSB7Q29uZmlnfSBjb25maWcgXHJcbiAgICAgKiBAcGFyYW0ge051bWJlcn0gZGVwdGggXHJcbiAgICAgKiBAcGFyYW0ge0luamVjdG9yfSBpbmplY3RvclxyXG4gICAgICogQHJldHVybnMge1Byb21pc2V9XHJcbiAgICAgKi9cclxuICAgIHN0YXRpYyBpbmplY3RQcm9wZXJ0eSh0YXJnZXRPYmplY3QsIGZpZWxkTmFtZSwgY29uZmlnLCBkZXB0aCwgaW5qZWN0b3IpIHtcclxuICAgICAgICBjb25zdCBpbmplY3Rpb25Qb2ludCA9IHRhcmdldE9iamVjdFtmaWVsZE5hbWVdOyAgICAgICAgXHJcbiAgICAgICAgaWYoIShpbmplY3Rpb25Qb2ludCBpbnN0YW5jZW9mIEluamVjdGlvblBvaW50KSkge1xyXG4gICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChpbmplY3Rpb25Qb2ludC50eXBlID09PSBJbmplY3Rpb25Qb2ludC5QUk9WSURFUl9UWVBFKSB7XHJcbiAgICAgICAgICAgIE1pbmRpSW5qZWN0b3IuaW5qZWN0UHJvcGVydHlQcm92aWRlcih0YXJnZXRPYmplY3QsIGZpZWxkTmFtZSwgY29uZmlnLCBpbmplY3Rvcik7XHJcbiAgICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIE1pbmRpSW5qZWN0b3IuaW5qZWN0UHJvcGVydHlJbnN0YW5jZSh0YXJnZXRPYmplY3QsIGZpZWxkTmFtZSwgY29uZmlnLCBkZXB0aCwgaW5qZWN0b3IpO1xyXG4gICAgICAgIFxyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHRhcmdldE9iamVjdCBcclxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWVsZE5hbWUgXHJcbiAgICAgKiBAcGFyYW0ge0NvbmZpZ30gY29uZmlnIFxyXG4gICAgICogQHBhcmFtIHtJbmplY3Rvcn0gaW5qZWN0b3JcclxuICAgICAqL1xyXG4gICAgc3RhdGljIGluamVjdFByb3BlcnR5UHJvdmlkZXIodGFyZ2V0T2JqZWN0LCBmaWVsZE5hbWUsIGNvbmZpZywgaW5qZWN0b3IpIHtcclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBAdHlwZSB7SW5qZWN0aW9uUG9pbnR9XHJcbiAgICAgICAgICovXHJcbiAgICAgICAgY29uc3QgaW5qZWN0aW9uUG9pbnQgPSB0YXJnZXRPYmplY3RbZmllbGROYW1lXTtcclxuICAgICAgICBjb25zdCB0eXBlQ29uZmlnID0gQ29uZmlnQWNjZXNzb3IudHlwZUNvbmZpZ0J5TmFtZShpbmplY3Rpb25Qb2ludC5uYW1lLCBjb25maWcpO1xyXG4gICAgICAgIHRhcmdldE9iamVjdFtmaWVsZE5hbWVdID0gbmV3IE1pbmRpUHJvdmlkZXIodHlwZUNvbmZpZywgaW5qZWN0b3IsIGNvbmZpZyk7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gdGFyZ2V0T2JqZWN0IFxyXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpZWxkTmFtZSBcclxuICAgICAqIEBwYXJhbSB7Q29uZmlnfSBjb25maWcgXHJcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gZGVwdGggXHJcbiAgICAgKiBAcGFyYW0ge0luamVjdG9yfSBpbmplY3RvclxyXG4gICAgICogQHJldHVybnMge1Byb21pc2V9XHJcbiAgICAgKi9cclxuICAgIHN0YXRpYyBpbmplY3RQcm9wZXJ0eUluc3RhbmNlKHRhcmdldE9iamVjdCwgZmllbGROYW1lLCBjb25maWcsIGRlcHRoLCBpbmplY3Rvcikge1xyXG4gICAgICAgIGxldCBpbmplY3RQcm9taXNlID0gUHJvbWlzZS5yZXNvbHZlKCk7XHJcbiAgICAgICAgLyoqIEB0eXBlIHtJbmplY3Rpb25Qb2ludH0gKi9cclxuICAgICAgICBjb25zdCBpbmplY3Rpb25Qb2ludCA9IHRhcmdldE9iamVjdFtmaWVsZE5hbWVdO1xyXG4gICAgICAgIGNvbnN0IGluc3RhbmNlSG9sZGVyID0gQ29uZmlnQWNjZXNzb3IuaW5zdGFuY2VIb2xkZXIoaW5qZWN0aW9uUG9pbnQubmFtZSwgY29uZmlnLCBpbmplY3Rpb25Qb2ludC5wYXJhbWV0ZXJzKTtcclxuICAgICAgICBpZiAoaW5zdGFuY2VIb2xkZXIudHlwZSA9PT0gSW5zdGFuY2VIb2xkZXIuTkVXX0lOU1RBTkNFKSB7XHJcbiAgICAgICAgICAgIGluamVjdFByb21pc2UgPSBpbmplY3Rvci5pbmplY3RUYXJnZXQoaW5zdGFuY2VIb2xkZXIuaW5zdGFuY2UsIGNvbmZpZywgZGVwdGgrKyk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRhcmdldE9iamVjdFtmaWVsZE5hbWVdID0gaW5zdGFuY2VIb2xkZXIuaW5zdGFuY2U7XHJcbiAgICAgICAgcmV0dXJuIGluamVjdFByb21pc2U7XHJcbiAgICB9XHJcblxyXG59XHJcblxyXG5jb25zdCBJTkpFQ1RPUiA9IG5ldyBNaW5kaUluamVjdG9yKCk7IiwiZXhwb3J0IGNsYXNzIEluc3RhbmNlUHJvY2Vzc29yIHtcclxuXHJcbiAgICAvKipcclxuICAgICAqIFxyXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGluc3RhbmNlIFxyXG4gICAgICogQHJldHVybiB7UHJvbWlzZX1cclxuICAgICAqL1xyXG4gICAgcHJvY2VzcyhpbnN0YW5jZSkge1xyXG4gICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKTtcclxuICAgIH1cclxuXHJcbn0iLCJpbXBvcnQgeyBNYXAgfSBmcm9tIFwiY29yZXV0aWxfdjFcIjtcclxuaW1wb3J0IHsgQ29uZmlnIH0gZnJvbSBcIi4uL2NvbmZpZy5qc1wiO1xyXG5cclxuZXhwb3J0IGNsYXNzIENvbmZpZ1Byb2Nlc3NvciB7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBcclxuICAgICAqIEBwYXJhbSB7Q29uZmlnfSBjb25maWcgXHJcbiAgICAgKiBAcGFyYW0ge01hcH0gY29uZmlnRW50cmllc01hcCBcclxuICAgICAqL1xyXG4gICAgcHJvY2Vzc0NvbmZpZyhjb25maWcsIGNvbmZpZ0VudHJpZXNNYXApIHtcclxuICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XHJcbiAgICB9XHJcblxyXG59IiwiaW1wb3J0IHsgTWFwLCBMaXN0LCBMb2dnZXIgfSBmcm9tIFwiY29yZXV0aWxfdjFcIjtcclxuaW1wb3J0IHsgVHlwZUNvbmZpZyB9IGZyb20gXCIuL3R5cGVDb25maWcvdHlwZUNvbmZpZy5qc1wiO1xyXG5pbXBvcnQgeyBDb25maWdQcm9jZXNzb3JFeGVjdXRvciB9IGZyb20gXCIuL2NvbmZpZ1Byb2Nlc3Nvci9jb25maWdQcm9jZXNzb3JFeGVjdXRvci5qc1wiO1xyXG5pbXBvcnQgeyBTaW5nbGV0b25Db25maWcgfSBmcm9tIFwiLi90eXBlQ29uZmlnL3NpbmdsZXRvbkNvbmZpZy5qc1wiO1xyXG5pbXBvcnQgeyBDb25maWcgfSBmcm9tIFwiLi9jb25maWcuanNcIjtcclxuaW1wb3J0IHsgTWluZGlJbmplY3RvciB9IGZyb20gXCIuL21pbmRpSW5qZWN0b3IuanNcIjtcclxuaW1wb3J0IHsgSW5zdGFuY2VQcm9jZXNzb3IgfSBmcm9tIFwiLi9pbnN0YW5jZVByb2Nlc3Nvci9pbnN0YW5jZVByb2Nlc3Nvci5qc1wiO1xyXG5pbXBvcnQgeyBDb25maWdQcm9jZXNzb3IgfSBmcm9tIFwiLi9jb25maWdQcm9jZXNzb3IvY29uZmlnUHJvY2Vzc29yLmpzXCI7XHJcblxyXG5jb25zdCBMT0cgPSBuZXcgTG9nZ2VyKFwiQ29uZmlnXCIpO1xyXG5cclxuZXhwb3J0IGNsYXNzIE1pbmRpQ29uZmlnIGV4dGVuZHMgQ29uZmlnIHtcclxuXHJcbiAgICBjb25zdHJ1Y3RvcigpIHtcclxuICAgICAgICBzdXBlcigpO1xyXG4gICAgICAgIHRoaXMuZmluYWxpemVkID0gZmFsc2U7XHJcbiAgICAgICAgLyoqIEB0eXBlIHtNYXB9ICovXHJcbiAgICAgICAgdGhpcy5jb25maWdFbnRyaWVzID0gbmV3IE1hcCgpO1xyXG4gICAgICAgIHRoaXMuY29uZmlnUHJvY2Vzc29ycyA9IG5ldyBMaXN0KCk7XHJcbiAgICAgICAgdGhpcy5pbnN0YW5jZVByb2Nlc3NvcnMgPSBuZXcgTGlzdCgpO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogXHJcbiAgICAgKiBAcGFyYW0ge0NvbmZpZ30gY29uZmlnXHJcbiAgICAgKiBAcmV0dXJucyB7TWluZGlDb25maWd9XHJcbiAgICAgKi9cclxuICAgIG1lcmdlKGNvbmZpZykge1xyXG4gICAgICAgIHRoaXMuZmluYWxpemVkID0gdHJ1ZTtcclxuICAgICAgICBjb25zdCBuZXdDb25maWdFbnRyaWVzID0gbmV3IE1hcCgpO1xyXG4gICAgICAgIG5ld0NvbmZpZ0VudHJpZXMuYWRkQWxsKHRoaXMuY29uZmlnRW50cmllcyk7XHJcbiAgICAgICAgbmV3Q29uZmlnRW50cmllcy5hZGRBbGwoY29uZmlnLmNvbmZpZ0VudHJpZXMpO1xyXG5cclxuICAgICAgICBjb25zdCBuZXdDb25maWdQcm9jZXNzb3JzID0gbmV3IExpc3QoKTtcclxuICAgICAgICBuZXdDb25maWdQcm9jZXNzb3JzLmFkZEFsbCh0aGlzLmNvbmZpZ1Byb2Nlc3NvcnMpO1xyXG4gICAgICAgIG5ld0NvbmZpZ1Byb2Nlc3NvcnMuYWRkQWxsKGNvbmZpZy5jb25maWdQcm9jZXNzb3JzKTtcclxuXHJcbiAgICAgICAgY29uc3QgbmV3SW5zdGFuY2VQcm9jZXNzb3JzID0gbmV3IExpc3QoKTtcclxuICAgICAgICBuZXdJbnN0YW5jZVByb2Nlc3NvcnMuYWRkQWxsKHRoaXMuaW5zdGFuY2VQcm9jZXNzb3JzKTtcclxuICAgICAgICBuZXdJbnN0YW5jZVByb2Nlc3NvcnMuYWRkQWxsKGNvbmZpZy5pbnN0YW5jZVByb2Nlc3NvcnMpO1xyXG5cclxuICAgICAgICAvKiogQHR5cGUge01hcH0gKi9cclxuICAgICAgICB0aGlzLmNvbmZpZ0VudHJpZXMgPSBuZXdDb25maWdFbnRyaWVzO1xyXG4gICAgICAgIHRoaXMuY29uZmlnUHJvY2Vzc29ycyA9IG5ld0NvbmZpZ1Byb2Nlc3NvcnM7XHJcbiAgICAgICAgdGhpcy5pbnN0YW5jZVByb2Nlc3NvcnMgPSBuZXdJbnN0YW5jZVByb2Nlc3NvcnM7XHJcblxyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogXHJcbiAgICAgKiBAcGFyYW0ge1R5cGVDb25maWd9IHR5cGVDb25maWdcclxuICAgICAqIEByZXR1cm5zIHtNaW5kaUNvbmZpZ31cclxuICAgICAqL1xyXG4gICAgYWRkVHlwZUNvbmZpZyh0eXBlQ29uZmlnKSB7XHJcbiAgICAgICAgdGhpcy5maW5hbGl6ZWQgPSBmYWxzZTtcclxuICAgICAgICB0aGlzLmNvbmZpZ0VudHJpZXMuc2V0KHR5cGVDb25maWcubmFtZSwgdHlwZUNvbmZpZyk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBcclxuICAgICAqIEBwYXJhbSB7Q29uZmlnUHJvY2Vzc29yfSBjb25maWdQcm9jZXNzb3JcclxuICAgICAqIEByZXR1cm5zIHtNaW5kaUNvbmZpZ31cclxuICAgICAqL1xyXG4gICAgYWRkQ29uZmlnUHJvY2Vzc29yKGNvbmZpZ1Byb2Nlc3Nvcikge1xyXG4gICAgICAgIHRoaXMuY29uZmlnUHJvY2Vzc29ycy5hZGQoY29uZmlnUHJvY2Vzc29yLm5hbWUpO1xyXG4gICAgICAgIHJldHVybiB0aGlzLmFkZFR5cGVDb25maWcoU2luZ2xldG9uQ29uZmlnLnVubmFtZWQoY29uZmlnUHJvY2Vzc29yKSk7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBcclxuICAgICAqIEBwYXJhbSB7SW5zdGFuY2VQcm9jZXNzb3J9IGluc3RhbmNlUHJvY2Vzc29yXHJcbiAgICAgKiBAcmV0dXJucyB7TWluZGlDb25maWd9XHJcbiAgICAgKi9cclxuICAgIGFkZEluc3RhbmNlUHJvY2Vzc29yKGluc3RhbmNlUHJvY2Vzc29yKSB7XHJcbiAgICAgICAgdGhpcy5pbnN0YW5jZVByb2Nlc3NvcnMuYWRkKGluc3RhbmNlUHJvY2Vzc29yLm5hbWUpO1xyXG4gICAgICAgIHJldHVybiB0aGlzLmFkZFR5cGVDb25maWcoU2luZ2xldG9uQ29uZmlnLnVubmFtZWQoaW5zdGFuY2VQcm9jZXNzb3IpKTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIFxyXG4gICAgICogQHBhcmFtIHtMaXN0fSB0eXBlQ29uZmlnTGlzdFxyXG4gICAgICogQHJldHVybiB7TWluZGlDb25maWd9XHJcbiAgICAgKi9cclxuICAgIGFkZEFsbFR5cGVDb25maWcodHlwZUNvbmZpZ0xpc3QpIHtcclxuICAgICAgICB0aGlzLmZpbmFsaXplZCA9IGZhbHNlO1xyXG4gICAgICAgIHR5cGVDb25maWdMaXN0LmZvckVhY2goKHR5cGVDb25maWcscGFyZW50KSA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMuY29uZmlnRW50cmllcy5zZXQodHlwZUNvbmZpZy5uYW1lLCB0eXBlQ29uZmlnKTtcclxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgfSwgdGhpcyk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBcclxuICAgICAqIEBwYXJhbSB7TGlzdH0gY29uZmlnUHJvY2Vzc29yTGlzdFxyXG4gICAgICogQHJldHVybiB7TWluZGlDb25maWd9XHJcbiAgICAgKi9cclxuICAgIGFkZEFsbENvbmZpZ1Byb2Nlc3Nvcihjb25maWdQcm9jZXNzb3JMaXN0KSB7XHJcbiAgICAgICAgY29uZmlnUHJvY2Vzc29yTGlzdC5mb3JFYWNoKChjb25maWdQcm9jZXNzb3IscGFyZW50KSA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMuY29uZmlnUHJvY2Vzc29ycy5hZGQoY29uZmlnUHJvY2Vzc29yLm5hbWUpO1xyXG4gICAgICAgICAgICB0aGlzLmFkZFR5cGVDb25maWcoU2luZ2xldG9uQ29uZmlnLnVubmFtZWQoY29uZmlnUHJvY2Vzc29yKSk7XHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgIH0sIHRoaXMpO1xyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogXHJcbiAgICAgKiBAcGFyYW0ge0xpc3R9IGluc3RhbmNlUHJvY2Vzc29yTGlzdCBcclxuICAgICAqIEByZXR1cm4ge01pbmRpQ29uZmlnfVxyXG4gICAgICovXHJcbiAgICBhZGRBbGxJbnN0YW5jZVByb2Nlc3NvcihpbnN0YW5jZVByb2Nlc3Nvckxpc3QpIHtcclxuICAgICAgICBpbnN0YW5jZVByb2Nlc3Nvckxpc3QuZm9yRWFjaCgoaW5zdGFuY2VQcm9jZXNzb3IscGFyZW50KSA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMuaW5zdGFuY2VQcm9jZXNzb3JzLmFkZChpbnN0YW5jZVByb2Nlc3Nvci5uYW1lKTtcclxuICAgICAgICAgICAgdGhpcy5hZGRUeXBlQ29uZmlnKFNpbmdsZXRvbkNvbmZpZy51bm5hbWVkKGluc3RhbmNlUHJvY2Vzc29yKSk7XHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgIH0sIHRoaXMpO1xyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQHJldHVybnMge0Jvb2xlYW59XHJcbiAgICAgKi9cclxuICAgIGlzRmluYWxpemVkKCkge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmZpbmFsaXplZDtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIEByZXR1cm5zIHtQcm9taXNlfVxyXG4gICAgICovXHJcbiAgICBmaW5hbGl6ZSgpIHtcclxuICAgICAgICB0aGlzLmZpbmFsaXplZCA9IHRydWU7XHJcbiAgICAgICAgcmV0dXJuIENvbmZpZ1Byb2Nlc3NvckV4ZWN1dG9yLmV4ZWN1dGUodGhpcy5jb25maWdQcm9jZXNzb3JzLCBNaW5kaUluamVjdG9yLmdldEluc3RhbmNlKCksIHRoaXMpO1xyXG4gICAgfVxyXG5cclxufSIsImltcG9ydCB7IExvZ2dlciB9IGZyb20gXCJjb3JldXRpbF92MVwiO1xyXG5pbXBvcnQgeyBJbnN0YW5jZVByb2Nlc3NvciB9IGZyb20gXCIuL2luc3RhbmNlUHJvY2Vzc29yLmpzXCI7XHJcblxyXG5jb25zdCBMT0cgPSBuZXcgTG9nZ2VyKFwiSW5zdGFuY2VQb3N0Q29uZmlnVHJpZ2dlclwiKTtcclxuXHJcbi8qKlxyXG4gKiBJbnN0YW5jZSBwcm9jZXNzb3Igd2hpY2ggY2FsbHMgcG9zdENvbmZpZyBvbiBvYmplY3RzIGFmdGVyIGNvbmZpZ1Byb2Nlc3NvcnMgYXJlIGZpbmlzaGVkXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgSW5zdGFuY2VQb3N0Q29uZmlnVHJpZ2dlciBleHRlbmRzIEluc3RhbmNlUHJvY2Vzc29yIHtcclxuXHJcbiAgICAvKipcclxuICAgICAqIFxyXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGluc3RhbmNlIFxyXG4gICAgICogQHJldHVybiB7UHJvbWlzZX1cclxuICAgICAqL1xyXG4gICAgcHJvY2VzcyhpbnN0YW5jZSkge1xyXG4gICAgICAgIGxldCByZXNwb25zZSA9IG51bGw7XHJcbiAgICAgICAgaWYoaW5zdGFuY2UucG9zdENvbmZpZykge1xyXG4gICAgICAgICAgICByZXNwb25zZSA9IGluc3RhbmNlLnBvc3RDb25maWcoKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKCFyZXNwb25zZSkge1xyXG4gICAgICAgICAgICByZXNwb25zZSA9IG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCkgPT4geyByZXNvbHZlKCk7IH0pO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoIXJlc3BvbnNlIGluc3RhbmNlb2YgUHJvbWlzZSkge1xyXG4gICAgICAgICAgICB0aHJvdyBcInBvc3RDb25maWcoKSBtdXN0IHJldHVybiBlaXRoZXIgdW5kZWZpbmVkIG9yIG51bGwgb3IgYSBQcm9taXNlXCJcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHJlc3BvbnNlO1xyXG4gICAgfVxyXG5cclxufSIsImltcG9ydCB7IFR5cGVDb25maWcgfSBmcm9tIFwiLi90eXBlQ29uZmlnLmpzXCI7XHJcblxyXG5leHBvcnQgY2xhc3MgUG9vbENvbmZpZyBleHRlbmRzIFR5cGVDb25maWcge1xyXG5cclxuICAgIHN0YXRpYyBuYW1lZChuYW1lLCBjbGFzc1JlZmVyZW5jZSwgcG9vbFNpemUpIHtcclxuICAgICAgICByZXR1cm4gbmV3IFBvb2xDb25maWcobmFtZSwgY2xhc3NSZWZlcmVuY2UsIHBvb2xTaXplKTtcclxuICAgIH1cclxuXHJcbiAgICBzdGF0aWMgdW5uYW1lZChjbGFzc1JlZmVyZW5jZSwgcG9vbFNpemUpIHtcclxuICAgICAgICByZXR1cm4gbmV3IFBvb2xDb25maWcoY2xhc3NSZWZlcmVuY2UubmFtZSwgY2xhc3NSZWZlcmVuY2UsIHBvb2xTaXplKTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdHJ1Y3RvcihuYW1lLCBjbGFzc1JlZmVyZW5jZSwgcG9vbFNpemUpIHtcclxuICAgICAgICBzdXBlcihuYW1lLCBjbGFzc1JlZmVyZW5jZSk7XHJcbiAgICAgICAgdGhpcy5wb29sU2l6ZSA9IHBvb2xTaXplO1xyXG4gICAgfVxyXG5cclxuICAgIGluc3RhbmNlSG9sZGVyKHBhcmFtZXRlcnMgPSBbXSkge1xyXG5cclxuICAgIH1cclxuXHJcbn0iLCJpbXBvcnQgeyBUeXBlQ29uZmlnIH0gZnJvbSBcIi4vdHlwZUNvbmZpZy5qc1wiO1xyXG5pbXBvcnQgeyBJbnN0YW5jZUhvbGRlciB9IGZyb20gXCIuL2luc3RhbmNlSG9sZGVyLmpzXCI7XHJcblxyXG5leHBvcnQgY2xhc3MgUHJvdG90eXBlQ29uZmlnIGV4dGVuZHMgVHlwZUNvbmZpZyB7XHJcblxyXG4gICAgc3RhdGljIG5hbWVkKG5hbWUsIGNsYXNzUmVmZXJlbmNlKSB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBQcm90b3R5cGVDb25maWcobmFtZSwgY2xhc3NSZWZlcmVuY2UpO1xyXG4gICAgfVxyXG5cclxuICAgIHN0YXRpYyB1bm5hbWVkKGNsYXNzUmVmZXJlbmNlKSB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBQcm90b3R5cGVDb25maWcoY2xhc3NSZWZlcmVuY2UubmFtZSwgY2xhc3NSZWZlcmVuY2UpO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0cnVjdG9yKG5hbWUsIGNsYXNzUmVmZXJlbmNlKSB7XHJcbiAgICAgICAgc3VwZXIobmFtZSwgY2xhc3NSZWZlcmVuY2UpO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQHBhcmFtIHthcnJheX0gcGFyYW1ldGVycyB0aGUgcGFyYW1ldGVycyB0byB1c2UgZm9yIHRoZSBjb25zdHJ1Y3RvclxyXG4gICAgICovXHJcbiAgICBpbnN0YW5jZUhvbGRlcihwYXJhbWV0ZXJzID0gW10pIHtcclxuICAgICAgICBsZXQgaW5zdGFuY2UgPSBudWxsO1xyXG4gICAgICAgIGlmKHBhcmFtZXRlcnMgJiYgcGFyYW1ldGVycy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgIGluc3RhbmNlID0gbmV3IHRoaXMuY2xhc3NSZWZlcmVuY2UoLi4ucGFyYW1ldGVycyk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgaW5zdGFuY2UgPSBuZXcgdGhpcy5jbGFzc1JlZmVyZW5jZSgpO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gSW5zdGFuY2VIb2xkZXIuaG9sZGVyV2l0aE5ld0luc3RhbmNlKGluc3RhbmNlKTtcclxuICAgIH1cclxuXHJcblxyXG59Il0sIm5hbWVzIjpbIkxPRyJdLCJtYXBwaW5ncyI6Ijs7QUFBTyxNQUFNLE1BQU0sQ0FBQztBQUNwQjtBQUNBLElBQUksV0FBVyxHQUFHO0FBQ2xCO0FBQ0EsUUFBUSxJQUFJLENBQUMsYUFBYSxHQUFHLElBQUksQ0FBQztBQUNsQztBQUNBO0FBQ0EsUUFBUSxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsSUFBSSxDQUFDO0FBQ3JDO0FBQ0E7QUFDQSxRQUFRLElBQUksQ0FBQyxrQkFBa0IsR0FBRyxJQUFJLENBQUM7QUFDdkMsS0FBSztBQUNMO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBSSxRQUFRLEdBQUc7QUFDZjtBQUNBLEtBQUs7QUFDTDtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQUksV0FBVyxHQUFHO0FBQ2xCLFFBQVEsT0FBTyxLQUFLLENBQUM7QUFDckIsS0FBSztBQUNMOztBQzFCTyxNQUFNLFFBQVEsQ0FBQztBQUN0QjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQUksWUFBWSxDQUFDLE1BQU0sRUFB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
