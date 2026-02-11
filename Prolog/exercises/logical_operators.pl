color(X, C):- C=X.

a_num(X, C):- (X<0; X>10) -> C=true; C=false.

not_empty(L):- \+ L=[].



