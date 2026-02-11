% ============================================================
%  agency_meta.pl  (SWI-Prolog)
%  Generic meta-engine:
%   - Consumer/Producer objects + flexible profiles
%   - Concern queue
%   - Service classes/services + allowed mapping rules
%   - Auto-triggered mapping when concerns exist
%   - Dynamic negotiation (offers/counters/value-add/bundles/switching)
%   - Persistence to agency_db.pl
%
%  Domain module supplies:
%    - negotiation_params(Class, Params)
%    - service_cost_default(ServiceName, cost(MinC,MaxC))
%    - service_scope(ServiceName, Text)
%    - service_value_pitch(ServiceName, Text)
%    - bundle_candidates(ConcernType, PrimaryServiceName, BundleServiceNames)
% ============================================================

:- module(agency_meta, [
    % persistence
    load_db/0, save_db/0,

    % config
    enable_auto_mapping/1,          % on/off
    set_domain_module/1,            % e.g. digital_marketing

    % consumer / producer
    new_consumer/2, new_producer/1,
    set_consumer_status/2, consumer_status/2,

    % profile
    profile_set/3, profile_get/3, profile_remove/2, profile_props/2,

    % concerns
    add_concern/4, list_concerns/2,
    concern_status/4, set_concern_status/4,

    % services & rules
    define_service_class/1,
    define_service/4,
    allow_concern_type_class/2,
    set_service_cost/2,

    % negotiation-driven mapping
    negotiate_all/1,
    negotiate_next/1,

    % aggregation
    pass_breakdown/3
]).

:- use_module(library(uuid)).
:- use_module(library(lists)).
:- use_module(library(apply)).
:- use_module(library(persistency)).
:- use_module(library(readutil)).

% --------------------------
% Persistence schema
% --------------------------
% consumer(ConsumerId, Status).
% producer(ProducerId).
% profile(EntityId, Key, Value).
% concern(ConsumerId, ConcernId, Type, Status).
% concern_solution(ConsumerId, ConcernId, ServiceId, Verdict).  % accepted/rejected
% service_class(ClassId).
% service(ServiceId, ClassId, Name, price(Min, Max)).
% service_cost(ServiceId, cost(MinC, MaxC)).
% allowed_concern_class(ConcernType, ClassId).
% deal(ConsumerId, ConcernId, ServiceId, final(Price), margin(Margin), rounds(Rounds)).
% nego_turn(ConsumerId, ConcernId, ServiceId, Round, Speaker, Text).

:- persistent
    consumer/2,
    producer/1,
    profile/3,
    concern/4,
    concern_solution/4,
    service_class/1,
    service/4,
    service_cost/2,
    allowed_concern_class/2,
    deal/6,
    nego_turn/6.

db_file('agency_db.pl').

load_db :-
    db_file(File),
    db_attach(File, []).

save_db :-
    db_sync(gc(always)).

% --------------------------
% Runtime config (not persisted)
% --------------------------
:- dynamic auto_mapping/1.
:- dynamic domain_module/1.

auto_mapping(off).
domain_module(none).

enable_auto_mapping(on)  :- retractall(auto_mapping(_)), assertz(auto_mapping(on)).
enable_auto_mapping(off) :- retractall(auto_mapping(_)), assertz(auto_mapping(off)).

set_domain_module(Mod) :-
    must_be(atom, Mod),
    retractall(domain_module(_)),
    assertz(domain_module(Mod)).

% --------------------------
% Utilities / validation
% --------------------------
new_id(Id) :- uuid(Id).

valid_consumer_status(waiting).
valid_consumer_status(active).
valid_consumer_status(inactive).
valid_consumer_status(failed).

valid_concern_status(new).
valid_concern_status(pass).
valid_concern_status(fail).
valid_concern_status(in_progress).

% ============================================================
%  Consumer / Producer
% ============================================================
new_consumer(Id, Status) :-
    valid_consumer_status(Status),
    new_id(Id),
    assert_consumer(Id, Status).

new_producer(Id) :-
    new_id(Id),
    assert_producer(Id).

consumer_status(Id, Status) :-
    consumer(Id, Status).

set_consumer_status(Id, NewStatus) :-
    valid_consumer_status(NewStatus),
    consumer(Id, _),
    retract_consumer(Id, _),
    assert_consumer(Id, NewStatus).

% ============================================================
%  Profile (flexible KV)
% ============================================================
profile_set(E, K, V) :-
    must_be(atom, K),
    ( profile(E, K, _) ->
        retract_profile(E, K, _)
    ; true ),
    assert_profile(E, K, V).

profile_get(E, K, V) :-
    profile(E, K, V).

profile_remove(E, K) :-
    ( profile(E, K, _) -> retract_profile(E, K, _) ; true ).

profile_props(E, Props) :-
    findall(K-V, profile(E, K, V), Props).

% ============================================================
%  Concerns
% ============================================================
add_concern(C, ConId, Type, Status) :-
    valid_concern_status(Status),
    new_id(ConId),
    assert_concern(C, ConId, Type, Status),
    maybe_auto_negotiate(C).

list_concerns(C, List) :-
    findall(concern(ConId,Type,Status),
            concern(C, ConId, Type, Status),
            List).

concern_status(C, ConId, Type, Status) :-
    concern(C, ConId, Type, Status).

set_concern_status(C, ConId, Type, NewStatus) :-
    valid_concern_status(NewStatus),
    concern(C, ConId, Type, _Old),
    retract_concern(C, ConId, Type, _),
    assert_concern(C, ConId, Type, NewStatus).

% ============================================================
%  Services & Rules
% ============================================================
define_service_class(Class) :-
    must_be(atom, Class),
    ( service_class(Class) -> true ; assert_service_class(Class) ).

define_service(ServiceId, Class, Name, price(Min,Max)) :-
    must_be(atom, Class),
    must_be(atom, Name),
    must_be(number, Min),
    must_be(number, Max),
    define_service_class(Class),
    new_id(ServiceId),
    assert_service(ServiceId, Class, Name, price(Min,Max)),
    maybe_seed_cost_from_domain(ServiceId, Name).

allow_concern_type_class(Type, Class) :-
    must_be(atom, Type),
    must_be(atom, Class),
    define_service_class(Class),
    ( allowed_concern_class(Type, Class) -> true
    ; assert_allowed_concern_class(Type, Class)
    ).

set_service_cost(ServiceId, cost(MinC,MaxC)) :-
    must_be(number, MinC),
    must_be(number, MaxC),
    ( service_cost(ServiceId, _) -> retract_service_cost(ServiceId, _) ; true ),
    assert_service_cost(ServiceId, cost(MinC,MaxC)).

maybe_seed_cost_from_domain(ServiceId, ServiceName) :-
    domain_module(Mod),
    ( Mod \= none,
      current_predicate(Mod:service_cost_default/2),
      call(Mod:service_cost_default(ServiceName, Cost)) ->
        ( service_cost(ServiceId, _) -> true ; assert_service_cost(ServiceId, Cost) )
    ; true ).

% ============================================================
%  Aggregation: passed concerns -> accepted services -> total cost
% ============================================================
pass_breakdown(C, Breakdown, total(MinSum, MaxSum)) :-
    consumer(C, _),
    findall(ConId-Type,
        concern(C, ConId, Type, pass),
        Pairs0),
    sort(Pairs0, Pairs),
    build_breakdown(C, Pairs, Breakdown),
    total_from_breakdown(Breakdown, MinSum, MaxSum).

build_breakdown(_, [], []).
build_breakdown(C, [ConId-Type|T], [Item|Rest]) :-
    findall(
        service_item(SId, Class, Name, price(Min,Max), final(FinalPrice)),
        (
            concern_solution(C, ConId, SId, accepted),
            service(SId, Class, Name, price(Min,Max)),
            ( deal(C, ConId, SId, final(FinalPrice), _Margin, _Rounds) -> true
            ; FinalPrice = unknown )
        ),
        Services0
    ),
    sort(Services0, Services),
    sum_final_or_range(Services, SubMin, SubMax),
    Item = concern_item(ConId, Type, Services, subtotal(SubMin,SubMax)),
    build_breakdown(C, T, Rest).

sum_final_or_range(Services, MinSum, MaxSum) :-
    foldl(sum_one, Services, 0-0, MinSum-MaxSum).

sum_one(service_item(_,_,_,price(Min,Max),final(Final)), A-B, A1-B1) :-
    ( number(Final) ->
        A1 is A + Final,
        B1 is B + Final
    ;   A1 is A + Min,
        B1 is B + Max
    ).

total_from_breakdown(Breakdown, MinSum, MaxSum) :-
    foldl(sum_item, Breakdown, 0-0, MinSum-MaxSum).

sum_item(concern_item(_,_,_,subtotal(Min,Max)), A-B, A1-B1) :-
    A1 is A + Min,
    B1 is B + Max.

% ============================================================
%  Auto-trigger
% ============================================================
maybe_auto_negotiate(C) :-
    auto_mapping(on),
    % If at least one new concern exists, start negotiation driver
    ( concern(C, _Any, _Type, new) ->
        negotiate_all(C)
    ; true ).
maybe_auto_negotiate(_C) :-
    auto_mapping(off).

% ============================================================
%  Negotiation-driven mapping
% ============================================================

% Public: negotiate all new concerns
negotiate_all(C) :-
    consumer(C, _),
    ( negotiate_next(C) ->
        negotiate_all(C)
    ; true ).

% Public: negotiate one step (one concern until it becomes pass/fail, possibly multiple services)
% Returns true if progress happened, false if nothing to do.
negotiate_next(C) :-
    consumer(C, _),
    ( next_new_concern(C, ConId, Type) ->
        format("\n--- Next concern ~w (~w) ---\n", [ConId, Type]),
        negotiate_concern(C, ConId, Type),
        true
    ; false ).

next_new_concern(C, ConId, Type) :-
    concern(C, ConId, Type, new), !.

% A concern can be addressed by one or more services.
% Here is the policy:
%  - negotiate one service to acceptance => concern becomes in_progress
%  - ask consumer if they want another service for same concern
%  - if yes -> negotiate another candidate and accept/reject
%  - close concern as pass when consumer says "done" and at least one accepted exists
%  - fail concern if no candidates left and none accepted
negotiate_concern(C, ConId, Type) :-
    set_concern_status(C, ConId, Type, in_progress),
    negotiate_more_services_for_concern(C, ConId, Type).

negotiate_more_services_for_concern(C, ConId, Type) :-
    ( has_any_accepted(C, ConId) ->
        % Offer choice to add more services
        ask_yes_no("You already accepted at least one service for this concern. Add another service? (y/n) ", AddMore),
        ( AddMore = yes ->
            negotiate_one_service_attempt(C, ConId, Type, DidSomething),
            ( DidSomething -> negotiate_more_services_for_concern(C, ConId, Type)
            ; % no candidates left
              close_or_fail_concern(C, ConId, Type)
            )
        ; close_or_fail_concern(C, ConId, Type)
        )
    ;   % none accepted yet: must try to map at least one
        negotiate_one_service_attempt(C, ConId, Type, DidSomething),
        ( DidSomething -> negotiate_more_services_for_concern(C, ConId, Type)
        ; close_or_fail_concern(C, ConId, Type)
        )
    ).

close_or_fail_concern(C, ConId, Type) :-
    ( has_any_accepted(C, ConId) ->
        set_concern_status(C, ConId, Type, pass),
        format("Concern ~w marked PASS.\n", [ConId])
    ;   set_concern_status(C, ConId, Type, fail),
        format("Concern ~w marked FAIL (no acceptable services).\n", [ConId])
    ).

has_any_accepted(C, ConId) :-
    concern_solution(C, ConId, _SId, accepted), !.

% Attempt to negotiate one service candidate (best profit-first).
% DidSomething = true if any negotiation attempt was made; false if no candidates.
negotiate_one_service_attempt(C, ConId, Type, DidSomething) :-
    select_best_candidate(C, ConId, Type, Candidate),
    !,
    DidSomething = true,
    negotiate_service(C, ConId, Type, Candidate).
negotiate_one_service_attempt(_C, _ConId, _Type, false).

% ============================================================
%  Candidate selection (profit-first, not cheapest)
% ============================================================

select_best_candidate(C, ConId, Type, candidate(SId, Class, Name, Price)) :-
    findall(Score-candidate(SId, Class, Name, Price),
        candidate_scored(C, ConId, Type, SId, Class, Name, Price, Score),
        Scored),
    Scored \= [],
    keysort(Scored, SortedAsc),
    reverse(SortedAsc, [ _BestScore-candidate(SId,Class,Name,Price) | _ ]).

candidate_scored(C, ConId, Type, SId, Class, Name, price(Min,Max), Score) :-
    % candidate must be allowed + not already decided
    allowed_concern_class(Type, Class),
    service(SId, Class, Name, price(Min,Max)),
    \+ concern_solution(C, ConId, SId, _),

    % derive negotiation parameters and initial offer/floor
    negotiation_numbers(C, Type, SId, Class, price(Min,Max), Offer0, Floor, Ceiling, _MaxRounds),

    % average cost if known
    ( service_cost(SId, cost(MinC,MaxC)) ->
        AvgCost is (MinC + MaxC) / 2
    ;   AvgCost is Min * 0.3  % fallback guess if no cost present
    ),
    ExpectedMargin is Offer0 - AvgCost,

    % acceptance bias from consumer persona (still profit-first)
    acceptance_bias(C, Bias),
    Score is ExpectedMargin * Bias * coverage_boost(C, Type).

acceptance_bias(C, Bias) :-
    ( profile_get(C, persona, price_sensitive) -> Bias = 0.75
    ; profile_get(C, persona, skeptical)       -> Bias = 0.85
    ; profile_get(C, persona, value_seeker)    -> Bias = 1.05
    ; profile_get(C, persona, impatient)       -> Bias = 0.90
    ; Bias = 1.0 ).

coverage_boost(_C, _Type) = 1.0.

% ============================================================
%  Negotiation engine (dynamic)
% ============================================================

% negotiation_numbers:
% - Offer0: starting offer
% - Floor: never go below max(cost_min + min_margin, list_max*floor_pct)
% - Ceiling: usually list_max (or list_max * 1.05)
% - MaxRounds: per class
negotiation_numbers(C, ConcernType, SId, Class, price(_Min, ListMax),
                    Offer0, Floor, Ceiling, MaxRounds) :-
    domain_module(Mod),
    default_params(Params0),
    ( Mod \= none, current_predicate(Mod:negotiation_params/2),
      call(Mod:negotiation_params(Class, Params1)) -> true ; Params1 = [] ),
    append(Params1, Params0, Params),

    param(anchor_pct, Params, AnchorPct),
    param(floor_pct,  Params, FloorPct),
    param(max_rounds, Params, MaxRounds),
    param(min_margin, Params, MinMargin),

    % starting offer influenced by urgency/pain
    urgency_factor(C, ConcernType, UF),
    Anchor is ListMax * AnchorPct * UF,
    Offer0 is round(min(ListMax * 1.10, Anchor)),
    Ceiling is round(ListMax * 1.10),

    ( service_cost(SId, cost(MinC,_MaxC)) -> true ; MinC is ListMax * 0.25 ),
    FloorByCost is MinC + MinMargin,
    FloorByPct  is ListMax * FloorPct,
    Floor is round(max(FloorByCost, FloorByPct)).

urgency_factor(C, _ConcernType, UF) :-
    ( profile_get(C, urgency, high) -> UF = 1.03
    ; profile_get(C, urgency, low)  -> UF = 0.98
    ; UF = 1.0 ).

default_params([
    anchor_pct=0.96,
    floor_pct=0.72,
    max_rounds=3,
    min_margin=120,
    concede_step_pct=0.06,
    split_bias=0.55,
    value_add_bonus=0.0
]).

param(Key, Params, Value) :-
    ( member(Key=Value, Params) -> true ; fail ).

% Main negotiation for one selected candidate service
negotiate_service(C, ConId, Type, candidate(SId, Class, Name, PriceRange)) :-
    format("\nProposed service: ~w (~w) ~w\n", [Name, Class, PriceRange]),
    negotiation_numbers(C, Type, SId, Class, PriceRange, Offer0, Floor, _Ceiling, MaxRounds),
    format("Starting offer: $~0f  (floor: $~0f, max rounds: ~w)\n", [Offer0, Floor, MaxRounds]),
    nego_loop(C, ConId, Type, SId, Class, Name, PriceRange, Offer0, Floor, 1, MaxRounds).

% Negotiation loop with dynamic tactics
nego_loop(C, ConId, Type, SId, Class, Name, PriceRange, Offer, Floor, Round, MaxRounds) :-
    record_turn(C, ConId, SId, Round, producer, offer(Offer)),
    producer_message(C, Type, SId, Class, Name, Offer, Round, Msg),
    format("Producer: ~w\n", [Msg]),
    consumer_prompt(Reply),
    handle_reply(C, ConId, Type, SId, Class, Name, PriceRange, Offer, Floor, Round, MaxRounds, Reply).

consumer_prompt(Reply) :-
    format("Consumer action: accept. | reject. | counter(Price). | ask(scope). | ask(value).\n> "),
    read(Reply).

handle_reply(C, ConId, Type, SId, Class, Name, PriceRange, Offer, Floor, Round, MaxRounds, accept) :-
    finalize_deal(C, ConId, SId, Offer, Round),
    assert_concern_solution(C, ConId, SId, accepted),
    format("✅ Accepted at $~0f for ~w.\n", [Offer, Name]),
    !.

handle_reply(C, ConId, _Type, SId, _Class, Name, _PriceRange, Offer, _Floor, Round, _MaxRounds, reject) :-
    record_turn(C, ConId, SId, Round, consumer, reject),
    assert_concern_solution(C, ConId, SId, rejected),
    format("❌ Rejected ~w.\n", [Name]),
    !.

handle_reply(C, ConId, Type, SId, Class, Name, PriceRange, Offer, Floor, Round, MaxRounds, counter(CounterPrice)) :-
    must_be(number, CounterPrice),
    record_turn(C, ConId, SId, Round, consumer, counter(CounterPrice)),
    dynamic_producer_response(C, ConId, Type, SId, Class, Name, PriceRange, Offer, Floor, Round, MaxRounds, CounterPrice).

handle_reply(C, ConId, _Type, SId, _Class, Name, _PriceRange, Offer, _Floor, Round, MaxRounds, ask(scope)) :-
    record_turn(C, ConId, SId, Round, consumer, ask(scope)),
    domain_module(Mod),
    ( Mod \= none, current_predicate(Mod:service_scope/2), call(Mod:service_scope(Name, Text)) ->
        format("Producer (scope): ~w\n", [Text])
    ;   format("Producer (scope): Standard delivery for ~w.\n", [Name])
    ),
    Round1 is min(MaxRounds, Round), % asking doesn't consume a round
    nego_loop(C, ConId, _Type, SId, _Class, Name, _PriceRange, Offer, _Floor, Round1, MaxRounds).

handle_reply(C, ConId, _Type, SId, _Class, Name, _PriceRange, Offer, _Floor, Round, MaxRounds, ask(value)) :-
    record_turn(C, ConId, SId, Round, consumer, ask(value)),
    domain_module(Mod),
    ( Mod \= none, current_predicate(Mod:service_value_pitch/2), call(Mod:service_value_pitch(Name, Text)) ->
        format("Producer (value): ~w\n", [Text])
    ;   format("Producer (value): This service directly addresses your concern.\n", [])
    ),
    Round1 is min(MaxRounds, Round),
    nego_loop(C, ConId, _Type, SId, _Class, Name, _PriceRange, Offer, _Floor, Round1, MaxRounds).

handle_reply(C, ConId, Type, SId, Class, Name, PriceRange, Offer, Floor, Round, MaxRounds, Other) :-
    record_turn(C, ConId, SId, Round, consumer, invalid(Other)),
    format("I didn't understand. Try: accept. reject. counter(650). ask(scope). ask(value).\n"),
    nego_loop(C, ConId, Type, SId, Class, Name, PriceRange, Offer, Floor, Round, MaxRounds).

% Producer responds dynamically to counter
dynamic_producer_response(C, ConId, Type, SId, Class, Name, PriceRange, Offer, Floor, Round, MaxRounds, Counter) :-
    ( Counter >= Offer ->
        % consumer countered higher or equal: accept immediately
        finalize_deal(C, ConId, SId, Counter, Round),
        assert_concern_solution(C, ConId, SId, accepted),
        format("✅ Accepted your counter at $~0f for ~w.\n", [Counter, Name])
    ; Round >= MaxRounds ->
        % last round: try final offer, bundle, or walk away
        final_round_strategy(C, ConId, Type, SId, Class, Name, PriceRange, Offer, Floor, Counter, Round, MaxRounds)
    ;   % choose dynamic tactic
        choose_tactic(C, Type, Class, Offer, Floor, Counter, Tactic),
        apply_tactic(C, ConId, Type, SId, Class, Name, PriceRange, Offer, Floor, Counter, Round, MaxRounds, Tactic)
    ).

choose_tactic(C, _Type, _Class, Offer, Floor, Counter, Tactic) :-
    % gap ratio determines firmness
    Gap is Offer - Counter,
    Span is max(1, Offer - Floor),
    Ratio is Gap / Span,
    ( profile_get(C, persona, price_sensitive), Ratio > 0.60 ->
        Tactic = bundle_offer
    ; Ratio > 0.75 ->
        Tactic = hold_or_switch
    ; Ratio > 0.40 ->
        Tactic = split_difference
    ; Ratio > 0.20 ->
        Tactic = concede_small
    ; Tactic = accept_counter ).

apply_tactic(C, ConId, Type, SId, Class, Name, PriceRange, Offer, Floor, Counter, Round, MaxRounds, accept_counter) :-
    % accept if counter is above floor and margin ok
    ( Counter >= Floor ->
        finalize_deal(C, ConId, SId, Counter, Round),
        assert_concern_solution(C, ConId, SId, accepted),
        format("✅ Accepted at $~0f for ~w.\n", [Counter, Name])
    ;   % below floor: counter back
        concede_formula(C, Class, Offer, Floor, Counter, NewOffer),
        Round1 is Round + 1,
        nego_loop(C, ConId, Type, SId, Class, Name, PriceRange, NewOffer, Floor, Round1, MaxRounds)
    ).

apply_tactic(C, ConId, Type, SId, Class, Name, PriceRange, Offer, Floor, Counter, Round, MaxRounds, split_difference) :-
    domain_module(Mod),
    default_params(DP),
    ( Mod \= none, current_predicate(Mod:negotiation_params/2), call(Mod:negotiation_params(Class, P1)) -> true ; P1 = [] ),
    append(P1, DP, Params),
    param(split_bias, Params, Bias),
    Mid is round((Offer * Bias) + (Counter * (1.0 - Bias))),
    NewOffer is max(Floor, Mid),
    record_turn(C, ConId, SId, Round, producer, tactic(split_difference(NewOffer))),
    Round1 is Round + 1,
    nego_loop(C, ConId, Type, SId, Class, Name, PriceRange, NewOffer, Floor, Round1, MaxRounds).

apply_tactic(C, ConId, Type, SId, Class, Name, PriceRange, Offer, Floor, Counter, Round, MaxRounds, concede_small) :-
    concede_formula(C, Class, Offer, Floor, Counter, NewOffer),
    record_turn(C, ConId, SId, Round, producer, tactic(concede_small(NewOffer))),
    Round1 is Round + 1,
    nego_loop(C, ConId, Type, SId, Class, Name, PriceRange, NewOffer, Floor, Round1, MaxRounds).

apply_tactic(C, ConId, Type, SId, Class, Name, PriceRange, Offer, Floor, Counter, Round, MaxRounds, hold_or_switch) :-
    % if there are other candidates for this concern, switch; else hold and counter modestly
    ( exists_alternative_candidate(C, ConId, Type, SId) ->
        record_turn(C, ConId, SId, Round, producer, tactic(switch_service)),
        assert_concern_solution(C, ConId, SId, rejected),
        format("Producer: This may not be the best fit at that price. Let's try a different option.\n", [])
    ;   concede_formula(C, Class, Offer, Floor, Counter, NewOffer),
        record_turn(C, ConId, SId, Round, producer, tactic(hold_line(NewOffer))),
        Round1 is Round + 1,
        nego_loop(C, ConId, Type, SId, Class, Name, PriceRange, NewOffer, Floor, Round1, MaxRounds)
    ).

apply_tactic(C, ConId, Type, SId, Class, Name, PriceRange, Offer, Floor, Counter, Round, MaxRounds, bundle_offer) :-
    % try a bundle to preserve revenue: propose offer_with_value or bundle with another service
    ( propose_bundle(C, Type, Name, BundleNames, BundlePrice, BundleText) ->
        record_turn(C, ConId, SId, Round, producer, tactic(bundle(BundleNames, BundlePrice))),
        format("Producer (bundle): ~w\n", [BundleText]),
        % Ask consumer about bundle
        format("Consumer action for bundle: accept. | reject. | counter(Price).\n> "),
        read(BundleReply),
        handle_bundle_reply(C, ConId, Type, Class, Name, PriceRange, Floor, Round, MaxRounds, BundleNames, BundlePrice, BundleReply)
    ;   % fallback: value-add without big discount
        value_add_offer(C, Type, Name, Offer, Floor, NewOffer, Text),
        record_turn(C, ConId, SId, Round, producer, tactic(value_add(NewOffer))),
        format("Producer (value-add): ~w\n", [Text]),
        Round1 is Round + 1,
        nego_loop(C, ConId, Type, SId, Class, Name, PriceRange, NewOffer, Floor, Round1, MaxRounds)
    ).

concede_formula(C, Class, Offer, Floor, Counter, NewOffer) :-
    domain_module(Mod),
    default_params(DP),
    ( Mod \= none, current_predicate(Mod:negotiation_params/2), call(Mod:negotiation_params(Class, P1)) -> true ; P1 = [] ),
    append(P1, DP, Params),
    param(concede_step_pct, Params, StepPct),
    % Move a percentage toward the counter, but never below floor
    Step is round((Offer - Counter) * StepPct),
    Proposed is Offer - max(1, Step),
    NewOffer is max(Floor, Proposed),
    % price-sensitive consumers may get slightly more movement
    ( profile_get(C, persona, price_sensitive) ->
        NewOffer2 is max(Floor, NewOffer - round((Offer - Floor) * 0.02))
    ; NewOffer2 = NewOffer ),
    NewOffer = NewOffer2.

exists_alternative_candidate(C, ConId, Type, CurrentSId) :-
    allowed_concern_class(Type, Class),
    service(OtherSId, Class, _Name, _Price),
    OtherSId \= CurrentSId,
    \+ concern_solution(C, ConId, OtherSId, _),
    !.

producer_message(C, Type, _SId, _Class, Name, Offer, Round, Msg) :-
    % Dynamic messaging based on persona/round
    ( Round =:= 1 ->
        Msg = ['For ',Name,' I can start this week. My offer is $',Offer,'.']
    ; profile_get(C, persona, skeptical) ->
        Msg = ['I hear you. At $',Offer,' we can still deliver properly and cover ',Type,'.']
    ; profile_get(C, persona, impatient) ->
        Msg = ['Quickest path: $',Offer,' and we begin immediately.']
    ; Msg = ['I can do $',Offer,' while keeping quality high.']
    ),
    atomic_list_concat(Msg, '', Msg).

final_round_strategy(C, ConId, Type, SId, Class, Name, PriceRange, Offer, Floor, Counter, Round, MaxRounds) :-
    % last attempt: if counter >= floor accept; else propose final offer, else switch/fail
    ( Counter >= Floor ->
        finalize_deal(C, ConId, SId, Counter, Round),
        assert_concern_solution(C, ConId, SId, accepted),
        format("✅ Final-round acceptance at $~0f for ~w.\n", [Counter, Name])
    ;   FinalOffer is Floor,
        record_turn(C, ConId, SId, Round, producer, final_offer(FinalOffer)),
        format("Producer: Final offer for ~w is $~0f (can’t go lower without cutting quality).\n", [Name, FinalOffer]),
        consumer_prompt(Reply),
        ( Reply = accept ->
            finalize_deal(C, ConId, SId, FinalOffer, MaxRounds),
            assert_concern_solution(C, ConId, SId, accepted),
            format("✅ Accepted at final offer $~0f.\n", [FinalOffer])
        ; Reply = counter(NewCounter), number(NewCounter), NewCounter >= Floor ->
            finalize_deal(C, ConId, SId, NewCounter, MaxRounds),
            assert_concern_solution(C, ConId, SId, accepted),
            format("✅ Accepted your counter $~0f.\n", [NewCounter])
        ;   assert_concern_solution(C, ConId, SId, rejected),
            format("❌ Could not agree on ~w.\n", [Name]),
            ( exists_alternative_candidate(C, ConId, Type, SId) ->
                format("Producer: We'll try another option.\n", [])
            ; true )
        )
    ).

value_add_offer(_C, _Type, ServiceName, Offer, Floor, NewOffer, Text) :-
    % Keep price firm, offer a small add-on
    NewOffer is max(Floor, Offer),
    atomic_list_concat([
        "If we keep it at $", NewOffer,
        ", I'll include a quick-win checklist and a 15-min handoff call for ", ServiceName, "."
    ], '', Text).

% ============================================================
% Bundle negotiation (dynamic)
% ============================================================

propose_bundle(_C, ConcernType, PrimaryServiceName, BundleNames, BundlePrice, BundleText) :-
    domain_module(Mod),
    Mod \= none,
    current_predicate(Mod:bundle_candidates/3),
    call(Mod:bundle_candidates(ConcernType, PrimaryServiceName, BundleNames)),
    BundleNames \= [],
    % Simple bundle pricing: sum of list-max for bundle services * (1 - discount)
    bundle_list_max_sum([PrimaryServiceName|BundleNames], SumMax),
    bundle_discount_pct(Mod, ConcernType, DiscPct),
    BundlePrice is round(SumMax * (1.0 - DiscPct)),
    atomic_list_concat([
        "Instead of discounting heavily, I can bundle: ",
        PrimaryServiceName, " + ", BundleNames,
        " for $", BundlePrice, ". It improves results and preserves quality."
    ], '', BundleText).

bundle_discount_pct(Mod, ConcernType, DiscPct) :-
    ( current_predicate(Mod:bundle_discount/2), call(Mod:bundle_discount(ConcernType, DiscPct)) ->
        true
    ; DiscPct = 0.12 ).

bundle_list_max_sum(ServiceNames, SumMax) :-
    findall(Max,
        ( member(N, ServiceNames),
          service(_SId, _Class, N, price(_Min, Max)) ),
        Maxes),
    sum_list(Maxes, SumMax).

handle_bundle_reply(C, ConId, Type, _Class, PrimaryName, _PriceRange, _Floor, Round, _MaxRounds, BundleNames, BundlePrice, accept) :-
    % Accept bundle means accept primary + bundle services; mark all deals at split prices
    format("✅ Bundle accepted at $~0f.\n", [BundlePrice]),
    accept_bundle(C, ConId, Type, PrimaryName, BundleNames, BundlePrice, Round).

handle_bundle_reply(C, ConId, Type, _Class, PrimaryName, _PriceRange, Floor, Round, MaxRounds, BundleNames, BundlePrice, counter(CounterPrice)) :-
    must_be(number, CounterPrice),
    record_turn(C, ConId, _Dummy, Round, consumer, bundle_counter(CounterPrice)),
    ( CounterPrice >= round(BundlePrice * 0.92) ->
        format("✅ Accepted bundle counter at $~0f.\n", [CounterPrice]),
        accept_bundle(C, ConId, Type, PrimaryName, BundleNames, CounterPrice, Round)
    ; Round >= MaxRounds ->
        format("❌ Bundle rejected (too low at last round).\n", []),
        true
    ;   NewOffer is max(Floor, round((BundlePrice + CounterPrice) / 2)),
        format("Producer: I can do the bundle at $~0f.\n", [NewOffer]),
        format("Consumer action for bundle: accept. | reject. | counter(Price).\n> "),
        read(Reply2),
        handle_bundle_reply(C, ConId, Type, _Class, PrimaryName, _PriceRange, Floor, Round, MaxRounds, BundleNames, NewOffer, Reply2)
    ).

handle_bundle_reply(_C, _ConId, _Type, _Class, _PrimaryName, _PriceRange, _Floor, _Round, _MaxRounds, _BundleNames, _BundlePrice, reject) :-
    format("❌ Bundle rejected.\n", []).

handle_bundle_reply(C, ConId, Type, Class, PrimaryName, PriceRange, Floor, Round, MaxRounds, BundleNames, BundlePrice, Other) :-
    format("I didn't understand bundle reply: ~w\n", [Other]),
    format("Try: accept. reject. counter(650).\n"),
    format("Consumer action for bundle: accept. | reject. | counter(Price).\n> "),
    read(Reply),
    handle_bundle_reply(C, ConId, Type, Class, PrimaryName, PriceRange, Floor, Round, MaxRounds, BundleNames, BundlePrice, Reply).

accept_bundle(C, ConId, _Type, PrimaryName, BundleNames, BundlePrice, Round) :-
    % Split bundle price proportionally to list-max
    append([PrimaryName], BundleNames, AllNames),
    findall(Name-Max,
        ( member(Name, AllNames),
          service(SId, _Cl, Name, price(_Min, Max)),
          Max > 0,
          % keep a temporary mapping of Name->SId in dynamic split below
          assertz(tmp_name_id(Name, SId))
        ),
        Pairs),
    findall(Max, member(_-Max, Pairs), Maxes),
    sum_list(Maxes, SumMax),
    forall(member(Name-Max, Pairs),
        (
            tmp_name_id(Name, SId),
            Portion is Max / SumMax,
            Final is round(BundlePrice * Portion),
            finalize_deal(C, ConId, SId, Final, Round),
            assert_concern_solution(C, ConId, SId, accepted)
        )),
    retractall(tmp_name_id(_,_)).

:- dynamic tmp_name_id/2.

% ============================================================
% Deal / Profit recording
% ============================================================

finalize_deal(C, ConId, SId, FinalPrice, Rounds) :-
    % Margin computed from cost if present
    ( service_cost(SId, cost(MinC,MaxC)) ->
        AvgCost is (MinC+MaxC)/2
    ; AvgCost is 0 ),
    Margin is round(FinalPrice - AvgCost),
    ( deal(C, ConId, SId, _, _, _) ->
        retract_deal(C, ConId, SId, _Final, _Margin, _Rounds)
    ; true ),
    assert_deal(C, ConId, SId, final(FinalPrice), margin(Margin), rounds(Rounds)).

record_turn(C, ConId, SId, Round, Speaker, Term) :-
    term_string(Term, Text),
    assert_nego_turn(C, ConId, SId, Round, Speaker, Text).

% ============================================================
% Console helper
% ============================================================

ask_yes_no(Prompt, Answer) :-
    format("~w", [Prompt]),
    read_line_to_string(user_input, S0),
    string_lower(S0, S),
    ( sub_string(S, 0, _, _, "y") -> Answer = yes
    ; Answer = no ).
