// Author: Surya Muntha

import { scoreChildrenWithLLM } from "./llmChooser.js";

function findChildById(node, childId) {
  return node.children.find((child) => child.id === childId)|| null;
}

function chooseChildDeterministically(atomicSentence, currentNodeId, children) {
  const text = String(atomicSentence || "").toLowerCase();
  const child = (id) => children.find((c) => c.id === id) || null;

  if (!children || children.length === 0) {
    return null;
  }

  if (currentNodeId === "seo") {
    if (text.includes("rankings") || text.includes("traffic")) {
      return child("seo.visibility");
    }

    if (text.includes("map results") || text.includes("google business profile")) {
      return child("seo.local");
    }

    if (text.includes("leads or calls") || text.includes("not converting")) {
      return child("seo.conversion");
    }

    if (
      text.includes("indexed") ||
      text.includes("speed") ||
      text.includes("crawlability") ||
      text.includes("canonical") ||
      text.includes("redirect") ||
      text.includes("technical problems")
    ) {
      return child("seo.technical");
    }

    if (text.includes("content")) {
      return child("seo.content");
    }

    if (
      text.includes("backlink authority") ||
      text.includes("backlink profiles")
    ) {
      return child("seo.authority");
    }

    return null;
  }

  if (currentNodeId === "seo.visibility") {
    if (text.includes("rankings")) {
      return child("seo.visibility.rankings_down");
    }

    if (text.includes("traffic")) {
      return child("seo.visibility.organic_traffic_down");
    }

    return null;
  }

  if (currentNodeId === "seo.local") {
    if (text.includes("map results")) {
      return child("seo.local.local_visibility_down");
    }

    if (text.includes("google business profile")) {
      return child("seo.local.gbp_optimization_issue");
    }

    return null;
  }

  if (currentNodeId === "seo.conversion") {
    if (text.includes("leads or calls")) {
      return child("seo.conversion.seo_leads_down");
    }

    if (text.includes("not converting")) {
      return child("seo.conversion.traffic_but_low_conversions");
    }

    return null;
  }

  if (currentNodeId === "seo.technical") {
    if (text.includes("indexed")) {
      return child("seo.technical.indexing_issue");
    }

    if (text.includes("speed")) {
      return child("seo.technical.site_speed_issue");
    }

    if (
      text.includes("crawlability") ||
      text.includes("canonical") ||
      text.includes("redirect") ||
      text.includes("technical problems")
    ) {
      return child("seo.technical.general_technical_issue");
    }

    return null;
  }

  if (currentNodeId === "seo.content") {
    if (
      text.includes("weak, outdated, duplicated") ||
      text.includes("search intent")
    ) {
      return child("seo.content.content_quality_issue");
    }

    if (text.includes("content")) {
      return child("seo.content.content_gap");
    }

    return null;
  }

  if (currentNodeId === "seo.authority") {
    if (text.includes("backlink profiles")) {
      return child("seo.authority.competitor_backlinks_stronger");
    }

    if (text.includes("backlink authority")) {
      return child("seo.authority.backlink_authority_weak");
    }

    return null;
  }

  return null;
}

export async function resolveConcernWithTree(atomicSentence, knowledgeGraph) {
  let currentNodeId = "seo";
  const scoringTrace = [];

  while (!knowledgeGraph.isLeaf(currentNodeId)) {
    const children = knowledgeGraph.getChildren(currentNodeId);

    // const nextNode = chooseChildDeterministically(
    //   atomicSentence,
    //   currentNodeId,
    //   children
    // );

    const scores = await scoreChildrenWithLLM(
      atomicSentence,
      currentNodeId,
      children
    );


    if(!scores.length){
      return{
          resolvedConcernId: null,
          path: knowledgeGraph.getPath(currentNodeId),
          scoringTrace
      };
    }

    const best = scores[0];
    scoringTrace.push({
      nodeId: currentNodeId,
      scores
    });

    if(!best || best.confidence < 0.5){
      return {
       resolvedConcernId: null,
       path: knowledgeGraph.getPath(currentNodeId),
       scoringTrace
     };
   }

    currentNodeId = best.id;
  }

  return {
    resolvedConcernId: currentNodeId,
    path: knowledgeGraph.getPath(currentNodeId),
    scoringTrace
  };
}