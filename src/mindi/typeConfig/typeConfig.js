export class TypeConfig {

    constructor(name, classReference) {
        this.name = name;
        this.classReference = classReference;
    }

    getClassReference() {
        return this.classReference;
    }

    getName() {
        return this.name;
    }

    instanceHolder(parameters = []) {
        return null;
    }

}