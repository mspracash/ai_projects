// domain_gate.js
// Detect high-level domains present in the input text.
// Returns an object like: { website:true, seo:false, ads:false, ... }

function hasAny(text, phrases) {
  for (const p of phrases) {
    if (text.includes(p)) return true;
  }
  return false;
}

// mild helper: whole-word-ish match for ambiguous short tokens (like "ads")
function hasWord(text, word) {
  const re = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
  return re.test(text);
}

function hasAnyWord(text, words) {
  for (const w of words) {
    if (hasWord(text, w)) return true;
  }
  return false;
}


export function detectDomains(input) {
  const t = String(input ?? "").toLowerCase();

  // --- Core signals ---
  // Keep tokens specific. Avoid generic words that appear everywhere ("campaign", "performance", etc.)
  const signals = {
    // WEBSITE / technical / UX surface
    website: [
      // explicit site references (critical for your case)
      "website", "site", "web page", "webpage", "page", "landing page", "homepage",
      "not loading", "down", "outage", "downtime",
      "500", "502", "503", "404",
      "ssl", "https",
      "site speed", "pagespeed", "page speed", "core web vitals",
      "lcp", "cls", "inp", "ttfb",
      "render", "javascript is blocking", "blocking rendering",
      "mobile friendly", "mobile usability", "text is too small", "clickable elements",
      "form", "contact form", "submit button"
    ],

    // SEO / search visibility (non-local)
    seo: [
      "seo",
      "rank", "ranking", "rankings", "keyword", "keywords",
      "indexed", "indexing", "noindex", "canonical",
      "search results", "serp", "google search",
      "search console", "gsc",
      "googlebot", "crawl", "crawling", "sitemap", "robots.txt",
      "schema", "structured data",
      "impressions", "clicks", "ctr","online visibility",
      "visibility is weak", "visibility is low", "visibility dropped",
      "online presence"
    ],

    // Local / maps / GBP
    local: [
      "google maps", "map pack", "gbp", "google business", "business profile",
      "local", "near me", "directions",
      "listing", "maps listing"
    ],

    // Tracking / analytics
    tracking: [
      "ga4", "google analytics", "analytics",
      "gtm", "tag manager",
      "conversion tracking", "event", "events",
      "utm", "attribution", "consent mode",
      "pixel", "traffic source", "traffic sources",
      "source medium","source/medium",
      "channel grouping", "self referral",
      "referral traffic", "direct traffic" // stays here, but see ads below for meta pixel context
    ],

    // Paid ads (make it specific; do NOT include generic "campaign")
    ads: [
      "google ads", "adwords", "ppc",
      "paid search", "paid ads",
      "cpc", "cpm", "roas",
      "meta ads", "facebook ads", "instagram ads",
      "quality score",
      "merchant center" // can be ads/ecom; we'll disambiguate later
    ],

    // CRO / conversion / UX (avoid "leads" alone—too broad)
    cro: [
      "conversion rate", "converting",
      "bounce rate", "engagement rate", "engagement time",
      "landing page", "call to action", "cta",
      "checkout conversion", "cart abandonment",
      "users leave", "exit rate", "inquiry", "inquiries", "enquiry", "enquiries",
      "contact us", "contact form", "form submission",
      "request a quote", "book a call"
    ],

    // Traffic / visibility (web analytics surface, not SEO mechanics)
    traffic: [
      "traffic", "sessions", "visitors",
      "search visibility",
      "impressions", "clicks", "ctr",  "visit", "people visit", "we get clicks","traffic is coming","users land on site",// overlaps with seo but that’s fine: multi-domain
      "nobody finds", "no one finds",
      "people can't find", "cannot find", "can't find",
      "hard to find", "difficult to find",
      "only people who know us", "unless they already know us",
      "only branded", "brand traffic"
    ],

    // CRM / sales ops
    crm: [
      "crm", "pipeline", "deal", "deals",
      "follow up", "follow-up",
      "response time", "lead response",
      "unqualified", "qualified leads"
    ],

    // Email (be careful: "bounce" collides with bounce rate)
    email: [
      "email", "newsletter",
      "deliverability", "spam",
      "spf", "dkim", "dmarc",
      "open rate", "click rate",
      "unsubscribe",
      "bounces are high", "email bounce", "bounce in email"
    ],

    // Social
    social: [
      "social", "instagram", "facebook", "linkedin",
      "followers", "reach",
      "likes", "comments", "shares"
    ],

    // Ecommerce
    ecommerce: [
      "cart", "checkout", "purchase", "payment",
      "shopify"
      // "merchant center" handled as shared with ads
    ]

  };

  // --- Detect ---
  const detected = {};
  for (const [domain, list] of Object.entries(signals)) {
    detected[domain] = hasAny(t, list);
  }

  // --- Disambiguation rules (small but important) ---

    // --- Disambiguation: "abandon" ≠ cart abandonment unless ecommerce signals are present ---

  // Word-boundary to avoid matching "abandoned" inside other words incorrectly
  const hasAbandon =
    hasWord(t, "abandon") || hasWord(t, "abandons") || hasWord(t, "abandoned") || hasWord(t, "abandoning");

  if (hasAbandon) {
    // Only treat as ecommerce if the input actually includes ecommerce signals (cart/checkout/etc)
    const hasEcomSignals = hasAny(t, signals.ecommerce);

    if (!hasEcomSignals) {
      // Force OFF: prevent cart/checkout interpretations from competing downstream
      detected.ecommerce = false;

      // It's still a UX/CRO symptom (people leaving)
      detected.cro = true;

      // If website signals are present (page/site/mobile/loading/etc), ensure website is ON
      if (hasAny(t, signals.website)) detected.website = true;
    } else {
      // If ecommerce signals are present, it's fair game
      detected.ecommerce = true;
      detected.cro = true;
    }
  }


  // "merchant center" appears in ads and ecommerce
  if (t.includes("merchant center")) {
    // if it also mentions products/checkout/purchase -> ecommerce too
    if (detected.ecommerce) detected.ads = true;
    else detected.ads = true; // default to ads
  }

  // "bounce" alone can be ambiguous; treat as CRO unless explicitly email bounce
  if (hasWord(t, "bounce") && !t.includes("email")) {
    detected.cro = true;
  }

  // If user explicitly says "website" but none of the other website tokens hit,
  // force website=true (this fixes your "website performance is poor" case)
  if (t.includes("website") || t.includes("site")) {
    detected.website = true;
  }

  // SEO fallback: visibility phrasing implies SEO unless local/GBP present
  const seoVisibilityFallback =
    (t.includes("not visible on google") ||
      t.includes("not showing up on google") ||
      t.includes("show up on google") ||
      t.includes("appear on google")) &&
    !detected.local;

  if (seoVisibilityFallback) detected.seo = true;

  return detected;
}
