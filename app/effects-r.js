// Os efeitos refeitos no modelo do Resolume, lote a lote. Cada lote é um arquivo (effects-rN.js) para que
// vários possam ser escritos ao mesmo tempo sem um pisar no outro.
import { R1 } from './effects-r1.js';
import { R2 } from './effects-r2.js';
import { R3 } from './effects-r3.js';
import { R4 } from './effects-r4.js';
import { R5 } from './effects-r5.js';
import { R6 } from './effects-r6.js';
import { R7 } from './effects-r7.js';

export const RESOLUME = [...R1, ...R2, ...R3, ...R4, ...R5, ...R6, ...R7];
