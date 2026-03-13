import readline from "readline";
import { DecompositionAgent } from "./agents/decompositionAgent.js";

const rl= readline.createInterface({
    input: process.stdin,
    output:process.stdout
});

const decompositionAgent = new DecompositionAgent({});

rl.question("Ask your SEO agency question: ", async(input) => {
    try{
        const result = await decompositionAgent.process(input);
        console.log("\nNormalized Text:\n");
        console.log(result.normalized_text);
        console.log("\Bus Items:\n");
        console.log(JSON.stringify({ items: result.items}, null, 2));
    } catch(err){
        console.error("Error:", err.message);
    }finally{
        rl.close();
    }
});