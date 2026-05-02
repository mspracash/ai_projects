---
service_id: technical_seo_audit
doc_type: concern
---

# Technical SEO Audit Concern Mapping

---

## title: Pages Not Appearing on Google
description: Maps indexing failures where pages are not visible in search results due to crawl restrictions or misconfigured directives.
keywords: pages not indexed, not appearing on google, no impressions SEO, indexing issues, crawl restrictions

user_scenario: We created pages but they are not showing on Google.

signals:
- pages missing from search results  
- no impressions in search console  
- site query not returning pages  

root_issue: Indexing failure caused by crawl restrictions or misconfigured directives

primary_service: technical_seo_audit
secondary_services: on_page_seo_optimization

---

## title: Sudden Traffic Drop Across Website
description: Identifies site-wide traffic drops caused by technical disruptions, crawl issues, or indexing problems.
keywords: sudden traffic drop, ranking drop sitewide, SEO technical issues, indexing problems

user_scenario: Our traffic dropped suddenly across the entire site.

signals:
- sharp decline in traffic  
- rankings dropped across pages  
- no content changes  

root_issue: Technical disruption affecting indexing or crawlability

primary_service: technical_seo_audit
secondary_services: seo_migration_support, seo_analytics_reporting

---

## title: Website Not Fully Indexed
description: Maps partial indexing issues due to crawl inefficiencies, weak internal linking, or duplication problems.
keywords: low indexed pages, crawl inefficiency, orphan pages, indexing issues SEO

user_scenario: Only some of our pages appear in Google.

signals:
- low indexed page count  
- many excluded pages  
- orphan pages  

root_issue: Crawl inefficiencies or duplication issues

primary_service: technical_seo_audit
secondary_services: content_strategy_seo

---

## title: Website Slow and Performance Issues
description: Identifies performance bottlenecks affecting page speed, user experience, and crawlability.
keywords: slow website SEO, page speed issues, Core Web Vitals, performance SEO

user_scenario: Our website loads slowly, especially on mobile.

signals:
- high load times  
- poor Core Web Vitals  
- high bounce rate  

root_issue: Performance bottlenecks impacting SEO and user experience

primary_service: technical_seo_audit
secondary_services: seo_retainer

---

## title: Broken Links and Crawl Errors
description: Covers structural issues causing broken links, crawl errors, and navigation problems.
keywords: broken links SEO, crawl errors, 404 pages, site maintenance issues

user_scenario: There are many broken links across our site.

signals:
- 404 errors  
- broken internal links  
- crawl errors  

root_issue: Structural issues and lack of maintenance

primary_service: technical_seo_audit
secondary_services: seo_retainer

---

## title: Duplicate Pages Competing
description: Maps duplicate content and cannibalization issues due to improper canonicalization and content structure.
keywords: duplicate pages SEO, canonical issues, keyword cannibalization, duplicate content

user_scenario: Multiple pages target similar content but none rank well.

signals:
- duplicate content  
- cannibalization  
- inconsistent canonical tags  

root_issue: Improper content structure and duplication signals

primary_service: technical_seo_audit
secondary_services: on_page_seo_optimization, content_strategy_seo

---

## title: Important Pages Blocked from Indexing
description: Identifies misconfigured robots.txt or noindex directives preventing important pages from being indexed.
keywords: robots.txt issues, noindex problem, blocked pages SEO, indexing blocked

user_scenario: Important pages are blocked from being indexed.

signals:
- blocked URLs  
- excluded pages  

root_issue: Incorrect technical configuration preventing indexing

primary_service: technical_seo_audit

---

## title: Weak Internal Linking Structure
description: Covers poor internal linking affecting crawlability, page discovery, and authority distribution.
keywords: weak internal linking, crawl depth issues, orphan pages, site structure SEO

user_scenario: Important pages are hard to find.

signals:
- deep hierarchy  
- low internal link count  
- orphan pages  

root_issue: Weak site architecture affecting crawl efficiency

primary_service: technical_seo_audit
secondary_services: on_page_seo_optimization

---

## title: Post Deployment SEO Issues
description: Maps technical inconsistencies introduced after releases causing indexing problems and broken functionality.
keywords: deployment SEO issues, post release errors, indexing issues after update, broken pages

user_scenario: After updates, things stopped working.

signals:
- indexing issues after release  
- broken pages  

root_issue: Deployment introduced technical inconsistencies

primary_service: technical_seo_audit
secondary_services: seo_migration_support

---

## title: Increasing Search Console Errors
description: Identifies growing crawl and indexing issues reflected in Search Console error reports.
keywords: search console errors, crawl issues SEO, indexing errors, coverage issues

user_scenario: We see many errors in Search Console.

signals:
- coverage errors  
- crawl anomalies  

root_issue: Underlying technical issues affecting crawling and indexing

primary_service: technical_seo_audit
secondary_services: seo_analytics_reporting

---