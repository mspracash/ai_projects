export function mapServicesFromConcerns(resolvedConcernIds, concernServiceMap) {

    const matchedServiceIds = [];
    for(const concernId of resolvedConcernIds){
        const mapping = concernServiceMap.find(m => m.concernId === concernId);
        if(mapping){
            matchedServiceIds.push(...mapping.serviceIds);
        }
    }

    return [...new Set(matchedServiceIds)]; // Return unique service IDs
}
