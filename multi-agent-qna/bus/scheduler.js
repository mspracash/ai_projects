export class Scheduler {
  constructor({ bus, state, agents, outputQueue }) {
    this.bus = bus;
    this.state = state;
    this.agents = agents;
    this.outputQueue = outputQueue;
  }

  async run(runId, intakeItems, context = {}) {
    const scheduledItems = intakeItems.map((item) => ({
      ...item,
      assignment: item.type,
      status: "queued"
    }));

    this.state.initRun(runId, scheduledItems, context);
    await this.drain(runId);
  }

  scheduleRunnable(runId) {
    const run = this.state.getRun(runId);
    if (!run) return;

    for (const item of run.items.values()) {
      if (item.status !== "queued") continue;

      this.bus.enqueue(item.assignment, {
        run_id: runId,
        item_id: item.item_id,
        payload: item
      });

      item.status = "dispatched";
    }
  }

  buildOutputEvent(runId, msg, result, agentName) {
    const payload = msg.payload || {};
    const r = result || {};

    return {
      run_id: runId,
      item_id: msg.item_id,
      agent: agentName,
      type: r.type || payload.type || agentName,
      question: r.question || payload.text || payload.question || "",
      answer: r.answer || r.summary || "",
      results: r.results || [],
      error: r.error || null,
      ts: Date.now()
    };
  }

  buildErrorEvent(runId, msg, err, agentName) {
    const payload = msg.payload || {};

    return {
      run_id: runId,
      item_id: msg.item_id,
      agent: agentName,
      type: payload.type || agentName,
      question: payload.text || payload.question || "",
      answer: "",
      results: [],
      error: err instanceof Error ? err.message : String(err),
      ts: Date.now()
    };
  }

  async drain(runId) {
    let progressed = true;

    while (progressed) {
      progressed = false;
      this.scheduleRunnable(runId);

      for (const agentName of ["knowledge", "agency", "negotiation"]) {
        let msg;

        while ((msg = this.bus.dequeue(agentName))) {
          try {
            this.state.updateItemStatus(runId, msg.item_id, "running");

            const agent = this.agents[agentName];
            if (!agent) {
              throw new Error(`No agent registered for "${agentName}"`);
            }

            const result = await agent.process(msg, this.state);

            this.state.saveResult(runId, msg.item_id, result);
            this.state.updateItemStatus(runId, msg.item_id, "done");

            this.outputQueue.push(
              this.buildOutputEvent(runId, msg, result, agentName)
            );

            progressed = true;
          } catch (err) {
            this.state.saveError(runId, msg.item_id, err);
            this.state.updateItemStatus(runId, msg.item_id, "error");

            this.outputQueue.push(
              this.buildErrorEvent(runId, msg, err, agentName)
            );

            progressed = true;
          }
        }
      }
    }

    this.outputQueue.close();
  }
}