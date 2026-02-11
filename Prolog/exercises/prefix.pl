prefix(_,P):- P=[].
prefix(L,P):- L=[H|T],prefix(T,X), P=[H|X].