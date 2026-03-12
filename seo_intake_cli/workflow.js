// Author: Surya Muntha

import { StateGraph, START, END } from "@langchain/langgraph";
import { stateChannels } from "./state.js";
import { buildDiscoveryGraph } from "./discoveryGraph.js";
import { createWorkflowNodes } from "./workFlowNodes.js";

export function buildRootGraph(deps) {
  const discoveryGraph = buildDiscoveryGraph(deps);

  const {
    intakeNode,
    mapServicesNode,
    priceServicesNode,
    summaryNode
  } = createWorkflowNodes(deps);

  const rootGraph = new StateGraph({
    channels: stateChannels
  });

  rootGraph.addNode("intake", (state) => intakeNode(state));
  rootGraph.addNode("discoveryGraph", discoveryGraph);
  rootGraph.addNode("mapServices", (state) => mapServicesNode(state, deps));
  rootGraph.addNode("priceServices", (state) => priceServicesNode(state, deps));
  rootGraph.addNode("summary", (state) => summaryNode(state, deps));

  rootGraph.addEdge(START, "intake");
  rootGraph.addEdge("intake", "discoveryGraph");
  rootGraph.addEdge("discoveryGraph", "mapServices");
  rootGraph.addEdge("mapServices", "priceServices");
  rootGraph.addEdge("priceServices", "summary");
  rootGraph.addEdge("summary", END);

  return rootGraph.compile();
}