'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var coreutil_v1 = require('coreutil_v1');

const LOG = new coreutil_v1.Logger("Provider");

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

    constructor(name, classReference) {
        this.name = name;
        this.classReference = classReference;
    }

    instanceHolder(parameters = []) {
        return null;
    }

}

/**
 * Utilities for accessing a Config object
 */

const LOG$1 = new coreutil_v1.Logger("ConfigAccessor");

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

const LOG$2 = new coreutil_v1.Logger("ConfigProcessorExecutor");

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
        const promiseList = new coreutil_v1.List();
        configProcessorClassNameList.forEach((configProcessorClassName, parent) => {
            /**  @type {InstanceHolder} */
            const processorHolder = ConfigAccessor.instanceHolder(configProcessorClassName, config);
            if(processorHolder.type === InstanceHolder.NEW_INSTANCE) {
                injector.injectTarget(processorHolder.instance, config);
            }
            const processorsPromise = processorHolder.instance.processConfig(config);
            if (processorsPromise) {
                promiseList.add(processorsPromise);
            }
            return true;
        }, this);
        return Promise.all(promiseList.getArray());
    }

}

class Injector {

    injectTarget(target, config, depth = 0) {

    }

}

const LOG$3 = new coreutil_v1.Logger("InstancePostConfigTrigger");

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

const LOG$4 = new coreutil_v1.Logger("InstanceProcessorExecutor");

/**
 * Executes the configs instance processors on the provided instance
 * Returns a promise for when the config processors has completed running
 * 
 * Instance processors perform operations on managed instances after they have been instansiated
 */
class InstanceProcessorExecutor {

    /**
     * @param {List} instanceProcessorList the instance processors
     * @param {Obect} instance the instance to process
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

const LOG$5 = new coreutil_v1.Logger("SingletonConfig");

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

const LOG$6 = new coreutil_v1.Logger("MindiInjector");

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

const LOG$7 = new coreutil_v1.Logger("Config");

class MindiConfig extends Config {

    constructor() {
        super();
        this.finalized = false;
        /** @type {Map} */
        this.configEntries = new coreutil_v1.Map();
        this.configProcessors = new coreutil_v1.List();
        this.instanceProcessors = new coreutil_v1.List();
    }

    /**
     * 
     * @param {Config} config 
     */
    merge(config) {
        if (!config.isFinalized()) {
            throw Error("Cannot merge into an unfinalized config");
        }
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
     */
    addTypeConfig(typeConfig) {
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

exports.Config = Config;
exports.ConfigAccessor = ConfigAccessor;
exports.ConfigProcessorExecutor = ConfigProcessorExecutor;
exports.InjectionPoint = InjectionPoint;
exports.Injector = Injector;
exports.InstanceHolder = InstanceHolder;
exports.InstancePostConfigTrigger = InstancePostConfigTrigger;
exports.InstanceProcessorExecutor = InstanceProcessorExecutor;
exports.MindiConfig = MindiConfig;
exports.MindiInjector = MindiInjector;
exports.MindiProvider = MindiProvider;
exports.PoolConfig = PoolConfig;
exports.PrototypeConfig = PrototypeConfig;
exports.Provider = Provider;
exports.SingletonConfig = SingletonConfig;
exports.TypeConfig = TypeConfig;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWluZGlfdjEuanMiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9taW5kaS9hcGkvcHJvdmlkZXIuanMiLCIuLi8uLi9zcmMvbWluZGkvYXBpL2luamVjdGlvblBvaW50LmpzIiwiLi4vLi4vc3JjL21pbmRpL2NvbmZpZy5qcyIsIi4uLy4uL3NyYy9taW5kaS90eXBlQ29uZmlnL2luc3RhbmNlSG9sZGVyLmpzIiwiLi4vLi4vc3JjL21pbmRpL3R5cGVDb25maWcvdHlwZUNvbmZpZy5qcyIsIi4uLy4uL3NyYy9taW5kaS9jb25maWdBY2Nlc3Nvci5qcyIsIi4uLy4uL3NyYy9taW5kaS9jb25maWdQcm9jZXNzb3IvY29uZmlnUHJvY2Vzc29yRXhlY3V0b3IuanMiLCIuLi8uLi9zcmMvbWluZGkvaW5qZWN0b3IuanMiLCIuLi8uLi9zcmMvbWluZGkvaW5zdGFuY2VQcm9jZXNzb3IvaW5zdGFuY2VQb3N0Q29uZmlnVHJpZ2dlci5qcyIsIi4uLy4uL3NyYy9taW5kaS9pbnN0YW5jZVByb2Nlc3Nvci9pbnN0YW5jZVByb2Nlc3NvckV4ZWN1dG9yLmpzIiwiLi4vLi4vc3JjL21pbmRpL3R5cGVDb25maWcvc2luZ2xldG9uQ29uZmlnLmpzIiwiLi4vLi4vc3JjL21pbmRpL21pbmRpUHJvdmlkZXIuanMiLCIuLi8uLi9zcmMvbWluZGkvbWluZGlJbmplY3Rvci5qcyIsIi4uLy4uL3NyYy9taW5kaS9taW5kaUNvbmZpZy5qcyIsIi4uLy4uL3NyYy9taW5kaS90eXBlQ29uZmlnL3Bvb2xDb25maWcuanMiLCIuLi8uLi9zcmMvbWluZGkvdHlwZUNvbmZpZy9wcm90b3R5cGVDb25maWcuanMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTG9nZ2VyIH0gZnJvbSBcImNvcmV1dGlsX3YxXCI7XHJcblxyXG5jb25zdCBMT0cgPSBuZXcgTG9nZ2VyKFwiUHJvdmlkZXJcIik7XHJcblxyXG5leHBvcnQgY2xhc3MgUHJvdmlkZXIge1xyXG5cclxuICAgIGdldChwYXJhbWV0ZXJzID0gW10pIHtcclxuICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgIH1cclxuXHJcbn0iLCJpbXBvcnQgeyBQcm92aWRlciB9IGZyb20gXCIuL3Byb3ZpZGVyLmpzXCI7XHJcblxyXG5leHBvcnQgY2xhc3MgSW5qZWN0aW9uUG9pbnQge1xyXG5cclxuICAgIHN0YXRpYyBnZXQgSU5TVEFOQ0VfVFlQRSgpIHsgcmV0dXJuIDA7IH0gXHJcbiAgICBzdGF0aWMgZ2V0IFBST1ZJREVSX1RZUEUoKSB7IHJldHVybiAxOyB9IFxyXG5cclxuICAgIC8qKlxyXG4gICAgICogXHJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbmFtZSBcclxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNsYXNzUmVmZXJlbmNlIFxyXG4gICAgICogQHBhcmFtIHthcnJheX0gcGFyYW1ldGVycyBcclxuICAgICAqIEByZXR1cm5zIHtvYmplY3R9XHJcbiAgICAgKi9cclxuICAgIHN0YXRpYyBpbnN0YW5jZUJ5TmFtZShuYW1lLCBjbGFzc1JlZmVyZW5jZSwgcGFyYW1ldGVycyA9IFtdKSB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBJbmplY3Rpb25Qb2ludChuYW1lLCBjbGFzc1JlZmVyZW5jZSwgSW5qZWN0aW9uUG9pbnQuSU5TVEFOQ0VfVFlQRSwgcGFyYW1ldGVycyk7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBcclxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNsYXNzUmVmZXJlbmNlIFxyXG4gICAgICogQHBhcmFtIHthcnJheX0gcGFyYW1ldGVycyBcclxuICAgICAqIEByZXR1cm5zIHtvYmplY3R9XHJcbiAgICAgKi9cclxuICAgIHN0YXRpYyBpbnN0YW5jZShjbGFzc1JlZmVyZW5jZSwgcGFyYW1ldGVycyA9IFtdKSB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBJbmplY3Rpb25Qb2ludChjbGFzc1JlZmVyZW5jZS5uYW1lLCBjbGFzc1JlZmVyZW5jZSwgSW5qZWN0aW9uUG9pbnQuSU5TVEFOQ0VfVFlQRSwgcGFyYW1ldGVycyk7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBcclxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBuYW1lIFxyXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2xhc3NSZWZlcmVuY2UgXHJcbiAgICAgKiBAcmV0dXJucyB7UHJvdmlkZXJ9XHJcbiAgICAgKi9cclxuICAgIHN0YXRpYyBwcm92aWRlckJ5TmFtZShuYW1lLCBjbGFzc1JlZmVyZW5jZSkge1xyXG4gICAgICAgIHJldHVybiBuZXcgSW5qZWN0aW9uUG9pbnQobmFtZSwgY2xhc3NSZWZlcmVuY2UsIEluamVjdGlvblBvaW50LlBST1ZJREVSX1RZUEUpO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogXHJcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjbGFzc1JlZmVyZW5jZSBcclxuICAgICAqIEByZXR1cm5zIHtQcm92aWRlcn1cclxuICAgICAqL1xyXG4gICAgc3RhdGljIHByb3ZpZGVyKGNsYXNzUmVmZXJlbmNlKSB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBJbmplY3Rpb25Qb2ludChjbGFzc1JlZmVyZW5jZS5uYW1lLCBjbGFzc1JlZmVyZW5jZSwgSW5qZWN0aW9uUG9pbnQuUFJPVklERVJfVFlQRSk7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3RydWN0b3IobmFtZSwgY2xhc3NSZWZlcmVuY2UsIHR5cGUgPSBJbmplY3Rpb25Qb2ludC5JTlNUQU5DRV9UWVBFLCBwYXJhbWV0ZXJzID0gbnVsbCkge1xyXG4gICAgICAgIHRoaXMubmFtZSA9IG5hbWU7XHJcbiAgICAgICAgdGhpcy5jbGFzc1JlZmVyZW5jZSA9IGNsYXNzUmVmZXJlbmNlO1xyXG4gICAgICAgIHRoaXMudHlwZSA9IHR5cGU7XHJcbiAgICAgICAgdGhpcy5wYXJhbWV0ZXJzID0gcGFyYW1ldGVycztcclxuICAgIH1cclxuXHJcbn0iLCJleHBvcnQgY2xhc3MgQ29uZmlnIHtcclxuXHJcbiAgICBjb25zdHJ1Y3RvcigpIHtcclxuICAgICAgICAvKiogQHR5cGUge01hcH0gKi9cclxuICAgICAgICB0aGlzLmNvbmZpZ0VudHJpZXMgPSBudWxsO1xyXG5cclxuICAgICAgICAvKiogQHR5cGUge0xpc3R9ICovXHJcbiAgICAgICAgdGhpcy5jb25maWdQcm9jZXNzb3JzID0gbnVsbDtcclxuXHJcbiAgICAgICAgLyoqIEB0eXBlIHtMaXN0fSAqL1xyXG4gICAgICAgIHRoaXMuaW5zdGFuY2VQcm9jZXNzb3JzID0gbnVsbDtcclxuICAgIH1cclxuXHJcbiAgICBpc0ZpbmFsaXplZCgpIHtcclxuICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9XHJcbn0iLCJleHBvcnQgY2xhc3MgSW5zdGFuY2VIb2xkZXIge1xyXG5cclxuICAgIHN0YXRpYyBnZXQgTkVXX0lOU1RBTkNFKCkgeyByZXR1cm4gMDsgfVxyXG5cclxuICAgIHN0YXRpYyBnZXQgRVhJU1RJTkdfSU5TVEFOQ0UoKSB7IHJldHVybiAxOyB9XHJcblxyXG4gICAgc3RhdGljIGhvbGRlcldpdGhOZXdJbnN0YW5jZShpbnN0YW5jZSkge1xyXG4gICAgICAgIHJldHVybiBuZXcgSW5zdGFuY2VIb2xkZXIoaW5zdGFuY2UsIEluc3RhbmNlSG9sZGVyLk5FV19JTlNUQU5DRSk7XHJcbiAgICB9XHJcblxyXG4gICAgc3RhdGljIGhvbGRlcldpdGhFeGlzdGluZ0luc3RhbmNlKGluc3RhbmNlKSB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBJbnN0YW5jZUhvbGRlcihpbnN0YW5jZSwgSW5zdGFuY2VIb2xkZXIuRVhJU1RJTkdfSU5TVEFOQ0UpO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0cnVjdG9yKGluc3RhbmNlLCB0eXBlKSB7XHJcbiAgICAgICAgdGhpcy5pbnN0YW5jZSA9IGluc3RhbmNlO1xyXG4gICAgICAgIHRoaXMudHlwZSA9IHR5cGU7XHJcbiAgICB9XHJcblxyXG59IiwiZXhwb3J0IGNsYXNzIFR5cGVDb25maWcge1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKG5hbWUsIGNsYXNzUmVmZXJlbmNlKSB7XHJcbiAgICAgICAgdGhpcy5uYW1lID0gbmFtZTtcclxuICAgICAgICB0aGlzLmNsYXNzUmVmZXJlbmNlID0gY2xhc3NSZWZlcmVuY2U7XHJcbiAgICB9XHJcblxyXG4gICAgaW5zdGFuY2VIb2xkZXIocGFyYW1ldGVycyA9IFtdKSB7XHJcbiAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICB9XHJcblxyXG59IiwiaW1wb3J0IHsgQ29uZmlnIH0gZnJvbSBcIi4vY29uZmlnLmpzXCI7XHJcbmltcG9ydCB7IExvZ2dlciB9IGZyb20gXCJjb3JldXRpbF92MVwiO1xyXG5pbXBvcnQgeyBJbnN0YW5jZUhvbGRlciB9IGZyb20gXCIuL3R5cGVDb25maWcvaW5zdGFuY2VIb2xkZXIuanNcIjtcclxuaW1wb3J0IHsgVHlwZUNvbmZpZyB9IGZyb20gXCIuL3R5cGVDb25maWcvdHlwZUNvbmZpZy5qc1wiO1xyXG5cclxuLyoqXHJcbiAqIFV0aWxpdGllcyBmb3IgYWNjZXNzaW5nIGEgQ29uZmlnIG9iamVjdFxyXG4gKi9cclxuXHJcbmNvbnN0IExPRyA9IG5ldyBMb2dnZXIoXCJDb25maWdBY2Nlc3NvclwiKTtcclxuXHJcbmV4cG9ydCBjbGFzcyBDb25maWdBY2Nlc3NvciB7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBHZXQgYW4gaW5zdGFuY2UgYnkgY2xhc3MgbmFtZSBpbiB0aGUgY29uZmlnXHJcbiAgICAgKiBcclxuICAgICAqIEBwYXJhbSB7Q29uZmlnfSBjb25maWcgXHJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbmFtZSBcclxuICAgICAqIEBwYXJhbSB7QXJyYXl9IHBhcmFtZXRlcnNcclxuICAgICAqIEByZXR1cm5zIHtJbnN0YW5jZUhvbGRlcn1cclxuICAgICAqL1xyXG4gICAgc3RhdGljIGluc3RhbmNlSG9sZGVyKG5hbWUsIGNvbmZpZywgcGFyYW1ldGVycyA9IFtdKSB7XHJcbiAgICAgICAgY29uc3QgdHlwZUNvbmZpZyA9IHRoaXMudHlwZUNvbmZpZ0J5TmFtZShuYW1lLCBjb25maWcpO1xyXG4gICAgICAgIGlmKHR5cGVDb25maWcgPT09IG51bGwpIHtcclxuICAgICAgICAgICAgTE9HLmVycm9yKFwiTm8gdHlwZWNvbmZpZyBmb3VuZCBmb3IgXCIgKyBuYW1lKTtcclxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNvbnN0IGluc3RhbmNlSG9sZGVyID0gdHlwZUNvbmZpZy5pbnN0YW5jZUhvbGRlcihwYXJhbWV0ZXJzKTtcclxuICAgICAgICBpZighaW5zdGFuY2VIb2xkZXIpIHtcclxuICAgICAgICAgICAgTE9HLmVycm9yKFwiTm8gb2JqZWN0IGZvdW5kIGZvciBcIiArIG5hbWUpO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gaW5zdGFuY2VIb2xkZXI7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBHZXQgdGhlIHR5cGUgY29uZmlnIGJ5IGNsYXNzIG5hbWUgaW4gdGhlIGNvbmZpZ1xyXG4gICAgICogXHJcbiAgICAgKiBAcGFyYW0ge0NvbmZpZ30gY29uZmlnIFxyXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG5hbWUgXHJcbiAgICAgKiBAcmV0dXJucyB7VHlwZUNvbmZpZ31cclxuICAgICAqL1xyXG4gICAgc3RhdGljIHR5cGVDb25maWdCeU5hbWUobmFtZSwgY29uZmlnKSB7XHJcbiAgICAgICAgbGV0IGNvbmZpZ0VudHJ5ID0gbnVsbDtcclxuICAgICAgICBjb25maWcuY29uZmlnRW50cmllcy5mb3JFYWNoKChrZXksIHZhbHVlLCBwYXJlbnQpID0+IHtcclxuICAgICAgICAgICAgaWYoa2V5ID09PSBuYW1lKSB7XHJcbiAgICAgICAgICAgICAgICBjb25maWdFbnRyeSA9IHZhbHVlO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgIH0sIHRoaXMpO1xyXG4gICAgICAgIGlmKCFjb25maWdFbnRyeSkge1xyXG4gICAgICAgICAgICBMT0cuZXJyb3IoXCJObyBjb25maWcgZW50cnkgZm91bmQgZm9yIFwiICsgbmFtZSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBjb25maWdFbnRyeTtcclxuICAgIH1cclxuXHJcbn0iLCJpbXBvcnQgeyBMb2dnZXIsIExpc3QgfSBmcm9tIFwiY29yZXV0aWxfdjFcIjtcclxuaW1wb3J0IHsgQ29uZmlnIH0gZnJvbSBcIi4uL2NvbmZpZy5qc1wiO1xyXG5pbXBvcnQgeyBDb25maWdBY2Nlc3NvciB9IGZyb20gXCIuLi9jb25maWdBY2Nlc3Nvci5qc1wiO1xyXG5pbXBvcnQgeyBJbnN0YW5jZUhvbGRlciB9IGZyb20gXCIuLi90eXBlQ29uZmlnL2luc3RhbmNlSG9sZGVyLmpzXCI7XHJcblxyXG5jb25zdCBMT0cgPSBuZXcgTG9nZ2VyKFwiQ29uZmlnUHJvY2Vzc29yRXhlY3V0b3JcIik7XHJcblxyXG4vKipcclxuICogRXhlY3V0ZXMgdGhlIHByb3ZpZGVkIGNvbmZpZyBwcm9jZXNzb3JzIG9uIHRoZSBwcm92aWRlZCBjb25maWcgcmVnaXN0cnlcclxuICogUmV0dXJucyBhIGxpc3Qgb2YgcHJvbWlzZXMgZm9yIHdoZW4gdGhlIGNvbmZpZyBwcm9jZXNzb3JzIGhhcyBjb21wbGV0ZWQgcnVubmluZ1xyXG4gKiBcclxuICogQSBjb25maWcgcHJvY2Vzc29yIHJlYWRzIHRoZSBjb25maWcgYW5kIHBlcmZvcm1zIGFueSBuZWNlc3NhcnkgYWN0aW9ucyBiYXNlZCBvblxyXG4gKiBjbGFzcyBhbmQgdHlwZSBpbmZvcm1hdGlvbi4gQSBjb25maWcgcHJvY2Vzc29yIGRvZXMgbm90IG9wZXJhdGUgb24gbWFuYWdlZCBpbnN0YW5jZXNcclxuICovXHJcbmV4cG9ydCBjbGFzcyBDb25maWdQcm9jZXNzb3JFeGVjdXRvciB7XHJcbiAgICBcclxuICAgIC8qKlxyXG4gICAgICogQHBhcmFtIHtMaXN0fSBjb25maWdQcm9jZXNzb3JDbGFzc0xpc3RcclxuICAgICAqIEBwYXJhbSB7SW5qZWN0b3J9IGluamVjdG9yXHJcbiAgICAgKiBAcGFyYW0ge0NvbmZpZ30gY29uZmlnXHJcbiAgICAgKiBAcmV0dXJucyB7UHJvbWlzZX0gcHJvbWlzZSB3aGljaCBpcyByZXNvbHZlZCB3aGVuIGFsbCBjb25maWcgcHJvY2Vzc29ycyBhcmUgcmVzb2x2ZWRcclxuICAgICAqL1xyXG4gICAgc3RhdGljIGV4ZWN1dGUoY29uZmlnUHJvY2Vzc29yQ2xhc3NOYW1lTGlzdCwgaW5qZWN0b3IsIGNvbmZpZykge1xyXG4gICAgICAgIGNvbnN0IHByb21pc2VMaXN0ID0gbmV3IExpc3QoKTtcclxuICAgICAgICBjb25maWdQcm9jZXNzb3JDbGFzc05hbWVMaXN0LmZvckVhY2goKGNvbmZpZ1Byb2Nlc3NvckNsYXNzTmFtZSwgcGFyZW50KSA9PiB7XHJcbiAgICAgICAgICAgIC8qKiAgQHR5cGUge0luc3RhbmNlSG9sZGVyfSAqL1xyXG4gICAgICAgICAgICBjb25zdCBwcm9jZXNzb3JIb2xkZXIgPSBDb25maWdBY2Nlc3Nvci5pbnN0YW5jZUhvbGRlcihjb25maWdQcm9jZXNzb3JDbGFzc05hbWUsIGNvbmZpZyk7XHJcbiAgICAgICAgICAgIGlmKHByb2Nlc3NvckhvbGRlci50eXBlID09PSBJbnN0YW5jZUhvbGRlci5ORVdfSU5TVEFOQ0UpIHtcclxuICAgICAgICAgICAgICAgIGluamVjdG9yLmluamVjdFRhcmdldChwcm9jZXNzb3JIb2xkZXIuaW5zdGFuY2UsIGNvbmZpZyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgY29uc3QgcHJvY2Vzc29yc1Byb21pc2UgPSBwcm9jZXNzb3JIb2xkZXIuaW5zdGFuY2UucHJvY2Vzc0NvbmZpZyhjb25maWcpO1xyXG4gICAgICAgICAgICBpZiAocHJvY2Vzc29yc1Byb21pc2UpIHtcclxuICAgICAgICAgICAgICAgIHByb21pc2VMaXN0LmFkZChwcm9jZXNzb3JzUHJvbWlzZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgfSwgdGhpcyk7XHJcbiAgICAgICAgcmV0dXJuIFByb21pc2UuYWxsKHByb21pc2VMaXN0LmdldEFycmF5KCkpO1xyXG4gICAgfVxyXG5cclxufSIsImV4cG9ydCBjbGFzcyBJbmplY3RvciB7XHJcblxyXG4gICAgaW5qZWN0VGFyZ2V0KHRhcmdldCwgY29uZmlnLCBkZXB0aCA9IDApIHtcclxuXHJcbiAgICB9XHJcblxyXG59IiwiaW1wb3J0IHsgTG9nZ2VyIH0gZnJvbSBcImNvcmV1dGlsX3YxXCI7XHJcblxyXG5jb25zdCBMT0cgPSBuZXcgTG9nZ2VyKFwiSW5zdGFuY2VQb3N0Q29uZmlnVHJpZ2dlclwiKTtcclxuXHJcbi8qKlxyXG4gKiBJbnN0YW5jZSBwcm9jZXNzb3Igd2hpY2ggY2FsbHMgcG9zdENvbmZpZyBvbiBvYmplY3RzIGFmdGVyIGNvbmZpZ1Byb2Nlc3NvcnMgYXJlIGZpbmlzaGVkXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgSW5zdGFuY2VQb3N0Q29uZmlnVHJpZ2dlciB7XHJcblxyXG4gICAgcHJvY2VzcyhpbnN0YW5jZSkge1xyXG4gICAgICAgIGlmKGluc3RhbmNlLnBvc3RDb25maWcpIHtcclxuICAgICAgICAgICAgaW5zdGFuY2UucG9zdENvbmZpZygpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbn0iLCJpbXBvcnQgeyBMb2dnZXIsIExpc3QgfSBmcm9tIFwiY29yZXV0aWxfdjFcIjtcclxuaW1wb3J0IHsgQ29uZmlnQWNjZXNzb3IgfSBmcm9tIFwiLi4vY29uZmlnQWNjZXNzb3IuanNcIjtcclxuaW1wb3J0IHsgQ29uZmlnIH0gZnJvbSBcIi4uL2NvbmZpZy5qc1wiO1xyXG5cclxuY29uc3QgTE9HID0gbmV3IExvZ2dlcihcIkluc3RhbmNlUHJvY2Vzc29yRXhlY3V0b3JcIik7XHJcblxyXG4vKipcclxuICogRXhlY3V0ZXMgdGhlIGNvbmZpZ3MgaW5zdGFuY2UgcHJvY2Vzc29ycyBvbiB0aGUgcHJvdmlkZWQgaW5zdGFuY2VcclxuICogUmV0dXJucyBhIHByb21pc2UgZm9yIHdoZW4gdGhlIGNvbmZpZyBwcm9jZXNzb3JzIGhhcyBjb21wbGV0ZWQgcnVubmluZ1xyXG4gKiBcclxuICogSW5zdGFuY2UgcHJvY2Vzc29ycyBwZXJmb3JtIG9wZXJhdGlvbnMgb24gbWFuYWdlZCBpbnN0YW5jZXMgYWZ0ZXIgdGhleSBoYXZlIGJlZW4gaW5zdGFuc2lhdGVkXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgSW5zdGFuY2VQcm9jZXNzb3JFeGVjdXRvciB7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBAcGFyYW0ge0xpc3R9IGluc3RhbmNlUHJvY2Vzc29yTGlzdCB0aGUgaW5zdGFuY2UgcHJvY2Vzc29yc1xyXG4gICAgICogQHBhcmFtIHtPYmVjdH0gaW5zdGFuY2UgdGhlIGluc3RhbmNlIHRvIHByb2Nlc3NcclxuICAgICAqIEBwYXJhbSB7Q29uZmlnfSBjb25maWdcclxuICAgICAqL1xyXG4gICAgc3RhdGljIGV4ZWN1dGUoaW5zdGFuY2UsIGNvbmZpZykge1xyXG4gICAgICAgIGNvbmZpZy5pbnN0YW5jZVByb2Nlc3NvcnMuZm9yRWFjaCgocHJvY2Vzc29yTmFtZSwgcGFyZW50KSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnN0IHByb2Nlc3NvckhvbGRlciA9IENvbmZpZ0FjY2Vzc29yLmluc3RhbmNlSG9sZGVyKHByb2Nlc3Nvck5hbWUsIGNvbmZpZyk7XHJcbiAgICAgICAgICAgIHByb2Nlc3NvckhvbGRlci5pbnN0YW5jZS5wcm9jZXNzKGluc3RhbmNlKTtcclxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgfSwgdGhpcyk7XHJcbiAgICB9XHJcblxyXG59IiwiaW1wb3J0IHsgVHlwZUNvbmZpZyB9IGZyb20gXCIuL3R5cGVDb25maWcuanNcIjtcclxuaW1wb3J0IHsgTG9nZ2VyIH0gZnJvbSBcImNvcmV1dGlsX3YxXCI7XHJcbmltcG9ydCB7IEluc3RhbmNlSG9sZGVyIH0gZnJvbSBcIi4vaW5zdGFuY2VIb2xkZXIuanNcIjtcclxuXHJcbmNvbnN0IExPRyA9IG5ldyBMb2dnZXIoXCJTaW5nbGV0b25Db25maWdcIik7XHJcblxyXG5leHBvcnQgY2xhc3MgU2luZ2xldG9uQ29uZmlnIGV4dGVuZHMgVHlwZUNvbmZpZyB7XHJcblxyXG4gICAgc3RhdGljIG5hbWVkKG5hbWUsIGNsYXNzUmVmZXJlbmNlKSB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBTaW5nbGV0b25Db25maWcobmFtZSwgY2xhc3NSZWZlcmVuY2UpO1xyXG4gICAgfVxyXG5cclxuICAgIHN0YXRpYyB1bm5hbWVkKGNsYXNzUmVmZXJlbmNlKSB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBTaW5nbGV0b25Db25maWcoY2xhc3NSZWZlcmVuY2UubmFtZSwgY2xhc3NSZWZlcmVuY2UpO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0cnVjdG9yKG5hbWUsIGNsYXNzUmVmZXJlbmNlKSB7XHJcbiAgICAgICAgc3VwZXIobmFtZSwgY2xhc3NSZWZlcmVuY2UpO1xyXG4gICAgfVxyXG5cclxuICAgIGluc3RhbmNlSG9sZGVyKHBhcmFtZXRlcnMgPSBbXSkge1xyXG4gICAgICAgIGlmICghdGhpcy5pbnN0YW5jZSkge1xyXG4gICAgICAgICAgICBpZihwYXJhbWV0ZXJzICYmIHBhcmFtZXRlcnMubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5pbnN0YW5jZSA9IG5ldyB0aGlzLmNsYXNzUmVmZXJlbmNlKC4uLnBhcmFtZXRlcnMpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5pbnN0YW5jZSA9IG5ldyB0aGlzLmNsYXNzUmVmZXJlbmNlKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIEluc3RhbmNlSG9sZGVyLmhvbGRlcldpdGhOZXdJbnN0YW5jZSh0aGlzLmluc3RhbmNlKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIEluc3RhbmNlSG9sZGVyLmhvbGRlcldpdGhFeGlzdGluZ0luc3RhbmNlKHRoaXMuaW5zdGFuY2UpO1xyXG4gICAgfVxyXG5cclxufSIsImltcG9ydCB7IFByb3ZpZGVyIH0gZnJvbSBcIi4vYXBpL3Byb3ZpZGVyLmpzXCI7XHJcbmltcG9ydCB7IFR5cGVDb25maWcgfSBmcm9tIFwiLi90eXBlQ29uZmlnL3R5cGVDb25maWcuanNcIjtcclxuaW1wb3J0IHsgSW5zdGFuY2VIb2xkZXIgfSBmcm9tIFwiLi90eXBlQ29uZmlnL2luc3RhbmNlSG9sZGVyLmpzXCI7XHJcbmltcG9ydCB7IEluamVjdG9yIH0gZnJvbSBcIi4vaW5qZWN0b3IuanNcIjtcclxuaW1wb3J0IHsgQ29uZmlnIH0gZnJvbSBcIi4vY29uZmlnLmpzXCI7XHJcbmltcG9ydCB7IENvbmZpZ0FjY2Vzc29yIH0gZnJvbSBcIi4vY29uZmlnQWNjZXNzb3IuanNcIjtcclxuXHJcbmV4cG9ydCBjbGFzcyBNaW5kaVByb3ZpZGVyIGV4dGVuZHMgUHJvdmlkZXIge1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogXHJcbiAgICAgKiBAcGFyYW0ge1R5cGVDb25maWd9IHR5cGVDb25maWcgXHJcbiAgICAgKi9cclxuICAgIGNvbnN0cnVjdG9yKHR5cGVDb25maWcsIGluamVjdG9yLCBjb25maWcpIHtcclxuXHJcbiAgICAgICAgc3VwZXIoKTtcclxuXHJcbiAgICAgICAgLyoqIEB0eXBlIHtUeXBlQ29uZmlnfSAqL1xyXG4gICAgICAgIHRoaXMudHlwZUNvbmZpZyA9IHR5cGVDb25maWc7XHJcblxyXG4gICAgICAgIC8qKiBAdHlwZSB7SW5qZWN0b3J9ICovXHJcbiAgICAgICAgdGhpcy5pbmplY3RvciA9IGluamVjdG9yO1xyXG5cclxuICAgICAgICAvKiogQHR5cGUge0NvbmZpZ30gKi9cclxuICAgICAgICB0aGlzLmNvbmZpZyA9IGNvbmZpZztcclxuICAgIH1cclxuXHJcbiAgICBnZXQocGFyYW1ldGVycyA9IFtdKSB7XHJcbiAgICAgICAgLyoqIEB0eXBlIHtJbnN0YW5jZUhvbGRlcn0gKi9cclxuICAgICAgICBjb25zdCBpbnN0YW5jZUhvbGRlciA9IENvbmZpZ0FjY2Vzc29yLmluc3RhbmNlSG9sZGVyKHRoaXMudHlwZUNvbmZpZy5uYW1lLCB0aGlzLmNvbmZpZywgcGFyYW1ldGVycyk7XHJcbiAgICAgICAgaWYgKGluc3RhbmNlSG9sZGVyLnR5cGUgPT09IEluc3RhbmNlSG9sZGVyLk5FV19JTlNUQU5DRSkge1xyXG4gICAgICAgICAgICB0aGlzLmluamVjdG9yLmluamVjdFRhcmdldChpbnN0YW5jZUhvbGRlci5pbnN0YW5jZSwgdGhpcy5jb25maWcpXHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBpbnN0YW5jZUhvbGRlci5pbnN0YW5jZTtcclxuICAgIH1cclxuXHJcbn0iLCJpbXBvcnQgeyBMb2dnZXIgfSBmcm9tIFwiY29yZXV0aWxfdjFcIjtcclxuaW1wb3J0IHsgQ29uZmlnIH0gZnJvbSBcIi4vY29uZmlnLmpzXCI7XHJcbmltcG9ydCB7IENvbmZpZ0FjY2Vzc29yIH0gZnJvbSBcIi4vY29uZmlnQWNjZXNzb3IuanNcIjtcclxuaW1wb3J0IHsgSW5qZWN0aW9uUG9pbnQgfSBmcm9tIFwiLi9hcGkvaW5qZWN0aW9uUG9pbnQuanNcIlxyXG5pbXBvcnQgeyBJbnN0YW5jZVByb2Nlc3NvckV4ZWN1dG9yIH0gZnJvbSBcIi4vaW5zdGFuY2VQcm9jZXNzb3IvaW5zdGFuY2VQcm9jZXNzb3JFeGVjdXRvci5qc1wiO1xyXG5pbXBvcnQgeyBJbnN0YW5jZUhvbGRlciB9IGZyb20gXCIuL3R5cGVDb25maWcvaW5zdGFuY2VIb2xkZXIuanNcIjtcclxuaW1wb3J0IHsgTWluZGlQcm92aWRlciB9IGZyb20gXCIuL21pbmRpUHJvdmlkZXIuanNcIjtcclxuaW1wb3J0IHsgSW5qZWN0b3IgfSBmcm9tIFwiLi9pbmplY3Rvci5qc1wiO1xyXG5cclxuY29uc3QgTE9HID0gbmV3IExvZ2dlcihcIk1pbmRpSW5qZWN0b3JcIik7XHJcblxyXG5leHBvcnQgY2xhc3MgTWluZGlJbmplY3RvciBleHRlbmRzIEluamVjdG9yIHtcclxuXHJcbiAgICBzdGF0aWMgaW5qZWN0KHRhcmdldCwgY29uZmlnKSB7XHJcbiAgICAgICAgSU5KRUNUT1IuaW5qZWN0VGFyZ2V0KHRhcmdldCwgY29uZmlnKTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIEByZXR1cm5zIHtNaW5kaUluamVjdG9yfVxyXG4gICAgICovXHJcbiAgICBzdGF0aWMgZ2V0SW5zdGFuY2UoKSB7XHJcbiAgICAgICAgcmV0dXJuIElOSkVDVE9SO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogSGVscGVyIG1ldGhvZCBmb3IgaW5qZWN0aW5nIGZpZWxkcyBpbiB0YXJnZXQgb2JqZWN0XHJcbiAgICAgKiBcclxuICAgICAqIEBwYXJhbSB7YW55fSB0YXJnZXQgXHJcbiAgICAgKiBAcGFyYW0ge0NvbmZpZ30gY29uZmlnIFxyXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGRlcHRoXHJcbiAgICAgKi9cclxuICAgIGluamVjdFRhcmdldCh0YXJnZXQsIGNvbmZpZywgZGVwdGggPSAwKSB7XHJcbiAgICAgICAgaWYgKCF0YXJnZXQpIHtcclxuICAgICAgICAgICAgdGhyb3cgRXJyb3IoXCJNaXNzaW5nIHRhcmdldCBvYmplY3RcIik7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICghY29uZmlnKSB7XHJcbiAgICAgICAgICAgIHRocm93IEVycm9yKFwiTWlzc2luZyBjb25maWdcIik7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICghY29uZmlnLmlzRmluYWxpemVkKCkpIHtcclxuICAgICAgICAgICAgdGhyb3cgRXJyb3IoXCJDb25maWcgbm90IGZpbmFsaXplZFwiKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKGRlcHRoID4gMTApIHtcclxuICAgICAgICAgICAgdGhyb3cgRXJyb3IoXCJJbmplY3Rpb24gc3RydWN0dXJlIHRvbyBkZWVwXCIpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjb25zdCBpbmplY3RvciA9IHRoaXM7XHJcbiAgICAgICAgT2JqZWN0LmtleXModGFyZ2V0KS5mb3JFYWNoKGZ1bmN0aW9uKGtleSxpbmRleCkge1xyXG4gICAgICAgICAgICBpZiAodGFyZ2V0W2tleV0gaW5zdGFuY2VvZiBJbmplY3Rpb25Qb2ludCkge1xyXG4gICAgICAgICAgICAgICAgaW5qZWN0b3IuaW5qZWN0UHJvcGVydHkodGFyZ2V0LCBrZXksIGNvbmZpZywgZGVwdGgpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgSW5zdGFuY2VQcm9jZXNzb3JFeGVjdXRvci5leGVjdXRlKHRhcmdldCwgY29uZmlnKTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSB0YXJnZXQgXHJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30ga2V5IFxyXG4gICAgICogQHBhcmFtIHtDb25maWd9IGNvbmZpZyBcclxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBkZXB0aCBcclxuICAgICAqL1xyXG4gICAgaW5qZWN0UHJvcGVydHkodGFyZ2V0LCBrZXksIGNvbmZpZywgZGVwdGgpIHtcclxuICAgICAgICBjb25zdCBpbmplY3Rpb25Qb2ludCA9IHRhcmdldFtrZXldO1xyXG4gICAgICAgIGlmIChpbmplY3Rpb25Qb2ludC50eXBlID09PSBJbmplY3Rpb25Qb2ludC5QUk9WSURFUl9UWVBFKSB7XHJcbiAgICAgICAgICAgIHRoaXMuaW5qZWN0UHJvcGVydHlQcm92aWRlcih0YXJnZXQsIGtleSwgY29uZmlnLCBkZXB0aCk7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy5pbmplY3RQcm9wZXJ0eUluc3RhbmNlKHRhcmdldCwga2V5LCBjb25maWcpO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHRhcmdldCBcclxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBrZXkgXHJcbiAgICAgKiBAcGFyYW0ge0NvbmZpZ30gY29uZmlnIFxyXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGRlcHRoIFxyXG4gICAgICovXHJcbiAgICBpbmplY3RQcm9wZXJ0eVByb3ZpZGVyKHRhcmdldCwga2V5LCBjb25maWcpIHtcclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBAdHlwZSB7SW5qZWN0aW9uUG9pbnR9XHJcbiAgICAgICAgICovXHJcbiAgICAgICAgY29uc3QgaW5qZWN0aW9uUG9pbnQgPSB0YXJnZXRba2V5XTtcclxuICAgICAgICBjb25zdCB0eXBlQ29uZmlnID0gQ29uZmlnQWNjZXNzb3IudHlwZUNvbmZpZ0J5TmFtZShpbmplY3Rpb25Qb2ludC5uYW1lLCBjb25maWcpO1xyXG4gICAgICAgIHRhcmdldFtrZXldID0gbmV3IE1pbmRpUHJvdmlkZXIodHlwZUNvbmZpZywgdGhpcywgY29uZmlnKTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSB0YXJnZXQgXHJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30ga2V5IFxyXG4gICAgICogQHBhcmFtIHtDb25maWd9IGNvbmZpZyBcclxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBkZXB0aCBcclxuICAgICAqL1xyXG4gICAgaW5qZWN0UHJvcGVydHlJbnN0YW5jZSh0YXJnZXQsIGtleSwgY29uZmlnLCBkZXB0aCkge1xyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIEB0eXBlIHtJbmplY3Rpb25Qb2ludH1cclxuICAgICAgICAgKi9cclxuICAgICAgICBjb25zdCBpbmplY3Rpb25Qb2ludCA9IHRhcmdldFtrZXldO1xyXG4gICAgICAgIGNvbnN0IGluc3RhbmNlSG9sZGVyID0gQ29uZmlnQWNjZXNzb3IuaW5zdGFuY2VIb2xkZXIoaW5qZWN0aW9uUG9pbnQubmFtZSwgY29uZmlnLCBpbmplY3Rpb25Qb2ludC5wYXJhbWV0ZXJzKTtcclxuICAgICAgICBpZihpbnN0YW5jZUhvbGRlci50eXBlID09PSBJbnN0YW5jZUhvbGRlci5ORVdfSU5TVEFOQ0UpIHtcclxuICAgICAgICAgICAgdGhpcy5pbmplY3RUYXJnZXQoaW5zdGFuY2VIb2xkZXIuaW5zdGFuY2UsIGNvbmZpZywgZGVwdGgrKyk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRhcmdldFtrZXldID0gaW5zdGFuY2VIb2xkZXIuaW5zdGFuY2U7XHJcbiAgICB9XHJcblxyXG59XHJcblxyXG5jb25zdCBJTkpFQ1RPUiA9IG5ldyBNaW5kaUluamVjdG9yKCk7IiwiaW1wb3J0IHsgTWFwLCBMaXN0LCBMb2dnZXIgfSBmcm9tIFwiY29yZXV0aWxfdjFcIjtcclxuaW1wb3J0IHsgVHlwZUNvbmZpZyB9IGZyb20gXCIuL3R5cGVDb25maWcvdHlwZUNvbmZpZy5qc1wiO1xyXG5pbXBvcnQgeyBDb25maWdQcm9jZXNzb3JFeGVjdXRvciB9IGZyb20gXCIuL2NvbmZpZ1Byb2Nlc3Nvci9jb25maWdQcm9jZXNzb3JFeGVjdXRvci5qc1wiO1xyXG5pbXBvcnQgeyBTaW5nbGV0b25Db25maWcgfSBmcm9tIFwiLi90eXBlQ29uZmlnL3NpbmdsZXRvbkNvbmZpZy5qc1wiO1xyXG5pbXBvcnQgeyBDb25maWcgfSBmcm9tIFwiLi9jb25maWcuanNcIjtcclxuaW1wb3J0IHsgTWluZGlJbmplY3RvciB9IGZyb20gXCIuL21pbmRpSW5qZWN0b3IuanNcIjtcclxuXHJcbmNvbnN0IExPRyA9IG5ldyBMb2dnZXIoXCJDb25maWdcIik7XHJcblxyXG5leHBvcnQgY2xhc3MgTWluZGlDb25maWcgZXh0ZW5kcyBDb25maWcge1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgICAgIHN1cGVyKCk7XHJcbiAgICAgICAgdGhpcy5maW5hbGl6ZWQgPSBmYWxzZTtcclxuICAgICAgICAvKiogQHR5cGUge01hcH0gKi9cclxuICAgICAgICB0aGlzLmNvbmZpZ0VudHJpZXMgPSBuZXcgTWFwKCk7XHJcbiAgICAgICAgdGhpcy5jb25maWdQcm9jZXNzb3JzID0gbmV3IExpc3QoKTtcclxuICAgICAgICB0aGlzLmluc3RhbmNlUHJvY2Vzc29ycyA9IG5ldyBMaXN0KCk7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBcclxuICAgICAqIEBwYXJhbSB7Q29uZmlnfSBjb25maWcgXHJcbiAgICAgKi9cclxuICAgIG1lcmdlKGNvbmZpZykge1xyXG4gICAgICAgIGlmICghY29uZmlnLmlzRmluYWxpemVkKCkpIHtcclxuICAgICAgICAgICAgdGhyb3cgRXJyb3IoXCJDYW5ub3QgbWVyZ2UgaW50byBhbiB1bmZpbmFsaXplZCBjb25maWdcIik7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNvbnN0IG5ld0NvbmZpZ0VudHJpZXMgPSBuZXcgTWFwKCk7XHJcbiAgICAgICAgbmV3Q29uZmlnRW50cmllcy5hZGRBbGwodGhpcy5jb25maWdFbnRyaWVzKTtcclxuICAgICAgICBuZXdDb25maWdFbnRyaWVzLmFkZEFsbChjb25maWcuY29uZmlnRW50cmllcyk7XHJcblxyXG4gICAgICAgIGNvbnN0IG5ld0NvbmZpZ1Byb2Nlc3NvcnMgPSBuZXcgTGlzdCgpO1xyXG4gICAgICAgIG5ld0NvbmZpZ1Byb2Nlc3NvcnMuYWRkQWxsKHRoaXMuY29uZmlnUHJvY2Vzc29ycyk7XHJcbiAgICAgICAgbmV3Q29uZmlnUHJvY2Vzc29ycy5hZGRBbGwoY29uZmlnLmNvbmZpZ1Byb2Nlc3NvcnMpO1xyXG5cclxuICAgICAgICBjb25zdCBuZXdJbnN0YW5jZVByb2Nlc3NvcnMgPSBuZXcgTGlzdCgpO1xyXG4gICAgICAgIG5ld0luc3RhbmNlUHJvY2Vzc29ycy5hZGRBbGwodGhpcy5pbnN0YW5jZVByb2Nlc3NvcnMpO1xyXG4gICAgICAgIG5ld0luc3RhbmNlUHJvY2Vzc29ycy5hZGRBbGwoY29uZmlnLmluc3RhbmNlUHJvY2Vzc29ycyk7XHJcblxyXG4gICAgICAgIC8qKiBAdHlwZSB7TWFwfSAqL1xyXG4gICAgICAgIHRoaXMuY29uZmlnRW50cmllcyA9IG5ld0NvbmZpZ0VudHJpZXM7XHJcbiAgICAgICAgdGhpcy5jb25maWdQcm9jZXNzb3JzID0gbmV3Q29uZmlnUHJvY2Vzc29ycztcclxuICAgICAgICB0aGlzLmluc3RhbmNlUHJvY2Vzc29ycyA9IG5ld0luc3RhbmNlUHJvY2Vzc29ycztcclxuXHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBcclxuICAgICAqIEBwYXJhbSB7VHlwZUNvbmZpZ30gdHlwZUNvbmZpZyBcclxuICAgICAqL1xyXG4gICAgYWRkVHlwZUNvbmZpZyh0eXBlQ29uZmlnKSB7XHJcbiAgICAgICAgdGhpcy5jb25maWdFbnRyaWVzLnNldCh0eXBlQ29uZmlnLm5hbWUsIHR5cGVDb25maWcpO1xyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfVxyXG5cclxuICAgIGFkZENvbmZpZ1Byb2Nlc3Nvcihjb25maWdQcm9jZXNzb3IpIHtcclxuICAgICAgICB0aGlzLmNvbmZpZ1Byb2Nlc3NvcnMuYWRkKGNvbmZpZ1Byb2Nlc3Nvci5uYW1lKTtcclxuICAgICAgICByZXR1cm4gdGhpcy5hZGRUeXBlQ29uZmlnKFNpbmdsZXRvbkNvbmZpZy51bm5hbWVkKGNvbmZpZ1Byb2Nlc3NvcikpO1xyXG4gICAgfVxyXG5cclxuICAgIGFkZEluc3RhbmNlUHJvY2Vzc29yKGluc3RhbmNlUHJvY2Vzc29yKSB7XHJcbiAgICAgICAgdGhpcy5pbnN0YW5jZVByb2Nlc3NvcnMuYWRkKGluc3RhbmNlUHJvY2Vzc29yLm5hbWUpO1xyXG4gICAgICAgIHJldHVybiB0aGlzLmFkZFR5cGVDb25maWcoU2luZ2xldG9uQ29uZmlnLnVubmFtZWQoaW5zdGFuY2VQcm9jZXNzb3IpKTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIFxyXG4gICAgICogQHBhcmFtIHtMaXN0fSB0eXBlQ29uZmlnTGlzdFxyXG4gICAgICovXHJcbiAgICBhZGRBbGxUeXBlQ29uZmlnKHR5cGVDb25maWdMaXN0KSB7XHJcbiAgICAgICAgdHlwZUNvbmZpZ0xpc3QuZm9yRWFjaCgodHlwZUNvbmZpZyxwYXJlbnQpID0+IHtcclxuICAgICAgICAgICAgdGhpcy5jb25maWdFbnRyaWVzLnNldCh0eXBlQ29uZmlnLm5hbWUsIHR5cGVDb25maWcpO1xyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICB9LHRoaXMpO1xyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogXHJcbiAgICAgKiBAcGFyYW0ge0xpc3R9IGNvbmZpZ1Byb2Nlc3Nvckxpc3QgXHJcbiAgICAgKi9cclxuICAgIGFkZEFsbENvbmZpZ1Byb2Nlc3Nvcihjb25maWdQcm9jZXNzb3JMaXN0KSB7XHJcbiAgICAgICAgY29uZmlnUHJvY2Vzc29yTGlzdC5mb3JFYWNoKChjb25maWdQcm9jZXNzb3IscGFyZW50KSA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMuY29uZmlnUHJvY2Vzc29ycy5hZGQoY29uZmlnUHJvY2Vzc29yLm5hbWUpO1xyXG4gICAgICAgICAgICB0aGlzLmFkZFR5cGVDb25maWcoU2luZ2xldG9uQ29uZmlnLnVubmFtZWQoY29uZmlnUHJvY2Vzc29yKSk7XHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgIH0sdGhpcyk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBcclxuICAgICAqIEBwYXJhbSB7TGlzdH0gaW5zdGFuY2VQcm9jZXNzb3JMaXN0IFxyXG4gICAgICovXHJcbiAgICBhZGRBbGxJbnN0YW5jZVByb2Nlc3NvcihpbnN0YW5jZVByb2Nlc3Nvckxpc3QpIHtcclxuICAgICAgICBpbnN0YW5jZVByb2Nlc3Nvckxpc3QuZm9yRWFjaCgoaW5zdGFuY2VQcm9jZXNzb3IscGFyZW50KSA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMuaW5zdGFuY2VQcm9jZXNzb3JzLmFkZChpbnN0YW5jZVByb2Nlc3Nvci5uYW1lKTtcclxuICAgICAgICAgICAgdGhpcy5hZGRUeXBlQ29uZmlnKFNpbmdsZXRvbkNvbmZpZy51bm5hbWVkKGluc3RhbmNlUHJvY2Vzc29yKSk7XHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgIH0sdGhpcyk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9XHJcblxyXG4gICAgaXNGaW5hbGl6ZWQoKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuZmluYWxpemVkO1xyXG4gICAgfVxyXG5cclxuICAgIGZpbmFsaXplKCkge1xyXG4gICAgICAgIHRoaXMuZmluYWxpemVkID0gdHJ1ZTtcclxuICAgICAgICByZXR1cm4gQ29uZmlnUHJvY2Vzc29yRXhlY3V0b3IuZXhlY3V0ZSh0aGlzLmNvbmZpZ1Byb2Nlc3NvcnMsIE1pbmRpSW5qZWN0b3IuZ2V0SW5zdGFuY2UoKSwgdGhpcyk7XHJcbiAgICB9XHJcblxyXG59IiwiaW1wb3J0IHsgVHlwZUNvbmZpZyB9IGZyb20gXCIuL3R5cGVDb25maWcuanNcIjtcclxuXHJcbmV4cG9ydCBjbGFzcyBQb29sQ29uZmlnIGV4dGVuZHMgVHlwZUNvbmZpZyB7XHJcblxyXG4gICAgc3RhdGljIG5hbWVkKG5hbWUsIGNsYXNzUmVmZXJlbmNlLCBwb29sU2l6ZSkge1xyXG4gICAgICAgIHJldHVybiBuZXcgUG9vbENvbmZpZyhuYW1lLCBjbGFzc1JlZmVyZW5jZSwgcG9vbFNpemUpO1xyXG4gICAgfVxyXG5cclxuICAgIHN0YXRpYyB1bm5hbWVkKGNsYXNzUmVmZXJlbmNlLCBwb29sU2l6ZSkge1xyXG4gICAgICAgIHJldHVybiBuZXcgUG9vbENvbmZpZyhjbGFzc1JlZmVyZW5jZS5uYW1lLCBjbGFzc1JlZmVyZW5jZSwgcG9vbFNpemUpO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0cnVjdG9yKG5hbWUsIGNsYXNzUmVmZXJlbmNlLCBwb29sU2l6ZSkge1xyXG4gICAgICAgIHN1cGVyKG5hbWUsIGNsYXNzUmVmZXJlbmNlKTtcclxuICAgICAgICB0aGlzLnBvb2xTaXplID0gcG9vbFNpemU7XHJcbiAgICB9XHJcblxyXG4gICAgaW5zdGFuY2VIb2xkZXIocGFyYW1ldGVycyA9IFtdKSB7XHJcblxyXG4gICAgfVxyXG5cclxufSIsImltcG9ydCB7IFR5cGVDb25maWcgfSBmcm9tIFwiLi90eXBlQ29uZmlnLmpzXCI7XHJcbmltcG9ydCB7IEluc3RhbmNlSG9sZGVyIH0gZnJvbSBcIi4vaW5zdGFuY2VIb2xkZXIuanNcIjtcclxuXHJcbmV4cG9ydCBjbGFzcyBQcm90b3R5cGVDb25maWcgZXh0ZW5kcyBUeXBlQ29uZmlnIHtcclxuXHJcbiAgICBzdGF0aWMgbmFtZWQobmFtZSwgY2xhc3NSZWZlcmVuY2UpIHtcclxuICAgICAgICByZXR1cm4gbmV3IFByb3RvdHlwZUNvbmZpZyhuYW1lLCBjbGFzc1JlZmVyZW5jZSk7XHJcbiAgICB9XHJcblxyXG4gICAgc3RhdGljIHVubmFtZWQoY2xhc3NSZWZlcmVuY2UpIHtcclxuICAgICAgICByZXR1cm4gbmV3IFByb3RvdHlwZUNvbmZpZyhjbGFzc1JlZmVyZW5jZS5uYW1lLCBjbGFzc1JlZmVyZW5jZSk7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3RydWN0b3IobmFtZSwgY2xhc3NSZWZlcmVuY2UpIHtcclxuICAgICAgICBzdXBlcihuYW1lLCBjbGFzc1JlZmVyZW5jZSk7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBAcGFyYW0ge2FycmF5fSBwYXJhbWV0ZXJzIHRoZSBwYXJhbWV0ZXJzIHRvIHVzZSBmb3IgdGhlIGNvbnN0cnVjdG9yXHJcbiAgICAgKi9cclxuICAgIGluc3RhbmNlSG9sZGVyKHBhcmFtZXRlcnMgPSBbXSkge1xyXG4gICAgICAgIGxldCBpbnN0YW5jZSA9IG51bGw7XHJcbiAgICAgICAgaWYocGFyYW1ldGVycyAmJiBwYXJhbWV0ZXJzLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgaW5zdGFuY2UgPSBuZXcgdGhpcy5jbGFzc1JlZmVyZW5jZSguLi5wYXJhbWV0ZXJzKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBpbnN0YW5jZSA9IG5ldyB0aGlzLmNsYXNzUmVmZXJlbmNlKCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBJbnN0YW5jZUhvbGRlci5ob2xkZXJXaXRoTmV3SW5zdGFuY2UoaW5zdGFuY2UpO1xyXG4gICAgfVxyXG5cclxuXHJcbn0iXSwibmFtZXMiOlsiTG9nZ2VyIiwiTE9HIiwiTGlzdCIsIk1hcCJdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBRUEsTUFBTSxHQUFHLEdBQUcsSUFBSUEsa0JBQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQzs7QUFFbkMsQUFBTyxNQUFNLFFBQVEsQ0FBQzs7SUFFbEIsR0FBRyxDQUFDLFVBQVUsR0FBRyxFQUFFLEVBQUU7UUFDakIsT0FBTyxJQUFJLENBQUM7S0FDZjs7OztDQUVKLERDUk0sTUFBTSxjQUFjLENBQUM7O0lBRXhCLFdBQVcsYUFBYSxHQUFHLEVBQUUsT0FBTyxDQUFDLENBQUMsRUFBRTtJQUN4QyxXQUFXLGFBQWEsR0FBRyxFQUFFLE9BQU8sQ0FBQyxDQUFDLEVBQUU7Ozs7Ozs7OztJQVN4QyxPQUFPLGNBQWMsQ0FBQyxJQUFJLEVBQUUsY0FBYyxFQUFFLFVBQVUsR0FBRyxFQUFFLEVBQUU7UUFDekQsT0FBTyxJQUFJLGNBQWMsQ0FBQyxJQUFJLEVBQUUsY0FBYyxFQUFFLGNBQWMsQ0FBQyxhQUFhLEVBQUUsVUFBVSxDQUFDLENBQUM7S0FDN0Y7Ozs7Ozs7O0lBUUQsT0FBTyxRQUFRLENBQUMsY0FBYyxFQUFFLFVBQVUsR0FBRyxFQUFFLEVBQUU7UUFDN0MsT0FBTyxJQUFJLGNBQWMsQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFLGNBQWMsRUFBRSxjQUFjLENBQUMsYUFBYSxFQUFFLFVBQVUsQ0FBQyxDQUFDO0tBQzVHOzs7Ozs7OztJQVFELE9BQU8sY0FBYyxDQUFDLElBQUksRUFB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
