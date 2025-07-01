export class Config {

    constructor() {
        /** @type {Map<any,any>} */
        this.configEntries = null;

        /** @type {Array<any>} */
        this.configProcessors = null;

        /** @type {Array<any>} */
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