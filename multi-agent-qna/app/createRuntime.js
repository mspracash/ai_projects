import { createCoreAgents, createScheduledAgents } from "../agents/createAgents.js";
import { QueryBus } from "../bus/queryBus.js";
import { RunStateStore } from "../bus/runStateStore.js";
import { Scheduler } from "../bus/scheduler.js";
import { OutputQueue } from "../bus/outputQueue.js";

export function createRuntime() {
  const bus = new QueryBus();
  const state = new RunStateStore();

  const coreAgents = createCoreAgents();
  const scheduledAgents = createScheduledAgents();

  return {
    ...coreAgents,
    bus,
    state,

    async runWithComposer(runId, intakeItems, context = {}) {
      const outputQueue = new OutputQueue();
      const scheduler = new Scheduler({
        bus,
        state,
        agents: scheduledAgents,
        outputQueue
      });

      this.composer.reset();
      this.composer.startRun(context.originalInput || "");

      const consumerTask = this.composer.consumeLoop(outputQueue);
      await scheduler.run(runId, intakeItems, context);
      await consumerTask;

      return this.composer.handleFinal();
    }
  };
}