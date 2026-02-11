% ============================================================
%  digital_marketing.pl
%  Fictitious digital marketing company domain data:
%   - service classes/services
%   - mapping rules concern_type -> allowed classes
%   - producer economics: cost defaults
%   - negotiation parameters by class
%   - scope & value pitches
%   - bundle candidates by concern type
% ============================================================

:- module(digital_marketing, [
    seed/0,
    negotiation_params/2,
    service_cost_default/2,
    service_scope/2,
    service_value_pitch/2,
    bundle_candidates/3,
    bundle_discount/2
]).

:- use_module(agency_meta).

seed :-
    % Tell meta which domain module is active
    agency_meta:set_domain_module(digital_marketing),

    % Service classes
    agency_meta:define_service_class(seo),
    agency_meta:define_service_class(ads),
    agency_meta:define_service_class(content),
    agency_meta:define_service_class(web),

    % Concern -> allowed classes (rules)
    agency_meta:allow_concern_type_class(low_traffic, seo),
    agency_meta:allow_concern_type_class(low_traffic, content),

    agency_meta:allow_concern_type_class(low_leads, ads),
    agency_meta:allow_concern_type_class(low_leads, seo),

    agency_meta:allow_concern_type_class(website_slow, web),
    agency_meta:allow_concern_type_class(website_slow, seo),

    agency_meta:allow_concern_type_class(no_brand_presence, content),
    agency_meta:allow_concern_type_class(no_brand_presence, seo),

    % Services (Name is atom; keep consistent with cost defaults below)
    seed_service(seo,     'SEO Audit',                  price(300, 800)),
    seed_service(seo,     'On-page Optimization',       price(500, 1500)),
    seed_service(seo,     'Local SEO Setup',            price(250, 700)),

    seed_service(ads,     'Google Ads Setup',           price(400, 1200)),
    seed_service(ads,     'Retargeting Campaign',       price(300, 900)),
    seed_service(ads,     'Landing Page + Ad Creative', price(600, 2000)),

    seed_service(content, 'Content Plan (4 weeks)',     price(350, 1000)),
    seed_service(content, 'Blog Pack (4 posts)',        price(300, 900)),
    seed_service(content, 'Social Media Starter Pack',  price(250, 800)),

    seed_service(web,     'Performance Optimization',   price(300, 1000)),
    seed_service(web,     'Website Refresh',            price(700, 2500)).

seed_service(Class, Name, price(Min,Max)) :-
    % Avoid duplicates across restarts
    ( agency_meta:service(_SId, Class, Name, price(Min,Max)) ->
        true
    ; agency_meta:define_service(_NewId, Class, Name, price(Min,Max))
    ).

% ============================================================
% Negotiation parameters by class
% (These override meta defaults; meta merges them with defaults.)
% ============================================================

% Params keys supported by meta:
%   anchor_pct, floor_pct, max_rounds, min_margin,
%   concede_step_pct, split_bias, value_add_bonus (optional)

negotiation_params(seo, [
    anchor_pct=0.98,
    floor_pct=0.74,
    max_rounds=3,
    min_margin=180,
    concede_step_pct=0.07,
    split_bias=0.60
]).

negotiation_params(ads, [
    anchor_pct=1.02,
    floor_pct=0.78,
    max_rounds=2,
    min_margin=220,
    concede_step_pct=0.06,
    split_bias=0.62
]).

negotiation_params(content, [
    anchor_pct=0.96,
    floor_pct=0.70,
    max_rounds=3,
    min_margin=140,
    concede_step_pct=0.08,
    split_bias=0.57
]).

negotiation_params(web, [
    anchor_pct=1.00,
    floor_pct=0.76,
    max_rounds=2,
    min_margin=200,
    concede_step_pct=0.06,
    split_bias=0.60
]).

% ============================================================
% Producer cost defaults (used to compute margin/profit)
% ============================================================

service_cost_default('SEO Audit', cost(120, 220)).
service_cost_default('On-page Optimization', cost(200, 450)).
service_cost_default('Local SEO Setup', cost(90, 180)).

service_cost_default('Google Ads Setup', cost(180, 350)).
service_cost_default('Retargeting Campaign', cost(140, 280)).
service_cost_default('Landing Page + Ad Creative', cost(260, 650)).

service_cost_default('Content Plan (4 weeks)', cost(140, 320)).
service_cost_default('Blog Pack (4 posts)', cost(120, 280)).
service_cost_default('Social Media Starter Pack', cost(90, 240)).

service_cost_default('Performance Optimization', cost(160, 420)).
service_cost_default('Website Refresh', cost(350, 900)).

% ============================================================
% Scope text (consumer asks: ask(scope).)
% ============================================================

service_scope('SEO Audit',
  "Full site crawl + technical audit + top issues list + prioritized fixes. Delivery: 5 business days.").

service_scope('On-page Optimization',
  "Optimize titles/meta/H1/H2, internal linking, and 10 priority pages. Includes 1 revision cycle.").

service_scope('Local SEO Setup',
  "Google Business Profile setup/cleanup + NAP consistency checklist + basic citations plan.").

service_scope('Google Ads Setup',
  "Account + conversion tracking + 1 search campaign + keyword set + initial negative keywords list.").

service_scope('Retargeting Campaign',
  "Pixel setup + audience creation + retargeting ads + basic frequency controls. 2 ad variations.").

service_scope('Landing Page + Ad Creative',
  "One landing page wireframe + copy + 2 creative variations (static). Includes 1 revision cycle.").

service_scope('Content Plan (4 weeks)',
  "Editorial calendar + topic clusters + briefs for 4 pieces + distribution checklist.").

service_scope('Blog Pack (4 posts)',
  "Four SEO-friendly blog posts (800-1200 words). Includes 1 light revision each.").

service_scope('Social Media Starter Pack',
  "10 post templates + caption pack + posting schedule guidance for 2 weeks.").

service_scope('Performance Optimization',
  "Core Web Vitals improvements + image optimization + caching configuration guidance.").

service_scope('Website Refresh',
  "UI refresh on key pages + speed/basic SEO hygiene + mobile responsiveness review.").

% ============================================================
% Value pitch (consumer asks: ask(value).)
% ============================================================

service_value_pitch('SEO Audit',
  "Finds the highest-impact blockers so you stop wasting spend. It's the fastest way to increase qualified traffic sustainably.").

service_value_pitch('On-page Optimization',
  "Turns existing pages into lead assets. You usually see uplift without extra ad spend when on-page is fixed properly.").

service_value_pitch('Local SEO Setup',
  "Improves map visibility and calls. Great ROI if you serve a region and rely on nearby customers.").

service_value_pitch('Google Ads Setup',
  "Gets you to controlled acquisition quickly. We build tracking so you know exactly what is working.").

service_value_pitch('Retargeting Campaign',
  "Captures visitors you already paid for. Retargeting often lowers blended CAC and increases conversion rates.").

service_value_pitch('Landing Page + Ad Creative',
  "Most ad accounts fail because the landing page leaks conversions. This plugs the leaks and improves quality score.").

service_value_pitch('Content Plan (4 weeks)',
  "Gives you a repeatable engine instead of random posts. It compounds: one plan supports multiple channels.").

service_value_pitch('Blog Pack (4 posts)',
  "Builds topical authority and long-tail traffic. These posts keep working after the month ends.").

service_value_pitch('Social Media Starter Pack',
  "Gets consistent brand presence without daily stress. Useful when awareness is the bottleneck.").

service_value_pitch('Performance Optimization',
  "Speed directly affects conversion and SEO. This improves both user experience and ranking signals.").

service_value_pitch('Website Refresh',
  "Makes your site feel trustworthy and modern—often a prerequisite for converting paid traffic profitably.").

% ============================================================
% Bundling: dynamic negotiation lever
% bundle_candidates(ConcernType, PrimaryServiceName, BundleServiceNames)
% ============================================================

bundle_candidates(low_traffic, 'SEO Audit', ['Content Plan (4 weeks)']).
bundle_candidates(low_traffic, 'On-page Optimization', ['Blog Pack (4 posts)']).

bundle_candidates(low_leads, 'Google Ads Setup', ['Landing Page + Ad Creative']).
bundle_candidates(low_leads, 'Retargeting Campaign', ['Landing Page + Ad Creative']).

bundle_candidates(no_brand_presence, 'Social Media Starter Pack', ['Content Plan (4 weeks)']).

bundle_candidates(website_slow, 'Performance Optimization', ['SEO Audit']).

% Bundle discount per concern type (optional override)
bundle_discount(low_traffic, 0.10).
bundle_discount(low_leads, 0.08).
bundle_discount(no_brand_presence, 0.12).
bundle_discount(website_slow, 0.09).
