// Author: Surya Muntha
export function buildPriceItems(serviceIds, services, prices){
    return serviceIds.map(serviceId => {
        const service = services.find(s => s.id === serviceId);
        const priceRow = prices.find(p => p.serviceId === serviceId);
        return {
            serviceId,
            label: service?.label,
            price: priceRow?.price || 0,
            currency: priceRow?.currency || "USD"   
        };
    });
}

export function calculateTotal(priceItems){
    return priceItems.reduce((sum, item) => sum + item.price, 0);
}