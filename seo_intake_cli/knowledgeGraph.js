export class KnowledgeGraph {
  constructor(services, prices, concernServiceMap, concernRelations, concernTree) {
    this.servicesById = new Map(services.map((s) => [s.id, s]));
    this.pricesByServiceId = new Map(prices.map((p) => [p.serviceId, p]));
    this.servicesByConcernId = new Map(
      concernServiceMap.map((m) => [m.concernId, m.serviceIds])
    );
    this.relatedConcernsById = new Map();

    for (const rel of concernRelations) {
      const fromId = rel.fromConcernId;
      const toId = rel.toConcernId;

      if (!this.relatedConcernsById.has(fromId)) {
        this.relatedConcernsById.set(fromId, []);
      }

      this.relatedConcernsById.get(fromId).push(toId);
    }

    this.treeNodesById = new Map();
    this.childrenById = new Map();
    this.parentById = new Map();

    this.#loadTree(concernTree, null);
  }

  #loadTree(node, parentId) {
    this.treeNodesById.set(node.id, node);

    if (parentId) {
      this.parentById.set(node.id, parentId);
    }

    const children = node.children || [];
    this.childrenById.set(
      node.id,
      children.map((child) => child.id)
    );

    for (const child of children) {
      this.#loadTree(child, node.id);
    }
  }

  getConcern(id) {
    return this.treeNodesById.get(id) || null;
  }

  getChildren(id) {
    const childIds = this.childrenById.get(id) || [];
    return childIds
      .map((childId) => this.treeNodesById.get(childId))
      .filter(Boolean);
  }

  getParent(id) {
    const parentId = this.parentById.get(id);
    return parentId ? this.treeNodesById.get(parentId) : null;
  }

  isLeaf(id) {
    return (this.childrenById.get(id) || []).length === 0;
  }

  getPath(id) {
    const path = [];
    let currentId = id;

    while (currentId) {
      path.unshift(currentId);
      currentId = this.parentById.get(currentId);
    }

    return path;
  }

  getService(id) {
    return this.servicesById.get(id) || null;
  }

  getPriceForService(serviceId) {
    return this.pricesByServiceId.get(serviceId) || null;
  }

  getServicesForConcern(concernId) {
    return this.servicesByConcernId.get(concernId) || [];
  }

  getRelatedConcerns(concernId) {
    return this.relatedConcernsById.get(concernId) || [];
  }

  getConcernsForService(serviceId) {
    const concerns = [];

    for (const [concernId, serviceIds] of this.servicesByConcernId.entries()) {
      if (serviceIds.includes(serviceId)) {
        concerns.push(concernId);
      }
    }

    return concerns;
  }

  getPriceItemsForServices(serviceIds) {
    return serviceIds.map((serviceId) => {
      const service = this.getService(serviceId);
      const price = this.getPriceForService(serviceId);

      if (!service || !price) {
        throw new Error(`Missing service or price for serviceId=${serviceId}`);
      }

      return {
        serviceId,
        label: service.label,
        price: price.price,
        currency: price.currency
      };
    });
  }
}