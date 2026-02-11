parent(john,mary).
parent(johh, peter).
parent(mary,alice).
parent(mary,bob).
parent(peter,chris).

grandparent(X,Y):- parent(X,Z), parent(Z,Y).
sibling(X,Y):- parent(Z, X), parent(Z, Y), X\=Y.
ancestor(X,Y):- parent(X,Y).
ancestor(X,Y):- parent(X,Z),ancestor(Z,Y).

first([H|_],X):-X=H.