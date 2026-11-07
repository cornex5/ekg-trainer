// English dictionary: German source string -> English.
import { EN_CASES } from './en-cases.js';
import { EN_DATA } from './en-data.js';
import { EN_UI } from './en-ui.js';
import { EN_LEARN } from './en-learn.js';
import { EN_LESSONS } from './lessons.js';

export const EN = { ...EN_CASES, ...EN_DATA, ...EN_UI, ...EN_LEARN, ...EN_LESSONS };
