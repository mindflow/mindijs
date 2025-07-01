import { TypeConfig } from "./typeConfig.js";

export class TypeConfigPack {

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