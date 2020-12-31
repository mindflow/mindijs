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

                let targetInjectedPromise = new Promise((resolveTargetInjected, reject) => {resolveTargetInjected();});

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

    static prepareUnconfiguredConfigEntries(configEntries) {
        const unconfiguredConfigEntries = new Map();

        configEntries.forEach((key, value, parent) => {

            /**
             * @type {TypeConfig}
             */
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

const LOG$3 = new Logger("InstancePostConfigTrigger");

/**
 * Instance processor which calls postConfig on objects after configProcessors are finished
 */
class InstancePostConfigTrigger {

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
        return new Promise((resolve, reject) => { resolve(instanceHolder.instance);});    }

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
     * @param {object} targetObject 
     * @param {string} fieldName 
     * @param {Config} config 
     * @param {number} depth 
     * @param {Injector} injector
     * @returns {Promise}
     */
    static injectProperty(targetObject, fieldName, config, depth, injector) {
        const injectionPoint = targetObject[fieldName];        
        if(injectionPoint instanceof InjectionPoint) {
            if (injectionPoint.type === InjectionPoint.PROVIDER_TYPE) {
                MindiInjector.injectPropertyProvider(targetObject, fieldName, config, injector);
                return new Promise((resolve, reject) => { resolve(); });
            }
            return MindiInjector.injectPropertyInstance(targetObject, fieldName, config, depth, injector);
        }
        return new Promise((resolve, reject) => { resolve(); })
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
     */
    static injectPropertyInstance(targetObject, fieldName, config, depth, injector) {
        let injectPromise = new Promise((resolve, reject) => { resolve(); });
        /** @type {InjectionPoint} */
        const injectionPoint = targetObject[fieldName];
        const instanceHolder = ConfigAccessor.instanceHolder(injectionPoint.name, config, injectionPoint.parameters);
        if(instanceHolder.type === InstanceHolder.NEW_INSTANCE) {
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
     */
    addTypeConfig(typeConfig) {
        this.finalized = false;
        this.configEntries.set(typeConfig.name, typeConfig);
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
        this.finalized = false;
        typeConfigList.forEach((typeConfig,parent) => {
            this.configEntries.set(typeConfig.name, typeConfig);
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

export { Config, ConfigAccessor, ConfigProcessorExecutor, InjectionPoint, Injector, InstanceHolder, InstancePostConfigTrigger, InstanceProcessorExecutor, MindiConfig, MindiInjector, MindiProvider, PoolConfig, PrototypeConfig, Provider, SingletonConfig, TypeConfig };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWluZGlfdjEuanMiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9taW5kaS9hcGkvcHJvdmlkZXIuanMiLCIuLi8uLi9zcmMvbWluZGkvYXBpL2luamVjdGlvblBvaW50LmpzIiwiLi4vLi4vc3JjL21pbmRpL2NvbmZpZy5qcyIsIi4uLy4uL3NyYy9taW5kaS90eXBlQ29uZmlnL2luc3RhbmNlSG9sZGVyLmpzIiwiLi4vLi4vc3JjL21pbmRpL3R5cGVDb25maWcvdHlwZUNvbmZpZy5qcyIsIi4uLy4uL3NyYy9taW5kaS9jb25maWdBY2Nlc3Nvci5qcyIsIi4uLy4uL3NyYy9taW5kaS9pbmplY3Rvci5qcyIsIi4uLy4uL3NyYy9taW5kaS9jb25maWdQcm9jZXNzb3IvY29uZmlnUHJvY2Vzc29yRXhlY3V0b3IuanMiLCIuLi8uLi9zcmMvbWluZGkvaW5zdGFuY2VQcm9jZXNzb3IvaW5zdGFuY2VQb3N0Q29uZmlnVHJpZ2dlci5qcyIsIi4uLy4uL3NyYy9taW5kaS9pbnN0YW5jZVByb2Nlc3Nvci9pbnN0YW5jZVByb2Nlc3NvckV4ZWN1dG9yLmpzIiwiLi4vLi4vc3JjL21pbmRpL3R5cGVDb25maWcvc2luZ2xldG9uQ29uZmlnLmpzIiwiLi4vLi4vc3JjL21pbmRpL21pbmRpUHJvdmlkZXIuanMiLCIuLi8uLi9zcmMvbWluZGkvbWluZGlJbmplY3Rvci5qcyIsIi4uLy4uL3NyYy9taW5kaS9taW5kaUNvbmZpZy5qcyIsIi4uLy4uL3NyYy9taW5kaS90eXBlQ29uZmlnL3Bvb2xDb25maWcuanMiLCIuLi8uLi9zcmMvbWluZGkvdHlwZUNvbmZpZy9wcm90b3R5cGVDb25maWcuanMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTG9nZ2VyIH0gZnJvbSBcImNvcmV1dGlsX3YxXCI7XHJcblxyXG5jb25zdCBMT0cgPSBuZXcgTG9nZ2VyKFwiUHJvdmlkZXJcIik7XHJcblxyXG5leHBvcnQgY2xhc3MgUHJvdmlkZXIge1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogXHJcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBwYXJhbWV0ZXJzIFxyXG4gICAgICogQHJldHVybnMge1Byb21pc2V9XHJcbiAgICAgKi9cclxuICAgIGdldChwYXJhbWV0ZXJzID0gW10pIHtcclxuICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgIH1cclxuXHJcbn0iLCJpbXBvcnQgeyBQcm92aWRlciB9IGZyb20gXCIuL3Byb3ZpZGVyLmpzXCI7XHJcblxyXG5leHBvcnQgY2xhc3MgSW5qZWN0aW9uUG9pbnQge1xyXG5cclxuICAgIHN0YXRpYyBnZXQgSU5TVEFOQ0VfVFlQRSgpIHsgcmV0dXJuIDA7IH0gXHJcbiAgICBzdGF0aWMgZ2V0IFBST1ZJREVSX1RZUEUoKSB7IHJldHVybiAxOyB9IFxyXG5cclxuICAgIC8qKlxyXG4gICAgICogXHJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbmFtZSBcclxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNsYXNzUmVmZXJlbmNlIFxyXG4gICAgICogQHBhcmFtIHthcnJheX0gcGFyYW1ldGVycyBcclxuICAgICAqIEByZXR1cm5zIHtvYmplY3R9XHJcbiAgICAgKi9cclxuICAgIHN0YXRpYyBpbnN0YW5jZUJ5TmFtZShuYW1lLCBjbGFzc1JlZmVyZW5jZSwgcGFyYW1ldGVycyA9IFtdKSB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBJbmplY3Rpb25Qb2ludChuYW1lLCBjbGFzc1JlZmVyZW5jZSwgSW5qZWN0aW9uUG9pbnQuSU5TVEFOQ0VfVFlQRSwgcGFyYW1ldGVycyk7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBcclxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNsYXNzUmVmZXJlbmNlIFxyXG4gICAgICogQHBhcmFtIHthcnJheX0gcGFyYW1ldGVycyBcclxuICAgICAqIEByZXR1cm5zIHtvYmplY3R9XHJcbiAgICAgKi9cclxuICAgIHN0YXRpYyBpbnN0YW5jZShjbGFzc1JlZmVyZW5jZSwgcGFyYW1ldGVycyA9IFtdKSB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBJbmplY3Rpb25Qb2ludChjbGFzc1JlZmVyZW5jZS5uYW1lLCBjbGFzc1JlZmVyZW5jZSwgSW5qZWN0aW9uUG9pbnQuSU5TVEFOQ0VfVFlQRSwgcGFyYW1ldGVycyk7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBcclxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBuYW1lIFxyXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2xhc3NSZWZlcmVuY2UgXHJcbiAgICAgKiBAcmV0dXJucyB7UHJvdmlkZXJ9XHJcbiAgICAgKi9cclxuICAgIHN0YXRpYyBwcm92aWRlckJ5TmFtZShuYW1lLCBjbGFzc1JlZmVyZW5jZSkge1xyXG4gICAgICAgIHJldHVybiBuZXcgSW5qZWN0aW9uUG9pbnQobmFtZSwgY2xhc3NSZWZlcmVuY2UsIEluamVjdGlvblBvaW50LlBST1ZJREVSX1RZUEUpO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogXHJcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjbGFzc1JlZmVyZW5jZSBcclxuICAgICAqIEByZXR1cm5zIHtQcm92aWRlcn1cclxuICAgICAqL1xyXG4gICAgc3RhdGljIHByb3ZpZGVyKGNsYXNzUmVmZXJlbmNlKSB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBJbmplY3Rpb25Qb2ludChjbGFzc1JlZmVyZW5jZS5uYW1lLCBjbGFzc1JlZmVyZW5jZSwgSW5qZWN0aW9uUG9pbnQuUFJPVklERVJfVFlQRSk7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3RydWN0b3IobmFtZSwgY2xhc3NSZWZlcmVuY2UsIHR5cGUgPSBJbmplY3Rpb25Qb2ludC5JTlNUQU5DRV9UWVBFLCBwYXJhbWV0ZXJzID0gbnVsbCkge1xyXG4gICAgICAgIHRoaXMubmFtZSA9IG5hbWU7XHJcbiAgICAgICAgdGhpcy5jbGFzc1JlZmVyZW5jZSA9IGNsYXNzUmVmZXJlbmNlO1xyXG4gICAgICAgIHRoaXMudHlwZSA9IHR5cGU7XHJcbiAgICAgICAgdGhpcy5wYXJhbWV0ZXJzID0gcGFyYW1ldGVycztcclxuICAgIH1cclxuXHJcbn0iLCJleHBvcnQgY2xhc3MgQ29uZmlnIHtcclxuXHJcbiAgICBjb25zdHJ1Y3RvcigpIHtcclxuICAgICAgICAvKiogQHR5cGUge01hcH0gKi9cclxuICAgICAgICB0aGlzLmNvbmZpZ0VudHJpZXMgPSBudWxsO1xyXG5cclxuICAgICAgICAvKiogQHR5cGUge0xpc3R9ICovXHJcbiAgICAgICAgdGhpcy5jb25maWdQcm9jZXNzb3JzID0gbnVsbDtcclxuXHJcbiAgICAgICAgLyoqIEB0eXBlIHtMaXN0fSAqL1xyXG4gICAgICAgIHRoaXMuaW5zdGFuY2VQcm9jZXNzb3JzID0gbnVsbDtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIEByZXR1cm5zIHtQcm9taXNlfVxyXG4gICAgICovXHJcbiAgICBmaW5hbGl6ZSgpIHtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cclxuICAgICAqL1xyXG4gICAgaXNGaW5hbGl6ZWQoKSB7XHJcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG59IiwiZXhwb3J0IGNsYXNzIEluc3RhbmNlSG9sZGVyIHtcclxuXHJcbiAgICBzdGF0aWMgZ2V0IE5FV19JTlNUQU5DRSgpIHsgcmV0dXJuIDA7IH1cclxuXHJcbiAgICBzdGF0aWMgZ2V0IEVYSVNUSU5HX0lOU1RBTkNFKCkgeyByZXR1cm4gMTsgfVxyXG5cclxuICAgIHN0YXRpYyBob2xkZXJXaXRoTmV3SW5zdGFuY2UoaW5zdGFuY2UpIHtcclxuICAgICAgICByZXR1cm4gbmV3IEluc3RhbmNlSG9sZGVyKGluc3RhbmNlLCBJbnN0YW5jZUhvbGRlci5ORVdfSU5TVEFOQ0UpO1xyXG4gICAgfVxyXG5cclxuICAgIHN0YXRpYyBob2xkZXJXaXRoRXhpc3RpbmdJbnN0YW5jZShpbnN0YW5jZSkge1xyXG4gICAgICAgIHJldHVybiBuZXcgSW5zdGFuY2VIb2xkZXIoaW5zdGFuY2UsIEluc3RhbmNlSG9sZGVyLkVYSVNUSU5HX0lOU1RBTkNFKTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdHJ1Y3RvcihpbnN0YW5jZSwgdHlwZSkge1xyXG4gICAgICAgIHRoaXMuaW5zdGFuY2UgPSBpbnN0YW5jZTtcclxuICAgICAgICB0aGlzLnR5cGUgPSB0eXBlO1xyXG4gICAgfVxyXG5cclxufSIsImV4cG9ydCBjbGFzcyBUeXBlQ29uZmlnIHtcclxuXHJcbiAgICBzdGF0aWMgZ2V0IE5FVygpIHsgcmV0dXJuIFwiTkVXXCI7IH1cclxuICAgIHN0YXRpYyBnZXQgQ09ORklHVVJFRCgpIHsgcmV0dXJuIFwiQ09ORklHVVJFRFwiOyB9XHJcblxyXG4gICAgY29uc3RydWN0b3IobmFtZSwgY2xhc3NSZWZlcmVuY2UpIHtcclxuICAgICAgICB0aGlzLm5hbWUgPSBuYW1lO1xyXG4gICAgICAgIHRoaXMuY2xhc3NSZWZlcmVuY2UgPSBjbGFzc1JlZmVyZW5jZTtcclxuICAgICAgICB0aGlzLnN0YWdlID0gVHlwZUNvbmZpZy5ORVc7XHJcbiAgICB9XHJcblxyXG4gICAgaW5zdGFuY2VIb2xkZXIocGFyYW1ldGVycyA9IFtdKSB7XHJcbiAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICB9XHJcblxyXG59IiwiaW1wb3J0IHsgQ29uZmlnIH0gZnJvbSBcIi4vY29uZmlnLmpzXCI7XHJcbmltcG9ydCB7IExvZ2dlciB9IGZyb20gXCJjb3JldXRpbF92MVwiO1xyXG5pbXBvcnQgeyBJbnN0YW5jZUhvbGRlciB9IGZyb20gXCIuL3R5cGVDb25maWcvaW5zdGFuY2VIb2xkZXIuanNcIjtcclxuaW1wb3J0IHsgVHlwZUNvbmZpZyB9IGZyb20gXCIuL3R5cGVDb25maWcvdHlwZUNvbmZpZy5qc1wiO1xyXG5cclxuLyoqXHJcbiAqIFV0aWxpdGllcyBmb3IgYWNjZXNzaW5nIGEgQ29uZmlnIG9iamVjdFxyXG4gKi9cclxuXHJcbmNvbnN0IExPRyA9IG5ldyBMb2dnZXIoXCJDb25maWdBY2Nlc3NvclwiKTtcclxuXHJcbmV4cG9ydCBjbGFzcyBDb25maWdBY2Nlc3NvciB7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBHZXQgYW4gaW5zdGFuY2UgYnkgY2xhc3MgbmFtZSBpbiB0aGUgY29uZmlnXHJcbiAgICAgKiBcclxuICAgICAqIEBwYXJhbSB7Q29uZmlnfSBjb25maWcgXHJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbmFtZSBcclxuICAgICAqIEBwYXJhbSB7QXJyYXl9IHBhcmFtZXRlcnNcclxuICAgICAqIEByZXR1cm5zIHtJbnN0YW5jZUhvbGRlcn1cclxuICAgICAqL1xyXG4gICAgc3RhdGljIGluc3RhbmNlSG9sZGVyKG5hbWUsIGNvbmZpZywgcGFyYW1ldGVycyA9IFtdKSB7XHJcbiAgICAgICAgY29uc3QgdHlwZUNvbmZpZyA9IHRoaXMudHlwZUNvbmZpZ0J5TmFtZShuYW1lLCBjb25maWcpO1xyXG4gICAgICAgIGlmKHR5cGVDb25maWcgPT09IG51bGwpIHtcclxuICAgICAgICAgICAgTE9HLmVycm9yKFwiTm8gdHlwZWNvbmZpZyBmb3VuZCBmb3IgXCIgKyBuYW1lKTtcclxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNvbnN0IGluc3RhbmNlSG9sZGVyID0gdHlwZUNvbmZpZy5pbnN0YW5jZUhvbGRlcihwYXJhbWV0ZXJzKTtcclxuICAgICAgICBpZighaW5zdGFuY2VIb2xkZXIpIHtcclxuICAgICAgICAgICAgTE9HLmVycm9yKFwiTm8gb2JqZWN0IGZvdW5kIGZvciBcIiArIG5hbWUpO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gaW5zdGFuY2VIb2xkZXI7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBHZXQgdGhlIHR5cGUgY29uZmlnIGJ5IGNsYXNzIG5hbWUgaW4gdGhlIGNvbmZpZ1xyXG4gICAgICogXHJcbiAgICAgKiBAcGFyYW0ge0NvbmZpZ30gY29uZmlnIFxyXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG5hbWUgXHJcbiAgICAgKiBAcmV0dXJucyB7VHlwZUNvbmZpZ31cclxuICAgICAqL1xyXG4gICAgc3RhdGljIHR5cGVDb25maWdCeU5hbWUobmFtZSwgY29uZmlnKSB7XHJcbiAgICAgICAgbGV0IGNvbmZpZ0VudHJ5ID0gbnVsbDtcclxuICAgICAgICBjb25maWcuY29uZmlnRW50cmllcy5mb3JFYWNoKChrZXksIHZhbHVlLCBwYXJlbnQpID0+IHtcclxuICAgICAgICAgICAgaWYoa2V5ID09PSBuYW1lKSB7XHJcbiAgICAgICAgICAgICAgICBjb25maWdFbnRyeSA9IHZhbHVlO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgIH0sIHRoaXMpO1xyXG4gICAgICAgIGlmKCFjb25maWdFbnRyeSkge1xyXG4gICAgICAgICAgICBMT0cuZXJyb3IoXCJObyBjb25maWcgZW50cnkgZm91bmQgZm9yIFwiICsgbmFtZSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBjb25maWdFbnRyeTtcclxuICAgIH1cclxuXHJcbn0iLCJleHBvcnQgY2xhc3MgSW5qZWN0b3Ige1xyXG5cclxuXHJcbiAgICAvKipcclxuICAgICAqIEhlbHBlciBtZXRob2QgZm9yIGluamVjdGluZyBmaWVsZHMgaW4gdGFyZ2V0IG9iamVjdFxyXG4gICAgICogXHJcbiAgICAgKiBAcGFyYW0ge2FueX0gdGFyZ2V0T2JqZWN0IFxyXG4gICAgICogQHBhcmFtIHtDb25maWd9IGNvbmZpZyBcclxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBkZXB0aFxyXG4gICAgICogQHJldHVybnMge1Byb21pc2V9XHJcbiAgICAgKi9cclxuICAgIGluamVjdFRhcmdldCh0YXJnZXQsIGNvbmZpZywgZGVwdGggPSAwKSB7XHJcblxyXG4gICAgfVxyXG5cclxufSIsImltcG9ydCB7IE1hcCwgTG9nZ2VyLCBMaXN0IH0gZnJvbSBcImNvcmV1dGlsX3YxXCI7XHJcbmltcG9ydCB7IENvbmZpZyB9IGZyb20gXCIuLi9jb25maWcuanNcIjtcclxuaW1wb3J0IHsgQ29uZmlnQWNjZXNzb3IgfSBmcm9tIFwiLi4vY29uZmlnQWNjZXNzb3IuanNcIjtcclxuaW1wb3J0IHsgSW5qZWN0b3IgfSBmcm9tIFwiLi4vaW5qZWN0b3IuanNcIjtcclxuaW1wb3J0IHsgSW5zdGFuY2VIb2xkZXIgfSBmcm9tIFwiLi4vdHlwZUNvbmZpZy9pbnN0YW5jZUhvbGRlci5qc1wiO1xyXG5pbXBvcnQgeyBUeXBlQ29uZmlnIH0gZnJvbSBcIi4uL3R5cGVDb25maWcvdHlwZUNvbmZpZy5qc1wiO1xyXG5cclxuY29uc3QgTE9HID0gbmV3IExvZ2dlcihcIkNvbmZpZ1Byb2Nlc3NvckV4ZWN1dG9yXCIpO1xyXG5cclxuLyoqXHJcbiAqIEV4ZWN1dGVzIHRoZSBwcm92aWRlZCBjb25maWcgcHJvY2Vzc29ycyBvbiB0aGUgcHJvdmlkZWQgY29uZmlnIHJlZ2lzdHJ5XHJcbiAqIFJldHVybnMgYSBsaXN0IG9mIHByb21pc2VzIGZvciB3aGVuIHRoZSBjb25maWcgcHJvY2Vzc29ycyBoYXMgY29tcGxldGVkIHJ1bm5pbmdcclxuICogXHJcbiAqIEEgY29uZmlnIHByb2Nlc3NvciByZWFkcyB0aGUgY29uZmlnIGFuZCBwZXJmb3JtcyBhbnkgbmVjZXNzYXJ5IGFjdGlvbnMgYmFzZWQgb25cclxuICogY2xhc3MgYW5kIHR5cGUgaW5mb3JtYXRpb24uIEEgY29uZmlnIHByb2Nlc3NvciBkb2VzIG5vdCBvcGVyYXRlIG9uIG1hbmFnZWQgaW5zdGFuY2VzXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgQ29uZmlnUHJvY2Vzc29yRXhlY3V0b3Ige1xyXG4gICAgXHJcbiAgICAvKipcclxuICAgICAqIEBwYXJhbSB7TGlzdH0gY29uZmlnUHJvY2Vzc29yQ2xhc3NOYW1lTGlzdFxyXG4gICAgICogQHBhcmFtIHtJbmplY3Rvcn0gaW5qZWN0b3JcclxuICAgICAqIEBwYXJhbSB7Q29uZmlnfSBjb25maWdcclxuICAgICAqIEByZXR1cm5zIHtQcm9taXNlfSBwcm9taXNlIHdoaWNoIGlzIHJlc29sdmVkIHdoZW4gYWxsIGNvbmZpZyBwcm9jZXNzb3JzIGFyZSByZXNvbHZlZFxyXG4gICAgICovXHJcbiAgICBzdGF0aWMgZXhlY3V0ZShjb25maWdQcm9jZXNzb3JDbGFzc05hbWVMaXN0LCBpbmplY3RvciwgY29uZmlnKSB7XHJcbiAgICAgICAgcmV0dXJuIGNvbmZpZ1Byb2Nlc3NvckNsYXNzTmFtZUxpc3QucHJvbWlzZUNoYWluKChjb25maWdQcm9jZXNzb3JDbGFzc05hbWUsIHBhcmVudCkgPT4ge1xyXG4gICAgICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmVDb25maWdQcm9jZXNzb3JFeGVjdXRlZCwgcmVqZWN0KSA9PiB7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IHRhcmdldEluamVjdGVkUHJvbWlzZSA9IG5ldyBQcm9taXNlKChyZXNvbHZlVGFyZ2V0SW5qZWN0ZWQsIHJlamVjdCkgPT4ge3Jlc29sdmVUYXJnZXRJbmplY3RlZCgpfSlcclxuXHJcbiAgICAgICAgICAgICAgICAvKiogIEB0eXBlIHtJbnN0YW5jZUhvbGRlcn0gKi9cclxuICAgICAgICAgICAgICAgIGNvbnN0IHByb2Nlc3NvckhvbGRlciA9IENvbmZpZ0FjY2Vzc29yLmluc3RhbmNlSG9sZGVyKGNvbmZpZ1Byb2Nlc3NvckNsYXNzTmFtZSwgY29uZmlnKTtcclxuICAgICAgICAgICAgICAgIGlmKHByb2Nlc3NvckhvbGRlci50eXBlID09PSBJbnN0YW5jZUhvbGRlci5ORVdfSU5TVEFOQ0UpIHtcclxuICAgICAgICAgICAgICAgICAgICB0YXJnZXRJbmplY3RlZFByb21pc2UgPSBpbmplY3Rvci5pbmplY3RUYXJnZXQocHJvY2Vzc29ySG9sZGVyLmluc3RhbmNlLCBjb25maWcpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIHRhcmdldEluamVjdGVkUHJvbWlzZS50aGVuKCgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCB0b0NvbmZpZ3VyZU1hcCA9IENvbmZpZ1Byb2Nlc3NvckV4ZWN1dG9yLnByZXBhcmVVbmNvbmZpZ3VyZWRDb25maWdFbnRyaWVzKGNvbmZpZy5jb25maWdFbnRyaWVzKTtcclxuICAgICAgICAgICAgICAgICAgICBwcm9jZXNzb3JIb2xkZXIuaW5zdGFuY2UucHJvY2Vzc0NvbmZpZyhjb25maWcsIHRvQ29uZmlndXJlTWFwKS50aGVuKCgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZUNvbmZpZ1Byb2Nlc3NvckV4ZWN1dGVkKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSlcclxuICAgIH1cclxuXHJcbiAgICBzdGF0aWMgcHJlcGFyZVVuY29uZmlndXJlZENvbmZpZ0VudHJpZXMoY29uZmlnRW50cmllcykge1xyXG4gICAgICAgIGNvbnN0IHVuY29uZmlndXJlZENvbmZpZ0VudHJpZXMgPSBuZXcgTWFwKCk7XHJcblxyXG4gICAgICAgIGNvbmZpZ0VudHJpZXMuZm9yRWFjaCgoa2V5LCB2YWx1ZSwgcGFyZW50KSA9PiB7XHJcblxyXG4gICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICogQHR5cGUge1R5cGVDb25maWd9XHJcbiAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICBjb25zdCBjb25maWdFbnRyeSA9IHZhbHVlO1xyXG5cclxuICAgICAgICAgICAgaWYoY29uZmlnRW50cnkuc3RhZ2UgPT09IFR5cGVDb25maWcuTkVXKSB7XHJcbiAgICAgICAgICAgICAgICB1bmNvbmZpZ3VyZWRDb25maWdFbnRyaWVzLnNldChrZXksIGNvbmZpZ0VudHJ5KTtcclxuICAgICAgICAgICAgICAgIGNvbmZpZ0VudHJ5LnN0YWdlID0gVHlwZUNvbmZpZy5DT05GSUdVUkVEO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICB9LCB0aGlzKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHVuY29uZmlndXJlZENvbmZpZ0VudHJpZXM7XHJcbiAgICB9XHJcblxyXG59IiwiaW1wb3J0IHsgTG9nZ2VyIH0gZnJvbSBcImNvcmV1dGlsX3YxXCI7XHJcblxyXG5jb25zdCBMT0cgPSBuZXcgTG9nZ2VyKFwiSW5zdGFuY2VQb3N0Q29uZmlnVHJpZ2dlclwiKTtcclxuXHJcbi8qKlxyXG4gKiBJbnN0YW5jZSBwcm9jZXNzb3Igd2hpY2ggY2FsbHMgcG9zdENvbmZpZyBvbiBvYmplY3RzIGFmdGVyIGNvbmZpZ1Byb2Nlc3NvcnMgYXJlIGZpbmlzaGVkXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgSW5zdGFuY2VQb3N0Q29uZmlnVHJpZ2dlciB7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBcclxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBpbnN0YW5jZSBcclxuICAgICAqIEByZXR1cm4ge1Byb21pc2V9XHJcbiAgICAgKi9cclxuICAgIHByb2Nlc3MoaW5zdGFuY2UpIHtcclxuICAgICAgICBsZXQgcmVzcG9uc2UgPSBudWxsO1xyXG4gICAgICAgIGlmKGluc3RhbmNlLnBvc3RDb25maWcpIHtcclxuICAgICAgICAgICAgcmVzcG9uc2UgPSBpbnN0YW5jZS5wb3N0Q29uZmlnKCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICghcmVzcG9uc2UpIHtcclxuICAgICAgICAgICAgcmVzcG9uc2UgPSBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpID0+IHsgcmVzb2x2ZSgpOyB9KTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKCFyZXNwb25zZSBpbnN0YW5jZW9mIFByb21pc2UpIHtcclxuICAgICAgICAgICAgdGhyb3cgXCJwb3N0Q29uZmlnKCkgbXVzdCByZXR1cm4gZWl0aGVyIHVuZGVmaW5lZCBvciBudWxsIG9yIGEgUHJvbWlzZVwiXHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiByZXNwb25zZTtcclxuICAgIH1cclxuXHJcbn0iLCJpbXBvcnQgeyBMb2dnZXIsIExpc3QgfSBmcm9tIFwiY29yZXV0aWxfdjFcIjtcclxuaW1wb3J0IHsgQ29uZmlnQWNjZXNzb3IgfSBmcm9tIFwiLi4vY29uZmlnQWNjZXNzb3IuanNcIjtcclxuaW1wb3J0IHsgQ29uZmlnIH0gZnJvbSBcIi4uL2NvbmZpZy5qc1wiO1xyXG5cclxuY29uc3QgTE9HID0gbmV3IExvZ2dlcihcIkluc3RhbmNlUHJvY2Vzc29yRXhlY3V0b3JcIik7XHJcblxyXG4vKipcclxuICogRXhlY3V0ZXMgdGhlIGNvbmZpZ3MgaW5zdGFuY2UgcHJvY2Vzc29ycyBvbiB0aGUgcHJvdmlkZWQgaW5zdGFuY2VcclxuICogUmV0dXJucyBhIHByb21pc2UgZm9yIHdoZW4gdGhlIGluc3RhbmNlIHByb2Nlc3NvcnMgaGFzIGNvbXBsZXRlZCBydW5uaW5nXHJcbiAqIFxyXG4gKiBJbnN0YW5jZSBwcm9jZXNzb3JzIHBlcmZvcm0gb3BlcmF0aW9ucyBvbiBtYW5hZ2VkIGluc3RhbmNlcyBhZnRlciB0aGV5IGhhdmUgYmVlbiBpbnN0YW5zaWF0ZWRcclxuICovXHJcbmV4cG9ydCBjbGFzcyBJbnN0YW5jZVByb2Nlc3NvckV4ZWN1dG9yIHtcclxuXHJcbiAgICAvKipcclxuICAgICAqIEBwYXJhbSB7TGlzdH0gaW5zdGFuY2VQcm9jZXNzb3JMaXN0IHRoZSBpbnN0YW5jZSBwcm9jZXNzb3JzXHJcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gaW5zdGFuY2UgdGhlIGluc3RhbmNlIHRvIHByb2Nlc3NcclxuICAgICAqIEBwYXJhbSB7Q29uZmlnfSBjb25maWdcclxuICAgICAqIEByZXR1cm5zIHtQcm9taXNlfVxyXG4gICAgICovXHJcbiAgICBzdGF0aWMgZXhlY3V0ZShpbnN0YW5jZSwgY29uZmlnKSB7XHJcbiAgICAgICAgcmV0dXJuIGNvbmZpZy5pbnN0YW5jZVByb2Nlc3NvcnMucHJvbWlzZUNoYWluKChwcm9jZXNzb3JOYW1lLCBwYXJlbnQpID0+IHtcclxuICAgICAgICAgICAgY29uc3QgcHJvY2Vzc29ySG9sZGVyID0gQ29uZmlnQWNjZXNzb3IuaW5zdGFuY2VIb2xkZXIocHJvY2Vzc29yTmFtZSwgY29uZmlnKTtcclxuICAgICAgICAgICAgcmV0dXJuIHByb2Nlc3NvckhvbGRlci5pbnN0YW5jZS5wcm9jZXNzKGluc3RhbmNlKTtcclxuICAgICAgICB9LCB0aGlzKTtcclxuICAgIH1cclxuXHJcbn0iLCJpbXBvcnQgeyBUeXBlQ29uZmlnIH0gZnJvbSBcIi4vdHlwZUNvbmZpZy5qc1wiO1xyXG5pbXBvcnQgeyBMb2dnZXIgfSBmcm9tIFwiY29yZXV0aWxfdjFcIjtcclxuaW1wb3J0IHsgSW5zdGFuY2VIb2xkZXIgfSBmcm9tIFwiLi9pbnN0YW5jZUhvbGRlci5qc1wiO1xyXG5cclxuY29uc3QgTE9HID0gbmV3IExvZ2dlcihcIlNpbmdsZXRvbkNvbmZpZ1wiKTtcclxuXHJcbmV4cG9ydCBjbGFzcyBTaW5nbGV0b25Db25maWcgZXh0ZW5kcyBUeXBlQ29uZmlnIHtcclxuXHJcbiAgICBzdGF0aWMgbmFtZWQobmFtZSwgY2xhc3NSZWZlcmVuY2UpIHtcclxuICAgICAgICByZXR1cm4gbmV3IFNpbmdsZXRvbkNvbmZpZyhuYW1lLCBjbGFzc1JlZmVyZW5jZSk7XHJcbiAgICB9XHJcblxyXG4gICAgc3RhdGljIHVubmFtZWQoY2xhc3NSZWZlcmVuY2UpIHtcclxuICAgICAgICByZXR1cm4gbmV3IFNpbmdsZXRvbkNvbmZpZyhjbGFzc1JlZmVyZW5jZS5uYW1lLCBjbGFzc1JlZmVyZW5jZSk7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3RydWN0b3IobmFtZSwgY2xhc3NSZWZlcmVuY2UpIHtcclxuICAgICAgICBzdXBlcihuYW1lLCBjbGFzc1JlZmVyZW5jZSk7XHJcbiAgICB9XHJcblxyXG4gICAgaW5zdGFuY2VIb2xkZXIocGFyYW1ldGVycyA9IFtdKSB7XHJcbiAgICAgICAgaWYgKCF0aGlzLmluc3RhbmNlKSB7XHJcbiAgICAgICAgICAgIGlmKHBhcmFtZXRlcnMgJiYgcGFyYW1ldGVycy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmluc3RhbmNlID0gbmV3IHRoaXMuY2xhc3NSZWZlcmVuY2UoLi4ucGFyYW1ldGVycyk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmluc3RhbmNlID0gbmV3IHRoaXMuY2xhc3NSZWZlcmVuY2UoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gSW5zdGFuY2VIb2xkZXIuaG9sZGVyV2l0aE5ld0luc3RhbmNlKHRoaXMuaW5zdGFuY2UpO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gSW5zdGFuY2VIb2xkZXIuaG9sZGVyV2l0aEV4aXN0aW5nSW5zdGFuY2UodGhpcy5pbnN0YW5jZSk7XHJcbiAgICB9XHJcblxyXG59IiwiaW1wb3J0IHsgUHJvdmlkZXIgfSBmcm9tIFwiLi9hcGkvcHJvdmlkZXIuanNcIjtcclxuaW1wb3J0IHsgVHlwZUNvbmZpZyB9IGZyb20gXCIuL3R5cGVDb25maWcvdHlwZUNvbmZpZy5qc1wiO1xyXG5pbXBvcnQgeyBJbnN0YW5jZUhvbGRlciB9IGZyb20gXCIuL3R5cGVDb25maWcvaW5zdGFuY2VIb2xkZXIuanNcIjtcclxuaW1wb3J0IHsgSW5qZWN0b3IgfSBmcm9tIFwiLi9pbmplY3Rvci5qc1wiO1xyXG5pbXBvcnQgeyBDb25maWcgfSBmcm9tIFwiLi9jb25maWcuanNcIjtcclxuaW1wb3J0IHsgQ29uZmlnQWNjZXNzb3IgfSBmcm9tIFwiLi9jb25maWdBY2Nlc3Nvci5qc1wiO1xyXG5cclxuZXhwb3J0IGNsYXNzIE1pbmRpUHJvdmlkZXIgZXh0ZW5kcyBQcm92aWRlciB7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBcclxuICAgICAqIEBwYXJhbSB7VHlwZUNvbmZpZ30gdHlwZUNvbmZpZyBcclxuICAgICAqL1xyXG4gICAgY29uc3RydWN0b3IodHlwZUNvbmZpZywgaW5qZWN0b3IsIGNvbmZpZykge1xyXG5cclxuICAgICAgICBzdXBlcigpO1xyXG5cclxuICAgICAgICAvKiogQHR5cGUge1R5cGVDb25maWd9ICovXHJcbiAgICAgICAgdGhpcy50eXBlQ29uZmlnID0gdHlwZUNvbmZpZztcclxuXHJcbiAgICAgICAgLyoqIEB0eXBlIHtJbmplY3Rvcn0gKi9cclxuICAgICAgICB0aGlzLmluamVjdG9yID0gaW5qZWN0b3I7XHJcblxyXG4gICAgICAgIC8qKiBAdHlwZSB7Q29uZmlnfSAqL1xyXG4gICAgICAgIHRoaXMuY29uZmlnID0gY29uZmlnO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogXHJcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBwYXJhbWV0ZXJzIFxyXG4gICAgICogQHJldHVybnMge1Byb21pc2V9XHJcbiAgICAgKi9cclxuICAgIGdldChwYXJhbWV0ZXJzID0gW10pIHtcclxuICAgICAgICAvKiogQHR5cGUge0luc3RhbmNlSG9sZGVyfSAqL1xyXG4gICAgICAgIGNvbnN0IGluc3RhbmNlSG9sZGVyID0gQ29uZmlnQWNjZXNzb3IuaW5zdGFuY2VIb2xkZXIodGhpcy50eXBlQ29uZmlnLm5hbWUsIHRoaXMuY29uZmlnLCBwYXJhbWV0ZXJzKTtcclxuICAgICAgICBpZiAoaW5zdGFuY2VIb2xkZXIudHlwZSA9PT0gSW5zdGFuY2VIb2xkZXIuTkVXX0lOU1RBTkNFKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmluamVjdG9yLmluamVjdFRhcmdldChpbnN0YW5jZUhvbGRlci5pbnN0YW5jZSwgdGhpcy5jb25maWcpO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4geyByZXNvbHZlKGluc3RhbmNlSG9sZGVyLmluc3RhbmNlKX0pOztcclxuICAgIH1cclxuXHJcbn0iLCJpbXBvcnQgeyBMaXN0LCBMb2dnZXIgfSBmcm9tIFwiY29yZXV0aWxfdjFcIjtcclxuaW1wb3J0IHsgQ29uZmlnIH0gZnJvbSBcIi4vY29uZmlnLmpzXCI7XHJcbmltcG9ydCB7IENvbmZpZ0FjY2Vzc29yIH0gZnJvbSBcIi4vY29uZmlnQWNjZXNzb3IuanNcIjtcclxuaW1wb3J0IHsgSW5qZWN0aW9uUG9pbnQgfSBmcm9tIFwiLi9hcGkvaW5qZWN0aW9uUG9pbnQuanNcIlxyXG5pbXBvcnQgeyBJbnN0YW5jZVByb2Nlc3NvckV4ZWN1dG9yIH0gZnJvbSBcIi4vaW5zdGFuY2VQcm9jZXNzb3IvaW5zdGFuY2VQcm9jZXNzb3JFeGVjdXRvci5qc1wiO1xyXG5pbXBvcnQgeyBJbnN0YW5jZUhvbGRlciB9IGZyb20gXCIuL3R5cGVDb25maWcvaW5zdGFuY2VIb2xkZXIuanNcIjtcclxuaW1wb3J0IHsgTWluZGlQcm92aWRlciB9IGZyb20gXCIuL21pbmRpUHJvdmlkZXIuanNcIjtcclxuaW1wb3J0IHsgSW5qZWN0b3IgfSBmcm9tIFwiLi9pbmplY3Rvci5qc1wiO1xyXG5cclxuY29uc3QgTE9HID0gbmV3IExvZ2dlcihcIk1pbmRpSW5qZWN0b3JcIik7XHJcblxyXG5leHBvcnQgY2xhc3MgTWluZGlJbmplY3RvciBleHRlbmRzIEluamVjdG9yIHtcclxuXHJcbiAgICBzdGF0aWMgaW5qZWN0KHRhcmdldCwgY29uZmlnKSB7XHJcbiAgICAgICAgcmV0dXJuIElOSkVDVE9SLmluamVjdFRhcmdldCh0YXJnZXQsIGNvbmZpZyk7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBAcmV0dXJucyB7TWluZGlJbmplY3Rvcn1cclxuICAgICAqL1xyXG4gICAgc3RhdGljIGdldEluc3RhbmNlKCkge1xyXG4gICAgICAgIHJldHVybiBJTkpFQ1RPUjtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIEhlbHBlciBtZXRob2QgZm9yIGluamVjdGluZyBmaWVsZHMgaW4gdGFyZ2V0IG9iamVjdFxyXG4gICAgICogXHJcbiAgICAgKiBAcGFyYW0ge2FueX0gdGFyZ2V0T2JqZWN0IFxyXG4gICAgICogQHBhcmFtIHtDb25maWd9IGNvbmZpZyBcclxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBkZXB0aFxyXG4gICAgICogQHJldHVybnMge1Byb21pc2V9XHJcbiAgICAgKi9cclxuICAgIGluamVjdFRhcmdldCh0YXJnZXRPYmplY3QsIGNvbmZpZywgZGVwdGggPSAwKSB7XHJcbiAgICAgICAgaWYgKCF0YXJnZXRPYmplY3QpIHtcclxuICAgICAgICAgICAgdGhyb3cgRXJyb3IoXCJNaXNzaW5nIHRhcmdldCBvYmplY3RcIik7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICghY29uZmlnKSB7XHJcbiAgICAgICAgICAgIHRocm93IEVycm9yKFwiTWlzc2luZyBjb25maWdcIik7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICghY29uZmlnLmlzRmluYWxpemVkKCkpIHtcclxuICAgICAgICAgICAgdGhyb3cgRXJyb3IoXCJDb25maWcgbm90IGZpbmFsaXplZFwiKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKGRlcHRoID4gMTApIHtcclxuICAgICAgICAgICAgdGhyb3cgRXJyb3IoXCJJbmplY3Rpb24gc3RydWN0dXJlIHRvbyBkZWVwXCIpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjb25zdCBpbmplY3RvciA9IHRoaXM7XHJcbiAgICAgICAgY29uc3Qgb2JqZWN0RmllbGROYW1lcyA9IG5ldyBMaXN0KE9iamVjdC5rZXlzKHRhcmdldE9iamVjdCkpO1xyXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XHJcbiAgICAgICAgICAgIHJldHVybiBvYmplY3RGaWVsZE5hbWVzLnByb21pc2VDaGFpbigoZmllbGROYW1lLCBwYXJlbnQpID0+IHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBNaW5kaUluamVjdG9yLmluamVjdFByb3BlcnR5KHRhcmdldE9iamVjdCwgZmllbGROYW1lLCBjb25maWcsIGRlcHRoLCBpbmplY3Rvcik7XHJcbiAgICAgICAgICAgIH0pLnRoZW4oKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgSW5zdGFuY2VQcm9jZXNzb3JFeGVjdXRvci5leGVjdXRlKHRhcmdldE9iamVjdCwgY29uZmlnKS50aGVuKCgpID0+e1xyXG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUodGFyZ2V0T2JqZWN0KTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9KVxyXG5cclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSB0YXJnZXRPYmplY3QgXHJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmllbGROYW1lIFxyXG4gICAgICogQHBhcmFtIHtDb25maWd9IGNvbmZpZyBcclxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBkZXB0aCBcclxuICAgICAqIEBwYXJhbSB7SW5qZWN0b3J9IGluamVjdG9yXHJcbiAgICAgKiBAcmV0dXJucyB7UHJvbWlzZX1cclxuICAgICAqL1xyXG4gICAgc3RhdGljIGluamVjdFByb3BlcnR5KHRhcmdldE9iamVjdCwgZmllbGROYW1lLCBjb25maWcsIGRlcHRoLCBpbmplY3Rvcikge1xyXG4gICAgICAgIGNvbnN0IGluamVjdGlvblBvaW50ID0gdGFyZ2V0T2JqZWN0W2ZpZWxkTmFtZV07ICAgICAgICBcclxuICAgICAgICBpZihpbmplY3Rpb25Qb2ludCBpbnN0YW5jZW9mIEluamVjdGlvblBvaW50KSB7XHJcbiAgICAgICAgICAgIGlmIChpbmplY3Rpb25Qb2ludC50eXBlID09PSBJbmplY3Rpb25Qb2ludC5QUk9WSURFUl9UWVBFKSB7XHJcbiAgICAgICAgICAgICAgICBNaW5kaUluamVjdG9yLmluamVjdFByb3BlcnR5UHJvdmlkZXIodGFyZ2V0T2JqZWN0LCBmaWVsZE5hbWUsIGNvbmZpZywgaW5qZWN0b3IpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHsgcmVzb2x2ZSgpOyB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gTWluZGlJbmplY3Rvci5pbmplY3RQcm9wZXJ0eUluc3RhbmNlKHRhcmdldE9iamVjdCwgZmllbGROYW1lLCBjb25maWcsIGRlcHRoLCBpbmplY3Rvcik7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7IHJlc29sdmUoKTsgfSlcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSB0YXJnZXRPYmplY3QgXHJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmllbGROYW1lIFxyXG4gICAgICogQHBhcmFtIHtDb25maWd9IGNvbmZpZyBcclxuICAgICAqIEBwYXJhbSB7SW5qZWN0b3J9IGluamVjdG9yXHJcbiAgICAgKi9cclxuICAgIHN0YXRpYyBpbmplY3RQcm9wZXJ0eVByb3ZpZGVyKHRhcmdldE9iamVjdCwgZmllbGROYW1lLCBjb25maWcsIGluamVjdG9yKSB7XHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogQHR5cGUge0luamVjdGlvblBvaW50fVxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIGNvbnN0IGluamVjdGlvblBvaW50ID0gdGFyZ2V0T2JqZWN0W2ZpZWxkTmFtZV07XHJcbiAgICAgICAgY29uc3QgdHlwZUNvbmZpZyA9IENvbmZpZ0FjY2Vzc29yLnR5cGVDb25maWdCeU5hbWUoaW5qZWN0aW9uUG9pbnQubmFtZSwgY29uZmlnKTtcclxuICAgICAgICB0YXJnZXRPYmplY3RbZmllbGROYW1lXSA9IG5ldyBNaW5kaVByb3ZpZGVyKHR5cGVDb25maWcsIGluamVjdG9yLCBjb25maWcpO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHRhcmdldE9iamVjdCBcclxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWVsZE5hbWUgXHJcbiAgICAgKiBAcGFyYW0ge0NvbmZpZ30gY29uZmlnIFxyXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGRlcHRoIFxyXG4gICAgICogQHBhcmFtIHtJbmplY3Rvcn0gaW5qZWN0b3JcclxuICAgICAqL1xyXG4gICAgc3RhdGljIGluamVjdFByb3BlcnR5SW5zdGFuY2UodGFyZ2V0T2JqZWN0LCBmaWVsZE5hbWUsIGNvbmZpZywgZGVwdGgsIGluamVjdG9yKSB7XHJcbiAgICAgICAgbGV0IGluamVjdFByb21pc2UgPSBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7IHJlc29sdmUoKTsgfSlcclxuICAgICAgICAvKiogQHR5cGUge0luamVjdGlvblBvaW50fSAqL1xyXG4gICAgICAgIGNvbnN0IGluamVjdGlvblBvaW50ID0gdGFyZ2V0T2JqZWN0W2ZpZWxkTmFtZV07XHJcbiAgICAgICAgY29uc3QgaW5zdGFuY2VIb2xkZXIgPSBDb25maWdBY2Nlc3Nvci5pbnN0YW5jZUhvbGRlcihpbmplY3Rpb25Qb2ludC5uYW1lLCBjb25maWcsIGluamVjdGlvblBvaW50LnBhcmFtZXRlcnMpO1xyXG4gICAgICAgIGlmKGluc3RhbmNlSG9sZGVyLnR5cGUgPT09IEluc3RhbmNlSG9sZGVyLk5FV19JTlNUQU5DRSkge1xyXG4gICAgICAgICAgICBpbmplY3RQcm9taXNlID0gaW5qZWN0b3IuaW5qZWN0VGFyZ2V0KGluc3RhbmNlSG9sZGVyLmluc3RhbmNlLCBjb25maWcsIGRlcHRoKyspO1xyXG4gICAgICAgIH1cclxuICAgICAgICB0YXJnZXRPYmplY3RbZmllbGROYW1lXSA9IGluc3RhbmNlSG9sZGVyLmluc3RhbmNlO1xyXG4gICAgICAgIHJldHVybiBpbmplY3RQcm9taXNlO1xyXG4gICAgfVxyXG5cclxufVxyXG5cclxuY29uc3QgSU5KRUNUT1IgPSBuZXcgTWluZGlJbmplY3RvcigpOyIsImltcG9ydCB7IE1hcCwgTGlzdCwgTG9nZ2VyIH0gZnJvbSBcImNvcmV1dGlsX3YxXCI7XHJcbmltcG9ydCB7IFR5cGVDb25maWcgfSBmcm9tIFwiLi90eXBlQ29uZmlnL3R5cGVDb25maWcuanNcIjtcclxuaW1wb3J0IHsgQ29uZmlnUHJvY2Vzc29yRXhlY3V0b3IgfSBmcm9tIFwiLi9jb25maWdQcm9jZXNzb3IvY29uZmlnUHJvY2Vzc29yRXhlY3V0b3IuanNcIjtcclxuaW1wb3J0IHsgU2luZ2xldG9uQ29uZmlnIH0gZnJvbSBcIi4vdHlwZUNvbmZpZy9zaW5nbGV0b25Db25maWcuanNcIjtcclxuaW1wb3J0IHsgQ29uZmlnIH0gZnJvbSBcIi4vY29uZmlnLmpzXCI7XHJcbmltcG9ydCB7IE1pbmRpSW5qZWN0b3IgfSBmcm9tIFwiLi9taW5kaUluamVjdG9yLmpzXCI7XHJcblxyXG5jb25zdCBMT0cgPSBuZXcgTG9nZ2VyKFwiQ29uZmlnXCIpO1xyXG5cclxuZXhwb3J0IGNsYXNzIE1pbmRpQ29uZmlnIGV4dGVuZHMgQ29uZmlnIHtcclxuXHJcbiAgICBjb25zdHJ1Y3RvcigpIHtcclxuICAgICAgICBzdXBlcigpO1xyXG4gICAgICAgIHRoaXMuZmluYWxpemVkID0gZmFsc2U7XHJcbiAgICAgICAgLyoqIEB0eXBlIHtNYXB9ICovXHJcbiAgICAgICAgdGhpcy5jb25maWdFbnRyaWVzID0gbmV3IE1hcCgpO1xyXG4gICAgICAgIHRoaXMuY29uZmlnUHJvY2Vzc29ycyA9IG5ldyBMaXN0KCk7XHJcbiAgICAgICAgdGhpcy5pbnN0YW5jZVByb2Nlc3NvcnMgPSBuZXcgTGlzdCgpO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogXHJcbiAgICAgKiBAcGFyYW0ge0NvbmZpZ30gY29uZmlnIFxyXG4gICAgICovXHJcbiAgICBtZXJnZShjb25maWcpIHtcclxuICAgICAgICB0aGlzLmZpbmFsaXplZCA9IHRydWU7XHJcbiAgICAgICAgY29uc3QgbmV3Q29uZmlnRW50cmllcyA9IG5ldyBNYXAoKTtcclxuICAgICAgICBuZXdDb25maWdFbnRyaWVzLmFkZEFsbCh0aGlzLmNvbmZpZ0VudHJpZXMpO1xyXG4gICAgICAgIG5ld0NvbmZpZ0VudHJpZXMuYWRkQWxsKGNvbmZpZy5jb25maWdFbnRyaWVzKTtcclxuXHJcbiAgICAgICAgY29uc3QgbmV3Q29uZmlnUHJvY2Vzc29ycyA9IG5ldyBMaXN0KCk7XHJcbiAgICAgICAgbmV3Q29uZmlnUHJvY2Vzc29ycy5hZGRBbGwodGhpcy5jb25maWdQcm9jZXNzb3JzKTtcclxuICAgICAgICBuZXdDb25maWdQcm9jZXNzb3JzLmFkZEFsbChjb25maWcuY29uZmlnUHJvY2Vzc29ycyk7XHJcblxyXG4gICAgICAgIGNvbnN0IG5ld0luc3RhbmNlUHJvY2Vzc29ycyA9IG5ldyBMaXN0KCk7XHJcbiAgICAgICAgbmV3SW5zdGFuY2VQcm9jZXNzb3JzLmFkZEFsbCh0aGlzLmluc3RhbmNlUHJvY2Vzc29ycyk7XHJcbiAgICAgICAgbmV3SW5zdGFuY2VQcm9jZXNzb3JzLmFkZEFsbChjb25maWcuaW5zdGFuY2VQcm9jZXNzb3JzKTtcclxuXHJcbiAgICAgICAgLyoqIEB0eXBlIHtNYXB9ICovXHJcbiAgICAgICAgdGhpcy5jb25maWdFbnRyaWVzID0gbmV3Q29uZmlnRW50cmllcztcclxuICAgICAgICB0aGlzLmNvbmZpZ1Byb2Nlc3NvcnMgPSBuZXdDb25maWdQcm9jZXNzb3JzO1xyXG4gICAgICAgIHRoaXMuaW5zdGFuY2VQcm9jZXNzb3JzID0gbmV3SW5zdGFuY2VQcm9jZXNzb3JzO1xyXG5cclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIFxyXG4gICAgICogQHBhcmFtIHtUeXBlQ29uZmlnfSB0eXBlQ29uZmlnIFxyXG4gICAgICovXHJcbiAgICBhZGRUeXBlQ29uZmlnKHR5cGVDb25maWcpIHtcclxuICAgICAgICB0aGlzLmZpbmFsaXplZCA9IGZhbHNlO1xyXG4gICAgICAgIHRoaXMuY29uZmlnRW50cmllcy5zZXQodHlwZUNvbmZpZy5uYW1lLCB0eXBlQ29uZmlnKTtcclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH1cclxuXHJcbiAgICBhZGRDb25maWdQcm9jZXNzb3IoY29uZmlnUHJvY2Vzc29yKSB7XHJcbiAgICAgICAgdGhpcy5jb25maWdQcm9jZXNzb3JzLmFkZChjb25maWdQcm9jZXNzb3IubmFtZSk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuYWRkVHlwZUNvbmZpZyhTaW5nbGV0b25Db25maWcudW5uYW1lZChjb25maWdQcm9jZXNzb3IpKTtcclxuICAgIH1cclxuXHJcbiAgICBhZGRJbnN0YW5jZVByb2Nlc3NvcihpbnN0YW5jZVByb2Nlc3Nvcikge1xyXG4gICAgICAgIHRoaXMuaW5zdGFuY2VQcm9jZXNzb3JzLmFkZChpbnN0YW5jZVByb2Nlc3Nvci5uYW1lKTtcclxuICAgICAgICByZXR1cm4gdGhpcy5hZGRUeXBlQ29uZmlnKFNpbmdsZXRvbkNvbmZpZy51bm5hbWVkKGluc3RhbmNlUHJvY2Vzc29yKSk7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBcclxuICAgICAqIEBwYXJhbSB7TGlzdH0gdHlwZUNvbmZpZ0xpc3RcclxuICAgICAqL1xyXG4gICAgYWRkQWxsVHlwZUNvbmZpZyh0eXBlQ29uZmlnTGlzdCkge1xyXG4gICAgICAgIHRoaXMuZmluYWxpemVkID0gZmFsc2U7XHJcbiAgICAgICAgdHlwZUNvbmZpZ0xpc3QuZm9yRWFjaCgodHlwZUNvbmZpZyxwYXJlbnQpID0+IHtcclxuICAgICAgICAgICAgdGhpcy5jb25maWdFbnRyaWVzLnNldCh0eXBlQ29uZmlnLm5hbWUsIHR5cGVDb25maWcpO1xyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICB9LHRoaXMpO1xyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogXHJcbiAgICAgKiBAcGFyYW0ge0xpc3R9IGNvbmZpZ1Byb2Nlc3Nvckxpc3QgXHJcbiAgICAgKi9cclxuICAgIGFkZEFsbENvbmZpZ1Byb2Nlc3Nvcihjb25maWdQcm9jZXNzb3JMaXN0KSB7XHJcbiAgICAgICAgY29uZmlnUHJvY2Vzc29yTGlzdC5mb3JFYWNoKChjb25maWdQcm9jZXNzb3IscGFyZW50KSA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMuY29uZmlnUHJvY2Vzc29ycy5hZGQoY29uZmlnUHJvY2Vzc29yLm5hbWUpO1xyXG4gICAgICAgICAgICB0aGlzLmFkZFR5cGVDb25maWcoU2luZ2xldG9uQ29uZmlnLnVubmFtZWQoY29uZmlnUHJvY2Vzc29yKSk7XHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgIH0sdGhpcyk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBcclxuICAgICAqIEBwYXJhbSB7TGlzdH0gaW5zdGFuY2VQcm9jZXNzb3JMaXN0IFxyXG4gICAgICovXHJcbiAgICBhZGRBbGxJbnN0YW5jZVByb2Nlc3NvcihpbnN0YW5jZVByb2Nlc3Nvckxpc3QpIHtcclxuICAgICAgICBpbnN0YW5jZVByb2Nlc3Nvckxpc3QuZm9yRWFjaCgoaW5zdGFuY2VQcm9jZXNzb3IscGFyZW50KSA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMuaW5zdGFuY2VQcm9jZXNzb3JzLmFkZChpbnN0YW5jZVByb2Nlc3Nvci5uYW1lKTtcclxuICAgICAgICAgICAgdGhpcy5hZGRUeXBlQ29uZmlnKFNpbmdsZXRvbkNvbmZpZy51bm5hbWVkKGluc3RhbmNlUHJvY2Vzc29yKSk7XHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgIH0sdGhpcyk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cclxuICAgICAqL1xyXG4gICAgaXNGaW5hbGl6ZWQoKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuZmluYWxpemVkO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQHJldHVybnMge1Byb21pc2V9XHJcbiAgICAgKi9cclxuICAgIGZpbmFsaXplKCkge1xyXG4gICAgICAgIHRoaXMuZmluYWxpemVkID0gdHJ1ZTtcclxuICAgICAgICByZXR1cm4gQ29uZmlnUHJvY2Vzc29yRXhlY3V0b3IuZXhlY3V0ZSh0aGlzLmNvbmZpZ1Byb2Nlc3NvcnMsIE1pbmRpSW5qZWN0b3IuZ2V0SW5zdGFuY2UoKSwgdGhpcyk7XHJcbiAgICB9XHJcblxyXG59IiwiaW1wb3J0IHsgVHlwZUNvbmZpZyB9IGZyb20gXCIuL3R5cGVDb25maWcuanNcIjtcclxuXHJcbmV4cG9ydCBjbGFzcyBQb29sQ29uZmlnIGV4dGVuZHMgVHlwZUNvbmZpZyB7XHJcblxyXG4gICAgc3RhdGljIG5hbWVkKG5hbWUsIGNsYXNzUmVmZXJlbmNlLCBwb29sU2l6ZSkge1xyXG4gICAgICAgIHJldHVybiBuZXcgUG9vbENvbmZpZyhuYW1lLCBjbGFzc1JlZmVyZW5jZSwgcG9vbFNpemUpO1xyXG4gICAgfVxyXG5cclxuICAgIHN0YXRpYyB1bm5hbWVkKGNsYXNzUmVmZXJlbmNlLCBwb29sU2l6ZSkge1xyXG4gICAgICAgIHJldHVybiBuZXcgUG9vbENvbmZpZyhjbGFzc1JlZmVyZW5jZS5uYW1lLCBjbGFzc1JlZmVyZW5jZSwgcG9vbFNpemUpO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0cnVjdG9yKG5hbWUsIGNsYXNzUmVmZXJlbmNlLCBwb29sU2l6ZSkge1xyXG4gICAgICAgIHN1cGVyKG5hbWUsIGNsYXNzUmVmZXJlbmNlKTtcclxuICAgICAgICB0aGlzLnBvb2xTaXplID0gcG9vbFNpemU7XHJcbiAgICB9XHJcblxyXG4gICAgaW5zdGFuY2VIb2xkZXIocGFyYW1ldGVycyA9IFtdKSB7XHJcblxyXG4gICAgfVxyXG5cclxufSIsImltcG9ydCB7IFR5cGVDb25maWcgfSBmcm9tIFwiLi90eXBlQ29uZmlnLmpzXCI7XHJcbmltcG9ydCB7IEluc3RhbmNlSG9sZGVyIH0gZnJvbSBcIi4vaW5zdGFuY2VIb2xkZXIuanNcIjtcclxuXHJcbmV4cG9ydCBjbGFzcyBQcm90b3R5cGVDb25maWcgZXh0ZW5kcyBUeXBlQ29uZmlnIHtcclxuXHJcbiAgICBzdGF0aWMgbmFtZWQobmFtZSwgY2xhc3NSZWZlcmVuY2UpIHtcclxuICAgICAgICByZXR1cm4gbmV3IFByb3RvdHlwZUNvbmZpZyhuYW1lLCBjbGFzc1JlZmVyZW5jZSk7XHJcbiAgICB9XHJcblxyXG4gICAgc3RhdGljIHVubmFtZWQoY2xhc3NSZWZlcmVuY2UpIHtcclxuICAgICAgICByZXR1cm4gbmV3IFByb3RvdHlwZUNvbmZpZyhjbGFzc1JlZmVyZW5jZS5uYW1lLCBjbGFzc1JlZmVyZW5jZSk7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3RydWN0b3IobmFtZSwgY2xhc3NSZWZlcmVuY2UpIHtcclxuICAgICAgICBzdXBlcihuYW1lLCBjbGFzc1JlZmVyZW5jZSk7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBAcGFyYW0ge2FycmF5fSBwYXJhbWV0ZXJzIHRoZSBwYXJhbWV0ZXJzIHRvIHVzZSBmb3IgdGhlIGNvbnN0cnVjdG9yXHJcbiAgICAgKi9cclxuICAgIGluc3RhbmNlSG9sZGVyKHBhcmFtZXRlcnMgPSBbXSkge1xyXG4gICAgICAgIGxldCBpbnN0YW5jZSA9IG51bGw7XHJcbiAgICAgICAgaWYocGFyYW1ldGVycyAmJiBwYXJhbWV0ZXJzLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgaW5zdGFuY2UgPSBuZXcgdGhpcy5jbGFzc1JlZmVyZW5jZSguLi5wYXJhbWV0ZXJzKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBpbnN0YW5jZSA9IG5ldyB0aGlzLmNsYXNzUmVmZXJlbmNlKCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBJbnN0YW5jZUhvbGRlci5ob2xkZXJXaXRoTmV3SW5zdGFuY2UoaW5zdGFuY2UpO1xy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
