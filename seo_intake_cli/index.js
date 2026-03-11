import "dotenv/config";
import { initialState } from "./state.js";
import services from "./services.json" with {type: "json"};
import prices from "./prices.json" with {type: "json"};
import concernServiceMap from "./concernServiceMap.json" with {type: "json"};
import concernRelations from "./concernRelations.json" with {type: "json"};
import { KnowledgeGraph } from "./knowledgeGraph.js";
import concernTree from "./concernTree.json" with {type: "json"}
import { buildRootGraph } from "./workflow.js";

async function main() {
    console.log("\nSEO Intake CLI Prototype\n");
    const knowledgeGraph = new KnowledgeGraph(services, prices, concernServiceMap, concernRelations, concernTree);
    const app = buildRootGraph({knowledgeGraph});
    await app.invoke(initialState);
}

main().catch((err) => {
    console.error("Error:", err);
    process.exit(1)});