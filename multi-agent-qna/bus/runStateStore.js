export class RunStateStore {
  constructor() {
    this.runs = new Map();
  }

  initRun(runId, items = [], context = {}) {
    this.runs.set(runId, {
      run_id: runId,
      items: new Map(items.map((item) => [item.item_id, { ...item }])),
      results: new Map(),
      context,
      created_at: new Date().toISOString()
    });
  }

  getRun(runId) {
    return this.runs.get(runId);
  }

  getItem(runId, itemId) {
    return this.runs.get(runId)?.items.get(itemId) || null;
  }

  updateItemStatus(runId, itemId, status) {
    const item = this.getItem(runId, itemId);
    if (item) {
      item.status = status;
    }
  }

  saveResult(runId, itemId, result) {
    const run = this.getRun(runId);
    if (!run) return;
    run.results.set(itemId, result);
    this.updateItemStatus(runId, itemId, "completed");
  }

  saveError(runId, itemId, error) {
    const item = this.getItem(runId, itemId);
    if (!item) return;
    item.error = error instanceof Error ? error.message : String(error);
    item.status = "failed";
  }

  getResult(runId, itemId) {
    return this.getRun(runId)?.results.get(itemId);
  }

  getAllItems(runId) {
    const run = this.getRun(runId);
    if (!run) return [];
    return Array.from(run.items.values());
  }

  getContext(runId) {
    return this.getRun(runId)?.context || {};
  }
}