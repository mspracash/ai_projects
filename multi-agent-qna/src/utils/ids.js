export function createRunId(){
    return `run_${Date.now()}`;
}

export function createItemId(index){
    return `a${index + 1}`;
}