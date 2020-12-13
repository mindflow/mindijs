import { Logger, List, Map } from './coreutil_v1.js'

const LOG = new Logger("Provider");

class Provider {

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
     * @param {List} configProcessorClassList
     * @param {Injector} injector
     * @param {Config} config
     * @returns {Promise} promise which is resolved when all config processors are resolved
     */
    static execute(configProcessorClassNameList, injector, config) {
        const promiseList = new List();
        configProcessorClassNameList.forEach((configProcessorClassName, parent) => {
            /**  @type {InstanceHolder} */
            const processorHolder = ConfigAccessor.instanceHolder(configProcessorClassName, config);
            if(processorHolder.type === InstanceHolder.NEW_INSTANCE) {
                injector.injectTarget(processorHolder.instance, config);
            }
            const processorsPromise = processorHolder.instance.processConfig(config, 
                ConfigProcessorExecutor.prepareUnconfiguredConfigEntries(config.configEntries));
            if (processorsPromise) {
                promiseList.add(processorsPromise);
            }
            return true;
        }, this);
        return Promise.all(promiseList.getArray());
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

    process(instance) {
        if(instance.postConfig) {
            instance.postConfig();
        }
    }

}

const LOG$4 = new Logger("InstanceProcessorExecutor");

/**
 * Executes the configs instance processors on the provided instance
 * Returns a promise for when the config processors has completed running
 * 
 * Instance processors perform operations on managed instances after they have been instansiated
 */
class InstanceProcessorExecutor {

    /**
     * @param {List} instanceProcessorList the instance processors
     * @param {Object} instance the instance to process
     * @param {Config} config
     */
    static execute(instance, config) {
        config.instanceProcessors.forEach((processorName, parent) => {
            const processorHolder = ConfigAccessor.instanceHolder(processorName, config);
            processorHolder.instance.process(instance);
            return true;
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

    get(parameters = []) {
        /** @type {InstanceHolder} */
        const instanceHolder = ConfigAccessor.instanceHolder(this.typeConfig.name, this.config, parameters);
        if (instanceHolder.type === InstanceHolder.NEW_INSTANCE) {
            this.injector.injectTarget(instanceHolder.instance, this.config);
        }
        return instanceHolder.instance;
    }

}

const LOG$6 = new Logger("MindiInjector");

class MindiInjector extends Injector {

    static inject(target, config) {
        INJECTOR.injectTarget(target, config);
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
     * @param {any} target 
     * @param {Config} config 
     * @param {number} depth
     */
    injectTarget(target, config, depth = 0) {
        if (!target) {
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
        Object.keys(target).forEach(function(key,index) {
            if (target[key] instanceof InjectionPoint) {
                injector.injectProperty(target, key, config, depth);
            }
        });
        InstanceProcessorExecutor.execute(target, config);
    }

    /**
     * @param {object} target 
     * @param {string} key 
     * @param {Config} config 
     * @param {number} depth 
     */
    injectProperty(target, key, config, depth) {
        const injectionPoint = target[key];
        if (injectionPoint.type === InjectionPoint.PROVIDER_TYPE) {
            this.injectPropertyProvider(target, key, config, depth);
            return;
        }
        this.injectPropertyInstance(target, key, config);
    }

    /**
     * @param {object} target 
     * @param {string} key 
     * @param {Config} config 
     * @param {number} depth 
     */
    injectPropertyProvider(target, key, config) {
        /**
         * @type {InjectionPoint}
         */
        const injectionPoint = target[key];
        const typeConfig = ConfigAccessor.typeConfigByName(injectionPoint.name, config);
        target[key] = new MindiProvider(typeConfig, this, config);
    }

    /**
     * @param {object} target 
     * @param {string} key 
     * @param {Config} config 
     * @param {number} depth 
     */
    injectPropertyInstance(target, key, config, depth) {
        /**
         * @type {InjectionPoint}
         */
        const injectionPoint = target[key];
        const instanceHolder = ConfigAccessor.instanceHolder(injectionPoint.name, config, injectionPoint.parameters);
        if(instanceHolder.type === InstanceHolder.NEW_INSTANCE) {
            this.injectTarget(instanceHolder.instance, config, depth++);
        }
        target[key] = instanceHolder.instance;
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

    isFinalized() {
        return this.finalized;
    }

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWluZGlfdjEuanMiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9taW5kaS9hcGkvcHJvdmlkZXIuanMiLCIuLi8uLi9zcmMvbWluZGkvYXBpL2luamVjdGlvblBvaW50LmpzIiwiLi4vLi4vc3JjL21pbmRpL2NvbmZpZy5qcyIsIi4uLy4uL3NyYy9taW5kaS90eXBlQ29uZmlnL2luc3RhbmNlSG9sZGVyLmpzIiwiLi4vLi4vc3JjL21pbmRpL3R5cGVDb25maWcvdHlwZUNvbmZpZy5qcyIsIi4uLy4uL3NyYy9taW5kaS9jb25maWdBY2Nlc3Nvci5qcyIsIi4uLy4uL3NyYy9taW5kaS9pbmplY3Rvci5qcyIsIi4uLy4uL3NyYy9taW5kaS9jb25maWdQcm9jZXNzb3IvY29uZmlnUHJvY2Vzc29yRXhlY3V0b3IuanMiLCIuLi8uLi9zcmMvbWluZGkvaW5zdGFuY2VQcm9jZXNzb3IvaW5zdGFuY2VQb3N0Q29uZmlnVHJpZ2dlci5qcyIsIi4uLy4uL3NyYy9taW5kaS9pbnN0YW5jZVByb2Nlc3Nvci9pbnN0YW5jZVByb2Nlc3NvckV4ZWN1dG9yLmpzIiwiLi4vLi4vc3JjL21pbmRpL3R5cGVDb25maWcvc2luZ2xldG9uQ29uZmlnLmpzIiwiLi4vLi4vc3JjL21pbmRpL21pbmRpUHJvdmlkZXIuanMiLCIuLi8uLi9zcmMvbWluZGkvbWluZGlJbmplY3Rvci5qcyIsIi4uLy4uL3NyYy9taW5kaS9taW5kaUNvbmZpZy5qcyIsIi4uLy4uL3NyYy9taW5kaS90eXBlQ29uZmlnL3Bvb2xDb25maWcuanMiLCIuLi8uLi9zcmMvbWluZGkvdHlwZUNvbmZpZy9wcm90b3R5cGVDb25maWcuanMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTG9nZ2VyIH0gZnJvbSBcImNvcmV1dGlsX3YxXCI7XHJcblxyXG5jb25zdCBMT0cgPSBuZXcgTG9nZ2VyKFwiUHJvdmlkZXJcIik7XHJcblxyXG5leHBvcnQgY2xhc3MgUHJvdmlkZXIge1xyXG5cclxuICAgIGdldChwYXJhbWV0ZXJzID0gW10pIHtcclxuICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgIH1cclxuXHJcbn0iLCJpbXBvcnQgeyBQcm92aWRlciB9IGZyb20gXCIuL3Byb3ZpZGVyLmpzXCI7XHJcblxyXG5leHBvcnQgY2xhc3MgSW5qZWN0aW9uUG9pbnQge1xyXG5cclxuICAgIHN0YXRpYyBnZXQgSU5TVEFOQ0VfVFlQRSgpIHsgcmV0dXJuIDA7IH0gXHJcbiAgICBzdGF0aWMgZ2V0IFBST1ZJREVSX1RZUEUoKSB7IHJldHVybiAxOyB9IFxyXG5cclxuICAgIC8qKlxyXG4gICAgICogXHJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbmFtZSBcclxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNsYXNzUmVmZXJlbmNlIFxyXG4gICAgICogQHBhcmFtIHthcnJheX0gcGFyYW1ldGVycyBcclxuICAgICAqIEByZXR1cm5zIHtvYmplY3R9XHJcbiAgICAgKi9cclxuICAgIHN0YXRpYyBpbnN0YW5jZUJ5TmFtZShuYW1lLCBjbGFzc1JlZmVyZW5jZSwgcGFyYW1ldGVycyA9IFtdKSB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBJbmplY3Rpb25Qb2ludChuYW1lLCBjbGFzc1JlZmVyZW5jZSwgSW5qZWN0aW9uUG9pbnQuSU5TVEFOQ0VfVFlQRSwgcGFyYW1ldGVycyk7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBcclxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNsYXNzUmVmZXJlbmNlIFxyXG4gICAgICogQHBhcmFtIHthcnJheX0gcGFyYW1ldGVycyBcclxuICAgICAqIEByZXR1cm5zIHtvYmplY3R9XHJcbiAgICAgKi9cclxuICAgIHN0YXRpYyBpbnN0YW5jZShjbGFzc1JlZmVyZW5jZSwgcGFyYW1ldGVycyA9IFtdKSB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBJbmplY3Rpb25Qb2ludChjbGFzc1JlZmVyZW5jZS5uYW1lLCBjbGFzc1JlZmVyZW5jZSwgSW5qZWN0aW9uUG9pbnQuSU5TVEFOQ0VfVFlQRSwgcGFyYW1ldGVycyk7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBcclxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBuYW1lIFxyXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2xhc3NSZWZlcmVuY2UgXHJcbiAgICAgKiBAcmV0dXJucyB7UHJvdmlkZXJ9XHJcbiAgICAgKi9cclxuICAgIHN0YXRpYyBwcm92aWRlckJ5TmFtZShuYW1lLCBjbGFzc1JlZmVyZW5jZSkge1xyXG4gICAgICAgIHJldHVybiBuZXcgSW5qZWN0aW9uUG9pbnQobmFtZSwgY2xhc3NSZWZlcmVuY2UsIEluamVjdGlvblBvaW50LlBST1ZJREVSX1RZUEUpO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogXHJcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjbGFzc1JlZmVyZW5jZSBcclxuICAgICAqIEByZXR1cm5zIHtQcm92aWRlcn1cclxuICAgICAqL1xyXG4gICAgc3RhdGljIHByb3ZpZGVyKGNsYXNzUmVmZXJlbmNlKSB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBJbmplY3Rpb25Qb2ludChjbGFzc1JlZmVyZW5jZS5uYW1lLCBjbGFzc1JlZmVyZW5jZSwgSW5qZWN0aW9uUG9pbnQuUFJPVklERVJfVFlQRSk7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3RydWN0b3IobmFtZSwgY2xhc3NSZWZlcmVuY2UsIHR5cGUgPSBJbmplY3Rpb25Qb2ludC5JTlNUQU5DRV9UWVBFLCBwYXJhbWV0ZXJzID0gbnVsbCkge1xyXG4gICAgICAgIHRoaXMubmFtZSA9IG5hbWU7XHJcbiAgICAgICAgdGhpcy5jbGFzc1JlZmVyZW5jZSA9IGNsYXNzUmVmZXJlbmNlO1xyXG4gICAgICAgIHRoaXMudHlwZSA9IHR5cGU7XHJcbiAgICAgICAgdGhpcy5wYXJhbWV0ZXJzID0gcGFyYW1ldGVycztcclxuICAgIH1cclxuXHJcbn0iLCJleHBvcnQgY2xhc3MgQ29uZmlnIHtcclxuXHJcbiAgICBjb25zdHJ1Y3RvcigpIHtcclxuICAgICAgICAvKiogQHR5cGUge01hcH0gKi9cclxuICAgICAgICB0aGlzLmNvbmZpZ0VudHJpZXMgPSBudWxsO1xyXG5cclxuICAgICAgICAvKiogQHR5cGUge0xpc3R9ICovXHJcbiAgICAgICAgdGhpcy5jb25maWdQcm9jZXNzb3JzID0gbnVsbDtcclxuXHJcbiAgICAgICAgLyoqIEB0eXBlIHtMaXN0fSAqL1xyXG4gICAgICAgIHRoaXMuaW5zdGFuY2VQcm9jZXNzb3JzID0gbnVsbDtcclxuICAgIH1cclxuXHJcbiAgICBpc0ZpbmFsaXplZCgpIHtcclxuICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9XHJcbn0iLCJleHBvcnQgY2xhc3MgSW5zdGFuY2VIb2xkZXIge1xyXG5cclxuICAgIHN0YXRpYyBnZXQgTkVXX0lOU1RBTkNFKCkgeyByZXR1cm4gMDsgfVxyXG5cclxuICAgIHN0YXRpYyBnZXQgRVhJU1RJTkdfSU5TVEFOQ0UoKSB7IHJldHVybiAxOyB9XHJcblxyXG4gICAgc3RhdGljIGhvbGRlcldpdGhOZXdJbnN0YW5jZShpbnN0YW5jZSkge1xyXG4gICAgICAgIHJldHVybiBuZXcgSW5zdGFuY2VIb2xkZXIoaW5zdGFuY2UsIEluc3RhbmNlSG9sZGVyLk5FV19JTlNUQU5DRSk7XHJcbiAgICB9XHJcblxyXG4gICAgc3RhdGljIGhvbGRlcldpdGhFeGlzdGluZ0luc3RhbmNlKGluc3RhbmNlKSB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBJbnN0YW5jZUhvbGRlcihpbnN0YW5jZSwgSW5zdGFuY2VIb2xkZXIuRVhJU1RJTkdfSU5TVEFOQ0UpO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0cnVjdG9yKGluc3RhbmNlLCB0eXBlKSB7XHJcbiAgICAgICAgdGhpcy5pbnN0YW5jZSA9IGluc3RhbmNlO1xyXG4gICAgICAgIHRoaXMudHlwZSA9IHR5cGU7XHJcbiAgICB9XHJcblxyXG59IiwiZXhwb3J0IGNsYXNzIFR5cGVDb25maWcge1xyXG5cclxuICAgIHN0YXRpYyBnZXQgTkVXKCkgeyByZXR1cm4gXCJORVdcIjsgfVxyXG4gICAgc3RhdGljIGdldCBDT05GSUdVUkVEKCkgeyByZXR1cm4gXCJDT05GSUdVUkVEXCI7IH1cclxuXHJcbiAgICBjb25zdHJ1Y3RvcihuYW1lLCBjbGFzc1JlZmVyZW5jZSkge1xyXG4gICAgICAgIHRoaXMubmFtZSA9IG5hbWU7XHJcbiAgICAgICAgdGhpcy5jbGFzc1JlZmVyZW5jZSA9IGNsYXNzUmVmZXJlbmNlO1xyXG4gICAgICAgIHRoaXMuc3RhZ2UgPSBUeXBlQ29uZmlnLk5FVztcclxuICAgIH1cclxuXHJcbiAgICBpbnN0YW5jZUhvbGRlcihwYXJhbWV0ZXJzID0gW10pIHtcclxuICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgIH1cclxuXHJcbn0iLCJpbXBvcnQgeyBDb25maWcgfSBmcm9tIFwiLi9jb25maWcuanNcIjtcclxuaW1wb3J0IHsgTG9nZ2VyIH0gZnJvbSBcImNvcmV1dGlsX3YxXCI7XHJcbmltcG9ydCB7IEluc3RhbmNlSG9sZGVyIH0gZnJvbSBcIi4vdHlwZUNvbmZpZy9pbnN0YW5jZUhvbGRlci5qc1wiO1xyXG5pbXBvcnQgeyBUeXBlQ29uZmlnIH0gZnJvbSBcIi4vdHlwZUNvbmZpZy90eXBlQ29uZmlnLmpzXCI7XHJcblxyXG4vKipcclxuICogVXRpbGl0aWVzIGZvciBhY2Nlc3NpbmcgYSBDb25maWcgb2JqZWN0XHJcbiAqL1xyXG5cclxuY29uc3QgTE9HID0gbmV3IExvZ2dlcihcIkNvbmZpZ0FjY2Vzc29yXCIpO1xyXG5cclxuZXhwb3J0IGNsYXNzIENvbmZpZ0FjY2Vzc29yIHtcclxuXHJcbiAgICAvKipcclxuICAgICAqIEdldCBhbiBpbnN0YW5jZSBieSBjbGFzcyBuYW1lIGluIHRoZSBjb25maWdcclxuICAgICAqIFxyXG4gICAgICogQHBhcmFtIHtDb25maWd9IGNvbmZpZyBcclxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBuYW1lIFxyXG4gICAgICogQHBhcmFtIHtBcnJheX0gcGFyYW1ldGVyc1xyXG4gICAgICogQHJldHVybnMge0luc3RhbmNlSG9sZGVyfVxyXG4gICAgICovXHJcbiAgICBzdGF0aWMgaW5zdGFuY2VIb2xkZXIobmFtZSwgY29uZmlnLCBwYXJhbWV0ZXJzID0gW10pIHtcclxuICAgICAgICBjb25zdCB0eXBlQ29uZmlnID0gdGhpcy50eXBlQ29uZmlnQnlOYW1lKG5hbWUsIGNvbmZpZyk7XHJcbiAgICAgICAgaWYodHlwZUNvbmZpZyA9PT0gbnVsbCkge1xyXG4gICAgICAgICAgICBMT0cuZXJyb3IoXCJObyB0eXBlY29uZmlnIGZvdW5kIGZvciBcIiArIG5hbWUpO1xyXG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICB9XHJcbiAgICAgICAgY29uc3QgaW5zdGFuY2VIb2xkZXIgPSB0eXBlQ29uZmlnLmluc3RhbmNlSG9sZGVyKHBhcmFtZXRlcnMpO1xyXG4gICAgICAgIGlmKCFpbnN0YW5jZUhvbGRlcikge1xyXG4gICAgICAgICAgICBMT0cuZXJyb3IoXCJObyBvYmplY3QgZm91bmQgZm9yIFwiICsgbmFtZSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBpbnN0YW5jZUhvbGRlcjtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIEdldCB0aGUgdHlwZSBjb25maWcgYnkgY2xhc3MgbmFtZSBpbiB0aGUgY29uZmlnXHJcbiAgICAgKiBcclxuICAgICAqIEBwYXJhbSB7Q29uZmlnfSBjb25maWcgXHJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbmFtZSBcclxuICAgICAqIEByZXR1cm5zIHtUeXBlQ29uZmlnfVxyXG4gICAgICovXHJcbiAgICBzdGF0aWMgdHlwZUNvbmZpZ0J5TmFtZShuYW1lLCBjb25maWcpIHtcclxuICAgICAgICBsZXQgY29uZmlnRW50cnkgPSBudWxsO1xyXG4gICAgICAgIGNvbmZpZy5jb25maWdFbnRyaWVzLmZvckVhY2goKGtleSwgdmFsdWUsIHBhcmVudCkgPT4ge1xyXG4gICAgICAgICAgICBpZihrZXkgPT09IG5hbWUpIHtcclxuICAgICAgICAgICAgICAgIGNvbmZpZ0VudHJ5ID0gdmFsdWU7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgfSwgdGhpcyk7XHJcbiAgICAgICAgaWYoIWNvbmZpZ0VudHJ5KSB7XHJcbiAgICAgICAgICAgIExPRy5lcnJvcihcIk5vIGNvbmZpZyBlbnRyeSBmb3VuZCBmb3IgXCIgKyBuYW1lKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGNvbmZpZ0VudHJ5O1xyXG4gICAgfVxyXG5cclxufSIsImV4cG9ydCBjbGFzcyBJbmplY3RvciB7XHJcblxyXG4gICAgaW5qZWN0VGFyZ2V0KHRhcmdldCwgY29uZmlnLCBkZXB0aCA9IDApIHtcclxuXHJcbiAgICB9XHJcblxyXG59IiwiaW1wb3J0IHsgTWFwLCBMb2dnZXIsIExpc3QgfSBmcm9tIFwiY29yZXV0aWxfdjFcIjtcclxuaW1wb3J0IHsgQ29uZmlnIH0gZnJvbSBcIi4uL2NvbmZpZy5qc1wiO1xyXG5pbXBvcnQgeyBDb25maWdBY2Nlc3NvciB9IGZyb20gXCIuLi9jb25maWdBY2Nlc3Nvci5qc1wiO1xyXG5pbXBvcnQgeyBJbmplY3RvciB9IGZyb20gXCIuLi9pbmplY3Rvci5qc1wiO1xyXG5pbXBvcnQgeyBJbnN0YW5jZUhvbGRlciB9IGZyb20gXCIuLi90eXBlQ29uZmlnL2luc3RhbmNlSG9sZGVyLmpzXCI7XHJcbmltcG9ydCB7IFR5cGVDb25maWcgfSBmcm9tIFwiLi4vdHlwZUNvbmZpZy90eXBlQ29uZmlnLmpzXCI7XHJcblxyXG5jb25zdCBMT0cgPSBuZXcgTG9nZ2VyKFwiQ29uZmlnUHJvY2Vzc29yRXhlY3V0b3JcIik7XHJcblxyXG4vKipcclxuICogRXhlY3V0ZXMgdGhlIHByb3ZpZGVkIGNvbmZpZyBwcm9jZXNzb3JzIG9uIHRoZSBwcm92aWRlZCBjb25maWcgcmVnaXN0cnlcclxuICogUmV0dXJucyBhIGxpc3Qgb2YgcHJvbWlzZXMgZm9yIHdoZW4gdGhlIGNvbmZpZyBwcm9jZXNzb3JzIGhhcyBjb21wbGV0ZWQgcnVubmluZ1xyXG4gKiBcclxuICogQSBjb25maWcgcHJvY2Vzc29yIHJlYWRzIHRoZSBjb25maWcgYW5kIHBlcmZvcm1zIGFueSBuZWNlc3NhcnkgYWN0aW9ucyBiYXNlZCBvblxyXG4gKiBjbGFzcyBhbmQgdHlwZSBpbmZvcm1hdGlvbi4gQSBjb25maWcgcHJvY2Vzc29yIGRvZXMgbm90IG9wZXJhdGUgb24gbWFuYWdlZCBpbnN0YW5jZXNcclxuICovXHJcbmV4cG9ydCBjbGFzcyBDb25maWdQcm9jZXNzb3JFeGVjdXRvciB7XHJcbiAgICBcclxuICAgIC8qKlxyXG4gICAgICogQHBhcmFtIHtMaXN0fSBjb25maWdQcm9jZXNzb3JDbGFzc0xpc3RcclxuICAgICAqIEBwYXJhbSB7SW5qZWN0b3J9IGluamVjdG9yXHJcbiAgICAgKiBAcGFyYW0ge0NvbmZpZ30gY29uZmlnXHJcbiAgICAgKiBAcmV0dXJucyB7UHJvbWlzZX0gcHJvbWlzZSB3aGljaCBpcyByZXNvbHZlZCB3aGVuIGFsbCBjb25maWcgcHJvY2Vzc29ycyBhcmUgcmVzb2x2ZWRcclxuICAgICAqL1xyXG4gICAgc3RhdGljIGV4ZWN1dGUoY29uZmlnUHJvY2Vzc29yQ2xhc3NOYW1lTGlzdCwgaW5qZWN0b3IsIGNvbmZpZykge1xyXG4gICAgICAgIGNvbnN0IHByb21pc2VMaXN0ID0gbmV3IExpc3QoKTtcclxuICAgICAgICBjb25maWdQcm9jZXNzb3JDbGFzc05hbWVMaXN0LmZvckVhY2goKGNvbmZpZ1Byb2Nlc3NvckNsYXNzTmFtZSwgcGFyZW50KSA9PiB7XHJcbiAgICAgICAgICAgIC8qKiAgQHR5cGUge0luc3RhbmNlSG9sZGVyfSAqL1xyXG4gICAgICAgICAgICBjb25zdCBwcm9jZXNzb3JIb2xkZXIgPSBDb25maWdBY2Nlc3Nvci5pbnN0YW5jZUhvbGRlcihjb25maWdQcm9jZXNzb3JDbGFzc05hbWUsIGNvbmZpZyk7XHJcbiAgICAgICAgICAgIGlmKHByb2Nlc3NvckhvbGRlci50eXBlID09PSBJbnN0YW5jZUhvbGRlci5ORVdfSU5TVEFOQ0UpIHtcclxuICAgICAgICAgICAgICAgIGluamVjdG9yLmluamVjdFRhcmdldChwcm9jZXNzb3JIb2xkZXIuaW5zdGFuY2UsIGNvbmZpZyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgY29uc3QgcHJvY2Vzc29yc1Byb21pc2UgPSBwcm9jZXNzb3JIb2xkZXIuaW5zdGFuY2UucHJvY2Vzc0NvbmZpZyhjb25maWcsIFxyXG4gICAgICAgICAgICAgICAgQ29uZmlnUHJvY2Vzc29yRXhlY3V0b3IucHJlcGFyZVVuY29uZmlndXJlZENvbmZpZ0VudHJpZXMoY29uZmlnLmNvbmZpZ0VudHJpZXMpKTtcclxuICAgICAgICAgICAgaWYgKHByb2Nlc3NvcnNQcm9taXNlKSB7XHJcbiAgICAgICAgICAgICAgICBwcm9taXNlTGlzdC5hZGQocHJvY2Vzc29yc1Byb21pc2UpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgIH0sIHRoaXMpO1xyXG4gICAgICAgIHJldHVybiBQcm9taXNlLmFsbChwcm9taXNlTGlzdC5nZXRBcnJheSgpKTtcclxuICAgIH1cclxuXHJcbiAgICBzdGF0aWMgcHJlcGFyZVVuY29uZmlndXJlZENvbmZpZ0VudHJpZXMoY29uZmlnRW50cmllcykge1xyXG4gICAgICAgIGNvbnN0IHVuY29uZmlndXJlZENvbmZpZ0VudHJpZXMgPSBuZXcgTWFwKCk7XHJcblxyXG4gICAgICAgIGNvbmZpZ0VudHJpZXMuZm9yRWFjaCgoa2V5LCB2YWx1ZSwgcGFyZW50KSA9PiB7XHJcblxyXG4gICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICogQHR5cGUge1R5cGVDb25maWd9XHJcbiAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICBjb25zdCBjb25maWdFbnRyeSA9IHZhbHVlO1xyXG5cclxuICAgICAgICAgICAgaWYoY29uZmlnRW50cnkuc3RhZ2UgPT09IFR5cGVDb25maWcuTkVXKSB7XHJcbiAgICAgICAgICAgICAgICB1bmNvbmZpZ3VyZWRDb25maWdFbnRyaWVzLnNldChrZXksIGNvbmZpZ0VudHJ5KTtcclxuICAgICAgICAgICAgICAgIGNvbmZpZ0VudHJ5LnN0YWdlID0gVHlwZUNvbmZpZy5DT05GSUdVUkVEO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICB9LCB0aGlzKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHVuY29uZmlndXJlZENvbmZpZ0VudHJpZXM7XHJcbiAgICB9XHJcblxyXG59IiwiaW1wb3J0IHsgTG9nZ2VyIH0gZnJvbSBcImNvcmV1dGlsX3YxXCI7XHJcblxyXG5jb25zdCBMT0cgPSBuZXcgTG9nZ2VyKFwiSW5zdGFuY2VQb3N0Q29uZmlnVHJpZ2dlclwiKTtcclxuXHJcbi8qKlxyXG4gKiBJbnN0YW5jZSBwcm9jZXNzb3Igd2hpY2ggY2FsbHMgcG9zdENvbmZpZyBvbiBvYmplY3RzIGFmdGVyIGNvbmZpZ1Byb2Nlc3NvcnMgYXJlIGZpbmlzaGVkXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgSW5zdGFuY2VQb3N0Q29uZmlnVHJpZ2dlciB7XHJcblxyXG4gICAgcHJvY2VzcyhpbnN0YW5jZSkge1xyXG4gICAgICAgIGlmKGluc3RhbmNlLnBvc3RDb25maWcpIHtcclxuICAgICAgICAgICAgaW5zdGFuY2UucG9zdENvbmZpZygpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbn0iLCJpbXBvcnQgeyBMb2dnZXIsIExpc3QgfSBmcm9tIFwiY29yZXV0aWxfdjFcIjtcclxuaW1wb3J0IHsgQ29uZmlnQWNjZXNzb3IgfSBmcm9tIFwiLi4vY29uZmlnQWNjZXNzb3IuanNcIjtcclxuaW1wb3J0IHsgQ29uZmlnIH0gZnJvbSBcIi4uL2NvbmZpZy5qc1wiO1xyXG5cclxuY29uc3QgTE9HID0gbmV3IExvZ2dlcihcIkluc3RhbmNlUHJvY2Vzc29yRXhlY3V0b3JcIik7XHJcblxyXG4vKipcclxuICogRXhlY3V0ZXMgdGhlIGNvbmZpZ3MgaW5zdGFuY2UgcHJvY2Vzc29ycyBvbiB0aGUgcHJvdmlkZWQgaW5zdGFuY2VcclxuICogUmV0dXJucyBhIHByb21pc2UgZm9yIHdoZW4gdGhlIGNvbmZpZyBwcm9jZXNzb3JzIGhhcyBjb21wbGV0ZWQgcnVubmluZ1xyXG4gKiBcclxuICogSW5zdGFuY2UgcHJvY2Vzc29ycyBwZXJmb3JtIG9wZXJhdGlvbnMgb24gbWFuYWdlZCBpbnN0YW5jZXMgYWZ0ZXIgdGhleSBoYXZlIGJlZW4gaW5zdGFuc2lhdGVkXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgSW5zdGFuY2VQcm9jZXNzb3JFeGVjdXRvciB7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBAcGFyYW0ge0xpc3R9IGluc3RhbmNlUHJvY2Vzc29yTGlzdCB0aGUgaW5zdGFuY2UgcHJvY2Vzc29yc1xyXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGluc3RhbmNlIHRoZSBpbnN0YW5jZSB0byBwcm9jZXNzXHJcbiAgICAgKiBAcGFyYW0ge0NvbmZpZ30gY29uZmlnXHJcbiAgICAgKi9cclxuICAgIHN0YXRpYyBleGVjdXRlKGluc3RhbmNlLCBjb25maWcpIHtcclxuICAgICAgICBjb25maWcuaW5zdGFuY2VQcm9jZXNzb3JzLmZvckVhY2goKHByb2Nlc3Nvck5hbWUsIHBhcmVudCkgPT4ge1xyXG4gICAgICAgICAgICBjb25zdCBwcm9jZXNzb3JIb2xkZXIgPSBDb25maWdBY2Nlc3Nvci5pbnN0YW5jZUhvbGRlcihwcm9jZXNzb3JOYW1lLCBjb25maWcpO1xyXG4gICAgICAgICAgICBwcm9jZXNzb3JIb2xkZXIuaW5zdGFuY2UucHJvY2VzcyhpbnN0YW5jZSk7XHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgIH0sIHRoaXMpO1xyXG4gICAgfVxyXG5cclxufSIsImltcG9ydCB7IFR5cGVDb25maWcgfSBmcm9tIFwiLi90eXBlQ29uZmlnLmpzXCI7XHJcbmltcG9ydCB7IExvZ2dlciB9IGZyb20gXCJjb3JldXRpbF92MVwiO1xyXG5pbXBvcnQgeyBJbnN0YW5jZUhvbGRlciB9IGZyb20gXCIuL2luc3RhbmNlSG9sZGVyLmpzXCI7XHJcblxyXG5jb25zdCBMT0cgPSBuZXcgTG9nZ2VyKFwiU2luZ2xldG9uQ29uZmlnXCIpO1xyXG5cclxuZXhwb3J0IGNsYXNzIFNpbmdsZXRvbkNvbmZpZyBleHRlbmRzIFR5cGVDb25maWcge1xyXG5cclxuICAgIHN0YXRpYyBuYW1lZChuYW1lLCBjbGFzc1JlZmVyZW5jZSkge1xyXG4gICAgICAgIHJldHVybiBuZXcgU2luZ2xldG9uQ29uZmlnKG5hbWUsIGNsYXNzUmVmZXJlbmNlKTtcclxuICAgIH1cclxuXHJcbiAgICBzdGF0aWMgdW5uYW1lZChjbGFzc1JlZmVyZW5jZSkge1xyXG4gICAgICAgIHJldHVybiBuZXcgU2luZ2xldG9uQ29uZmlnKGNsYXNzUmVmZXJlbmNlLm5hbWUsIGNsYXNzUmVmZXJlbmNlKTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdHJ1Y3RvcihuYW1lLCBjbGFzc1JlZmVyZW5jZSkge1xyXG4gICAgICAgIHN1cGVyKG5hbWUsIGNsYXNzUmVmZXJlbmNlKTtcclxuICAgIH1cclxuXHJcbiAgICBpbnN0YW5jZUhvbGRlcihwYXJhbWV0ZXJzID0gW10pIHtcclxuICAgICAgICBpZiAoIXRoaXMuaW5zdGFuY2UpIHtcclxuICAgICAgICAgICAgaWYocGFyYW1ldGVycyAmJiBwYXJhbWV0ZXJzLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuaW5zdGFuY2UgPSBuZXcgdGhpcy5jbGFzc1JlZmVyZW5jZSguLi5wYXJhbWV0ZXJzKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuaW5zdGFuY2UgPSBuZXcgdGhpcy5jbGFzc1JlZmVyZW5jZSgpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiBJbnN0YW5jZUhvbGRlci5ob2xkZXJXaXRoTmV3SW5zdGFuY2UodGhpcy5pbnN0YW5jZSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBJbnN0YW5jZUhvbGRlci5ob2xkZXJXaXRoRXhpc3RpbmdJbnN0YW5jZSh0aGlzLmluc3RhbmNlKTtcclxuICAgIH1cclxuXHJcbn0iLCJpbXBvcnQgeyBQcm92aWRlciB9IGZyb20gXCIuL2FwaS9wcm92aWRlci5qc1wiO1xyXG5pbXBvcnQgeyBUeXBlQ29uZmlnIH0gZnJvbSBcIi4vdHlwZUNvbmZpZy90eXBlQ29uZmlnLmpzXCI7XHJcbmltcG9ydCB7IEluc3RhbmNlSG9sZGVyIH0gZnJvbSBcIi4vdHlwZUNvbmZpZy9pbnN0YW5jZUhvbGRlci5qc1wiO1xyXG5pbXBvcnQgeyBJbmplY3RvciB9IGZyb20gXCIuL2luamVjdG9yLmpzXCI7XHJcbmltcG9ydCB7IENvbmZpZyB9IGZyb20gXCIuL2NvbmZpZy5qc1wiO1xyXG5pbXBvcnQgeyBDb25maWdBY2Nlc3NvciB9IGZyb20gXCIuL2NvbmZpZ0FjY2Vzc29yLmpzXCI7XHJcblxyXG5leHBvcnQgY2xhc3MgTWluZGlQcm92aWRlciBleHRlbmRzIFByb3ZpZGVyIHtcclxuXHJcbiAgICAvKipcclxuICAgICAqIFxyXG4gICAgICogQHBhcmFtIHtUeXBlQ29uZmlnfSB0eXBlQ29uZmlnIFxyXG4gICAgICovXHJcbiAgICBjb25zdHJ1Y3Rvcih0eXBlQ29uZmlnLCBpbmplY3RvciwgY29uZmlnKSB7XHJcblxyXG4gICAgICAgIHN1cGVyKCk7XHJcblxyXG4gICAgICAgIC8qKiBAdHlwZSB7VHlwZUNvbmZpZ30gKi9cclxuICAgICAgICB0aGlzLnR5cGVDb25maWcgPSB0eXBlQ29uZmlnO1xyXG5cclxuICAgICAgICAvKiogQHR5cGUge0luamVjdG9yfSAqL1xyXG4gICAgICAgIHRoaXMuaW5qZWN0b3IgPSBpbmplY3RvcjtcclxuXHJcbiAgICAgICAgLyoqIEB0eXBlIHtDb25maWd9ICovXHJcbiAgICAgICAgdGhpcy5jb25maWcgPSBjb25maWc7XHJcbiAgICB9XHJcblxyXG4gICAgZ2V0KHBhcmFtZXRlcnMgPSBbXSkge1xyXG4gICAgICAgIC8qKiBAdHlwZSB7SW5zdGFuY2VIb2xkZXJ9ICovXHJcbiAgICAgICAgY29uc3QgaW5zdGFuY2VIb2xkZXIgPSBDb25maWdBY2Nlc3Nvci5pbnN0YW5jZUhvbGRlcih0aGlzLnR5cGVDb25maWcubmFtZSwgdGhpcy5jb25maWcsIHBhcmFtZXRlcnMpO1xyXG4gICAgICAgIGlmIChpbnN0YW5jZUhvbGRlci50eXBlID09PSBJbnN0YW5jZUhvbGRlci5ORVdfSU5TVEFOQ0UpIHtcclxuICAgICAgICAgICAgdGhpcy5pbmplY3Rvci5pbmplY3RUYXJnZXQoaW5zdGFuY2VIb2xkZXIuaW5zdGFuY2UsIHRoaXMuY29uZmlnKVxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gaW5zdGFuY2VIb2xkZXIuaW5zdGFuY2U7XHJcbiAgICB9XHJcblxyXG59IiwiaW1wb3J0IHsgTG9nZ2VyIH0gZnJvbSBcImNvcmV1dGlsX3YxXCI7XHJcbmltcG9ydCB7IENvbmZpZyB9IGZyb20gXCIuL2NvbmZpZy5qc1wiO1xyXG5pbXBvcnQgeyBDb25maWdBY2Nlc3NvciB9IGZyb20gXCIuL2NvbmZpZ0FjY2Vzc29yLmpzXCI7XHJcbmltcG9ydCB7IEluamVjdGlvblBvaW50IH0gZnJvbSBcIi4vYXBpL2luamVjdGlvblBvaW50LmpzXCJcclxuaW1wb3J0IHsgSW5zdGFuY2VQcm9jZXNzb3JFeGVjdXRvciB9IGZyb20gXCIuL2luc3RhbmNlUHJvY2Vzc29yL2luc3RhbmNlUHJvY2Vzc29yRXhlY3V0b3IuanNcIjtcclxuaW1wb3J0IHsgSW5zdGFuY2VIb2xkZXIgfSBmcm9tIFwiLi90eXBlQ29uZmlnL2luc3RhbmNlSG9sZGVyLmpzXCI7XHJcbmltcG9ydCB7IE1pbmRpUHJvdmlkZXIgfSBmcm9tIFwiLi9taW5kaVByb3ZpZGVyLmpzXCI7XHJcbmltcG9ydCB7IEluamVjdG9yIH0gZnJvbSBcIi4vaW5qZWN0b3IuanNcIjtcclxuXHJcbmNvbnN0IExPRyA9IG5ldyBMb2dnZXIoXCJNaW5kaUluamVjdG9yXCIpO1xyXG5cclxuZXhwb3J0IGNsYXNzIE1pbmRpSW5qZWN0b3IgZXh0ZW5kcyBJbmplY3RvciB7XHJcblxyXG4gICAgc3RhdGljIGluamVjdCh0YXJnZXQsIGNvbmZpZykge1xyXG4gICAgICAgIElOSkVDVE9SLmluamVjdFRhcmdldCh0YXJnZXQsIGNvbmZpZyk7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBAcmV0dXJucyB7TWluZGlJbmplY3Rvcn1cclxuICAgICAqL1xyXG4gICAgc3RhdGljIGdldEluc3RhbmNlKCkge1xyXG4gICAgICAgIHJldHVybiBJTkpFQ1RPUjtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIEhlbHBlciBtZXRob2QgZm9yIGluamVjdGluZyBmaWVsZHMgaW4gdGFyZ2V0IG9iamVjdFxyXG4gICAgICogXHJcbiAgICAgKiBAcGFyYW0ge2FueX0gdGFyZ2V0IFxyXG4gICAgICogQHBhcmFtIHtDb25maWd9IGNvbmZpZyBcclxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBkZXB0aFxyXG4gICAgICovXHJcbiAgICBpbmplY3RUYXJnZXQodGFyZ2V0LCBjb25maWcsIGRlcHRoID0gMCkge1xyXG4gICAgICAgIGlmICghdGFyZ2V0KSB7XHJcbiAgICAgICAgICAgIHRocm93IEVycm9yKFwiTWlzc2luZyB0YXJnZXQgb2JqZWN0XCIpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoIWNvbmZpZykge1xyXG4gICAgICAgICAgICB0aHJvdyBFcnJvcihcIk1pc3NpbmcgY29uZmlnXCIpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoIWNvbmZpZy5pc0ZpbmFsaXplZCgpKSB7XHJcbiAgICAgICAgICAgIHRocm93IEVycm9yKFwiQ29uZmlnIG5vdCBmaW5hbGl6ZWRcIik7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChkZXB0aCA+IDEwKSB7XHJcbiAgICAgICAgICAgIHRocm93IEVycm9yKFwiSW5qZWN0aW9uIHN0cnVjdHVyZSB0b28gZGVlcFwiKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgY29uc3QgaW5qZWN0b3IgPSB0aGlzO1xyXG4gICAgICAgIE9iamVjdC5rZXlzKHRhcmdldCkuZm9yRWFjaChmdW5jdGlvbihrZXksaW5kZXgpIHtcclxuICAgICAgICAgICAgaWYgKHRhcmdldFtrZXldIGluc3RhbmNlb2YgSW5qZWN0aW9uUG9pbnQpIHtcclxuICAgICAgICAgICAgICAgIGluamVjdG9yLmluamVjdFByb3BlcnR5KHRhcmdldCwga2V5LCBjb25maWcsIGRlcHRoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIEluc3RhbmNlUHJvY2Vzc29yRXhlY3V0b3IuZXhlY3V0ZSh0YXJnZXQsIGNvbmZpZyk7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gdGFyZ2V0IFxyXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGtleSBcclxuICAgICAqIEBwYXJhbSB7Q29uZmlnfSBjb25maWcgXHJcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gZGVwdGggXHJcbiAgICAgKi9cclxuICAgIGluamVjdFByb3BlcnR5KHRhcmdldCwga2V5LCBjb25maWcsIGRlcHRoKSB7XHJcbiAgICAgICAgY29uc3QgaW5qZWN0aW9uUG9pbnQgPSB0YXJnZXRba2V5XTtcclxuICAgICAgICBpZiAoaW5qZWN0aW9uUG9pbnQudHlwZSA9PT0gSW5qZWN0aW9uUG9pbnQuUFJPVklERVJfVFlQRSkge1xyXG4gICAgICAgICAgICB0aGlzLmluamVjdFByb3BlcnR5UHJvdmlkZXIodGFyZ2V0LCBrZXksIGNvbmZpZywgZGVwdGgpO1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRoaXMuaW5qZWN0UHJvcGVydHlJbnN0YW5jZSh0YXJnZXQsIGtleSwgY29uZmlnKTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSB0YXJnZXQgXHJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30ga2V5IFxyXG4gICAgICogQHBhcmFtIHtDb25maWd9IGNvbmZpZyBcclxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBkZXB0aCBcclxuICAgICAqL1xyXG4gICAgaW5qZWN0UHJvcGVydHlQcm92aWRlcih0YXJnZXQsIGtleSwgY29uZmlnKSB7XHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogQHR5cGUge0luamVjdGlvblBvaW50fVxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIGNvbnN0IGluamVjdGlvblBvaW50ID0gdGFyZ2V0W2tleV07XHJcbiAgICAgICAgY29uc3QgdHlwZUNvbmZpZyA9IENvbmZpZ0FjY2Vzc29yLnR5cGVDb25maWdCeU5hbWUoaW5qZWN0aW9uUG9pbnQubmFtZSwgY29uZmlnKTtcclxuICAgICAgICB0YXJnZXRba2V5XSA9IG5ldyBNaW5kaVByb3ZpZGVyKHR5cGVDb25maWcsIHRoaXMsIGNvbmZpZyk7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gdGFyZ2V0IFxyXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGtleSBcclxuICAgICAqIEBwYXJhbSB7Q29uZmlnfSBjb25maWcgXHJcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gZGVwdGggXHJcbiAgICAgKi9cclxuICAgIGluamVjdFByb3BlcnR5SW5zdGFuY2UodGFyZ2V0LCBrZXksIGNvbmZpZywgZGVwdGgpIHtcclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBAdHlwZSB7SW5qZWN0aW9uUG9pbnR9XHJcbiAgICAgICAgICovXHJcbiAgICAgICAgY29uc3QgaW5qZWN0aW9uUG9pbnQgPSB0YXJnZXRba2V5XTtcclxuICAgICAgICBjb25zdCBpbnN0YW5jZUhvbGRlciA9IENvbmZpZ0FjY2Vzc29yLmluc3RhbmNlSG9sZGVyKGluamVjdGlvblBvaW50Lm5hbWUsIGNvbmZpZywgaW5qZWN0aW9uUG9pbnQucGFyYW1ldGVycyk7XHJcbiAgICAgICAgaWYoaW5zdGFuY2VIb2xkZXIudHlwZSA9PT0gSW5zdGFuY2VIb2xkZXIuTkVXX0lOU1RBTkNFKSB7XHJcbiAgICAgICAgICAgIHRoaXMuaW5qZWN0VGFyZ2V0KGluc3RhbmNlSG9sZGVyLmluc3RhbmNlLCBjb25maWcsIGRlcHRoKyspO1xyXG4gICAgICAgIH1cclxuICAgICAgICB0YXJnZXRba2V5XSA9IGluc3RhbmNlSG9sZGVyLmluc3RhbmNlO1xyXG4gICAgfVxyXG5cclxufVxyXG5cclxuY29uc3QgSU5KRUNUT1IgPSBuZXcgTWluZGlJbmplY3RvcigpOyIsImltcG9ydCB7IE1hcCwgTGlzdCwgTG9nZ2VyIH0gZnJvbSBcImNvcmV1dGlsX3YxXCI7XHJcbmltcG9ydCB7IFR5cGVDb25maWcgfSBmcm9tIFwiLi90eXBlQ29uZmlnL3R5cGVDb25maWcuanNcIjtcclxuaW1wb3J0IHsgQ29uZmlnUHJvY2Vzc29yRXhlY3V0b3IgfSBmcm9tIFwiLi9jb25maWdQcm9jZXNzb3IvY29uZmlnUHJvY2Vzc29yRXhlY3V0b3IuanNcIjtcclxuaW1wb3J0IHsgU2luZ2xldG9uQ29uZmlnIH0gZnJvbSBcIi4vdHlwZUNvbmZpZy9zaW5nbGV0b25Db25maWcuanNcIjtcclxuaW1wb3J0IHsgQ29uZmlnIH0gZnJvbSBcIi4vY29uZmlnLmpzXCI7XHJcbmltcG9ydCB7IE1pbmRpSW5qZWN0b3IgfSBmcm9tIFwiLi9taW5kaUluamVjdG9yLmpzXCI7XHJcblxyXG5jb25zdCBMT0cgPSBuZXcgTG9nZ2VyKFwiQ29uZmlnXCIpO1xyXG5cclxuZXhwb3J0IGNsYXNzIE1pbmRpQ29uZmlnIGV4dGVuZHMgQ29uZmlnIHtcclxuXHJcbiAgICBjb25zdHJ1Y3RvcigpIHtcclxuICAgICAgICBzdXBlcigpO1xyXG4gICAgICAgIHRoaXMuZmluYWxpemVkID0gZmFsc2U7XHJcbiAgICAgICAgLyoqIEB0eXBlIHtNYXB9ICovXHJcbiAgICAgICAgdGhpcy5jb25maWdFbnRyaWVzID0gbmV3IE1hcCgpO1xyXG4gICAgICAgIHRoaXMuY29uZmlnUHJvY2Vzc29ycyA9IG5ldyBMaXN0KCk7XHJcbiAgICAgICAgdGhpcy5pbnN0YW5jZVByb2Nlc3NvcnMgPSBuZXcgTGlzdCgpO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogXHJcbiAgICAgKiBAcGFyYW0ge0NvbmZpZ30gY29uZmlnIFxyXG4gICAgICovXHJcbiAgICBtZXJnZShjb25maWcpIHtcclxuICAgICAgICB0aGlzLmZpbmFsaXplZCA9IHRydWU7XHJcbiAgICAgICAgY29uc3QgbmV3Q29uZmlnRW50cmllcyA9IG5ldyBNYXAoKTtcclxuICAgICAgICBuZXdDb25maWdFbnRyaWVzLmFkZEFsbCh0aGlzLmNvbmZpZ0VudHJpZXMpO1xyXG4gICAgICAgIG5ld0NvbmZpZ0VudHJpZXMuYWRkQWxsKGNvbmZpZy5jb25maWdFbnRyaWVzKTtcclxuXHJcbiAgICAgICAgY29uc3QgbmV3Q29uZmlnUHJvY2Vzc29ycyA9IG5ldyBMaXN0KCk7XHJcbiAgICAgICAgbmV3Q29uZmlnUHJvY2Vzc29ycy5hZGRBbGwodGhpcy5jb25maWdQcm9jZXNzb3JzKTtcclxuICAgICAgICBuZXdDb25maWdQcm9jZXNzb3JzLmFkZEFsbChjb25maWcuY29uZmlnUHJvY2Vzc29ycyk7XHJcblxyXG4gICAgICAgIGNvbnN0IG5ld0luc3RhbmNlUHJvY2Vzc29ycyA9IG5ldyBMaXN0KCk7XHJcbiAgICAgICAgbmV3SW5zdGFuY2VQcm9jZXNzb3JzLmFkZEFsbCh0aGlzLmluc3RhbmNlUHJvY2Vzc29ycyk7XHJcbiAgICAgICAgbmV3SW5zdGFuY2VQcm9jZXNzb3JzLmFkZEFsbChjb25maWcuaW5zdGFuY2VQcm9jZXNzb3JzKTtcclxuXHJcbiAgICAgICAgLyoqIEB0eXBlIHtNYXB9ICovXHJcbiAgICAgICAgdGhpcy5jb25maWdFbnRyaWVzID0gbmV3Q29uZmlnRW50cmllcztcclxuICAgICAgICB0aGlzLmNvbmZpZ1Byb2Nlc3NvcnMgPSBuZXdDb25maWdQcm9jZXNzb3JzO1xyXG4gICAgICAgIHRoaXMuaW5zdGFuY2VQcm9jZXNzb3JzID0gbmV3SW5zdGFuY2VQcm9jZXNzb3JzO1xyXG5cclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIFxyXG4gICAgICogQHBhcmFtIHtUeXBlQ29uZmlnfSB0eXBlQ29uZmlnIFxyXG4gICAgICovXHJcbiAgICBhZGRUeXBlQ29uZmlnKHR5cGVDb25maWcpIHtcclxuICAgICAgICB0aGlzLmZpbmFsaXplZCA9IGZhbHNlO1xyXG4gICAgICAgIHRoaXMuY29uZmlnRW50cmllcy5zZXQodHlwZUNvbmZpZy5uYW1lLCB0eXBlQ29uZmlnKTtcclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH1cclxuXHJcbiAgICBhZGRDb25maWdQcm9jZXNzb3IoY29uZmlnUHJvY2Vzc29yKSB7XHJcbiAgICAgICAgdGhpcy5jb25maWdQcm9jZXNzb3JzLmFkZChjb25maWdQcm9jZXNzb3IubmFtZSk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuYWRkVHlwZUNvbmZpZyhTaW5nbGV0b25Db25maWcudW5uYW1lZChjb25maWdQcm9jZXNzb3IpKTtcclxuICAgIH1cclxuXHJcbiAgICBhZGRJbnN0YW5jZVByb2Nlc3NvcihpbnN0YW5jZVByb2Nlc3Nvcikge1xyXG4gICAgICAgIHRoaXMuaW5zdGFuY2VQcm9jZXNzb3JzLmFkZChpbnN0YW5jZVByb2Nlc3Nvci5uYW1lKTtcclxuICAgICAgICByZXR1cm4gdGhpcy5hZGRUeXBlQ29uZmlnKFNpbmdsZXRvbkNvbmZpZy51bm5hbWVkKGluc3RhbmNlUHJvY2Vzc29yKSk7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBcclxuICAgICAqIEBwYXJhbSB7TGlzdH0gdHlwZUNvbmZpZ0xpc3RcclxuICAgICAqL1xyXG4gICAgYWRkQWxsVHlwZUNvbmZpZyh0eXBlQ29uZmlnTGlzdCkge1xyXG4gICAgICAgIHRoaXMuZmluYWxpemVkID0gZmFsc2U7XHJcbiAgICAgICAgdHlwZUNvbmZpZ0xpc3QuZm9yRWFjaCgodHlwZUNvbmZpZyxwYXJlbnQpID0+IHtcclxuICAgICAgICAgICAgdGhpcy5jb25maWdFbnRyaWVzLnNldCh0eXBlQ29uZmlnLm5hbWUsIHR5cGVDb25maWcpO1xyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICB9LHRoaXMpO1xyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogXHJcbiAgICAgKiBAcGFyYW0ge0xpc3R9IGNvbmZpZ1Byb2Nlc3Nvckxpc3QgXHJcbiAgICAgKi9cclxuICAgIGFkZEFsbENvbmZpZ1Byb2Nlc3Nvcihjb25maWdQcm9jZXNzb3JMaXN0KSB7XHJcbiAgICAgICAgY29uZmlnUHJvY2Vzc29yTGlzdC5mb3JFYWNoKChjb25maWdQcm9jZXNzb3IscGFyZW50KSA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMuY29uZmlnUHJvY2Vzc29ycy5hZGQoY29uZmlnUHJvY2Vzc29yLm5hbWUpO1xyXG4gICAgICAgICAgICB0aGlzLmFkZFR5cGVDb25maWcoU2luZ2xldG9uQ29uZmlnLnVubmFtZWQoY29uZmlnUHJvY2Vzc29yKSk7XHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgIH0sdGhpcyk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBcclxuICAgICAqIEBwYXJhbSB7TGlzdH0gaW5zdGFuY2VQcm9jZXNzb3JMaXN0IFxyXG4gICAgICovXHJcbiAgICBhZGRBbGxJbnN0YW5jZVByb2Nlc3NvcihpbnN0YW5jZVByb2Nlc3Nvckxpc3QpIHtcclxuICAgICAgICBpbnN0YW5jZVByb2Nlc3Nvckxpc3QuZm9yRWFjaCgoaW5zdGFuY2VQcm9jZXNzb3IscGFyZW50KSA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMuaW5zdGFuY2VQcm9jZXNzb3JzLmFkZChpbnN0YW5jZVByb2Nlc3Nvci5uYW1lKTtcclxuICAgICAgICAgICAgdGhpcy5hZGRUeXBlQ29uZmlnKFNpbmdsZXRvbkNvbmZpZy51bm5hbWVkKGluc3RhbmNlUHJvY2Vzc29yKSk7XHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgIH0sdGhpcyk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9XHJcblxyXG4gICAgaXNGaW5hbGl6ZWQoKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuZmluYWxpemVkO1xyXG4gICAgfVxyXG5cclxuICAgIGZpbmFsaXplKCkge1xyXG4gICAgICAgIHRoaXMuZmluYWxpemVkID0gdHJ1ZTtcclxuICAgICAgICByZXR1cm4gQ29uZmlnUHJvY2Vzc29yRXhlY3V0b3IuZXhlY3V0ZSh0aGlzLmNvbmZpZ1Byb2Nlc3NvcnMsIE1pbmRpSW5qZWN0b3IuZ2V0SW5zdGFuY2UoKSwgdGhpcyk7XHJcbiAgICB9XHJcblxyXG59IiwiaW1wb3J0IHsgVHlwZUNvbmZpZyB9IGZyb20gXCIuL3R5cGVDb25maWcuanNcIjtcclxuXHJcbmV4cG9ydCBjbGFzcyBQb29sQ29uZmlnIGV4dGVuZHMgVHlwZUNvbmZpZyB7XHJcblxyXG4gICAgc3RhdGljIG5hbWVkKG5hbWUsIGNsYXNzUmVmZXJlbmNlLCBwb29sU2l6ZSkge1xyXG4gICAgICAgIHJldHVybiBuZXcgUG9vbENvbmZpZyhuYW1lLCBjbGFzc1JlZmVyZW5jZSwgcG9vbFNpemUpO1xyXG4gICAgfVxyXG5cclxuICAgIHN0YXRpYyB1bm5hbWVkKGNsYXNzUmVmZXJlbmNlLCBwb29sU2l6ZSkge1xyXG4gICAgICAgIHJldHVybiBuZXcgUG9vbENvbmZpZyhjbGFzc1JlZmVyZW5jZS5uYW1lLCBjbGFzc1JlZmVyZW5jZSwgcG9vbFNpemUpO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0cnVjdG9yKG5hbWUsIGNsYXNzUmVmZXJlbmNlLCBwb29sU2l6ZSkge1xyXG4gICAgICAgIHN1cGVyKG5hbWUsIGNsYXNzUmVmZXJlbmNlKTtcclxuICAgICAgICB0aGlzLnBvb2xTaXplID0gcG9vbFNpemU7XHJcbiAgICB9XHJcblxyXG4gICAgaW5zdGFuY2VIb2xkZXIocGFyYW1ldGVycyA9IFtdKSB7XHJcblxyXG4gICAgfVxyXG5cclxufSIsImltcG9ydCB7IFR5cGVDb25maWcgfSBmcm9tIFwiLi90eXBlQ29uZmlnLmpzXCI7XHJcbmltcG9ydCB7IEluc3RhbmNlSG9sZGVyIH0gZnJvbSBcIi4vaW5zdGFuY2VIb2xkZXIuanNcIjtcclxuXHJcbmV4cG9ydCBjbGFzcyBQcm90b3R5cGVDb25maWcgZXh0ZW5kcyBUeXBlQ29uZmlnIHtcclxuXHJcbiAgICBzdGF0aWMgbmFtZWQobmFtZSwgY2xhc3NSZWZlcmVuY2UpIHtcclxuICAgICAgICByZXR1cm4gbmV3IFByb3RvdHlwZUNvbmZpZyhuYW1lLCBjbGFzc1JlZmVyZW5jZSk7XHJcbiAgICB9XHJcblxyXG4gICAgc3RhdGljIHVubmFtZWQoY2xhc3NSZWZlcmVuY2UpIHtcclxuICAgICAgICByZXR1cm4gbmV3IFByb3RvdHlwZUNvbmZpZyhjbGFzc1JlZmVyZW5jZS5uYW1lLCBjbGFzc1JlZmVyZW5jZSk7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3RydWN0b3IobmFtZSwgY2xhc3NSZWZlcmVuY2UpIHtcclxuICAgICAgICBzdXBlcihuYW1lLCBjbGFzc1JlZmVyZW5jZSk7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBAcGFyYW0ge2FycmF5fSBwYXJhbWV0ZXJzIHRoZSBwYXJhbWV0ZXJzIHRvIHVzZSBmb3IgdGhlIGNvbnN0cnVjdG9yXHJcbiAgICAgKi9cclxuICAgIGluc3RhbmNlSG9sZGVyKHBhcmFtZXRlcnMgPSBbXSkge1xyXG4gICAgICAgIGxldCBpbnN0YW5jZSA9IG51bGw7XHJcbiAgICAgICAgaWYocGFyYW1ldGVycyAmJiBwYXJhbWV0ZXJzLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgaW5zdGFuY2UgPSBuZXcgdGhpcy5jbGFzc1JlZmVyZW5jZSguLi5wYXJhbWV0ZXJzKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBpbnN0YW5jZSA9IG5ldyB0aGlzLmNsYXNzUmVmZXJlbmNlKCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBJbnN0YW5jZUhvbGRlci5ob2xkZXJXaXRoTmV3SW5zdGFuY2UoaW5zdGFuY2UpO1xyXG4gICAgfVxyXG5cclxuXHJcbn0iXSwibmFtZXMiOlsiTE9HIl0sIm1hcHBpbmdzIjoiOztBQUVBLE1BQU0sR0FBRyxHQUFHLElBQUksTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDOztBQUVuQyxNQUFhLFFBQVEsQ0FBQzs7SUFFbEIsR0FBRyxDQUFDLFVBQVUsR0FBRyxFQUFFLEVBQUU7UUFDakIsT0FBTyxJQUFJLENBQUM7S0FDZjs7OztDQUVKLEtDUlksY0FBYyxDQUFDOztJQUV4QixXQUFXLGFBQWEsR0FBRyxFQUFFLE9BQU8sQ0FBQyxDQUFDLEVBQUU7SUFDeEMsV0FBVyxhQUFhLEdBQUcsRUFBRSxPQUFPLENBQUMsQ0FBQyxFQUFFOzs7Ozs7Ozs7SUFTeEMsT0FBTyxjQUFjLENBQUMsSUFBSSxFQUFFLGNBQWMsRUFBRSxVQUFVLEdBQUcsRUFBRSxFQUFFO1FBQ3pELE9BQU8sSUFBSSxjQUFjLENBQUMsSUFBSSxFQUFFLGNBQWMsRUFBRSxjQUFjLENBQUMsYUFBYSxFQUFFLFVBQVUsQ0FBQyxDQUFDO0tBQzdGOzs7Ozs7OztJQVFELE9BQU8sUUFBUSxDQUFDLGNBQWMsRUFBRSxVQUFVLEdBQUcsRUFBRSxFQUFFO1FBQzdDLE9BQU8sSUFBSSxjQUFjLENBQUMsY0FBYyxDQUFDLElBQUksRUFBRSxjQUFjLEVBQUUsY0FBYyxDQUFDLGFBQWEsRUFBRSxVQUFVLENBQUMsQ0FBQztLQUM1Rzs7Ozs7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
