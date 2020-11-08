// ========================================================
// Value type definition for L5

import { append, join,map } from 'ramda';
import { isPrimOp, CExp, PrimOp, VarDecl } from './L5-ast';
import { Env } from './L5-env';
import { isNumber, isArray, isString } from '../shared/type-predicates';
import { isTupleTExp } from './TExp';

export type Value = SExpValue;

export type Functional = PrimOp | Closure;
export const isFunctional = (x: any): x is Functional => isPrimOp(x) || isClosure(x);

// ========================================================
// Closure for L5
export interface Closure {
    tag: "Closure";
    params: VarDecl[];
    body: CExp[];
    env: Env;
}
export const makeClosure = (params: VarDecl[], body: CExp[], env: Env): Closure =>
    ({tag: "Closure", params: params, body: body, env: env});
export const isClosure = (x: any): x is Closure => x.tag === "Closure";

// ========================================================
// SExp
export interface CompoundSExp {
    tag: "CompoundSexp";
    val1: SExpValue;
    val2: SExpValue;
}
export interface EmptySExp {
    tag: "EmptySExp";
}
export interface SymbolSExp {
    tag: "SymbolSExp";
    val: string;
}
export interface TupleSexp {
    tag: "TupleSexp";
    vals: SExpValue[];
}

//export type SExpValue = number | boolean | string | PrimOp | Closure | SymbolSExp | EmptySExp | CompoundSExp | void ;
export type SExpValue = number | boolean | string | PrimOp | Closure | SymbolSExp | EmptySExp | CompoundSExp | void | TupleSexp;

export const isSExp = (x: any): x is SExpValue =>
    typeof(x) === 'string' || typeof(x) === 'boolean' || typeof(x) === 'number' ||
    //isSymbolSExp(x) || isCompoundSExp(x) || isEmptySExp(x) || isPrimOp(x) || isClosure(x) ;
    isSymbolSExp(x) || isCompoundSExp(x) || isEmptySExp(x) || isPrimOp(x) || isClosure(x) ||isTupleSexp(x);

export const makeCompoundSExp = (val1: SExpValue, val2: SExpValue): CompoundSExp =>
    ({tag: "CompoundSexp", val1: val1, val2 : val2});
export const isCompoundSExp = (x: any): x is CompoundSExp => x.tag === "CompoundSexp";

export const makeEmptySExp = (): EmptySExp => ({tag: "EmptySExp"});
export const isEmptySExp = (x: any): x is EmptySExp => x.tag === "EmptySExp";

export const makeSymbolSExp = (val: string): SymbolSExp =>
    ({tag: "SymbolSExp", val: val});
export const isSymbolSExp = (x: any): x is SymbolSExp => x.tag === "SymbolSExp";

export const makeTuple = (vals: SExpValue[]): TupleSexp =>
    ({tag: "TupleSexp", vals: vals});
export const isTupleSexp = (x: any): x is TupleSexp => x.tag === "TupleSexp";



// Printable form for values
export const closureToString = (c: Closure): string =>
    // `<Closure ${c.params} ${L3unparse(c.body)}>`
    `<Closure ${c.params} ${c.body}>`

export const compoundSExpToArray = (cs: CompoundSExp, res: string[]): string[] | { s1: string[], s2: string } =>
    isEmptySExp(cs.val2) ? append(valueToString(cs.val1), res) :
    isCompoundSExp(cs.val2) ? compoundSExpToArray(cs.val2, res.concat([valueToString(cs.val1)])) :
    ({ s1: res.concat([valueToString(cs.val1)]), s2: valueToString(cs.val2)})
 
export const compoundSExpToString = (cs: CompoundSExp, css = compoundSExpToArray(cs, [])): string => 
    isArray(css) ? `(${join(' ', css)})` :
    `(${css.s1.join(' ')} . ${css.s2})`

export const tupleSExpTostring = (tc: TupleSexp):string =>
    `(values ${map(valueToString,tc.vals).join(" ")})`;

export const valueToString = (val: Value): string =>
    isNumber(val) ?  val.toString() :
    val === true ? '#t' :
    val === false ? '#f' :
    isString(val) ? `"${val}"` :
    isClosure(val) ? closureToString(val) :
    isPrimOp(val) ? val.op :
    isSymbolSExp(val) ? val.val :
    isEmptySExp(val) ? "'()" :
    isCompoundSExp(val) ? compoundSExpToString(val) :
    isTupleSexp(val) ? tupleSExpTostring(val) :
    "Error: unknown value type "+val 
