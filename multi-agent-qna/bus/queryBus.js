export class QueryBus {
    constructor(){
        this.queues = {
            knowledge : [],
            agency: [],
            negotiation: [],
            composer:[]
        };
    }

    enqueue(agent, message){
        if(!this.queues[agent]) throw new Error(`Unknown queue:${agent}`);
        this.queues[agent].push(message);
    }

    dequeue(agent){
         if (!this.queues[agent]) {
            throw new Error(`Unknown queue: ${agent}`);
            }
        return this.queues[agent].shift() || null;
    }

    size(agent){
        return this.queues[agent]?.length || 0;
    }
}