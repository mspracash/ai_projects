/*remove first occurence of an element */
removef([],_,[]).
removef([H|T],X,T).
removef([H|T],X, [H|R]):- H\=X, removef(T,X, R).

/*remove all occurences of an element */
remove_all([],_,[]).
remove_all([H|T], X, R):- H=X,remove_all(T,H,R).
remove_all([H|T], X, [H|R]):- H\=X, remove_all(T,X,R).

/*replace an element */
replace([],_,_,[]).
replace([H|T], X, Y, [Y|R]):- H=X, replace(T, X, Y, R).
replace([H|T], X, Y, [H|R]):- H\=X, replace(T, X, Y, R).

/*duplicate every element */
dupe_all([],[]).
dupe_all([H|T], [H,H|R]):-dupe_all(T, R).

/*drop first element */
dropf([],[]).
dropf([_|T],T).

/*drop last element */
dropl([_],[]).
dropl([H|T],[H|R]):-dropl(T,R).

/*insert element at the first */
insertf(L,X,[X|L]).

/*insert element at the end */
insertl([],X,[X]).
insertl([H|T],X,[H|R]):-insertl(T,X,R).

/*reverse a list*/
reverse([],X,[X]).
reverse([_],X,[_,X]).
reverse([H|T],X,R):- X=H, reverse(T,X,R).