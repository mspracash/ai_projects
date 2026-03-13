export class Scheduler {
    constructor({ bus, state, agents, onStream }){
        this.bus = bus;
        this.state = state;
        this.agents = agents;
        this.onStream = onStream || (() => {});
    }

    scheduleRunnable(runId){
        const run = this.state.getRun(runId);
        if(!run) return;

        for(const item of run.items.values()){
            if(item.status !=="queued") continue;
            if(!this.state.areDependenciesSatisfied(runId, item)) continue;
            
            this.bus.enqueue(item.assignment,{
                run_id: runId,
                item_id: item.item_id,
                payload: item
            });
            item.status = "dispatched";
        }
    }

    async drain(runId){
        let progressed = true;

        while(progressed){
            progressed = false;
            this.scheduleRunnable(runId);

            for(const agentName of ["knowledge", "agency", "negotiation"]){
                let msg;
                while((msg = this.bus.dequeue(agentName))){
                    this.state.updateItemStatus(runId, msg.item_id, "running");
                    const result = await this.agents[agentName].handle(msg, this.state);
                    this.state.saveResult(runId, msg.item_id, result);
                    this.onStream(result);
                    progressed = true;
                }
            }
        }
        return this.agents.composer.handleFinal(runId, this.state);
    }
}