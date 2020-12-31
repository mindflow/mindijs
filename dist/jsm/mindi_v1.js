import { Logger, Map, List } from './coreutil_v1.js'

const LOG = new Logger("Provider");

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

const LOG$1 = new Logger("ConfigAccessor");

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
        config.configEntries.forEach((key, value, parent) => {
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

const LOG$2 = new Logger("ConfigProcessorExecutor");

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

const LOG$3 = new Logger("InstancePostConfigTrigger");

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

const LOG$6 = new Logger("MindiInjector");

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

const LOG$7 = new Logger("Config");

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWluZGlfdjEuanMiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9taW5kaS9hcGkvcHJvdmlkZXIuanMiLCIuLi8uLi9zcmMvbWluZGkvYXBpL2luamVjdGlvblBvaW50LmpzIiwiLi4vLi4vc3JjL21pbmRpL2NvbmZpZy5qcyIsIi4uLy4uL3NyYy9taW5kaS90eXBlQ29uZmlnL2luc3RhbmNlSG9sZGVyLmpzIiwiLi4vLi4vc3JjL21pbmRpL3R5cGVDb25maWcvdHlwZUNvbmZpZy5qcyIsIi4uLy4uL3NyYy9taW5kaS9jb25maWdBY2Nlc3Nvci5qcyIsIi4uLy4uL3NyYy9taW5kaS9jb25maWdQcm9jZXNzb3IvY29uZmlnUHJvY2Vzc29yLmpzIiwiLi4vLi4vc3JjL21pbmRpL2luamVjdG9yLmpzIiwiLi4vLi4vc3JjL21pbmRpL2NvbmZpZ1Byb2Nlc3Nvci9jb25maWdQcm9jZXNzb3JFeGVjdXRvci5qcyIsIi4uLy4uL3NyYy9taW5kaS9pbnN0YW5jZVByb2Nlc3Nvci9pbnN0YW5jZVByb2Nlc3Nvci5qcyIsIi4uLy4uL3NyYy9taW5kaS9pbnN0YW5jZVByb2Nlc3Nvci9pbnN0YW5jZVBvc3RDb25maWdUcmlnZ2VyLmpzIiwiLi4vLi4vc3JjL21pbmRpL2luc3RhbmNlUHJvY2Vzc29yL2luc3RhbmNlUHJvY2Vzc29yRXhlY3V0b3IuanMiLCIuLi8uLi9zcmMvbWluZGkvdHlwZUNvbmZpZy9zaW5nbGV0b25Db25maWcuanMiLCIuLi8uLi9zcmMvbWluZGkvbWluZGlQcm92aWRlci5qcyIsIi4uLy4uL3NyYy9taW5kaS9taW5kaUluamVjdG9yLmpzIiwiLi4vLi4vc3JjL21pbmRpL21pbmRpQ29uZmlnLmpzIiwiLi4vLi4vc3JjL21pbmRpL3R5cGVDb25maWcvcG9vbENvbmZpZy5qcyIsIi4uLy4uL3NyYy9taW5kaS90eXBlQ29uZmlnL3Byb3RvdHlwZUNvbmZpZy5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBMb2dnZXIgfSBmcm9tIFwiY29yZXV0aWxfdjFcIjtcclxuXHJcbmNvbnN0IExPRyA9IG5ldyBMb2dnZXIoXCJQcm92aWRlclwiKTtcclxuXHJcbmV4cG9ydCBjbGFzcyBQcm92aWRlciB7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBcclxuICAgICAqIEBwYXJhbSB7QXJyYXl9IHBhcmFtZXRlcnMgXHJcbiAgICAgKiBAcmV0dXJucyB7UHJvbWlzZX1cclxuICAgICAqL1xyXG4gICAgZ2V0KHBhcmFtZXRlcnMgPSBbXSkge1xyXG4gICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgfVxyXG5cclxufSIsImltcG9ydCB7IFByb3ZpZGVyIH0gZnJvbSBcIi4vcHJvdmlkZXIuanNcIjtcclxuXHJcbmV4cG9ydCBjbGFzcyBJbmplY3Rpb25Qb2ludCB7XHJcblxyXG4gICAgc3RhdGljIGdldCBJTlNUQU5DRV9UWVBFKCkgeyByZXR1cm4gMDsgfSBcclxuICAgIHN0YXRpYyBnZXQgUFJPVklERVJfVFlQRSgpIHsgcmV0dXJuIDE7IH0gXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBcclxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBuYW1lIFxyXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2xhc3NSZWZlcmVuY2UgXHJcbiAgICAgKiBAcGFyYW0ge2FycmF5fSBwYXJhbWV0ZXJzIFxyXG4gICAgICogQHJldHVybnMge29iamVjdH1cclxuICAgICAqL1xyXG4gICAgc3RhdGljIGluc3RhbmNlQnlOYW1lKG5hbWUsIGNsYXNzUmVmZXJlbmNlLCBwYXJhbWV0ZXJzID0gW10pIHtcclxuICAgICAgICByZXR1cm4gbmV3IEluamVjdGlvblBvaW50KG5hbWUsIGNsYXNzUmVmZXJlbmNlLCBJbmplY3Rpb25Qb2ludC5JTlNUQU5DRV9UWVBFLCBwYXJhbWV0ZXJzKTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIFxyXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2xhc3NSZWZlcmVuY2UgXHJcbiAgICAgKiBAcGFyYW0ge2FycmF5fSBwYXJhbWV0ZXJzIFxyXG4gICAgICogQHJldHVybnMge29iamVjdH1cclxuICAgICAqL1xyXG4gICAgc3RhdGljIGluc3RhbmNlKGNsYXNzUmVmZXJlbmNlLCBwYXJhbWV0ZXJzID0gW10pIHtcclxuICAgICAgICByZXR1cm4gbmV3IEluamVjdGlvblBvaW50KGNsYXNzUmVmZXJlbmNlLm5hbWUsIGNsYXNzUmVmZXJlbmNlLCBJbmplY3Rpb25Qb2ludC5JTlNUQU5DRV9UWVBFLCBwYXJhbWV0ZXJzKTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIFxyXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG5hbWUgXHJcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjbGFzc1JlZmVyZW5jZSBcclxuICAgICAqIEByZXR1cm5zIHtQcm92aWRlcn1cclxuICAgICAqL1xyXG4gICAgc3RhdGljIHByb3ZpZGVyQnlOYW1lKG5hbWUsIGNsYXNzUmVmZXJlbmNlKSB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBJbmplY3Rpb25Qb2ludChuYW1lLCBjbGFzc1JlZmVyZW5jZSwgSW5qZWN0aW9uUG9pbnQuUFJPVklERVJfVFlQRSk7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBcclxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNsYXNzUmVmZXJlbmNlIFxyXG4gICAgICogQHJldHVybnMge1Byb3ZpZGVyfVxyXG4gICAgICovXHJcbiAgICBzdGF0aWMgcHJvdmlkZXIoY2xhc3NSZWZlcmVuY2UpIHtcclxuICAgICAgICByZXR1cm4gbmV3IEluamVjdGlvblBvaW50KGNsYXNzUmVmZXJlbmNlLm5hbWUsIGNsYXNzUmVmZXJlbmNlLCBJbmplY3Rpb25Qb2ludC5QUk9WSURFUl9UWVBFKTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdHJ1Y3RvcihuYW1lLCBjbGFzc1JlZmVyZW5jZSwgdHlwZSA9IEluamVjdGlvblBvaW50LklOU1RBTkNFX1RZUEUsIHBhcmFtZXRlcnMgPSBudWxsKSB7XHJcbiAgICAgICAgdGhpcy5uYW1lID0gbmFtZTtcclxuICAgICAgICB0aGlzLmNsYXNzUmVmZXJlbmNlID0gY2xhc3NSZWZlcmVuY2U7XHJcbiAgICAgICAgdGhpcy50eXBlID0gdHlwZTtcclxuICAgICAgICB0aGlzLnBhcmFtZXRlcnMgPSBwYXJhbWV0ZXJzO1xyXG4gICAgfVxyXG5cclxufSIsImV4cG9ydCBjbGFzcyBDb25maWcge1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgICAgIC8qKiBAdHlwZSB7TWFwfSAqL1xyXG4gICAgICAgIHRoaXMuY29uZmlnRW50cmllcyA9IG51bGw7XHJcblxyXG4gICAgICAgIC8qKiBAdHlwZSB7TGlzdH0gKi9cclxuICAgICAgICB0aGlzLmNvbmZpZ1Byb2Nlc3NvcnMgPSBudWxsO1xyXG5cclxuICAgICAgICAvKiogQHR5cGUge0xpc3R9ICovXHJcbiAgICAgICAgdGhpcy5pbnN0YW5jZVByb2Nlc3NvcnMgPSBudWxsO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQHJldHVybnMge1Byb21pc2V9XHJcbiAgICAgKi9cclxuICAgIGZpbmFsaXplKCkge1xyXG5cclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIEByZXR1cm5zIHtCb29sZWFufVxyXG4gICAgICovXHJcbiAgICBpc0ZpbmFsaXplZCgpIHtcclxuICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9XHJcbn0iLCJleHBvcnQgY2xhc3MgSW5zdGFuY2VIb2xkZXIge1xyXG5cclxuICAgIHN0YXRpYyBnZXQgTkVXX0lOU1RBTkNFKCkgeyByZXR1cm4gMDsgfVxyXG5cclxuICAgIHN0YXRpYyBnZXQgRVhJU1RJTkdfSU5TVEFOQ0UoKSB7IHJldHVybiAxOyB9XHJcblxyXG4gICAgc3RhdGljIGhvbGRlcldpdGhOZXdJbnN0YW5jZShpbnN0YW5jZSkge1xyXG4gICAgICAgIHJldHVybiBuZXcgSW5zdGFuY2VIb2xkZXIoaW5zdGFuY2UsIEluc3RhbmNlSG9sZGVyLk5FV19JTlNUQU5DRSk7XHJcbiAgICB9XHJcblxyXG4gICAgc3RhdGljIGhvbGRlcldpdGhFeGlzdGluZ0luc3RhbmNlKGluc3RhbmNlKSB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBJbnN0YW5jZUhvbGRlcihpbnN0YW5jZSwgSW5zdGFuY2VIb2xkZXIuRVhJU1RJTkdfSU5TVEFOQ0UpO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0cnVjdG9yKGluc3RhbmNlLCB0eXBlKSB7XHJcbiAgICAgICAgdGhpcy5pbnN0YW5jZSA9IGluc3RhbmNlO1xyXG4gICAgICAgIHRoaXMudHlwZSA9IHR5cGU7XHJcbiAgICB9XHJcblxyXG59IiwiZXhwb3J0IGNsYXNzIFR5cGVDb25maWcge1xyXG5cclxuICAgIHN0YXRpYyBnZXQgTkVXKCkgeyByZXR1cm4gXCJORVdcIjsgfVxyXG4gICAgc3RhdGljIGdldCBDT05GSUdVUkVEKCkgeyByZXR1cm4gXCJDT05GSUdVUkVEXCI7IH1cclxuXHJcbiAgICBjb25zdHJ1Y3RvcihuYW1lLCBjbGFzc1JlZmVyZW5jZSkge1xyXG4gICAgICAgIHRoaXMubmFtZSA9IG5hbWU7XHJcbiAgICAgICAgdGhpcy5jbGFzc1JlZmVyZW5jZSA9IGNsYXNzUmVmZXJlbmNlO1xyXG4gICAgICAgIHRoaXMuc3RhZ2UgPSBUeXBlQ29uZmlnLk5FVztcclxuICAgIH1cclxuXHJcbiAgICBpbnN0YW5jZUhvbGRlcihwYXJhbWV0ZXJzID0gW10pIHtcclxuICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgIH1cclxuXHJcbn0iLCJpbXBvcnQgeyBDb25maWcgfSBmcm9tIFwiLi9jb25maWcuanNcIjtcclxuaW1wb3J0IHsgTG9nZ2VyIH0gZnJvbSBcImNvcmV1dGlsX3YxXCI7XHJcbmltcG9ydCB7IEluc3RhbmNlSG9sZGVyIH0gZnJvbSBcIi4vdHlwZUNvbmZpZy9pbnN0YW5jZUhvbGRlci5qc1wiO1xyXG5pbXBvcnQgeyBUeXBlQ29uZmlnIH0gZnJvbSBcIi4vdHlwZUNvbmZpZy90eXBlQ29uZmlnLmpzXCI7XHJcblxyXG4vKipcclxuICogVXRpbGl0aWVzIGZvciBhY2Nlc3NpbmcgYSBDb25maWcgb2JqZWN0XHJcbiAqL1xyXG5cclxuY29uc3QgTE9HID0gbmV3IExvZ2dlcihcIkNvbmZpZ0FjY2Vzc29yXCIpO1xyXG5cclxuZXhwb3J0IGNsYXNzIENvbmZpZ0FjY2Vzc29yIHtcclxuXHJcbiAgICAvKipcclxuICAgICAqIEdldCBhbiBpbnN0YW5jZSBieSBjbGFzcyBuYW1lIGluIHRoZSBjb25maWdcclxuICAgICAqIFxyXG4gICAgICogQHBhcmFtIHtDb25maWd9IGNvbmZpZyBcclxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBuYW1lIFxyXG4gICAgICogQHBhcmFtIHtBcnJheX0gcGFyYW1ldGVyc1xyXG4gICAgICogQHJldHVybnMge0luc3RhbmNlSG9sZGVyfVxyXG4gICAgICovXHJcbiAgICBzdGF0aWMgaW5zdGFuY2VIb2xkZXIobmFtZSwgY29uZmlnLCBwYXJhbWV0ZXJzID0gW10pIHtcclxuICAgICAgICBjb25zdCB0eXBlQ29uZmlnID0gdGhpcy50eXBlQ29uZmlnQnlOYW1lKG5hbWUsIGNvbmZpZyk7XHJcbiAgICAgICAgaWYodHlwZUNvbmZpZyA9PT0gbnVsbCkge1xyXG4gICAgICAgICAgICBMT0cuZXJyb3IoXCJObyB0eXBlY29uZmlnIGZvdW5kIGZvciBcIiArIG5hbWUpO1xyXG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICB9XHJcbiAgICAgICAgY29uc3QgaW5zdGFuY2VIb2xkZXIgPSB0eXBlQ29uZmlnLmluc3RhbmNlSG9sZGVyKHBhcmFtZXRlcnMpO1xyXG4gICAgICAgIGlmKCFpbnN0YW5jZUhvbGRlcikge1xyXG4gICAgICAgICAgICBMT0cuZXJyb3IoXCJObyBvYmplY3QgZm91bmQgZm9yIFwiICsgbmFtZSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBpbnN0YW5jZUhvbGRlcjtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIEdldCB0aGUgdHlwZSBjb25maWcgYnkgY2xhc3MgbmFtZSBpbiB0aGUgY29uZmlnXHJcbiAgICAgKiBcclxuICAgICAqIEBwYXJhbSB7Q29uZmlnfSBjb25maWcgXHJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbmFtZSBcclxuICAgICAqIEByZXR1cm5zIHtUeXBlQ29uZmlnfVxyXG4gICAgICovXHJcbiAgICBzdGF0aWMgdHlwZUNvbmZpZ0J5TmFtZShuYW1lLCBjb25maWcpIHtcclxuICAgICAgICBsZXQgY29uZmlnRW50cnkgPSBudWxsO1xyXG4gICAgICAgIGNvbmZpZy5jb25maWdFbnRyaWVzLmZvckVhY2goKGtleSwgdmFsdWUsIHBhcmVudCkgPT4ge1xyXG4gICAgICAgICAgICBpZihrZXkgPT09IG5hbWUpIHtcclxuICAgICAgICAgICAgICAgIGNvbmZpZ0VudHJ5ID0gdmFsdWU7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgfSwgdGhpcyk7XHJcbiAgICAgICAgaWYoIWNvbmZpZ0VudHJ5KSB7XHJcbiAgICAgICAgICAgIExPRy5lcnJvcihcIk5vIGNvbmZpZyBlbnRyeSBmb3VuZCBmb3IgXCIgKyBuYW1lKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGNvbmZpZ0VudHJ5O1xyXG4gICAgfVxyXG5cclxufSIsImltcG9ydCB7IE1hcCB9IGZyb20gXCJjb3JldXRpbF92MVwiO1xyXG5pbXBvcnQgeyBDb25maWcgfSBmcm9tIFwiLi4vY29uZmlnLmpzXCI7XHJcblxyXG5leHBvcnQgY2xhc3MgQ29uZmlnUHJvY2Vzc29yIHtcclxuXHJcbiAgICAvKipcclxuICAgICAqIFxyXG4gICAgICogQHBhcmFtIHtDb25maWd9IGNvbmZpZyBcclxuICAgICAqIEBwYXJhbSB7TWFwfSBjb25maWdFbnRyaWVzTWFwIFxyXG4gICAgICovXHJcbiAgICBwcm9jZXNzQ29uZmlnKGNvbmZpZywgY29uZmlnRW50cmllc01hcCkge1xyXG4gICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKTtcclxuICAgIH1cclxuXHJcbn0iLCJleHBvcnQgY2xhc3MgSW5qZWN0b3Ige1xyXG5cclxuXHJcbiAgICAvKipcclxuICAgICAqIEhlbHBlciBtZXRob2QgZm9yIGluamVjdGluZyBmaWVsZHMgaW4gdGFyZ2V0IG9iamVjdFxyXG4gICAgICogXHJcbiAgICAgKiBAcGFyYW0ge2FueX0gdGFyZ2V0T2JqZWN0IFxyXG4gICAgICogQHBhcmFtIHtDb25maWd9IGNvbmZpZyBcclxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBkZXB0aFxyXG4gICAgICogQHJldHVybnMge1Byb21pc2V9XHJcbiAgICAgKi9cclxuICAgIGluamVjdFRhcmdldCh0YXJnZXQsIGNvbmZpZywgZGVwdGggPSAwKSB7XHJcblxyXG4gICAgfVxyXG5cclxufSIsImltcG9ydCB7IE1hcCwgTG9nZ2VyLCBMaXN0IH0gZnJvbSBcImNvcmV1dGlsX3YxXCI7XHJcbmltcG9ydCB7IENvbmZpZyB9IGZyb20gXCIuLi9jb25maWcuanNcIjtcclxuaW1wb3J0IHsgQ29uZmlnQWNjZXNzb3IgfSBmcm9tIFwiLi4vY29uZmlnQWNjZXNzb3IuanNcIjtcclxuaW1wb3J0IHsgSW5qZWN0b3IgfSBmcm9tIFwiLi4vaW5qZWN0b3IuanNcIjtcclxuaW1wb3J0IHsgSW5zdGFuY2VIb2xkZXIgfSBmcm9tIFwiLi4vdHlwZUNvbmZpZy9pbnN0YW5jZUhvbGRlci5qc1wiO1xyXG5pbXBvcnQgeyBUeXBlQ29uZmlnIH0gZnJvbSBcIi4uL3R5cGVDb25maWcvdHlwZUNvbmZpZy5qc1wiO1xyXG5cclxuY29uc3QgTE9HID0gbmV3IExvZ2dlcihcIkNvbmZpZ1Byb2Nlc3NvckV4ZWN1dG9yXCIpO1xyXG5cclxuLyoqXHJcbiAqIEV4ZWN1dGVzIHRoZSBwcm92aWRlZCBjb25maWcgcHJvY2Vzc29ycyBvbiB0aGUgcHJvdmlkZWQgY29uZmlnIHJlZ2lzdHJ5XHJcbiAqIFJldHVybnMgYSBsaXN0IG9mIHByb21pc2VzIGZvciB3aGVuIHRoZSBjb25maWcgcHJvY2Vzc29ycyBoYXMgY29tcGxldGVkIHJ1bm5pbmdcclxuICogXHJcbiAqIEEgY29uZmlnIHByb2Nlc3NvciByZWFkcyB0aGUgY29uZmlnIGFuZCBwZXJmb3JtcyBhbnkgbmVjZXNzYXJ5IGFjdGlvbnMgYmFzZWQgb25cclxuICogY2xhc3MgYW5kIHR5cGUgaW5mb3JtYXRpb24uIEEgY29uZmlnIHByb2Nlc3NvciBkb2VzIG5vdCBvcGVyYXRlIG9uIG1hbmFnZWQgaW5zdGFuY2VzXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgQ29uZmlnUHJvY2Vzc29yRXhlY3V0b3Ige1xyXG4gICAgXHJcbiAgICAvKipcclxuICAgICAqIEBwYXJhbSB7TGlzdH0gY29uZmlnUHJvY2Vzc29yQ2xhc3NOYW1lTGlzdFxyXG4gICAgICogQHBhcmFtIHtJbmplY3Rvcn0gaW5qZWN0b3JcclxuICAgICAqIEBwYXJhbSB7Q29uZmlnfSBjb25maWdcclxuICAgICAqIEByZXR1cm5zIHtQcm9taXNlfSBwcm9taXNlIHdoaWNoIGlzIHJlc29sdmVkIHdoZW4gYWxsIGNvbmZpZyBwcm9jZXNzb3JzIGFyZSByZXNvbHZlZFxyXG4gICAgICovXHJcbiAgICBzdGF0aWMgZXhlY3V0ZShjb25maWdQcm9jZXNzb3JDbGFzc05hbWVMaXN0LCBpbmplY3RvciwgY29uZmlnKSB7XHJcbiAgICAgICAgcmV0dXJuIGNvbmZpZ1Byb2Nlc3NvckNsYXNzTmFtZUxpc3QucHJvbWlzZUNoYWluKChjb25maWdQcm9jZXNzb3JDbGFzc05hbWUsIHBhcmVudCkgPT4ge1xyXG4gICAgICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmVDb25maWdQcm9jZXNzb3JFeGVjdXRlZCwgcmVqZWN0KSA9PiB7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IHRhcmdldEluamVjdGVkUHJvbWlzZSA9IFByb21pc2UucmVzb2x2ZSgpO1xyXG5cclxuICAgICAgICAgICAgICAgIC8qKiAgQHR5cGUge0luc3RhbmNlSG9sZGVyfSAqL1xyXG4gICAgICAgICAgICAgICAgY29uc3QgcHJvY2Vzc29ySG9sZGVyID0gQ29uZmlnQWNjZXNzb3IuaW5zdGFuY2VIb2xkZXIoY29uZmlnUHJvY2Vzc29yQ2xhc3NOYW1lLCBjb25maWcpO1xyXG4gICAgICAgICAgICAgICAgaWYocHJvY2Vzc29ySG9sZGVyLnR5cGUgPT09IEluc3RhbmNlSG9sZGVyLk5FV19JTlNUQU5DRSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRhcmdldEluamVjdGVkUHJvbWlzZSA9IGluamVjdG9yLmluamVjdFRhcmdldChwcm9jZXNzb3JIb2xkZXIuaW5zdGFuY2UsIGNvbmZpZyk7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgdGFyZ2V0SW5qZWN0ZWRQcm9taXNlLnRoZW4oKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRvQ29uZmlndXJlTWFwID0gQ29uZmlnUHJvY2Vzc29yRXhlY3V0b3IucHJlcGFyZVVuY29uZmlndXJlZENvbmZpZ0VudHJpZXMoY29uZmlnLmNvbmZpZ0VudHJpZXMpO1xyXG4gICAgICAgICAgICAgICAgICAgIHByb2Nlc3NvckhvbGRlci5pbnN0YW5jZS5wcm9jZXNzQ29uZmlnKGNvbmZpZywgdG9Db25maWd1cmVNYXApLnRoZW4oKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlQ29uZmlnUHJvY2Vzc29yRXhlY3V0ZWQoKTtcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9KVxyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogXHJcbiAgICAgKiBAcGFyYW0ge01hcH0gY29uZmlnRW50cmllcyBcclxuICAgICAqIEByZXR1cm4ge01hcH1cclxuICAgICAqL1xyXG4gICAgc3RhdGljIHByZXBhcmVVbmNvbmZpZ3VyZWRDb25maWdFbnRyaWVzKGNvbmZpZ0VudHJpZXMpIHtcclxuICAgICAgICBjb25zdCB1bmNvbmZpZ3VyZWRDb25maWdFbnRyaWVzID0gbmV3IE1hcCgpO1xyXG5cclxuICAgICAgICBjb25maWdFbnRyaWVzLmZvckVhY2goKGtleSwgdmFsdWUsIHBhcmVudCkgPT4ge1xyXG5cclxuICAgICAgICAgICAgLyoqIEB0eXBlIHtUeXBlQ29uZmlnfSAqL1xyXG4gICAgICAgICAgICBjb25zdCBjb25maWdFbnRyeSA9IHZhbHVlO1xyXG5cclxuICAgICAgICAgICAgaWYoY29uZmlnRW50cnkuc3RhZ2UgPT09IFR5cGVDb25maWcuTkVXKSB7XHJcbiAgICAgICAgICAgICAgICB1bmNvbmZpZ3VyZWRDb25maWdFbnRyaWVzLnNldChrZXksIGNvbmZpZ0VudHJ5KTtcclxuICAgICAgICAgICAgICAgIGNvbmZpZ0VudHJ5LnN0YWdlID0gVHlwZUNvbmZpZy5DT05GSUdVUkVEO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICB9LCB0aGlzKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHVuY29uZmlndXJlZENvbmZpZ0VudHJpZXM7XHJcbiAgICB9XHJcblxyXG59IiwiZXhwb3J0IGNsYXNzIEluc3RhbmNlUHJvY2Vzc29yIHtcclxuXHJcbiAgICAvKipcclxuICAgICAqIFxyXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGluc3RhbmNlIFxyXG4gICAgICogQHJldHVybiB7UHJvbWlzZX1cclxuICAgICAqL1xyXG4gICAgcHJvY2VzcyhpbnN0YW5jZSkge1xyXG4gICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKTtcclxuICAgIH1cclxuXHJcbn0iLCJpbXBvcnQgeyBMb2dnZXIgfSBmcm9tIFwiY29yZXV0aWxfdjFcIjtcclxuaW1wb3J0IHsgSW5zdGFuY2VQcm9jZXNzb3IgfSBmcm9tIFwiLi9pbnN0YW5jZVByb2Nlc3Nvci5qc1wiO1xyXG5cclxuY29uc3QgTE9HID0gbmV3IExvZ2dlcihcIkluc3RhbmNlUG9zdENvbmZpZ1RyaWdnZXJcIik7XHJcblxyXG4vKipcclxuICogSW5zdGFuY2UgcHJvY2Vzc29yIHdoaWNoIGNhbGxzIHBvc3RDb25maWcgb24gb2JqZWN0cyBhZnRlciBjb25maWdQcm9jZXNzb3JzIGFyZSBmaW5pc2hlZFxyXG4gKi9cclxuZXhwb3J0IGNsYXNzIEluc3RhbmNlUG9zdENvbmZpZ1RyaWdnZXIgZXh0ZW5kcyBJbnN0YW5jZVByb2Nlc3NvciB7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBcclxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBpbnN0YW5jZSBcclxuICAgICAqIEByZXR1cm4ge1Byb21pc2V9XHJcbiAgICAgKi9cclxuICAgIHByb2Nlc3MoaW5zdGFuY2UpIHtcclxuICAgICAgICBsZXQgcmVzcG9uc2UgPSBudWxsO1xyXG4gICAgICAgIGlmKGluc3RhbmNlLnBvc3RDb25maWcpIHtcclxuICAgICAgICAgICAgcmVzcG9uc2UgPSBpbnN0YW5jZS5wb3N0Q29uZmlnKCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICghcmVzcG9uc2UpIHtcclxuICAgICAgICAgICAgcmVzcG9uc2UgPSBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpID0+IHsgcmVzb2x2ZSgpOyB9KTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKCFyZXNwb25zZSBpbnN0YW5jZW9mIFByb21pc2UpIHtcclxuICAgICAgICAgICAgdGhyb3cgXCJwb3N0Q29uZmlnKCkgbXVzdCByZXR1cm4gZWl0aGVyIHVuZGVmaW5lZCBvciBudWxsIG9yIGEgUHJvbWlzZVwiXHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiByZXNwb25zZTtcclxuICAgIH1cclxuXHJcbn0iLCJpbXBvcnQgeyBMb2dnZXIsIExpc3QgfSBmcm9tIFwiY29yZXV0aWxfdjFcIjtcclxuaW1wb3J0IHsgQ29uZmlnQWNjZXNzb3IgfSBmcm9tIFwiLi4vY29uZmlnQWNjZXNzb3IuanNcIjtcclxuaW1wb3J0IHsgQ29uZmlnIH0gZnJvbSBcIi4uL2NvbmZpZy5qc1wiO1xyXG5cclxuY29uc3QgTE9HID0gbmV3IExvZ2dlcihcIkluc3RhbmNlUHJvY2Vzc29yRXhlY3V0b3JcIik7XHJcblxyXG4vKipcclxuICogRXhlY3V0ZXMgdGhlIGNvbmZpZ3MgaW5zdGFuY2UgcHJvY2Vzc29ycyBvbiB0aGUgcHJvdmlkZWQgaW5zdGFuY2VcclxuICogUmV0dXJucyBhIHByb21pc2UgZm9yIHdoZW4gdGhlIGluc3RhbmNlIHByb2Nlc3NvcnMgaGFzIGNvbXBsZXRlZCBydW5uaW5nXHJcbiAqIFxyXG4gKiBJbnN0YW5jZSBwcm9jZXNzb3JzIHBlcmZvcm0gb3BlcmF0aW9ucyBvbiBtYW5hZ2VkIGluc3RhbmNlcyBhZnRlciB0aGV5IGhhdmUgYmVlbiBpbnN0YW5zaWF0ZWRcclxuICovXHJcbmV4cG9ydCBjbGFzcyBJbnN0YW5jZVByb2Nlc3NvckV4ZWN1dG9yIHtcclxuXHJcbiAgICAvKipcclxuICAgICAqIEBwYXJhbSB7TGlzdH0gaW5zdGFuY2VQcm9jZXNzb3JMaXN0IHRoZSBpbnN0YW5jZSBwcm9jZXNzb3JzXHJcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gaW5zdGFuY2UgdGhlIGluc3RhbmNlIHRvIHByb2Nlc3NcclxuICAgICAqIEBwYXJhbSB7Q29uZmlnfSBjb25maWdcclxuICAgICAqIEByZXR1cm5zIHtQcm9taXNlfVxyXG4gICAgICovXHJcbiAgICBzdGF0aWMgZXhlY3V0ZShpbnN0YW5jZSwgY29uZmlnKSB7XHJcbiAgICAgICAgcmV0dXJuIGNvbmZpZy5pbnN0YW5jZVByb2Nlc3NvcnMucHJvbWlzZUNoYWluKChwcm9jZXNzb3JOYW1lLCBwYXJlbnQpID0+IHtcclxuICAgICAgICAgICAgY29uc3QgcHJvY2Vzc29ySG9sZGVyID0gQ29uZmlnQWNjZXNzb3IuaW5zdGFuY2VIb2xkZXIocHJvY2Vzc29yTmFtZSwgY29uZmlnKTtcclxuICAgICAgICAgICAgcmV0dXJuIHByb2Nlc3NvckhvbGRlci5pbnN0YW5jZS5wcm9jZXNzKGluc3RhbmNlKTtcclxuICAgICAgICB9LCB0aGlzKTtcclxuICAgIH1cclxuXHJcbn0iLCJpbXBvcnQgeyBUeXBlQ29uZmlnIH0gZnJvbSBcIi4vdHlwZUNvbmZpZy5qc1wiO1xyXG5pbXBvcnQgeyBMb2dnZXIgfSBmcm9tIFwiY29yZXV0aWxfdjFcIjtcclxuaW1wb3J0IHsgSW5zdGFuY2VIb2xkZXIgfSBmcm9tIFwiLi9pbnN0YW5jZUhvbGRlci5qc1wiO1xyXG5cclxuY29uc3QgTE9HID0gbmV3IExvZ2dlcihcIlNpbmdsZXRvbkNvbmZpZ1wiKTtcclxuXHJcbmV4cG9ydCBjbGFzcyBTaW5nbGV0b25Db25maWcgZXh0ZW5kcyBUeXBlQ29uZmlnIHtcclxuXHJcbiAgICBzdGF0aWMgbmFtZWQobmFtZSwgY2xhc3NSZWZlcmVuY2UpIHtcclxuICAgICAgICByZXR1cm4gbmV3IFNpbmdsZXRvbkNvbmZpZyhuYW1lLCBjbGFzc1JlZmVyZW5jZSk7XHJcbiAgICB9XHJcblxyXG4gICAgc3RhdGljIHVubmFtZWQoY2xhc3NSZWZlcmVuY2UpIHtcclxuICAgICAgICByZXR1cm4gbmV3IFNpbmdsZXRvbkNvbmZpZyhjbGFzc1JlZmVyZW5jZS5uYW1lLCBjbGFzc1JlZmVyZW5jZSk7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3RydWN0b3IobmFtZSwgY2xhc3NSZWZlcmVuY2UpIHtcclxuICAgICAgICBzdXBlcihuYW1lLCBjbGFzc1JlZmVyZW5jZSk7XHJcbiAgICB9XHJcblxyXG4gICAgaW5zdGFuY2VIb2xkZXIocGFyYW1ldGVycyA9IFtdKSB7XHJcbiAgICAgICAgaWYgKCF0aGlzLmluc3RhbmNlKSB7XHJcbiAgICAgICAgICAgIGlmKHBhcmFtZXRlcnMgJiYgcGFyYW1ldGVycy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmluc3RhbmNlID0gbmV3IHRoaXMuY2xhc3NSZWZlcmVuY2UoLi4ucGFyYW1ldGVycyk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmluc3RhbmNlID0gbmV3IHRoaXMuY2xhc3NSZWZlcmVuY2UoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gSW5zdGFuY2VIb2xkZXIuaG9sZGVyV2l0aE5ld0luc3RhbmNlKHRoaXMuaW5zdGFuY2UpO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gSW5zdGFuY2VIb2xkZXIuaG9sZGVyV2l0aEV4aXN0aW5nSW5zdGFuY2UodGhpcy5pbnN0YW5jZSk7XHJcbiAgICB9XHJcblxyXG59IiwiaW1wb3J0IHsgUHJvdmlkZXIgfSBmcm9tIFwiLi9hcGkvcHJvdmlkZXIuanNcIjtcclxuaW1wb3J0IHsgVHlwZUNvbmZpZyB9IGZyb20gXCIuL3R5cGVDb25maWcvdHlwZUNvbmZpZy5qc1wiO1xyXG5pbXBvcnQgeyBJbnN0YW5jZUhvbGRlciB9IGZyb20gXCIuL3R5cGVDb25maWcvaW5zdGFuY2VIb2xkZXIuanNcIjtcclxuaW1wb3J0IHsgSW5qZWN0b3IgfSBmcm9tIFwiLi9pbmplY3Rvci5qc1wiO1xyXG5pbXBvcnQgeyBDb25maWcgfSBmcm9tIFwiLi9jb25maWcuanNcIjtcclxuaW1wb3J0IHsgQ29uZmlnQWNjZXNzb3IgfSBmcm9tIFwiLi9jb25maWdBY2Nlc3Nvci5qc1wiO1xyXG5cclxuZXhwb3J0IGNsYXNzIE1pbmRpUHJvdmlkZXIgZXh0ZW5kcyBQcm92aWRlciB7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBcclxuICAgICAqIEBwYXJhbSB7VHlwZUNvbmZpZ30gdHlwZUNvbmZpZyBcclxuICAgICAqIEBwYXJhbSB7SW5qZWN0b3J9IGluamVjdG9yXHJcbiAgICAgKiBAcGFyYW0ge0NvbmZpZ30gY29uZmlnXHJcbiAgICAgKi9cclxuICAgIGNvbnN0cnVjdG9yKHR5cGVDb25maWcsIGluamVjdG9yLCBjb25maWcpIHtcclxuXHJcbiAgICAgICAgc3VwZXIoKTtcclxuXHJcbiAgICAgICAgLyoqIEB0eXBlIHtUeXBlQ29uZmlnfSAqL1xyXG4gICAgICAgIHRoaXMudHlwZUNvbmZpZyA9IHR5cGVDb25maWc7XHJcblxyXG4gICAgICAgIC8qKiBAdHlwZSB7SW5qZWN0b3J9ICovXHJcbiAgICAgICAgdGhpcy5pbmplY3RvciA9IGluamVjdG9yO1xyXG5cclxuICAgICAgICAvKiogQHR5cGUge0NvbmZpZ30gKi9cclxuICAgICAgICB0aGlzLmNvbmZpZyA9IGNvbmZpZztcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIFxyXG4gICAgICogQHBhcmFtIHtBcnJheX0gcGFyYW1ldGVycyBcclxuICAgICAqIEByZXR1cm5zIHtQcm9taXNlfVxyXG4gICAgICovXHJcbiAgICBnZXQocGFyYW1ldGVycyA9IFtdKSB7XHJcbiAgICAgICAgLyoqIEB0eXBlIHtJbnN0YW5jZUhvbGRlcn0gKi9cclxuICAgICAgICBjb25zdCBpbnN0YW5jZUhvbGRlciA9IENvbmZpZ0FjY2Vzc29yLmluc3RhbmNlSG9sZGVyKHRoaXMudHlwZUNvbmZpZy5uYW1lLCB0aGlzLmNvbmZpZywgcGFyYW1ldGVycyk7XHJcbiAgICAgICAgaWYgKGluc3RhbmNlSG9sZGVyLnR5cGUgPT09IEluc3RhbmNlSG9sZGVyLk5FV19JTlNUQU5DRSkge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5pbmplY3Rvci5pbmplY3RUYXJnZXQoaW5zdGFuY2VIb2xkZXIuaW5zdGFuY2UsIHRoaXMuY29uZmlnKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShpbnN0YW5jZUhvbGRlci5pbnN0YW5jZSk7XHJcbiAgICB9XHJcblxyXG59IiwiaW1wb3J0IHsgTGlzdCwgTG9nZ2VyIH0gZnJvbSBcImNvcmV1dGlsX3YxXCI7XHJcbmltcG9ydCB7IENvbmZpZyB9IGZyb20gXCIuL2NvbmZpZy5qc1wiO1xyXG5pbXBvcnQgeyBDb25maWdBY2Nlc3NvciB9IGZyb20gXCIuL2NvbmZpZ0FjY2Vzc29yLmpzXCI7XHJcbmltcG9ydCB7IEluamVjdGlvblBvaW50IH0gZnJvbSBcIi4vYXBpL2luamVjdGlvblBvaW50LmpzXCJcclxuaW1wb3J0IHsgSW5zdGFuY2VQcm9jZXNzb3JFeGVjdXRvciB9IGZyb20gXCIuL2luc3RhbmNlUHJvY2Vzc29yL2luc3RhbmNlUHJvY2Vzc29yRXhlY3V0b3IuanNcIjtcclxuaW1wb3J0IHsgSW5zdGFuY2VIb2xkZXIgfSBmcm9tIFwiLi90eXBlQ29uZmlnL2luc3RhbmNlSG9sZGVyLmpzXCI7XHJcbmltcG9ydCB7IE1pbmRpUHJvdmlkZXIgfSBmcm9tIFwiLi9taW5kaVByb3ZpZGVyLmpzXCI7XHJcbmltcG9ydCB7IEluamVjdG9yIH0gZnJvbSBcIi4vaW5qZWN0b3IuanNcIjtcclxuXHJcbmNvbnN0IExPRyA9IG5ldyBMb2dnZXIoXCJNaW5kaUluamVjdG9yXCIpO1xyXG5cclxuZXhwb3J0IGNsYXNzIE1pbmRpSW5qZWN0b3IgZXh0ZW5kcyBJbmplY3RvciB7XHJcblxyXG4gICAgc3RhdGljIGluamVjdCh0YXJnZXQsIGNvbmZpZykge1xyXG4gICAgICAgIHJldHVybiBJTkpFQ1RPUi5pbmplY3RUYXJnZXQodGFyZ2V0LCBjb25maWcpO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQHJldHVybnMge01pbmRpSW5qZWN0b3J9XHJcbiAgICAgKi9cclxuICAgIHN0YXRpYyBnZXRJbnN0YW5jZSgpIHtcclxuICAgICAgICByZXR1cm4gSU5KRUNUT1I7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBIZWxwZXIgbWV0aG9kIGZvciBpbmplY3RpbmcgZmllbGRzIGluIHRhcmdldCBvYmplY3RcclxuICAgICAqIFxyXG4gICAgICogQHBhcmFtIHthbnl9IHRhcmdldE9iamVjdCBcclxuICAgICAqIEBwYXJhbSB7Q29uZmlnfSBjb25maWcgXHJcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gZGVwdGhcclxuICAgICAqIEByZXR1cm5zIHtQcm9taXNlfVxyXG4gICAgICovXHJcbiAgICBpbmplY3RUYXJnZXQodGFyZ2V0T2JqZWN0LCBjb25maWcsIGRlcHRoID0gMCkge1xyXG4gICAgICAgIGlmICghdGFyZ2V0T2JqZWN0KSB7XHJcbiAgICAgICAgICAgIHRocm93IEVycm9yKFwiTWlzc2luZyB0YXJnZXQgb2JqZWN0XCIpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoIWNvbmZpZykge1xyXG4gICAgICAgICAgICB0aHJvdyBFcnJvcihcIk1pc3NpbmcgY29uZmlnXCIpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoIWNvbmZpZy5pc0ZpbmFsaXplZCgpKSB7XHJcbiAgICAgICAgICAgIHRocm93IEVycm9yKFwiQ29uZmlnIG5vdCBmaW5hbGl6ZWRcIik7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChkZXB0aCA+IDEwKSB7XHJcbiAgICAgICAgICAgIHRocm93IEVycm9yKFwiSW5qZWN0aW9uIHN0cnVjdHVyZSB0b28gZGVlcFwiKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgY29uc3QgaW5qZWN0b3IgPSB0aGlzO1xyXG4gICAgICAgIGNvbnN0IG9iamVjdEZpZWxkTmFtZXMgPSBuZXcgTGlzdChPYmplY3Qua2V5cyh0YXJnZXRPYmplY3QpKTtcclxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xyXG4gICAgICAgICAgICByZXR1cm4gb2JqZWN0RmllbGROYW1lcy5wcm9taXNlQ2hhaW4oKGZpZWxkTmFtZSwgcGFyZW50KSA9PiB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gTWluZGlJbmplY3Rvci5pbmplY3RQcm9wZXJ0eSh0YXJnZXRPYmplY3QsIGZpZWxkTmFtZSwgY29uZmlnLCBkZXB0aCwgaW5qZWN0b3IpO1xyXG4gICAgICAgICAgICB9KS50aGVuKCgpID0+IHtcclxuICAgICAgICAgICAgICAgIEluc3RhbmNlUHJvY2Vzc29yRXhlY3V0b3IuZXhlY3V0ZSh0YXJnZXRPYmplY3QsIGNvbmZpZykudGhlbigoKSA9PntcclxuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHRhcmdldE9iamVjdCk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSlcclxuXHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gdGFyZ2V0T2JqZWN0IFxyXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IGZpZWxkTmFtZSBcclxuICAgICAqIEBwYXJhbSB7Q29uZmlnfSBjb25maWcgXHJcbiAgICAgKiBAcGFyYW0ge051bWJlcn0gZGVwdGggXHJcbiAgICAgKiBAcGFyYW0ge0luamVjdG9yfSBpbmplY3RvclxyXG4gICAgICogQHJldHVybnMge1Byb21pc2V9XHJcbiAgICAgKi9cclxuICAgIHN0YXRpYyBpbmplY3RQcm9wZXJ0eSh0YXJnZXRPYmplY3QsIGZpZWxkTmFtZSwgY29uZmlnLCBkZXB0aCwgaW5qZWN0b3IpIHtcclxuICAgICAgICBjb25zdCBpbmplY3Rpb25Qb2ludCA9IHRhcmdldE9iamVjdFtmaWVsZE5hbWVdOyAgICAgICAgXHJcbiAgICAgICAgaWYoIShpbmplY3Rpb25Qb2ludCBpbnN0YW5jZW9mIEluamVjdGlvblBvaW50KSkge1xyXG4gICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChpbmplY3Rpb25Qb2ludC50eXBlID09PSBJbmplY3Rpb25Qb2ludC5QUk9WSURFUl9UWVBFKSB7XHJcbiAgICAgICAgICAgIE1pbmRpSW5qZWN0b3IuaW5qZWN0UHJvcGVydHlQcm92aWRlcih0YXJnZXRPYmplY3QsIGZpZWxkTmFtZSwgY29uZmlnLCBpbmplY3Rvcik7XHJcbiAgICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIE1pbmRpSW5qZWN0b3IuaW5qZWN0UHJvcGVydHlJbnN0YW5jZSh0YXJnZXRPYmplY3QsIGZpZWxkTmFtZSwgY29uZmlnLCBkZXB0aCwgaW5qZWN0b3IpO1xyXG4gICAgICAgIFxyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHRhcmdldE9iamVjdCBcclxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWVsZE5hbWUgXHJcbiAgICAgKiBAcGFyYW0ge0NvbmZpZ30gY29uZmlnIFxyXG4gICAgICogQHBhcmFtIHtJbmplY3Rvcn0gaW5qZWN0b3JcclxuICAgICAqL1xyXG4gICAgc3RhdGljIGluamVjdFByb3BlcnR5UHJvdmlkZXIodGFyZ2V0T2JqZWN0LCBmaWVsZE5hbWUsIGNvbmZpZywgaW5qZWN0b3IpIHtcclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBAdHlwZSB7SW5qZWN0aW9uUG9pbnR9XHJcbiAgICAgICAgICovXHJcbiAgICAgICAgY29uc3QgaW5qZWN0aW9uUG9pbnQgPSB0YXJnZXRPYmplY3RbZmllbGROYW1lXTtcclxuICAgICAgICBjb25zdCB0eXBlQ29uZmlnID0gQ29uZmlnQWNjZXNzb3IudHlwZUNvbmZpZ0J5TmFtZShpbmplY3Rpb25Qb2ludC5uYW1lLCBjb25maWcpO1xyXG4gICAgICAgIHRhcmdldE9iamVjdFtmaWVsZE5hbWVdID0gbmV3IE1pbmRpUHJvdmlkZXIodHlwZUNvbmZpZywgaW5qZWN0b3IsIGNvbmZpZyk7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gdGFyZ2V0T2JqZWN0IFxyXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpZWxkTmFtZSBcclxuICAgICAqIEBwYXJhbSB7Q29uZmlnfSBjb25maWcgXHJcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gZGVwdGggXHJcbiAgICAgKiBAcGFyYW0ge0luamVjdG9yfSBpbmplY3RvclxyXG4gICAgICogQHJldHVybnMge1Byb21pc2V9XHJcbiAgICAgKi9cclxuICAgIHN0YXRpYyBpbmplY3RQcm9wZXJ0eUluc3RhbmNlKHRhcmdldE9iamVjdCwgZmllbGROYW1lLCBjb25maWcsIGRlcHRoLCBpbmplY3Rvcikge1xyXG4gICAgICAgIGxldCBpbmplY3RQcm9taXNlID0gUHJvbWlzZS5yZXNvbHZlKCk7XHJcbiAgICAgICAgLyoqIEB0eXBlIHtJbmplY3Rpb25Qb2ludH0gKi9cclxuICAgICAgICBjb25zdCBpbmplY3Rpb25Qb2ludCA9IHRhcmdldE9iamVjdFtmaWVsZE5hbWVdO1xyXG4gICAgICAgIGNvbnN0IGluc3RhbmNlSG9sZGVyID0gQ29uZmlnQWNjZXNzb3IuaW5zdGFuY2VIb2xkZXIoaW5qZWN0aW9uUG9pbnQubmFtZSwgY29uZmlnLCBpbmplY3Rpb25Qb2ludC5wYXJhbWV0ZXJzKTtcclxuICAgICAgICBpZiAoaW5zdGFuY2VIb2xkZXIudHlwZSA9PT0gSW5zdGFuY2VIb2xkZXIuTkVXX0lOU1RBTkNFKSB7XHJcbiAgICAgICAgICAgIGluamVjdFByb21pc2UgPSBpbmplY3Rvci5pbmplY3RUYXJnZXQoaW5zdGFuY2VIb2xkZXIuaW5zdGFuY2UsIGNvbmZpZywgZGVwdGgrKyk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRhcmdldE9iamVjdFtmaWVsZE5hbWVdID0gaW5zdGFuY2VIb2xkZXIuaW5zdGFuY2U7XHJcbiAgICAgICAgcmV0dXJuIGluamVjdFByb21pc2U7XHJcbiAgICB9XHJcblxyXG59XHJcblxyXG5jb25zdCBJTkpFQ1RPUiA9IG5ldyBNaW5kaUluamVjdG9yKCk7IiwiaW1wb3J0IHsgTWFwLCBMaXN0LCBMb2dnZXIgfSBmcm9tIFwiY29yZXV0aWxfdjFcIjtcclxuaW1wb3J0IHsgVHlwZUNvbmZpZyB9IGZyb20gXCIuL3R5cGVDb25maWcvdHlwZUNvbmZpZy5qc1wiO1xyXG5pbXBvcnQgeyBDb25maWdQcm9jZXNzb3JFeGVjdXRvciB9IGZyb20gXCIuL2NvbmZpZ1Byb2Nlc3Nvci9jb25maWdQcm9jZXNzb3JFeGVjdXRvci5qc1wiO1xyXG5pbXBvcnQgeyBTaW5nbGV0b25Db25maWcgfSBmcm9tIFwiLi90eXBlQ29uZmlnL3NpbmdsZXRvbkNvbmZpZy5qc1wiO1xyXG5pbXBvcnQgeyBDb25maWcgfSBmcm9tIFwiLi9jb25maWcuanNcIjtcclxuaW1wb3J0IHsgTWluZGlJbmplY3RvciB9IGZyb20gXCIuL21pbmRpSW5qZWN0b3IuanNcIjtcclxuaW1wb3J0IHsgSW5zdGFuY2VQcm9jZXNzb3IgfSBmcm9tIFwiLi9pbnN0YW5jZVByb2Nlc3Nvci9pbnN0YW5jZVByb2Nlc3Nvci5qc1wiO1xyXG5pbXBvcnQgeyBDb25maWdQcm9jZXNzb3IgfSBmcm9tIFwiLi9jb25maWdQcm9jZXNzb3IvY29uZmlnUHJvY2Vzc29yLmpzXCI7XHJcblxyXG5jb25zdCBMT0cgPSBuZXcgTG9nZ2VyKFwiQ29uZmlnXCIpO1xyXG5cclxuZXhwb3J0IGNsYXNzIE1pbmRpQ29uZmlnIGV4dGVuZHMgQ29uZmlnIHtcclxuXHJcbiAgICBjb25zdHJ1Y3RvcigpIHtcclxuICAgICAgICBzdXBlcigpO1xyXG4gICAgICAgIHRoaXMuZmluYWxpemVkID0gZmFsc2U7XHJcbiAgICAgICAgLyoqIEB0eXBlIHtNYXB9ICovXHJcbiAgICAgICAgdGhpcy5jb25maWdFbnRyaWVzID0gbmV3IE1hcCgpO1xyXG4gICAgICAgIHRoaXMuY29uZmlnUHJvY2Vzc29ycyA9IG5ldyBMaXN0KCk7XHJcbiAgICAgICAgdGhpcy5pbnN0YW5jZVByb2Nlc3NvcnMgPSBuZXcgTGlzdCgpO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogXHJcbiAgICAgKiBAcGFyYW0ge0NvbmZpZ30gY29uZmlnXHJcbiAgICAgKiBAcmV0dXJucyB7TWluZGlDb25maWd9XHJcbiAgICAgKi9cclxuICAgIG1lcmdlKGNvbmZpZykge1xyXG4gICAgICAgIHRoaXMuZmluYWxpemVkID0gdHJ1ZTtcclxuICAgICAgICBjb25zdCBuZXdDb25maWdFbnRyaWVzID0gbmV3IE1hcCgpO1xyXG4gICAgICAgIG5ld0NvbmZpZ0VudHJpZXMuYWRkQWxsKHRoaXMuY29uZmlnRW50cmllcyk7XHJcbiAgICAgICAgbmV3Q29uZmlnRW50cmllcy5hZGRBbGwoY29uZmlnLmNvbmZpZ0VudHJpZXMpO1xyXG5cclxuICAgICAgICBjb25zdCBuZXdDb25maWdQcm9jZXNzb3JzID0gbmV3IExpc3QoKTtcclxuICAgICAgICBuZXdDb25maWdQcm9jZXNzb3JzLmFkZEFsbCh0aGlzLmNvbmZpZ1Byb2Nlc3NvcnMpO1xyXG4gICAgICAgIG5ld0NvbmZpZ1Byb2Nlc3NvcnMuYWRkQWxsKGNvbmZpZy5jb25maWdQcm9jZXNzb3JzKTtcclxuXHJcbiAgICAgICAgY29uc3QgbmV3SW5zdGFuY2VQcm9jZXNzb3JzID0gbmV3IExpc3QoKTtcclxuICAgICAgICBuZXdJbnN0YW5jZVByb2Nlc3NvcnMuYWRkQWxsKHRoaXMuaW5zdGFuY2VQcm9jZXNzb3JzKTtcclxuICAgICAgICBuZXdJbnN0YW5jZVByb2Nlc3NvcnMuYWRkQWxsKGNvbmZpZy5pbnN0YW5jZVByb2Nlc3NvcnMpO1xyXG5cclxuICAgICAgICAvKiogQHR5cGUge01hcH0gKi9cclxuICAgICAgICB0aGlzLmNvbmZpZ0VudHJpZXMgPSBuZXdDb25maWdFbnRyaWVzO1xyXG4gICAgICAgIHRoaXMuY29uZmlnUHJvY2Vzc29ycyA9IG5ld0NvbmZpZ1Byb2Nlc3NvcnM7XHJcbiAgICAgICAgdGhpcy5pbnN0YW5jZVByb2Nlc3NvcnMgPSBuZXdJbnN0YW5jZVByb2Nlc3NvcnM7XHJcblxyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogXHJcbiAgICAgKiBAcGFyYW0ge1R5cGVDb25maWd9IHR5cGVDb25maWdcclxuICAgICAqIEByZXR1cm5zIHtNaW5kaUNvbmZpZ31cclxuICAgICAqL1xyXG4gICAgYWRkVHlwZUNvbmZpZyh0eXBlQ29uZmlnKSB7XHJcbiAgICAgICAgdGhpcy5maW5hbGl6ZWQgPSBmYWxzZTtcclxuICAgICAgICB0aGlzLmNvbmZpZ0VudHJpZXMuc2V0KHR5cGVDb25maWcubmFtZSwgdHlwZUNvbmZpZyk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBcclxuICAgICAqIEBwYXJhbSB7Q29uZmlnUHJvY2Vzc29yfSBjb25maWdQcm9jZXNzb3JcclxuICAgICAqIEByZXR1cm5zIHtNaW5kaUNvbmZpZ31cclxuICAgICAqL1xyXG4gICAgYWRkQ29uZmlnUHJvY2Vzc29yKGNvbmZpZ1Byb2Nlc3Nvcikge1xyXG4gICAgICAgIHRoaXMuY29uZmlnUHJvY2Vzc29ycy5hZGQoY29uZmlnUHJvY2Vzc29yLm5hbWUpO1xyXG4gICAgICAgIHJldHVybiB0aGlzLmFkZFR5cGVDb25maWcoU2luZ2xldG9uQ29uZmlnLnVubmFtZWQoY29uZmlnUHJvY2Vzc29yKSk7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBcclxuICAgICAqIEBwYXJhbSB7SW5zdGFuY2VQcm9jZXNzb3J9IGluc3RhbmNlUHJvY2Vzc29yXHJcbiAgICAgKiBAcmV0dXJucyB7TWluZGlDb25maWd9XHJcbiAgICAgKi9cclxuICAgIGFkZEluc3RhbmNlUHJvY2Vzc29yKGluc3RhbmNlUHJvY2Vzc29yKSB7XHJcbiAgICAgICAgdGhpcy5pbnN0YW5jZVByb2Nlc3NvcnMuYWRkKGluc3RhbmNlUHJvY2Vzc29yLm5hbWUpO1xyXG4gICAgICAgIHJldHVybiB0aGlzLmFkZFR5cGVDb25maWcoU2luZ2xldG9uQ29uZmlnLnVubmFtZWQoaW5zdGFuY2VQcm9jZXNzb3IpKTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIFxyXG4gICAgICogQHBhcmFtIHtMaXN0fSB0eXBlQ29uZmlnTGlzdFxyXG4gICAgICogQHJldHVybiB7TWluZGlDb25maWd9XHJcbiAgICAgKi9cclxuICAgIGFkZEFsbFR5cGVDb25maWcodHlwZUNvbmZpZ0xpc3QpIHtcclxuICAgICAgICB0aGlzLmZpbmFsaXplZCA9IGZhbHNlO1xyXG4gICAgICAgIHR5cGVDb25maWdMaXN0LmZvckVhY2goKHR5cGVDb25maWcscGFyZW50KSA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMuY29uZmlnRW50cmllcy5zZXQodHlwZUNvbmZpZy5uYW1lLCB0eXBlQ29uZmlnKTtcclxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgfSwgdGhpcyk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBcclxuICAgICAqIEBwYXJhbSB7TGlzdH0gY29uZmlnUHJvY2Vzc29yTGlzdFxyXG4gICAgICogQHJldHVybiB7TWluZGlDb25maWd9XHJcbiAgICAgKi9cclxuICAgIGFkZEFsbENvbmZpZ1Byb2Nlc3Nvcihjb25maWdQcm9jZXNzb3JMaXN0KSB7XHJcbiAgICAgICAgY29uZmlnUHJvY2Vzc29yTGlzdC5mb3JFYWNoKChjb25maWdQcm9jZXNzb3IscGFyZW50KSA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMuY29uZmlnUHJvY2Vzc29ycy5hZGQoY29uZmlnUHJvY2Vzc29yLm5hbWUpO1xyXG4gICAgICAgICAgICB0aGlzLmFkZFR5cGVDb25maWcoU2luZ2xldG9uQ29uZmlnLnVubmFtZWQoY29uZmlnUHJvY2Vzc29yKSk7XHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgIH0sIHRoaXMpO1xyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogXHJcbiAgICAgKiBAcGFyYW0ge0xpc3R9IGluc3RhbmNlUHJvY2Vzc29yTGlzdCBcclxuICAgICAqIEByZXR1cm4ge01pbmRpQ29uZmlnfVxyXG4gICAgICovXHJcbiAgICBhZGRBbGxJbnN0YW5jZVByb2Nlc3NvcihpbnN0YW5jZVByb2Nlc3Nvckxpc3QpIHtcclxuICAgICAgICBpbnN0YW5jZVByb2Nlc3Nvckxpc3QuZm9yRWFjaCgoaW5zdGFuY2VQcm9jZXNzb3IscGFyZW50KSA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMuaW5zdGFuY2VQcm9jZXNzb3JzLmFkZChpbnN0YW5jZVByb2Nlc3Nvci5uYW1lKTtcclxuICAgICAgICAgICAgdGhpcy5hZGRUeXBlQ29uZmlnKFNpbmdsZXRvbkNvbmZpZy51bm5hbWVkKGluc3RhbmNlUHJvY2Vzc29yKSk7XHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgIH0sIHRoaXMpO1xyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQHJldHVybnMge0Jvb2xlYW59XHJcbiAgICAgKi9cclxuICAgIGlzRmluYWxpemVkKCkge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmZpbmFsaXplZDtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIEByZXR1cm5zIHtQcm9taXNlfVxyXG4gICAgICovXHJcbiAgICBmaW5hbGl6ZSgpIHtcclxuICAgICAgICB0aGlzLmZpbmFsaXplZCA9IHRydWU7XHJcbiAgICAgICAgcmV0dXJuIENvbmZpZ1Byb2Nlc3NvckV4ZWN1dG9yLmV4ZWN1dGUodGhpcy5jb25maWdQcm9jZXNzb3JzLCBNaW5kaUluamVjdG9yLmdldEluc3RhbmNlKCksIHRoaXMpO1xyXG4gICAgfVxyXG5cclxufSIsImltcG9ydCB7IFR5cGVDb25maWcgfSBmcm9tIFwiLi90eXBlQ29uZmlnLmpzXCI7XHJcblxyXG5leHBvcnQgY2xhc3MgUG9vbENvbmZpZyBleHRlbmRzIFR5cGVDb25maWcge1xyXG5cclxuICAgIHN0YXRpYyBuYW1lZChuYW1lLCBjbGFzc1JlZmVyZW5jZSwgcG9vbFNpemUpIHtcclxuICAgICAgICByZXR1cm4gbmV3IFBvb2xDb25maWcobmFtZSwgY2xhc3NSZWZlcmVuY2UsIHBvb2xTaXplKTtcclxuICAgIH1cclxuXHJcbiAgICBzdGF0aWMgdW5uYW1lZChjbGFzc1JlZmVyZW5jZSwgcG9vbFNpemUpIHtcclxuICAgICAgICByZXR1cm4gbmV3IFBvb2xDb25maWcoY2xhc3NSZWZlcmVuY2UubmFtZSwgY2xhc3NSZWZlcmVuY2UsIHBvb2xTaXplKTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdHJ1Y3RvcihuYW1lLCBjbGFzc1JlZmVyZW5jZSwgcG9vbFNpemUpIHtcclxuICAgICAgICBzdXBlcihuYW1lLCBjbGFzc1JlZmVyZW5jZSk7XHJcbiAgICAgICAgdGhpcy5wb29sU2l6ZSA9IHBvb2xTaXplO1xyXG4gICAgfVxyXG5cclxuICAgIGluc3RhbmNlSG9sZGVyKHBhcmFtZXRlcnMgPSBbXSkge1xyXG5cclxuICAgIH1cclxuXHJcbn0iLCJpbXBvcnQgeyBUeXBlQ29uZmlnIH0gZnJvbSBcIi4vdHlwZUNvbmZpZy5qc1wiO1xyXG5pbXBvcnQgeyBJbnN0YW5jZUhvbGRlciB9IGZyb20gXCIuL2luc3RhbmNlSG9sZGVyLmpzXCI7XHJcblxyXG5leHBvcnQgY2xhc3MgUHJvdG90eXBlQ29uZmlnIGV4dGVuZHMgVHlwZUNvbmZpZyB7XHJcblxyXG4gICAgc3RhdGljIG5hbWVkKG5hbWUsIGNsYXNzUmVmZXJlbmNlKSB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBQcm90b3R5cGVDb25maWcobmFtZSwgY2xhc3NSZWZlcmVuY2UpO1xyXG4gICAgfVxyXG5cclxuICAgIHN0YXRpYyB1bm5hbWVkKGNsYXNzUmVmZXJlbmNlKSB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBQcm90b3R5cGVDb25maWcoY2xhc3NSZWZlcmVuY2UubmFtZSwgY2xhc3NSZWZlcmVuY2UpO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0cnVjdG9yKG5hbWUsIGNsYXNzUmVmZXJlbmNlKSB7XHJcbiAgICAgICAgc3VwZXIobmFtZSwgY2xhc3NSZWZlcmVuY2UpO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQHBhcmFtIHthcnJheX0gcGFyYW1ldGVycyB0aGUgcGFyYW1ldGVycyB0byB1c2UgZm9yIHRoZSBjb25zdHJ1Y3RvclxyXG4gICAgICovXHJcbiAgICBpbnN0YW5jZUhvbGRlcihwYXJhbWV0ZXJzID0gW10pIHtcclxuICAgICAgICBsZXQgaW5zdGFuY2UgPSBudWxsO1xyXG4gICAgICAgIGlmKHBhcmFtZXRlcnMgJiYgcGFyYW1ldGVycy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgIGluc3RhbmNlID0gbmV3IHRoaXMuY2xhc3NSZWZlcmVuY2UoLi4ucGFyYW1ldGVycyk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgaW5zdGFuY2UgPSBuZXcgdGhpcy5jbGFzc1JlZmVyZW5jZSgpO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gSW5zdGFuY2VIb2xkZXIuaG9sZGVyV2l0aE5ld0luc3RhbmNlKGluc3RhbmNlKTtcclxuICAgIH1cclxuXHJcblxyXG59Il0sIm5hbWVzIjpbIkxPRyJdLCJtYXBwaW5ncyI6Ijs7QUFFQSxNQUFNLEdBQUcsR0FBRyxJQUFJLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQzs7QUFFbkMsTUFBYSxRQUFRLENBQUM7Ozs7Ozs7SUFPbEIsR0FBRyxDQUFDLFVBQVUsR0FBRyxFQUFFLEVBQUU7UUFDakIsT0FBTyxJQUFJLENBQUM7S0FDZjs7OztDQUVKLEtDYlksY0FBYyxDQUFDOztJQUV4QixXQUFXLGFBQWEsR0FBRyxFQUFFLE9BQU8sQ0FBQyxDQUFDLEVBQUU7SUFDeEMsV0FBVyxhQUFhLEdBQUcsRUFBRSxPQUFPLENBQUMsQ0FBQyxFQUFFOzs7Ozs7Ozs7SUFTeEMsT0FBTyxjQUFjLENBQUMsSUFBSSxFQUFFLGNBQWMsRUFBRSxVQUFVLEdBQUcsRUFBRSxFQUFFO1FBQ3pELE9BQU8sSUFBSSxjQUFjLENBQUMsSUFBSSxFQUFFLGNBQWMsRUFBRSxjQUFjLENBQUMsYUFBYSxFQUFFLFVBQVUsQ0FBQyxDQUFDO0tBQzdGOzs7Ozs7OztJQVFELE9BQU8sUUFBUSxDQUFDLGNBQWMsRUFB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
