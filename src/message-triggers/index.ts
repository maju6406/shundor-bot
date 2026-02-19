import type { Trigger } from './types.js';
import { exampleHear } from './builtins/_example_hear.js';
import { exampleRespond } from './builtins/_example_respond.js';
import { hubotPersonalPhase1Triggers } from './builtins/hubot_phase1_personal.js';

export const triggers: Trigger[] = [
  ...hubotPersonalPhase1Triggers,
  exampleRespond,
  exampleHear
];
