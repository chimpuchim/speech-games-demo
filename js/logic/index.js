import { match } from './match.js';
import { sort } from './sort.js';
import { sequence } from './sequence.js';
import { odd } from './odd.js';

/** Every game template, keyed by id. A template is { create, apply, isDone, progress }. */
export const TEMPLATES = { match, sort, sequence, odd };
export const TEMPLATE_IDS = Object.keys(TEMPLATES);
