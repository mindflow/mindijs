export class InjectionPoint {

    static get INSTANCE_TYPE() { return 0; } 
    static get PROVIDER_TYPE() { return 1; } 

    static instanceByName(name, classReference, parameters = []) {
        return new InjectionPoint(name, classReference, InjectionPoint.INSTANCE_TYPE, parameters);
    }

    static instance(classReference, parameters = []) {
        return new InjectionPoint(classReference.name, classReference, InjectionPoint.INSTANCE_TYPE, parameters);
    }

    static provideryByName(name, classReference, parameters = []) {
        return new InjectionPoint(name, classReference, InjectionPoint.PROVIDER_TYPE, parameters);
    }

    static provider(classReference, parameters = []) {
        return new InjectionPoint(classReference.name, classReference, InjectionPoint.PROVIDER_TYPE, parameters);
    }

    constructor(name, classReference, type = InjectionPoint.INSTANCE_TYPE, parameters) {
        this.name = name;
        this.classReference = classReference;
        this.type = type;
        this.parameters = parameters;
    }

    getName() {
        return this.name;
    }

    getClassReference() {
        return this.classReference;
    }

    getType() {
       return this.type; 
    }

    getParameters() {
        return this.parameters;
    }

}