export class BaseAgent{
    constructor({name}){
        this.name = name;
    }

    async process(_input){
        throw new Error(`${this.name} must implement process method.`)
    }
}