import prompts from "prompts";
import ora from "ora";
import chalk from "chalk";
import {atomizeConcern} from "./atomizer.js";
import { resolveConcernWithTree } from "./concernResolver.js";
import concernTree from "./concernTree.json" with {type: "json"}

export async function runDiscoveryLoop(state, knowledgeGraph) {
    console.log(chalk.bold.yellow("\nConcerns Discovery\n"));

    while(true){

        const response = await prompts({
            type: "text",
            name: "concern",
            message:"Describe your concerns or issues with your SEO:(type 'done' when finished)"
        },
        {
            onCancel: () => {
                console.log(chalk.red("\nDiscovery loop cancelled. Exiting."));
                process.exit(0);
            }
        }
     ); 

        const rawConcern = response.concern.trim(); 

        if(!rawConcern){
            console.log(chalk.red("\nNo concern entered. Please enter a concern or type 'done' to finish."));
            continue;
        }
        if(rawConcern.toLowerCase() === "done"){
            console.log(chalk.green("\nFinished entering concerns."));
            break;
        }

        const spinner = ora("Analyzing concern...").start();
        
        const atomized = atomizeConcern(rawConcern);

        const atomicConcern = typeof atomized === "string" ? atomized : atomized.atomic;
        const confidence =  typeof atomized === "string" ? null : atomized.confidence;
      
        const {resolvedConcernId, path} = resolveConcernWithTree(atomicConcern, concernTree);
        const resolvedConcern = resolvedConcernId? knowledgeGraph.getConcern(resolvedConcernId): null;

        spinner.succeed("Concern resolved.");

        state.concernMessages.push(rawConcern);
        state.atomicConcernCandidates.push(atomicConcern);

        if (resolvedConcern) {
            const alreadyResolved = state.resolvedConcernIds.includes(resolvedConcern.id);

            if (!alreadyResolved) {
                state.resolvedConcernIds.push(resolvedConcern.id);
            }

            console.log(chalk.cyan(`\nOriginal concern: ${rawConcern}`));
            console.log(chalk.yellow(`Atomic concern candidate: ${atomicConcern}`));
            console.log(chalk.green(`Resolved concern: ${resolvedConcern.label}`));

            if (confidence !== null) {
                console.log(chalk.gray(`Confidence: ${(confidence * 100).toFixed(0)}%`));
            }

            if (alreadyResolved) {
                console.log(chalk.gray("Duplicate concern detected: merged with existing resolved concern."));
            }
        }
        else{
            console.log(chalk.cyan(`\nOriginal concern: ${rawConcern}`));
            console.log(chalk.yellow(`Atomic concern candidate: ${atomicConcern}`));
            console.log(chalk.red(`No matching resolved concern found.`));
        }
        console.log();
    }

    return state;

}