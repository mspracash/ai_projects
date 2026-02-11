empty(L, X):-L=[].

not_empty(L,X):-L\=[].

head([H|T], X):- X=H.

tail([H|T], X):- X=T.

is_head([H|T],X, Y):-X=H.

is_tail([H|T], X, Y):-X=T.

is_last(L,X, Y):- last(L, X).

non_member(X,L):- \+ member(X,L).

uni_list([_|T]):-T=[].

bi_list([_|T]):- uni_list(T).

is_eq(L1, L2):- L1=L2.

same_head(L1,L2):- L1=[H|_], L2=[H|_].

same_head2([H|_],[H|_]).

one_distinct([_]).
one_distinct([H|T]):- T=[H|X], one_distinct([H|X]).

len([],0).
len([H|T],C):-  len(T, C1), C is C1+1.

second([], none).
second([_],none).
second([H1,H2|T],H2).

second_to_last([X,_],X).
second_to_last([_|T],X):- second_to_last(T,X).

Remove_First([],_,[]).
Remove_First([X|T],X,T).
Remove_First([H|T],X, [H|R]):- H\=X, Remove_First(T,X, R).

Remove_All([],_,[]).
Remove_All([H|T], X, R]):- H=X,Remove_All(T,H,R).
Remove_All([H|T], X, [H|R]):- H\=X, Remove_All(T,X,R).

replace([],_,_,[]).
replace([H|T], X, Y, [Y|R]):- H=X, replace(T, X, Y, R).
replace([H|T], X, Y, [H|R]):- H\=X, replace(T, X, Y, R).  





