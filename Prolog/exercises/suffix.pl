suffix(_,S):- S=[].
suffix(L,S):- L=S.
suffix(L,S):- L=[H|T],suffix(T,S).