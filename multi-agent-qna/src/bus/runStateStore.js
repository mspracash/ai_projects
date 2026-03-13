export class RunStateStore {
    constructor(){
        this.runs = new Map();
    }

    initRun(runId, items = []){
        this.runs.set(runId, {
            run_id: runId,
            items: new Map(items.map((item) => [item.item_id, {...item}])),
            results: new Map(),
            created_at: new Date().toISOString()
        });
    }

    getRun(runId){
        return this.runs.get(runId);
    }

    getItem(runId, itemId){
        return this.runs.get(runId)?.items.get(itemId);
    }

    updateItemStatus(runId, itemId, status){
        const item = this.getItem(runId, itemId);
        if(item){
            item.staus = status;
        }
    }

    saveResult(runId, itemId, result){
        const run = this.getRun(runId);
        if (!run) return;
        run.results.set(itemId, result);
        this.updateItemStatus(runId, itemId, "completed");
    }

    getResult(runId, itemId){
        return this.getRun(runId)?.results.get(itemId);
    }

    areDependenciesSatisfied(run, item){
        return (item.dependencies || []).every((depId) => this.getResult(runId, depId));
    }

}