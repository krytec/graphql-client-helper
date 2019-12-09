import { URL } from "url";

export function isValidURL(value:string): boolean{
    try{
        const url = new URL(value);
        return true;
    }catch(TypeError){
        return false;
    }
}