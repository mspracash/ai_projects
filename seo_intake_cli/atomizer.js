// Author: Surya Muntha
import {seoModel, invokeJson} from "./seoLlm.js";
import { buildSeoAtomizePrompt } from "./seoPrompts.js";

export async function atomizeConcern(text){
    const prompt = buildSeoAtomizePrompt({text});
    const result = await invokeJson(seoModel, prompt);

    if(!result || !Array.isArray(result.atomic_sentences)){
        return {
            atomic_sentences: [],
            notes: ["Atomizer failed to return valid JSON"]
        }
    }

    return {
        atomic_sentences: result.atomic_sentences.map((s) => String(s || "").trim()).filter(Boolean), 
        notes: Array.isArray(result.notes)? result.notes :[]
    };
}