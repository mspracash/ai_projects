// Author: Surya Muntha

import { StateGraph, START, END } from "@langchain/langgraph";
import { stateChannels } from "./state.js";
import { createWorkflowNodes } from "./workFlowNodes.js";

export function buildDiscoveryGraph(deps) {
  const {
    askConcernNode,
    normalizeConcernNode,
    atomizeConcernNode,
    resolveAtomicConcernsNode
  } = createWorkflowNodes(deps);

  const discoveryGraph = new StateGraph({
    channels: stateChannels
  });

  discoveryGraph.addNode("askConcern", (state) => askConcernNode(state));
  discoveryGraph.addNode("normalizeConcern", (state) => normalizeConcernNode(state));
  discoveryGraph.addNode("atomizeConcern", (state) => atomizeConcernNode(state));
  discoveryGraph.addNode("resolveAtomicConcerns", (state) =>
    resolveAtomicConcernsNode(state, deps)
  );

  discoveryGraph.addEdge(START, "askConcern");

  discoveryGraph.addConditionalEdges("askConcern", (state) => {
    if (state.isDiscoveryDone) {
      return END;
    }

    if (!state.currentConcern) {
      return "askConcern";
    }

    return "normalizeConcern";
  });

  discoveryGraph.addEdge("normalizeConcern", "atomizeConcern");
  discoveryGraph.addEdge("atomizeConcern", "resolveAtomicConcerns");
  discoveryGraph.addEdge("resolveAtomicConcerns", "askConcern");

  return discoveryGraph.compile();
}