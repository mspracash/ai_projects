import { BaseAgent } from "./BaseAgent.js";
import normalizationPrompt from "../prompts/normalizationPrompt.js";
import atomizationPrompt from "../prompts/atomizationPrompt.js";
import { queryLLM } from "../lib/llmClient.js";

export class DecompositionAgent extends BaseAgent{
    constructor({}){
        super({name: "decompositionAgent"});
    }

    buildBusItems(atomicQuestions){
        return atomicQuestions.map((question, index) => ({
            item_id:`Q${index + 1}`,
            text: question,
            status: "new"
        }));
    }

    async normalize(userInput){
        const result = await queryLLM(`${normalizationPrompt}
                                                      UserInput: 
                                                      ${userInput}`);

       if(!result.normalized_text){
         throw new Error("Normalization response missing normalized_text");
       }
       console.log(result);
       return result.normalized_text;
    }

    async atomize(normalizedText){
        const result = await queryLLM(`${atomizationPrompt}
                                                     Input text:
                                                     ${normalizedText}`);
        console.log(result);
       if(!Array.isArray(result.atomic_questions)){
         throw new Error("Atomization response missing atomic_questions");
       }
    }

    async process(userInput){
        const normalizedText = await this.normalize(userInput);
        const atomicQuestions = await this.atomize(normalizedText);

        return{
            normalized_text: normalizedText,
            items: this.buildBusItems(atomicQuestions)
        }
    }
}