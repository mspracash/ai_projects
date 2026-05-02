---
service_id: seo_migration
doc_type: concern
---

# SEO Migration Support Concern Mapping

---

## title: Traffic Dropped After Redesign
description: Maps cases where traffic declines after website redesign due to improper migration handling and missing redirects.
keywords: traffic drop after redesign, SEO migration issues, rankings dropped after launch, site relaunch SEO

user_scenario: After redesigning our website, our traffic dropped significantly.

signals:
- sharp traffic decline post-launch  
- rankings dropped across multiple pages  

root_issue: Improper migration handling including redirects, structure changes, and indexing issues

primary_service: seo_migration
secondary_services: technical_seo_audit

---

## title: URL Changes Caused Ranking Loss
description: Identifies ranking loss due to missing or incorrect redirect mapping after URL changes.
keywords: URL change SEO, redirect issues, ranking loss after URL change, SEO redirects missing

user_scenario: We changed our URLs and lost rankings.

signals:
- old URLs not ranking  
- new URLs not indexed or ranking  

root_issue: Missing or incorrect redirect mapping between old and new URLs

primary_service: seo_migration

---

## title: Domain Migration Caused Traffic Drop
description: Maps traffic and visibility loss after moving to a new domain due to improper SEO signal transfer.
keywords: domain migration SEO, new domain traffic drop, domain authority loss, SEO migration issues

user_scenario: We moved to a new domain and traffic dropped.

signals:
- loss of domain authority signals  
- reduced visibility  

root_issue: Improper domain migration and failure to transfer SEO signals

primary_service: seo_migration_support

---

## title: CMS Migration Caused SEO Issues
description: Covers SEO performance drops due to technical issues introduced during CMS or platform migration.
keywords: CMS migration SEO, platform migration SEO, missing pages SEO, broken links migration

user_scenario: We moved platforms and SEO performance dropped.

signals:
- missing pages  
- broken links  
- indexing inconsistencies  

root_issue: Technical issues introduced during CMS migration

primary_service: seo_migration_support
secondary_services: technical_seo_audit

---

## title: Redirects Not Working Properly
description: Identifies incorrect redirect implementation causing errors and crawl inefficiencies.
keywords: redirects not working, 404 errors SEO, redirect chains loops, SEO redirect issues

user_scenario: Old pages are not redirecting correctly.

signals:
- 404 errors  
- redirect chains or loops  

root_issue: Incorrect or incomplete redirect implementation

primary_service: seo_migration_support

---

## title: Pages Missing After Migration
description: Maps missing pages and indexing loss due to improper migration or page transfer issues.
keywords: missing pages SEO, pages lost after migration, indexed pages drop, SEO migration errors

user_scenario: Some pages disappeared after migration.

signals:
- missing URLs  
- drop in indexed pages  

root_issue: Pages not transferred or improperly configured during migration

primary_service: seo_migration_support

---

## title: Broken Internal Links After Migration
description: Covers internal linking issues affecting navigation and crawlability after migration.
keywords: broken internal links, navigation issues SEO, crawl errors internal links, migration linking issues

user_scenario: Internal links are broken after update.

signals:
- broken navigation  
- crawl errors  

root_issue: Internal linking not updated to reflect new URL structure

primary_service: seo_migration_support
secondary_services: technical_seo_audit

---

## title: Increased Crawl Errors After Migration
description: Identifies spikes in crawl errors due to technical inconsistencies introduced during migration.
keywords: crawl errors after migration, indexing issues SEO, search console errors, SEO diagnostics

user_scenario: Search Console shows many errors after migration.

signals:
- spike in crawl errors  
- indexing issues  

root_issue: Technical inconsistencies affecting crawlability and indexing

primary_service: seo_migration_support

---

## title: Key Pages Lost Rankings After Migration
description: Maps ranking loss for important pages due to authority loss or improper URL mapping.
keywords: key pages ranking drop, migration ranking loss, SEO authority loss, URL mapping issues

user_scenario: Important pages lost rankings after migration.

signals:
- loss of top positions  
- drop in impressions  

root_issue: Loss of authority signals or incorrect URL mapping

primary_service: seo_migration_support
secondary_services: on_page_seo_optimization

---

## title: Duplicate Pages After Migration
description: Identifies duplicate content issues caused by improper canonical and URL handling.
keywords: duplicate pages SEO, canonical issues migration, duplicate URLs, SEO duplication problems

user_scenario: We have duplicate pages after migration.

signals:
- duplicate URLs  
- canonical issues  

root_issue: Improper handling of canonical tags and URL duplication

primary_service: seo_migration_support
secondary_services: technical_seo_audit

---

## title: Sitemap and Indexing Issues After Migration
description: Covers problems with sitemaps and indexing configurations after migration.
keywords: sitemap issues SEO, indexing problems migration, SEO configuration errors, sitemap not working

user_scenario: Sitemap is not working after migration.

signals:
- missing or outdated sitemap  
- indexing inconsistencies  

root_issue: Improper sitemap setup and indexing configuration

primary_service: seo_migration_support

---

## title: Gradual Traffic Decline After Migration
description: Maps slow performance decline due to hidden or delayed SEO issues introduced during migration.
keywords: gradual traffic decline SEO, delayed SEO issues, migration performance drop, hidden SEO issues

user_scenario: Traffic is slowly declining after migration.

signals:
- gradual drop in rankings  
- delayed indexing issues  

root_issue: Hidden migration issues affecting long-term performance

primary_service: seo_migration_support
secondary_services: seo_analytics_reporting

---