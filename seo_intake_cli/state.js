export const initialState = {
    phase: "intake",

    contactName: '',
    phone: '',
    email: '',

    businessName: '',
    businessAddress: '',
    businessDescription: '',

    currentConcern: "",
    isDiscoveryDone: false,

    normalizedConcern: null,
    currentAtomicConcerns: [],

    concernMessages:[],
    atomicConcernCandidates: [],
    resolvedConcernIds: [],

    matchedServiceIds: [],
    priceItems: [],

    totalCost:0
};

export const stateChannels = Object.fromEntries(
  Object.keys(initialState).map((k) => [k, null])
);