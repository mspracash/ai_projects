// seo_concerns.v1.js
// SEO-only concern ontology (hierarchical) with:
// - gate.required_any: at least ONE must match
// - gate.secondary_any: at least ONE must match
// - 28 leaf concerns
// - each leaf has >= 10 anchors (15–30 words each)
//
// Eligibility rule (recommended):
//   eligible = matchAny(required_any, text) && matchAny(secondary_any, text)

export const SEO_CONCERNS = {
  version: "1.0",
  channel: "seo",
  meta: {
    leaf_count: 28,
    gating: "required_any AND secondary_any (any-of each list)",
    anchors: "negative-only; 10 per leaf; each 15–30 words"
  },
  nodes: [
    // -------------------------
    // Channel + collapse targets
    // -------------------------
    {
      id: "seo",
      label: "SEO (Organic Search)",
      parent: "root",
      gate: {
        required_any: ["seo", "search", "google", "organic"],
        secondary_any: ["low", "down", "dropped", "declined", "poor", "bad", "minimal", "near zero", "not"]
      }
    },

    {
      id: "seo.visibility",
      label: "SEO Visibility",
      parent: "seo",
      gate: {
        required_any: ["visibility", "impressions", "ranking", "rankings", "position", "serp", "search results"],
        secondary_any: ["low", "down", "dropped", "declined", "poor", "bad", "minimal", "near zero", "not"]
      },
      clarify_question:
        "Is the issue mainly low impressions/visibility, poor rankings/positions, or poor SERP listing quality causing low clicks?"
    },
    {
      id: "seo.indexing",
      label: "SEO Indexing & Crawlability",
      parent: "seo",
      gate: {
        required_any: ["index", "indexed", "indexing", "crawl", "crawling", "googlebot", "robots", "search console", "gsc"],
        secondary_any: ["error", "blocked", "excluded", "not", "missing", "failed", "limited", "issue", "problem"]
      },
      clarify_question:
        "Is the problem index coverage (pages excluded), crawl/robots/server errors, or architecture issues like internal links, duplicates, or canonicals?"
    },
    {
      id: "seo.traffic",
      label: "SEO Traffic",
      parent: "seo",
      gate: {
        required_any: ["traffic", "visits", "sessions", "users"],
        secondary_any: ["organic", "search", "google", "seo", "low", "down", "dropped", "declined", "minimal"]
      },
      clarify_question:
        "Is organic traffic low overall, mainly content/blog traffic, or is it a recent drop versus long-term low baseline?"
    },
    {
      id: "seo.engagement",
      label: "SEO Engagement",
      parent: "seo",
      gate: {
        required_any: ["ctr", "click", "clicks", "bounce", "engagement", "time on page", "dwell"],
        secondary_any: ["low", "poor", "bad", "high", "declined", "dropped", "minimal", "weak"]
      },
      clarify_question:
        "Is the issue low CTR in search results, or are visitors from search bouncing quickly / not engaging once they land on pages?"
    },
    {
      id: "seo.conversion",
      label: "SEO Conversions",
      parent: "seo",
      gate: {
        required_any: ["lead", "leads", "inquiry", "inquiries", "conversion", "conversions", "form", "contact"],
        secondary_any: ["organic", "search", "google", "seo", "low", "poor", "bad", "minimal", "declined"]
      },
      clarify_question:
        "Are organic leads low because traffic is low, because conversion rate is poor, or because content is not assisting visitors toward inquiries?"
    },

    // -------------------------
    // Sub-themes
    // -------------------------
    { id: "seo.visibility.impressions", label: "Impressions (Reach)", parent: "seo.visibility" },
    { id: "seo.visibility.rankings", label: "Rankings (Positions)", parent: "seo.visibility" },
    { id: "seo.visibility.snippets", label: "Snippets (SERP Presentation)", parent: "seo.visibility" },

    { id: "seo.indexing.coverage", label: "Index Coverage", parent: "seo.indexing" },
    { id: "seo.indexing.crawl", label: "Crawl Health", parent: "seo.indexing" },
    { id: "seo.indexing.architecture", label: "Site Architecture", parent: "seo.indexing" },

    { id: "seo.traffic.organic", label: "Organic Sessions", parent: "seo.traffic" },
    { id: "seo.traffic.content", label: "Content Traffic", parent: "seo.traffic" },

    { id: "seo.engagement.ctr", label: "Organic CTR", parent: "seo.engagement" },
    { id: "seo.engagement.behavior", label: "On-page Behavior", parent: "seo.engagement" },

    { id: "seo.conversion.leads", label: "Organic Leads", parent: "seo.conversion" },
    { id: "seo.conversion.assist", label: "Content Assist", parent: "seo.conversion" },

    // =========================================================
    // LEAVES (28) — each has gate + 10 anchors (15–30 words)
    // =========================================================

    // -------------------------
    // VISIBILITY / IMPRESSIONS (4)
    // -------------------------
    {
      id: "seo.visibility.impressions.impressions_low",
      parent: "seo.visibility.impressions",
      label: "Search impressions are low",
      gate: {
        required_any: ["impressions", "visibility", "gsc", "google", "reach"],
        secondary_any: ["low", "minimal", "near","zero", "down", "declined", "dropped", "poor"]
      },
      anchors: [
        "Search Console shows very low impressions across our important pages, even though the site is live and accessible.",
        "Our impressions in Google Search Console are near zero for weeks, which makes search visibility feel almost nonexistent.",
        "We publish content regularly, but impressions remain minimal in Search Console, suggesting Google is not showing our pages.",
        "Impression numbers are extremely low for key queries and pages, and the site rarely appears in search results.",
        "Search visibility is poor because impressions stay low, even when we search for relevant terms in our niche.",
        "We are getting minimal impressions from Google, which indicates our pages are not being surfaced to searchers.",
        "Search Console reports low impressions across many URLs, and the overall visibility line keeps trending downward.",
        "Our website gets very few impressions for core topics, so we suspect something is limiting search exposure.",
        "Impressions are low despite proper on-page SEO, which suggests our content is not eligible or competitive in SERPs.",
        "Search impressions appear to be very low, and we cannot identify any queries where Google shows us consistently."
      ]
    },
    {
      id: "seo.visibility.impressions.nonbrand_impressions_low",
      parent: "seo.visibility.impressions",
      label: "Non-branded impressions are low",
      gate: {
        required_any: ["non brand", "non-branded", "generic", "discovery"],
        secondary_any: ["impressions", "visibility", "low", "minimal", "near zero", "missing", "poor"]
      },
      anchors: [
        "We only get impressions for our business name, but non-branded impressions for service keywords are extremely low.",
        "Non-branded search impressions are minimal, so discovery traffic is missing and new customers cannot find us organically.",
        "Search Console shows impressions mostly for branded terms, while generic queries produce almost no visibility for us.",
        "We appear for branded searches but get little or no impressions for non-branded keywords that describe our services.",
        "Our non-brand impressions are near zero, so it feels like Google only shows us to people who already know us.",
        "Discovery impressions are low for ‘near me’ and service queries, even though our pages target those topics directly.",
        "We rank for our company name, but non-branded impressions stay low, which limits organic reach and new lead flow.",
        "When we filter Search Console by non-branded queries, impressions drop dramatically and there is no consistent presence.",
        "Non-branded visibility is missing; impressions are weak for the core services we want, not just peripheral keywords.",
        "Our SEO looks like brand-only performance, because non-branded impressions remain low and do not grow month over month.",
        "When filtering Search Console to non-branded queries, impressions fall near zero and the site lacks consistent discovery visibility",
        "Impressions are concentrated in branded searches, while generic service and problem-based keywords show negligible reach in Search Console",
        "Non-brand query impressions remain minimal across weeks, indicating weak discovery presence for category and intent-based searches",
        "Search Console segments show strong branded visibility but minimal non-branded impressions for keywords describing offerings or locations served",
        "Discovery performance is weak, with non-branded impressions nearly absent despite normal crawlability and indexed pages appearing for branded terms"
      ]
    },
    {
      id: "seo.visibility.impressions.keyword_coverage_limited",
      parent: "seo.visibility.impressions",
      label: "Keyword coverage is limited",
      gate: {
        required_any: ["keyword", "keywords", "queries", "query", "coverage", "footprint", "breadth", "diversity"],
        secondary_any: ["few","limited","small number","handful","narrow","low diversity","not many","only a few","thin coverage"]
      },
      anchors: [
        "Search Console shows a very small number of distinct queries driving visibility across the site",
        "Keyword coverage is weak because we only appear for a handful of terms, even though we target many services.",
        "Our site shows up for very few relevant queries, so it feels like our keyword footprint is extremely limited.",
        "We are not ranking for most of our target keywords, and the number of ranking queries stays low over time.",
        "Search Console query list is small, suggesting our content is not expanding coverage into new keyword areas.",
        "We have limited keyword coverage and do not appear for important topics, so organic discovery remains weak.",
        "Our pages are not visible for many service-related queries, meaning keyword coverage is missing in key categories.",
        "Even with new pages published, we still rank for few terms, and our keyword distribution looks too narrow.",
        "We are stuck with a limited set of ranking keywords, and we cannot break into additional queries we need.",
        "Keyword coverage appears limited across our site, and we do not see long-tail queries bringing impressions.",
        "Search Console query coverage is narrow, with few distinct non-branded terms showing any measurable presence across the reporting period",
        "The site ranks for a small set of unique keywords, with limited breadth across core services, categories, and informational intents",
        "Keyword footprint is constrained, with only a handful of recurring queries appearing across pages in Search Console performance exports",
        "Visibility is concentrated in a few terms, indicating limited keyword breadth across priority topics and service-related query variants",
        "Search Console query lists show low diversity, with minimal expansion into adjacent keyword clusters over time"
      ]
    },
    {
      id: "seo.visibility.impressions.branded_only_visibility",
      parent: "seo.visibility.impressions",
      label: "Visibility is mostly branded only",
      gate: {
        required_any: ["brand", "branded", "company name", "business name"],
        secondary_any: ["only", "mostly", "just", "all", "traffic", "impressions", "visibility", "search"]
      },
      anchors: [
        "Our SEO performance looks branded-only because most impressions and clicks come from people searching our company name.",
        "We only show up when customers search for our brand, but visibility for service queries remains very low.",
        "Nearly all search traffic is branded, so new prospects are not discovering us through generic or informational searches.",
        "Search Console indicates branded queries dominate, and non-branded visibility is too low to support growth.",
        "It feels like we have brand visibility only, while our service pages get little exposure for non-branded keywords.",
        "We get traffic mostly from people who already know us, suggesting branded visibility is strong but discovery is weak.",
        "Our impressions are concentrated in branded terms, so we are not earning visibility for the problems we solve.",
        "We appear for our business name but not for what we do, which makes our search visibility depend on existing awareness.",
        "Branded queries drive nearly everything, and non-branded visibility stays minimal even after SEO improvements.",
        "We want new leads from search, but branded-only visibility means we are invisible to users searching for services."
      ]
    },

    // -------------------------
    // VISIBILITY / RANKINGS (3)
    // -------------------------
    {
      id: "seo.visibility.rankings.avg_position_poor",
      parent: "seo.visibility.rankings",
      label: "Average position is poor",
      gate: {
        required_any: ["ranking", "rankings", "position", "positions", "serp"],
        secondary_any: ["poor", "low", "bad", "down", "declined", "dropped", "beyond", "top10", "top 10"]
      }
      ,
      anchors: [
        "Our average position is poor for priority keywords, and we rarely appear on the first page of Google results.",
        "Rankings are far down the results, so even when we get impressions, the positions are too low to get clicks.",
        "We are not ranking on page one for key services, and our average position remains weak across queries.",
        "Our site appears beyond page two for many keywords, so visibility is limited and traffic stays low.",
        "Average position in Search Console is bad, and we do not see meaningful improvements despite ongoing SEO work.",
        "Our important pages rank too low to compete, which keeps organic clicks and leads from growing consistently.",
        "Rankings are weak across the board, and we cannot break into top ten positions for the terms we care about.",
        "We get some impressions, but average position is poor, so users do not reach our site from search results.",
        "Our positions are declining or stagnant at low ranks, and the site does not show in competitive SERP slots.",
        "We are stuck with poor rankings that keep us off page one, making our SEO performance feel ineffective."
      ]
    },
    {
      id: "seo.visibility.rankings.rankings_dropped",
      parent: "seo.visibility.rankings",
      label: "Rankings dropped recently",
      gate: {
      required_any: ["rank","ranking","rankings","position","positions","serp","page one","page 1","page two","page 2","page three","page 3","top 10","top 20","top 30","first page"],
      secondary_any: ["dropped","drop","declined","fell","down","lost","slipped","decreased","moved down","from page","to page","last month","last week","recent"]
      },
      anchors: [
        "Our rankings dropped recently across multiple keywords, and traffic declined at the same time without obvious site changes.",
        "We lost positions in Google for priority queries, and the ranking drop happened suddenly over a short period.",
        "Search Console shows average position worsening recently, and impressions and clicks both declined after the drop.",
        "Our keyword rankings fell compared with last month, and competitors now appear above us for important queries.",
        "We experienced a sudden rankings decline, and it feels like an update or technical issue reduced our visibility.",
        "Rankings dropped for several service pages, and we are concerned that indexing or quality signals have changed.",
        "Our positions slipped from page one to page two, which caused a noticeable decrease in organic traffic and inquiries.",
        "We used to rank higher, but rankings dropped recently and have not recovered despite publishing new content.",
        "There was a sharp decline in rankings after site edits, and we suspect something broke our SEO performance.",
        "Our rankings are down across many terms, and we need to understand what caused the visibility loss."
      ]
    },
    {
      id: "seo.visibility.rankings.competitors_outranking",
      parent: "seo.visibility.rankings",
      label: "Competitors outrank us",
      gate: {
        required_any: ["competitor", "competitors", "others", "rivals"],
        secondary_any: ["outrank", "above us", "rank higher", "beating us", "losing", "ahead"]
      },
      anchors: [
        "Competitors outrank us for the keywords that matter, and our site appears below them even for our core services.",
        "Our competitors show above us in Google results, so they capture clicks and leads while we remain lower ranked.",
        "We are losing search visibility to competitors, and their pages consistently outrank ours on important local queries.",
        "Rival businesses rank higher than we do, which makes our SEO feel ineffective despite similar offerings and pricing.",
        "Competitors dominate the SERP for our services, and our site is pushed down where users rarely click.",
        "Other companies outrank our pages for the same topics, so we suspect authority, content depth, or backlinks are lacking.",
        "We keep seeing competitors ahead of us in search, and their listings get the clicks while ours are ignored.",
        "Competitors have stronger rankings across many keywords, and we want to understand why our pages underperform.",
        "Our SEO struggles because competitors outrank us on both branded-adjacent and generic terms we should own.",
        "We are consistently below competitors in the results, and we need a plan to close the ranking gap."
      ]
    },

    // -------------------------
    // VISIBILITY / SNIPPETS (3)
    // -------------------------
    {
      id: "seo.visibility.snippets.snippet_not_compelling",
      parent: "seo.visibility.snippets",
      label: "Snippet not compelling (low clicks)",
      gate: {
        required_any: ["ctr", "click", "clicks", "snippet", "title", "meta", "serp", "listing"],
        secondary_any: ["low", "poor", "bad", "few", "minimal", "declined", "dropped"]
      }
      ,
      anchors: [
        "We get impressions in Search Console but very few clicks, suggesting our search snippet is not compelling enough.",
        "People see our listing in Google results, yet they do not click, which points to weak titles and descriptions.",
        "CTR is poor even when impressions are stable, so our snippet likely fails to communicate value and relevance quickly.",
        "Our pages show in search, but clicks are low, which suggests the SERP listing is not attractive or trustworthy.",
        "Search results show us sometimes, but users choose other listings, indicating our snippet does not stand out.",
        "We suspect low clicks because the title and meta description are generic and do not match search intent well.",
        "Our listings look bland compared with competitors, so users ignore our snippet and click other results instead.",
        "We appear in results, but click-through is weak, which suggests our snippet does not promise the right outcome.",
        "CTR dropped even though rankings did not change much, implying our snippet quality or competitive context worsened.",
        "Our SERP listing is not driving clicks, so we need better titles, descriptions, and value-focused messaging."
      ]
    },
    {
      id: "seo.visibility.snippets.rich_results_missing",
      parent: "seo.visibility.snippets",
      label: "Rich results missing",
      gate: {
        required_any: ["schema", "rich", "stars", "ratings", "faq", "rich snippet", "structured data"],
        secondary_any: ["missing", "not showing", "absent", "no", "not appearing", "gone"]
      },
      anchors: [
        "We do not see rich results like stars, FAQs, or other enhancements in Google, and our listings look plain.",
        "Rich snippets are missing from our search listings, so competitors look more credible and get higher click-through.",
        "Schema markup does not appear to generate any enhanced results, and our SERP features are absent across pages.",
        "We expected review stars or FAQ rich results, but nothing appears, suggesting structured data is missing or invalid.",
        "Our search results lack rich features, so our listings look less trustworthy compared with competitors using schema.",
        "Even after adding structured data, rich results do not show, and we cannot get enhanced snippets in Google.",
        "Our pages do not display special SERP features, and we suspect schema issues or eligibility problems are preventing them.",
        "Rich results that used to show are now missing, which may indicate a schema change or Google eligibility update.",
        "We cannot get any rich snippets despite relevant content, so structured data implementation may be broken or incomplete.",
        "Rich results are absent and we want them to improve CTR, trust, and visibility in competitive search listings."
      ]
    },
    {
      id: "seo.visibility.snippets.title_meta_weak",
      parent: "seo.visibility.snippets",
      label: "Title/meta descriptions weak",
      gate: {
        required_any: ["title", "titles", "meta", "description", "descriptions"],
        secondary_any: ["weak", "poor", "bad", "not optimized", "generic", "boring", "low"]
      },
      anchors: [
        "Our page titles are not optimized for search intent, and meta descriptions do not clearly communicate benefits or differentiation.",
        "Titles and meta descriptions feel generic, so users skip our listing even when we appear for relevant queries.",
        "We suspect weak metadata because CTR is low and the titles do not include key phrases users search for.",
        "Meta descriptions do not match what the page offers, so clicks are low and users may bounce quickly after landing.",
        "Our search titles are inconsistent and sometimes truncated, which makes the SERP listing look unprofessional and unclear.",
        "The titles do not emphasize outcomes, and the descriptions are bland, so our listing does not win attention in SERPs.",
        "Metadata across the site is repetitive, so Google may rewrite titles, and our listings lose clarity and relevance.",
        "Our titles are too long or too vague, and the meta descriptions do not provide a strong reason to click.",
        "We need stronger titles and descriptions because competitors have more compelling SERP messaging and capture the clicks.",
        "Titles and meta descriptions are weak, and improving them could increase CTR without changing rankings dramatically."
      ]
    },

    // -------------------------
    // INDEXING / COVERAGE (3)
    // -------------------------
    {
      id: "seo.indexing.coverage.pages_not_indexed",
      parent: "seo.indexing.coverage",
      label: "Pages not indexed",
      gate: {
          required_any: ["index", "indexed", "indexing", "site:", "exact url", "url", "urls"],
          secondary_any: ["missing","absent","never","doesn't","not","show","appear","find","google"]
      },
      anchors: [
        "Important pages are not indexed in Google, and searching site colon for URLs does not show them in results.",
        "Search Console indicates our pages are not indexed, so they cannot rank, and organic traffic remains extremely low.",
        "We publish new pages but they never appear in Google, which suggests indexing issues that block visibility and growth.",
        "Many URLs are missing from search, and Google does not show them even when we search exact page titles.",
        "Our key service pages are not indexed, and Search Console coverage suggests Google is not including them.",
        "Some pages were previously indexed, but now they are missing, so we suspect indexing changes or technical blocks.",
        "Google does not display several important URLs, and we cannot find them through branded or non-branded searches.",
        "We see index problems where Google ignores pages, which prevents rankings and keeps our search performance low.",
        "Search Console coverage looks unhealthy, and indexing is incomplete for core content we need to rank.",
        "Pages are not indexed and this blocks SEO entirely, because Google cannot show what it does not index."
      ]
    },
    {
      id: "seo.indexing.coverage.indexing_limited",
      parent: "seo.indexing.coverage",
      label: "Indexing is limited (many excluded)",
      gate: {
        required_any: ["excluded", "coverage", "index coverage", "indexed", "indexing"],
        secondary_any: ["many", "limited", "problem", "issue", "errors", "not", "low"]
      },
      anchors: [
        "Search Console shows many pages excluded from the index, so indexing coverage is limited and visibility is restricted.",
        "A large portion of our URLs are excluded, which reduces keyword coverage and prevents our content from ranking.",
        "Index coverage reports many excluded pages, and we do not understand why Google is limiting indexing of our site.",
        "Google indexes only a small fraction of our pages, which makes indexing coverage poor and traffic lower than expected.",
        "We see lots of excluded URLs in Search Console, suggesting canonical, duplicate, or quality issues limit indexing.",
        "Indexing appears limited across the site, so many pages cannot compete in search even if content is relevant.",
        "Our index coverage is poor because Google excludes many pages, and we need to identify the exclusion reasons.",
        "Search Console reports widespread exclusions, and this likely reduces impressions, clicks, and overall search presence.",
        "Indexing is limited and we suspect thin content or duplication, because too many pages are not indexed.",
        "A high number of pages are excluded, so SEO performance suffers due to limited index footprint."
      ]
    },
    {
      id: "seo.indexing.coverage.noindex_by_mistake",
      parent: "seo.indexing.coverage",
      label: "Noindex applied by mistake",
      gate: {
        required_any: ["noindex", "meta robots", "robots meta", "x robots", "x-robots-tag"],
        secondary_any: ["mistake", "accident", "template", "tag", "directive", "coverage", "excluded"]
      },
      anchors: [
        "We suspect a noindex tag is blocking important pages, because they are excluded and never appear in Google results.",
        "Some key pages might be set to noindex by mistake, which prevents indexing and kills organic visibility completely.",
        "Our pages are not indexed and we think meta robots noindex was applied accidentally during a site update.",
        "Noindex seems to be present on pages that should rank, which blocks crawling and prevents Search Console coverage.",
        "Index issues started after development changes, and we suspect a mistaken noindex directive is preventing inclusion.",
        "Google cannot index our pages because they appear set to noindex, which means they will not show in results.",
        "We may have a template error that applies noindex sitewide, causing a sudden drop in indexed pages.",
        "Search Console exclusions hint at noindex, and we need to confirm whether robots meta directives are incorrect.",
        "Our SEO collapsed and we suspect noindex flags, because many pages disappeared from the index unexpectedly.",
        "Noindex applied by mistake would explain low impressions and missing pages, so we want to audit robots directives."
      ]
    },

    // -------------------------
    // INDEXING / CRAWL (3)
    // -------------------------
    {
      id: "seo.indexing.crawl.crawl_errors",
      parent: "seo.indexing.crawl",
      label: "Crawl errors detected",
      gate: {
        required_any: ["crawl error", "crawl errors", "fetch failed", "unreachable", "dns", "not found", "404", "4xx"],
        secondary_any: ["googlebot", "search console", "gsc", "crawl", "crawling"]
      },
      anchors: [
        "Search Console shows crawl errors, and Googlebot cannot reliably fetch important URLs, which reduces indexing and ranking.",
        "We see crawl failures for multiple pages, so Google may not discover updates, and visibility continues to decline.",
        "Googlebot reports crawl issues, and the site may be returning errors that prevent consistent crawling and indexing.",
        "Crawl errors appear in Search Console, and we suspect server or configuration problems are blocking search engine access.",
        "Some URLs fail when crawled, which prevents Google from indexing changes and keeps organic impressions low.",
        "We have crawl errors for key pages, and the crawl problem likely blocks ranking improvements and traffic growth.",
        "Search Console flags crawling problems, and Google cannot fetch our pages consistently to evaluate content quality.",
        "Crawl errors increased recently, and organic performance dropped, which suggests crawl health is impacting visibility.",
        "Googlebot cannot crawl some pages due to errors, so index coverage is limited and traffic remains minimal.",
        "Crawl errors are frequent, and we need to fix fetch failures to restore indexing and search performance."
      ]
    },
    {
      id: "seo.indexing.crawl.robots_blocked",
      parent: "seo.indexing.crawl",
      label: "Robots blocking crawling",
      gate: {
        required_any: ["robots", "robots.txt", "blocked", "disallow"],
        secondary_any: ["googlebot", "crawl", "crawling", "index", "indexed", "prevent", "not"]
      },
      anchors: [
        "We think robots dot txt is blocking Googlebot, because Search Console shows blocked resources and missing indexed pages.",
        "Google cannot crawl important sections, and robots rules may be preventing crawling and indexing of key content.",
        "Robots restrictions appear to block crawlers, so pages are not discovered and visibility remains very low.",
        "A robots directive might be disallowing important folders, causing pages to disappear from the index unexpectedly.",
        "Search Console indicates crawling blocked by robots, which prevents Google from accessing pages and evaluating content.",
        "We suspect Googlebot is blocked, because crawling and indexing stopped after a robots configuration change.",
        "Robots file rules may be too strict, preventing access to service pages that should rank for our keywords.",
        "Crawling is restricted by robots, and we need to allow Googlebot so the site can regain impressions and traffic.",
        "Blocked by robots messages appear for many URLs, which limits index coverage and reduces search presence.",
        "Robots blocking crawling would explain low impressions and missing pages, so we need a full robots audit."
      ]
    },
    {
      id: "seo.indexing.crawl.server_errors",
      parent: "seo.indexing.crawl",
      label: "Server errors impacting crawl",
      gate: {
         required_any: ["5xx", "500", "502", "503", "504", "server error", "timeout", "timed out"],
         secondary_any: ["googlebot", "crawl", "crawling", "search console", "gsc", "fetch"]
      },
      anchors: [
        "Googlebot encounters server errors when crawling, and 5xx responses likely prevent indexing and reduce search visibility.",
        "We see server timeouts during crawling, so Google may reduce crawl rate and stop indexing updates reliably.",
        "Search Console reports server errors, suggesting hosting issues that block crawlers and reduce organic impressions.",
        "Crawling fails due to server problems, which can cause pages to drop from the index and rankings to decline.",
        "Our server returns intermittent 500 errors, and Google cannot fetch key URLs consistently for indexing purposes.",
        "Server instability causes crawl errors, so Googlebot may not trust the site and may limit visibility in search.",
        "We suspect hosting or application errors because crawl failures coincide with traffic drops and indexing issues.",
        "Googlebot cannot crawl due to server errors, and this prevents reindexing after we publish new content updates.",
        "Crawl health is poor because the server is unreliable, and that blocks indexing and harms search performance.",
        "Server errors during crawl likely reduce crawl budget, which limits discovery and slows SEO recovery."
      ]
    },

    // -------------------------
    // INDEXING / ARCHITECTURE (3)
    // -------------------------
    {
      id: "seo.indexing.architecture.orphan_pages",
      parent: "seo.indexing.architecture",
      label: "Orphan pages",
      gate: {
        required_any: ["orphan", "unlinked", "not linked", "no internal links", "internal link", "internal links"],
        secondary_any: ["index", "indexed", "discover", "crawl", "crawling", "google", "missing", "not"]
      },
      anchors: [
        "Some pages have no internal links pointing to them, so they behave like orphan pages and are hard for Google to discover.",
        "We suspect orphan pages exist because important URLs are not linked in navigation, and they rarely appear in search.",
        "Internal linking is missing for certain pages, so crawlers may not find them, and index coverage remains limited.",
        "Orphan content likely prevents indexing, because pages are isolated and not connected to the site architecture.",
        "We created new pages but did not link them properly, so they remain orphaned and fail to gain impressions.",
        "Pages are not discoverable through internal links, and that makes crawling inefficient and indexing incomplete.",
        "Orphan pages can cause low impressions because Google does not easily find them, and users cannot reach them either.",
        "We have isolated service pages without internal links, which likely reduces crawl frequency and ranking potential.",
        "Our architecture leaves some pages unlinked, so Google may treat them as low priority and exclude them from index.",
        "Orphan pages explain why some URLs never rank, because they are not supported by internal navigation or linking."
      ]
    },
    {
      id: "seo.indexing.architecture.internal_links_weak",
      parent: "seo.indexing.architecture",
      label: "Internal linking is weak",
      gate: {
        required_any: ["internal link", "internal links", "site structure", "navigation", "linking"],
        secondary_any: ["weak", "poor", "bad", "missing", "not", "lack", "hard"]
      },
      anchors: [
        "Internal linking is weak, so important pages lack link equity and Google may not understand which pages matter most.",
        "Our site structure does not connect related topics well, which limits crawling paths and reduces ranking strength.",
        "We have poor internal links between service and supporting pages, so Google cannot see topical relationships clearly.",
        "Navigation and internal linking are weak, so key pages are buried and do not receive enough internal authority.",
        "Weak internal linking may reduce crawl depth, causing pages to get fewer impressions and slower index updates.",
        "Important pages are not linked from high-traffic pages, so internal link flow is weak and rankings remain low.",
        "Our internal linking strategy is inconsistent, which makes the site harder to crawl and harms SEO performance.",
        "Pages that should rank are not supported by internal links, so they lack relevance signals and struggle in SERPs.",
        "Weak linking causes poor architecture, and Google may not prioritize our key pages for crawling and indexing.",
        "We need stronger internal links because the current structure does not help Google understand importance and hierarchy."
      ]
    },
    {
      id: "seo.indexing.architecture.duplicate_content",
      parent: "seo.indexing.architecture",
      label: "Duplicate content issues",
      gate: {
        required_any: ["duplicate", "duplicates", "canonical", "copied", "similar content"],
        secondary_any: ["issue", "problem", "confusing", "wrong", "not", "excluded", "ranking"]
      },
      anchors: [
        "We have duplicate content across multiple pages, and Google may not know which version to rank for important keywords.",
        "Similar pages target the same terms, causing duplication and cannibalization that weakens rankings and search visibility.",
        "Google seems to pick the wrong canonical page, suggesting duplicate content issues are confusing indexing decisions.",
        "Duplicate content likely causes pages to be excluded, which limits index coverage and reduces impressions overall.",
        "We have multiple service pages with near-identical text, and that duplication may be harming ranking performance.",
        "Content duplication creates competition within our own site, which can reduce visibility and split ranking signals.",
        "We suspect canonical problems because Google indexes unexpected URLs and does not rank the page we intended.",
        "Duplicate content across city or service pages may trigger exclusions, leading to limited visibility and low traffic.",
        "Our pages are too similar, so Google may treat them as duplicates and show fewer of them in search results.",
        "Duplicate content issues could explain low impressions, because Google filters similar pages and reduces exposure."
      ]
    },

    // -------------------------
    // TRAFFIC / ORGANIC (3)
    // -------------------------
    {
      id: "seo.traffic.organic.organic_traffic_low",
      parent: "seo.traffic.organic",
      label: "Organic traffic is low",
      gate: {
        required_any: ["traffic", "visit", "visits", "session", "sessions", "users"],
        secondary_any: ["organic", "search", "google", "seo", "low", "minimal", "near", "zero", "down", "declined", "dropped"]
      }
      ,
      anchors: [
        "Our website is receiving minimal search traffic, and organic sessions are near zero even though we offer relevant services.",
        "Google traffic is very low across the site, and we are not getting consistent visits from organic search results.",
        "Organic search sessions remain low month after month, and the site does not generate meaningful traffic from Google.",
        "We get some direct traffic, but search traffic is minimal, which suggests poor SEO visibility or indexing problems.",
        "Organic visits are low despite content efforts, so we suspect our pages are not ranking or being shown for queries.",
        "Search traffic appears very low, and we are not seeing growth even after updating pages and adding new content.",
        "We have minimal organic sessions from Google, so the website is not attracting new users through search discovery.",
        "Search traffic is low and unpredictable, and we cannot identify which pages should be driving organic visits reliably.",
        "Organic traffic is low across core service pages, which prevents inbound inquiries and reduces overall lead flow.",
        "We are receiving very little traffic from search, and it feels like our SEO is not producing measurable results."
      ]
    },
    {
      id: "seo.traffic.organic.traffic_drop_recent",
      parent: "seo.traffic.organic",
      label: "Organic traffic dropped recently",
      gate: {
        required_any: ["organic", "search", "google", "seo"],
        secondary_any: ["dropped", "drop", "declined", "down", "fell", "sudden", "recent"]
      },
      anchors: [
        "Organic traffic dropped recently, and we saw a noticeable decline in Google sessions over the past few weeks.",
        "We had stable search traffic, but it suddenly fell, and we are unsure whether an update or technical change caused it.",
        "Google organic sessions declined sharply compared with last month, and the drop impacted leads and inquiries.",
        "Search traffic dropped after a site change, and we suspect something affected indexing, crawling, or ranking signals.",
        "We experienced a sudden decline in organic traffic, and impressions and clicks also decreased at the same time.",
        "Organic visits fell recently and have not recovered, so we need to identify the cause and stop further losses.",
        "Search traffic dropped without clear explanation, and we want to understand whether content, links, or technical issues are involved.",
        "Our organic traffic decreased quickly, and we are concerned competitors replaced us in rankings for key queries.",
        "We saw a recent drop in search sessions, and the decline appears across multiple pages and keyword groups.",
        "Organic traffic dropped and revenue declined, so we need a structured diagnosis of what changed and what to fix."
      ]
    },
    {
      id: "seo.traffic.organic.traffic_flat_no_growth",
      parent: "seo.traffic.organic",
      label: "Organic traffic is flat (no growth)",
      gate: {
        required_any: ["organic", "search", "google", "seo"],
        secondary_any: ["flat", "stagnant", "not growing", "no growth", "stuck", "plateau"]
      },
      anchors: [
        "Organic search traffic is flat, and we are not seeing growth in sessions even after publishing new pages regularly.",
        "Search traffic seems stuck at the same level for months, and there is no upward trend in organic performance.",
        "We are not growing organic visits, and the plateau suggests our SEO strategy is not expanding reach or rankings.",
        "Organic traffic is stagnant and does not increase, even though we improved content and fixed some technical issues.",
        "Search sessions remain flat over time, and we cannot break into higher traffic levels for priority topics.",
        "We see no growth in organic traffic, so the site is not gaining authority or expanding keyword coverage.",
        "Our SEO performance is stuck, with organic traffic flat month to month and little improvement in impressions or clicks.",
        "Organic traffic is not growing despite effort, indicating we may lack content depth, links, or technical optimization.",
        "Traffic from Google has plateaued, and we need to understand what limits growth and how to increase visibility.",
        "Organic visits are flat, and we want a plan to move from stagnant performance to consistent growth."
      ]
    },

    // -------------------------
    // TRAFFIC / CONTENT (2)
    // -------------------------
    {
      id: "seo.traffic.content.blog_traffic_low",
      parent: "seo.traffic.content",
      label: "Blog traffic is low",
      gate: {
        required_any: ["blog", "blogs", "post", "posts", "article", "articles"],
        secondary_any: ["traffic", "visits", "sessions", "organic", "search", "google", "low", "minimal", "not"]
      },
      anchors: [
        "Our blog traffic is low, and recent posts are not getting organic visits from Google even after weeks of publishing.",
        "Blog articles are not attracting search visitors, and the content does not generate impressions or clicks in Search Console.",
        "We publish blog content, but traffic remains minimal, suggesting posts are not ranking or matching search intent.",
        "Blog pages get very few sessions from organic search, and the content does not contribute to lead generation.",
        "Our articles are not driving search traffic, and the blog feels invisible for informational keywords in our niche.",
        "Blog traffic is low and flat, and we do not see growth in impressions for informational queries over time.",
        "Content marketing efforts are not producing traffic, because blog posts do not appear prominently in search results.",
        "Our blog does not bring visitors, and Search Console shows low impressions and clicks for article pages.",
        "Blog posts are underperforming in search, and we suspect weak topical authority or poor keyword targeting.",
        "Blog traffic remains low, and we need to understand why content is not being discovered or clicked in Google."
      ]
    },
    {
      id: "seo.traffic.content.informational_traffic_low",
      parent: "seo.traffic.content",
      label: "Informational traffic is low",
      gate: {
      required_any: ["informational", "how to", "guide", "guides", "faq", "blog", "article", "articles"],
      secondary_any: ["traffic", "impressions", "clicks", "organic", "search", "low", "minimal", "missing"]
      },
      anchors: [
        "Informational traffic is low, and we do not get visitors from how-to or educational queries that should bring top-of-funnel exposure.",
        "Our guides and informational pages get minimal impressions, so we are not capturing early-stage searchers in our market.",
        "We are not receiving informational traffic from search, which suggests our content is not ranking for question-based queries.",
        "Top-of-funnel organic traffic is missing, and informational content does not attract visitors who are learning about solutions.",
        "Informational pages have low clicks and impressions, and we cannot build awareness through educational search traffic.",
        "We do not get traffic from informational keywords, so discovery is weak and our content strategy is not working.",
        "Educational content has low visibility, and informational search traffic remains minimal even after publishing new articles.",
        "Informational queries do not bring visits, suggesting weak topical authority or content that does not match intent.",
        "Our informational content is not earning traffic, and we want to improve rankings for guides, FAQs, and learning topics.",
        "Informational traffic is low, so we are missing early-stage users who could later convert into leads and customers."
      ]
    },

    // -------------------------
    // ENGAGEMENT / CTR (1)
    // -------------------------
    {
      id: "seo.engagement.ctr.organic_ctr_low",
      parent: "seo.engagement.ctr",
      label: "Organic CTR is low",
      gate: {
        required_any: ["ctr", "click", "clicks", "click-through", "snippet", "title", "meta"],
        secondary_any: ["low", "poor", "bad", "declined", "dropped", "few", "minimal"]
      },
      anchors: [
        "Organic CTR is low in Search Console, so we get impressions but few clicks from Google results.",
        "We have visibility in search, but click-through rate is poor, suggesting our titles and snippets do not persuade users.",
        "CTR from organic search is low, and competitors seem to get the clicks even when we appear on the same page.",
        "Clicks are low relative to impressions, and organic CTR is declining even though rankings look roughly stable.",
        "Search Console shows poor CTR, and we need to improve SERP messaging to increase clicks without relying on ranking jumps.",
        "Organic click-through is weak across many queries, indicating our listing does not match intent or stand out enough.",
        "CTR is low despite decent impressions, so our meta titles, descriptions, or rich results may not be competitive.",
        "We see impressions but almost no clicks, and the organic CTR line stays low for priority keyword groups.",
        "Organic CTR decreased recently, and we suspect snippet changes, SERP layout changes, or stronger competitor listings.",
        "Low organic CTR limits traffic even with impressions, so improving snippet attractiveness is critical for growth.",
        "Search Console shows low organic CTR, with impressions present but clicks remaining disproportionately low across key pages and queries",
        "Titles and snippets earn few clicks relative to impressions, indicating weak SERP appeal or mismatch between intent and on-page targeting",
        "CTR is consistently below expected levels in Search Console, suggesting snippets are not converting impressions into visits"
      ]
    },

    // -------------------------
    // ENGAGEMENT / BEHAVIOR (2)
    // -------------------------
    {
      id: "seo.engagement.behavior.bounce_high_from_search",
      parent: "seo.engagement.behavior",
      label: "Bounce rate from search is high",
      gate: {
        required_any: ["bounce", "bounces", "exit", "leave"],
        secondary_any: ["organic", "search", "google", "high", "immediately", "quickly", "poor", "bad"]
      }
      ,
      anchors: [
        "Bounce rate from organic search is high, and visitors leave immediately after landing, suggesting the page does not meet search intent.",
        "People click from Google and exit quickly, so the landing experience may be confusing, slow, or not aligned with the query.",
        "Search visitors bounce at a high rate, and we suspect the content does not answer questions or provide clear next steps.",
        "Organic traffic lands on pages but leaves fast, which indicates low relevance, weak messaging, or poor user experience.",
        "Bounce is high for search sessions, so even when SEO brings visitors, they do not stay to explore services or contact us.",
        "Users from Google leave immediately, suggesting the page content, layout, or offer is not what they expected from the snippet.",
        "High bounce from search implies a mismatch between query intent and content, so rankings may not convert into engagement.",
        "Search traffic bounces quickly, and we need to improve page clarity, value proposition, and internal navigation for visitors.",
        "Organic visitors exit rapidly, which hurts conversions and indicates the landing pages are not solving user needs effectively.",
        "Bounce rate is high for organic users, so we need to diagnose content relevance, speed, UX friction, and next-step CTAs."
      ]
    },
    {
      id: "seo.engagement.behavior.time_on_page_low_from_search",
      parent: "seo.engagement.behavior",
      label: "Time on page from search is low",
      gate: {
        required_any: ["dwell", "duration", "engagement time", "session duration", "avg session duration", "average session duration", "bounce"],
        secondary_any: ["organic", "search", "google", "low", "short", "poor", "bad", "quickly"]
      },
      anchors: [
        "Time on page from organic search is low, and visitors do not read content long enough to understand our services.",
        "Search users spend very little time before leaving, which suggests the page is not engaging or does not answer intent.",
        "Organic visitors have short session durations, indicating content quality, structure, or relevance may be insufficient.",
        "Visitors from Google do not stay on the page, so the content may be thin, confusing, or lacking useful information.",
        "Low time on page for search sessions suggests poor engagement, weak readability, or missing value compared with competitors.",
        "Search traffic arrives but does not stay, meaning the landing pages may not provide clear benefits or credible proof.",
        "Organic sessions have low duration, and users do not scroll or interact, which reduces conversions and leads.",
        "Time on page is low from search, so we should improve content depth, formatting, and internal links to keep users engaged.",
        "Google visitors leave quickly after landing, implying a mismatch between query intent and page content or offer.",
        "Low organic engagement time suggests the page is not satisfying the user, so improvements should focus on relevance and clarity."
      ]
    },

    // -------------------------
    // CONVERSION / LEADS (2)
    // -------------------------
    {
      id: "seo.conversion.leads.organic_leads_low",
      parent: "seo.conversion.leads",
      label: "Organic leads are low",
      gate: {
        required_any: ["lead", "leads", "inquiry", "inquiries", "contact", "calls", "form"],
        secondary_any: ["organic", "search", "google", "seo", "low", "few", "minimal", "near zero"]
      },
      anchors: [
        "Organic leads are low, and we get very few inquiries from Google search even when some traffic arrives to the site.",
        "We receive visits from organic search, but inquiries remain minimal, so SEO is not producing meaningful leads.",
        "Search traffic does not generate leads, and the number of organic inquiries is near zero over recent weeks.",
        "We want more inquiries from SEO, but organic leads are low despite having service pages and contact forms available.",
        "Organic visitors do not submit forms or call, so leads from search are low and the website is not converting interest.",
        "Leads from Google are minimal, and we suspect landing pages, CTAs, or trust signals are preventing inquiries.",
        "Even with some rankings, organic leads remain low, which suggests the traffic is unqualified or the offer is unclear.",
        "Search-based inquiries are rare, so we need better conversion paths and stronger intent alignment for organic visitors.",
        "Organic traffic is not turning into contacts, so leads are low and SEO does not impact pipeline effectively.",
        "We get little business from organic search, and organic leads are low compared with other channels and expectations."
      ]
    },
    {
      id: "seo.conversion.leads.organic_conversion_rate_low",
      parent: "seo.conversion.leads",
      label: "Organic conversion rate is low",
      gate: {
        required_any: ["conversion rate", "converts", "converting", "conversion", "leads"],
        secondary_any: ["organic", "search", "google", "seo", "low", "poor", "bad", "weak"]
      },
      anchors: [
        "Conversion rate from organic search is low, so visitors arrive from Google but do not become leads or inquiries.",
        "Organic visitors do not convert, and the conversion rate from search traffic is poor compared with other channels.",
        "We get organic sessions, but conversions are low, suggesting landing pages and CTAs are not effective for search intent.",
        "Search traffic comes in, yet conversion rate is weak, so the site fails to turn SEO visibility into real business.",
        "Organic conversion rate is poor, and visitors from Google do not fill forms, request quotes, or contact us reliably.",
        "Even when search traffic increases, conversions do not follow, indicating low conversion efficiency for organic visitors.",
        "Organic traffic has low conversion performance, and we need to improve trust, clarity, and next steps for users.",
        "The conversion rate from Google search is low, so we suspect mismatch between intent, offer, and landing page content.",
        "Organic sessions are not converting to inquiries, suggesting UX friction, weak value proposition, or missing proof elements.",
        "SEO brings some visitors, but the organic conversion rate is low, so we need CRO improvements tailored to search traffic."
      ]
    },

    // -------------------------
    // CONVERSION / ASSIST (1)
    // -------------------------
    {
      id: "seo.conversion.assist.content_not_assisting_sales",
      parent: "seo.conversion.assist",
      label: "Content not assisting sales",
      gate: {
        required_any: ["content", "blog", "articles", "guides", "resources"],
        secondary_any: ["not", "doesn't", "does not", "low", "poor", "bad", "no leads", "no inquiries"]
      },
      anchors: [
        "Our content does not assist sales, because blog and guide pages attract little qualified interest and rarely lead to inquiries.",
        "We publish helpful articles, but content is not generating leads or moving visitors toward contacting us for services.",
        "Content marketing feels ineffective, because readers do not progress from informational pages to service pages or contact forms.",
        "Our blog is active, but content does not contribute to pipeline, suggesting poor internal linking and weak conversion paths.",
        "Content is not assisting conversions, because visitors consume information but do not take next steps or request quotes.",
        "Informational pages do not drive inquiries, and content fails to build trust or guide users toward purchase decisions.",
        "We need content to support sales, but current articles do not create demand or deliver qualified leads consistently.",
        "Blog content does not help sales calls, because prospects are not referencing it and it does not produce inbound contacts.",
        "Our content library is large, yet it does not generate business outcomes, so we need better intent mapping and CTAs.",
        "Content is not assisting sales, because it attracts the wrong audience or lacks clear pathways to service offerings and conversion."
      ]
    }
  ]
};
