import {StateGraph, START, END} from "@langchain/langgraph";
import {intakeNode,mapServicesNode, priceServicesNode, summaryNode } from "./workFlowNodes.js";
import { buildDiscoveryGraph } from "./discoveryGraph.js";
import { stateChannels } from "./state.js";

export function buildRootGraph(deps){
    const graph = new StateGraph({
        channels: stateChannels
    });

    const discoveryGraph = buildDiscoveryGraph(deps);

    graph.addNode("intake", (state) => intakeNode(state, deps));
    graph.addNode("discovery", (state) => discoveryGraph);
    graph.addNode("mapServices", (state) => mapServicesNode(state, deps));
    graph.addNode("priceServices", (state) => priceServicesNode(state, deps));
    graph.addNode("summary", (state) => summaryNode(state, deps));

    graph.addEdge(START, "intake");
    graph.addEdge("intake", "discovery");
    graph.addEdge("discovery", "mapServices");
    graph.addEdge("mapServices","priceServices");
    graph.addEdge("priceServices", "summary")
    graph.addEdge("summary", END);

    return graph.compile();
}

