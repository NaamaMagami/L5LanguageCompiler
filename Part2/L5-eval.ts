// L5-eval-box

import { map, repeat, zipWith } from "ramda";
import { CExp, Exp, IfExp, LetrecExp, LetExp, ProcExp, Program, SetExp, isCExp, isValuesExp, isLetValuesExp, valuesExp, LetValuesExp, valuesBindingsExp } from './L5-ast';
import { Binding, VarDecl } from "./L5-ast";
import { isBoolExp, isLitExp, isNumExp, isPrimOp, isStrExp, isVarRef } from "./L5-ast";
import { parseL5Exp ,parseL5} from "./L5-ast";
import { isAppExp, isDefineExp, isIfExp, isLetrecExp, isLetExp,
         isProcExp, isSetExp } from "./L5-ast";
import { applyEnv, applyEnvBdg, globalEnvAddBinding, makeExtEnv, setFBinding,
         theGlobalEnv, Env, FBinding } from "./L5-env";
import { isClosure, makeClosure, Closure, Value ,SExpValue,isCompoundSExp,makeTuple, TupleSexp, isTupleSexp} from "./L5-value";
import { isEmpty, first, rest,allT } from '../shared/list';
import { Result, makeOk, makeFailure, mapResult, safe2, bind ,isOk,isFailure} from "../shared/result";
import { parse as p } from "../shared/parser";
import { applyPrimitive,listPrim } from "./evalPrimitive";
import { isUndefined } from "util";
import { isTupleTExp } from "./TExp";

// ========================================================
// Eval functions

export const applicativeEval = (exp: CExp, env: Env): Result<Value> =>
    isNumExp(exp) ? makeOk(exp.val) :
    isBoolExp(exp) ? makeOk(exp.val) :
    isStrExp(exp) ? makeOk(exp.val) :
    isPrimOp(exp) ? makeOk(exp) :
    isVarRef(exp) ? applyEnv(env, exp.var) :
    isLitExp(exp) ? makeOk(exp.val) :
    isIfExp(exp) ? evalIf(exp, env) :
    isProcExp(exp) ? evalProc(exp, env) :
    isLetExp(exp) ? evalLet(exp, env) :
    isLetrecExp(exp) ? evalLetrec(exp, env) :
    isSetExp(exp) ? evalSet(exp, env) :
    isAppExp(exp) ? safe2((proc: Value, args: Value[]) => applyProcedure(proc, args))
                        (applicativeEval(exp.rator, env), mapResult(rand => applicativeEval(rand, env), exp.rands)) :
    isValuesExp(exp) ? evalValuesExp(exp, env):
    isLetValuesExp(exp) ? evalLetValuesExp(exp, env) :
    makeFailure(`Bad L5 AST ${exp}`);

export const isTrueValue = (x: Value): boolean =>
    ! (x === false);

const evalIf = (exp: IfExp, env: Env): Result<Value> =>
    bind(applicativeEval(exp.test, env),
         (test: Value) => isTrueValue(test) ? applicativeEval(exp.then, env) : applicativeEval(exp.alt, env));

const evalProc = (exp: ProcExp, env: Env): Result<Closure> =>
    makeOk(makeClosure(exp.args, exp.body, env));

const evalValuesExp = (exp: valuesExp, env:Env) : Result<Value> =>
    bind(mapResult((v:CExp)=>applicativeEval(v,env),exp.vals),(values:Value[])=>makeOk(makeTuple(values)));

// KEY: This procedure does NOT have an env parameter.
//      Instead we use the env of the closure.
const applyProcedure = (proc: Value, args: Value[]): Result<Value> =>
    isPrimOp(proc) ? applyPrimitive(proc, args) :
    isClosure(proc) ? applyClosure(proc, args) :
    makeFailure(`Bad procedure ${JSON.stringify(proc)}`);

const applyClosure = (proc: Closure, args: Value[]): Result<Value> => {
    const vars = map((v: VarDecl) => v.var, proc.params);
    return evalSequence(proc.body, makeExtEnv(vars, args, proc.env));
}

// Evaluate a sequence of expressions (in a program)
export const evalSequence = (seq: Exp[], env: Env): Result<Value> =>
    isEmpty(seq) ? makeFailure("Empty sequence") :
    isDefineExp(first(seq)) ? evalDefineExps(first(seq), rest(seq)) :
    evalCExps(first(seq), rest(seq), env);
    
const evalCExps = (first: Exp, rest: Exp[], env: Env): Result<Value> =>
    isCExp(first) && isEmpty(rest) ? applicativeEval(first, env) :
    isCExp(first) ? bind(applicativeEval(first, env), _ => evalSequence(rest, env)) :
    makeFailure("Never");
    
// define always updates theGlobalEnv
// We also only expect defineExps at the top level.
// Eval a sequence of expressions when the first exp is a Define.
// Compute the rhs of the define, extend the env with the new binding
// then compute the rest of the exps in the new env.
const evalDefineExps = (def: Exp, exps: Exp[]): Result<Value> =>
    isDefineExp(def) ? bind(applicativeEval(def.val, theGlobalEnv),
                            (rhs: Value) => { globalEnvAddBinding(def.var.var, rhs);
                                              return evalSequence(exps, theGlobalEnv); }) :
    makeFailure("Unexpected " + def);

// Main program
export const evalProgram = (program: Program): Result<Value> =>
    evalSequence(program.exps, theGlobalEnv);

export const evalParse = (s: string): Result<Value> =>
    bind(bind(p(s), parseL5Exp), (exp: Exp) => evalSequence([exp], theGlobalEnv));

// LET: Direct evaluation rule without syntax expansion
// compute the values, extend the env, eval the body.
const evalLet = (exp: LetExp, env: Env): Result<Value> => {
    const vals = mapResult((v : CExp) => applicativeEval(v, env), map((b : Binding) => b.val, exp.bindings));
    const vars = map((b: Binding) => b.var.var, exp.bindings);
    return bind(vals, (vals: Value[]) => evalSequence(exp.body, makeExtEnv(vars, vals, env)));
}

const evalLetValuesExp = (exp:LetValuesExp, env:Env) :Result<Value> =>{
    const bindingsValues:Result<Value[]> = mapResult((b:valuesBindingsExp)=>applicativeEval(b.values,env),exp.bindings);
    
    const areValidBindings:boolean = isOk(bindingsValues) && matchingNumOfOperands(bindingsValues.value,map((b:valuesBindingsExp)=>b.vars.length,exp.bindings));
    if (areValidBindings){
        const ResVals:Result<Value[]> = bind(mapResult((v : CExp) => applicativeEval(v, env),map((b:valuesBindingsExp)=>b.values,exp.bindings)),(vals:Value[])=>turnSexpToarr(vals));
        const vardecls:VarDecl[][] = map((v:valuesBindingsExp)=>v.vars,exp.bindings);
        const vars:string[] = vardecls.reduce((acc,curr)=> acc = acc.concat(curr),[]).map(v => v.var);
        return bind(ResVals, (vals: Value[]) => evalSequence(exp.body, makeExtEnv(vars, vals, env)));
    }
    return makeFailure("Invalid bindings for let-values");
}

const matchingNumOfOperands = (vals:Value[],lens:number[]) :boolean =>{
    const numOfVals:number[] = map((v)=> isTupleSexp(v)? v.vals.length :-1 ,vals);
    for (let i=0; i<lens.length;i++){
        if (lens[i]!=numOfVals[i])
            return false;
    }
    return true;
}
const turnSexpToarr = (exps: SExpValue[]): Result<SExpValue[]> => {
    if (allT(isTupleSexp,exps)){
        const valuesArr:SExpValue[][] = map((e)=>e.vals ,exps);
        return makeOk(valuesArr.reduce((acc,curr) => acc = acc.concat(curr), []));
        //return makeOk(exps.map(exp => CompoundSexpToArr(exp)).reduce((acc,curr) => acc = acc.concat(curr), []))
    }
    return makeFailure("let-values must only receive vals that evaluate to values");
}
const recursiveCompoundSexpToArr = (exp:SExpValue,arr:SExpValue[]): SExpValue[] =>
!isUndefined(exp)?
 isCompoundSExp(exp)? recursiveCompoundSexpToArr(exp.val2,arr.concat([exp.val1])) : arr :
 arr;

const CompoundSexpToArr = (exp: SExpValue): SExpValue[] => {
     const EmptyArr : SExpValue[] = [];
    if (isCompoundSExp(exp))
        return recursiveCompoundSexpToArr(exp,EmptyArr);
    if (!isUndefined(exp))
        return [exp];
    return [];}






// LETREC: Direct evaluation rule without syntax expansion
// 1. extend the env with vars initialized to void (temporary value)
// 2. compute the vals in the new extended env
// 3. update the bindings of the vars to the computed vals
// 4. compute body in extended env
const evalLetrec = (exp: LetrecExp, env: Env): Result<Value> => {
    const vars = map((b) => b.var.var, exp.bindings);
    const vals = map((b) => b.val, exp.bindings);
    const extEnv = makeExtEnv(vars, repeat(undefined, vars.length), env);
    // @@ Compute the vals in the extended env
    const cvalsResult = mapResult((v: CExp) => applicativeEval(v, extEnv), vals);
    const result = bind(cvalsResult,
                        (cvals: Value[]) => makeOk(zipWith((bdg, cval) => setFBinding(bdg, cval), extEnv.frame.fbindings, cvals)));
    return bind(result, _ => evalSequence(exp.body, extEnv));
};

// L4-eval-box: Handling of mutation with set!
const evalSet = (exp: SetExp, env: Env): Result<void> =>
    safe2((val: Value, bdg: FBinding) => makeOk(setFBinding(bdg, val)))
        (applicativeEval(exp.val, env), applyEnvBdg(env, exp.var.var));


//console.log(parseL5Exp("(let-values (((a b c) (values 1 2 3))) (+ a b c))"));
//console.log(evalParse("(let-values (((a b c) (values 1 2 3))) (+ a b c))"));
//console.log(bind(parseL5("(L5 (define f (lambda (x) (values 1 2 3))) (let-values (((a b c) (f 0))) (+ a b c)))"), evalProgram));
//console.log(evalParse("(let-values (((x y) (values 1 3))) (+ y x))"));
//console.log(evalParse("(let-values (((n s) (values 1 #t))) (if s 3 5))"));

// console.log(evalParse("(let-values (((a b c) (values 1 2 3))) (+ a b c))"));
// console.log(bind(parseL5("(L5 (define f (lambda (x) (values 1 2 3))) (let-values (((a b c) (f 0))) (+ a b c)))"), evalProgram));
// console.log(evalParse("(let-values (((x y) (values 1 3))) (+ y x))"));
// console.log(evalParse("(let-values (((n s) (values 1 #t))) (if s 3 5))"));

//console.log(evalParse("(let-values ((()(values)) ((a b)(values 1 2))) 1)"));