// Peças para escrever os efeitos refeitos no modelo do Resolume (effects-r*.js).
// Cada controle leva `r`: o nome dele na ficha do Resolume (referencia-resolume/FICHAS.md). O `def()` monta o mapa
// rparams (nome no Resolume -> chave daqui), que a bancada usa para levar os mesmos valores aos dois programas.
//   N  número (faixa)        B  liga/desliga (0 ou 1)        L  lista (o valor é o índice da opção)
//   C  cor "#rrggbb" (vec3) ou, com alfa, "#rrggbbaa" (vec4)  E  botão de disparo (0 ou 1, como o Reset do Resolume)
export const N = (key, r, label, def, min, max, step, unit = '') => ({ key, r, label, def, min, max, step: step ?? (max - min > 20 ? 1 : 0.01), unit });
export const B = (key, r, label, def = 0) => ({ key, r, label, def: def ? 1 : 0, min: 0, max: 1, step: 1, unit: '', bool: true });
export const L = (key, r, label, ropts, opts, def = 0) => ({ key, r, label, def, opts: opts || ropts, ropts, min: 0, max: ropts.length - 1, step: 1, unit: '' });
export const C = (key, r, label, def, alpha = false) => ({ key, r, label, def, color: true, alpha });
export const E = (key, r, label) => ({ key, r, label, def: 0, min: 0, max: 1, step: 1, unit: '', event: true });
// def({ id, name, desc, params, glsl, ... }): acrescenta o rparams a partir dos `r` dos controles
// v: versão dos controles. Uma composição gravada antes da troca traz as chaves antigas (às vezes com o mesmo nome e outro
// sentido: o Crop antigo com r = 0 era "sem corte", o novo com r = 0 corta tudo); o cloneFx devolve o padrão nesses casos.
export const def = (d) => ({ v: 2, ...d, rparams: Object.fromEntries(d.params.filter(p => p.r).map(p => [p.r, p.key])) });
