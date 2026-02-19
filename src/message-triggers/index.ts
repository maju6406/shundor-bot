import type { Trigger } from './types.js';
import { exampleHear } from './builtins/_example_hear.js';
import { exampleRespond } from './builtins/_example_respond.js';

export const triggers: Trigger[] = [
  exampleRespond,
  exampleHear
];
