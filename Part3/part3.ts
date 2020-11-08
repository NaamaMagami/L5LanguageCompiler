import { expect } from 'chai';
import { range } from 'ramda';


// export function* gen1() {
//     yield 0;
//     yield 1;
//     yield 2;
//     yield 3;
//     yield 4;
// }
// export function* gen2() {
//     yield 5;
//     yield 6;
//     yield 7;
//     yield 8;
//     yield 9;
//     yield 10;
//     yield 11;
//     yield 12;
// }

export function* braid (gen1: Generator, gen2: Generator):Generator{
    let x = gen1.next();
    let y = gen2.next();
    while( x.done == false && y.done == false){
        yield x.value; 
        x = gen1.next();   
        yield y.value;  
        y = gen2.next();   
    }
    while(x.done == false){
        yield x.value; 
        x = gen1.next();  
    }
    while(y.done==false){
        yield y.value; 
        y = gen2.next();  
    }
}


// export function* take(n: number,g:Generator){
//     for(let x of g){
//         if(n<=0){
//             return;
//         }
//         n--;
//         yield x;
//     }

// }

export function* biased(gen1: Generator, gen2: Generator) {
    let x = gen1.next();
    let y = gen2.next();
    while(x.done == false && y.done == false){
        yield x.value;   
        x = gen1.next();
        if (x.done==false){
            yield x.value;  
            x = gen1.next(); 
        }
        yield y.value;   
        y = gen2.next();   
    }
    while(x.done==false){
        yield x.value; 
        x = gen1.next();  
    }
    while(y.done==false){
        yield y.value; 
        y = gen2.next();  
    }

}



// for (let n of take(20, braid(gen1(),gen2()))) {
//     console.log(n);
// }

// let g = braid(gen1(),gen2());
// for (let i in range(0, 5)) {
//     console.log(g.next());
//     console.log(g.next());
// }
// for (let i in range(5, 8)) {
//     console.log(g.next());
// }