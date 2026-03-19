import { KnowledgeAgent } from "./KnowledgeAgent.js";
import { NegotiationAgent } from "./NegotiationAgent.js";
import { ComposerAgent } from "./ComposerAgent.js";
import { IntakeAgent } from "./IntakeAgent.js";
import { PartitionAgent } from "./PartitionAgent.js";
import { NonIntakeAgent } from "./NonIntakeAgent.js";
import { AgencyAgent } from "./AgencyAgent.js";

export function instantiateGroup(group) {
  return Object.fromEntries(
    Object.entries(group).map(([key, AgentClass]) => [key, new AgentClass()])
  );
}

export function createCoreAgents() {
  return instantiateGroup({
    partitionAgent: PartitionAgent,
    intakeAgent: IntakeAgent,
    nonIntakeAgent: NonIntakeAgent,
    composer: ComposerAgent
  });
}

export function createScheduledAgents() {
  return instantiateGroup({
    agency: AgencyAgent,
    knowledge: KnowledgeAgent,
    negotiation: NegotiationAgent
  });
}