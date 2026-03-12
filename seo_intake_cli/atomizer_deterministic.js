// Author: Surya Muntha
export function atomizeConcern(message) {
  const text = String(message || "").trim().toLowerCase();

  if (text.includes("rank")) {
    return {
      atomic: "Important keyword rankings have dropped.",
      confidence: 0.9
    };
  }

  if (text.includes("traffic") || text.includes("visitor")) {
    return {
      atomic: "Organic search traffic has declined.",
      confidence: 0.9
    };
  }

  if (text.includes("call") || text.includes("lead")) {
    return {
      atomic: "Leads or calls from organic search have declined.",
      confidence: 0.85
    };
  }

  if (text.includes("map") || text.includes("local")) {
    return {
      atomic: "Visibility in local search or map results has declined.",
      confidence: 0.85
    };
  }

  if (
    text.includes("gbp") ||
    text.includes("google business") ||
    text.includes("business profile")
  ) {
    return {
      atomic: "Google Business Profile is incomplete or poorly optimized.",
      confidence: 0.85
    };
  }

  if (text.includes("index")) {
    return {
      atomic: "Important pages may not be indexed correctly.",
      confidence: 0.8
    };
  }

  if (text.includes("speed") || text.includes("slow")) {
    return {
      atomic: "Slow page speed may be hurting SEO or user experience.",
      confidence: 0.8
    };
  }

  if (
    text.includes("duplicate") ||
    text.includes("outdated") ||
    text.includes("thin content") ||
    text.includes("search intent")
  ) {
    return {
      atomic: "Existing content is weak, outdated, duplicated, or not satisfying search intent.",
      confidence: 0.8
    };
  }

  if (text.includes("content")) {
    return {
      atomic: "The site lacks enough useful content for target topics.",
      confidence: 0.75
    };
  }

  if (
    text.includes("competitor backlinks") ||
    text.includes("competitors have better backlinks")
  ) {
    return {
      atomic: "Competitors have significantly stronger backlink profiles.",
      confidence: 0.8
    };
  }

  if (
    text.includes("backlink") ||
    text.includes("authority") ||
    text.includes("link building") ||
    text.includes("links")
  ) {
    return {
      atomic: "The site lacks strong backlink authority compared with competitors.",
      confidence: 0.8
    };
  }

  return {
    atomic: "Crawlability, metadata, canonical, redirect, or structured technical problems exist.",
    confidence: 0.6
  };
}