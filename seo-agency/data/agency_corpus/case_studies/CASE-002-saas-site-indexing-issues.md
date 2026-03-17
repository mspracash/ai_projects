---
doc_id: CASE-002
title: "Case Study: SaaS Site Indexing Issues"
doc_type: case_study
topic: saas_indexing
audience: internal
service_ids: [technical_audit, indexing_recovery]
concern_ids: [pages_not_indexed, crawl_budget_waste]
version: v2
---

# Case Study: SaaS Site Indexing Issues

## Client Snapshot
A fast-growing SaaS company providing project management tools contacted the agency after experiencing a sudden drop in organic visibility.
The company relied heavily on inbound marketing and search traffic for customer acquisition.
Their product documentation and feature pages had historically ranked well for competitive queries.
Six months after a major website redesign the marketing team noticed a steady decline in search impressions.
Organic signups began falling as fewer product pages appeared in search results.

## Initial Symptoms
Google Search Console reported a growing number of excluded pages.
Many product and documentation URLs were categorized as "Crawled – currently not indexed".
Several newly launched feature pages had never appeared in search results.
Organic impressions declined by nearly 35 percent within three months.
Internal analytics confirmed fewer organic trial signups during the same period.

## Observed Evidence
A technical crawl revealed thousands of URLs across marketing, documentation, and blog sections.
Several important pages had inconsistent canonical tags.
Legacy URLs from the previous site architecture were still referenced internally.
Multiple redirect chains increased crawl complexity.
The XML sitemap also lacked several recently published feature pages.

## Technical Evidence
Server log analysis showed that search engine crawlers frequently visited low-value archive pages.
High-priority product pages were crawled less frequently.
Robots.txt rules were reviewed and revealed an unintended block on a documentation directory.
That rule had been added during staging and accidentally deployed to production.
Additionally, several parameterized URLs created duplicate content variations.

## Hypothesis
The team concluded that a combination of crawl inefficiencies and indexing confusion caused the issue.
Search engines were wasting crawl budget on low-value pages.
At the same time, canonical inconsistencies and duplicate parameters weakened indexing signals.
Important feature pages were not clearly prioritized for indexing.

## Recommended Services
Technical SEO audit
Indexing recovery strategy
Internal linking restructuring
Canonical tag normalization
XML sitemap automation
Crawl budget optimization

## Execution
Engineers removed the accidental robots.txt restriction from documentation directories.
Canonical tags were standardized across templates.
Parameterized URLs were consolidated to preferred versions.
The XML sitemap generation process was automated.
Internal links were added from high-authority pages to key feature and documentation pages.

## Outcome
Within two months Google Search Console reported a steady increase in indexed pages.
Several product feature pages regained top-ten rankings for core SaaS keywords.
Organic impressions increased by approximately 30 percent.
Trial signups from organic search returned to previous levels.
Crawl efficiency also improved as fewer low-value pages were indexed.

## Lessons Learned
Large SaaS websites are particularly sensitive to crawl budget inefficiencies.
Small configuration errors can significantly impact indexing.
Automated sitemap updates and canonical validation should be part of deployment workflows.
Regular technical audits help prevent silent indexing losses.

## Transferable Pattern
Many SaaS companies experience indexing problems after major redesigns.
Legacy URLs, duplicate parameters, and inconsistent canonicals frequently appear together.
Without proactive monitoring these issues slowly erode search visibility.
Technical SEO governance is essential for maintaining stable organic growth.