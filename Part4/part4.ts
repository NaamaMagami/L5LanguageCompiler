import { resolve } from "dns";
import { reject, values, construct,map } from "ramda";
import { isWorker } from "cluster";


export function f (x :number) : number{
   return 1/x;
}
export function g (x :number) : number{
    return x*x;
}
export function h (x :number) : number{
    return f(g(x));
}


export const promiseF = (number : number ): Promise<number> => 
    new Promise<number>((resolve,reject) =>  {
        if(number == 0)
            reject('Error - divide by 0');
        else
            resolve(1/number);
  });

  export const promiseG = (number : number ): Promise<number> => 
  new Promise<number>((resolve,reject) =>  {
          resolve(number*number);
});

export const promiseH = (number : number ): Promise<number> => {
    return promiseG(number).then((value) => promiseF(value));
}
        



  

//---------------------------------------------------------------------------------------------
// export const promise1 = (number:number) =>new Promise((resolve, reject) =>{
//     if (number==0)
//     reject("errorr");
//     else
//     setTimeout(resolve, 500, true);
//   });
  
//   export const promise2 = new Promise((resolve, reject) => {
//     setTimeout(resolve, 100, 'two');
//   });
  
  export const slower = <T,U>(promiseArr : [Promise<T>,Promise<U>]): Promise<[number,T|U]> =>
  new Promise<[number,T|U]>((resolve,reject) => {
      let leftToResolve= 2;
      const updateRes=(i :number, val:T|U) => {
          leftToResolve--;
          if(leftToResolve === 0){
              resolve([i,val]);
          }   
      };
      promiseArr[0].then((val:T)=>updateRes(0,val)).catch((err)=>reject(err));
      promiseArr[1].then((val:U)=>updateRes(1,val)).catch((err)=>reject(err));

  });


  //slower([promise2,promise1(0)]).then(res=>console.log("result: "+res)).catch(err=>console.log("err: "+err));

 