// Author: Surya Muntha

import { seoModel } from "./seoLlm.js";
import { buildSeoNormalizePrompt } from "./seoPrompts.js";

export async function normalizeSeoConcern(text){
    const prompt = buildSeoNormalizePrompt({text});
    const response = await seoModel.invoke(prompt);

    const normalized = String(response?.content || "").trim();

    return normalized;
}