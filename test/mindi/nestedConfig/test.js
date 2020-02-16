import { Logger } from 'coreutil_v1';
import { CONFIG } from './config.js';
import { Root } from './root.js';
import { MindiInjector } from '../../../src/mindi/mindiInjector.js';

const LOG = new Logger("Test");

let root = new Root();

LOG.info(root);

CONFIG.finalize().then(() => {
    LOG.info(CONFIG);
    MindiInjector.inject(root, CONFIG);
    LOG.info(root);
});

