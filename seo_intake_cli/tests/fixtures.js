export const services = [
  { id: "seo_audit", label: "SEO Audit" },
  { id: "technical_audit", label: "Technical SEO Audit" }
];

export const prices = [
  { serviceId: "seo_audit", price: 500, currency: "USD" },
  { serviceId: "technical_audit", price: 600, currency: "USD" }
];

export const concernServiceMap = [
  {
    concernId: "seo.visibility.rankings_down",
    serviceIds: ["seo_audit"]
  },
  {
    concernId: "seo.technical.general_technical_issue",
    serviceIds: ["technical_audit"]
  }
];

export const concernRelations = [];

export const concernTree = {
  id: "seo",
  label: "SEO",
  children: [
    {
      id: "seo.visibility",
      label: "Visibility",
      children: [
        {
          id: "seo.visibility.rankings_down",
          label: "Rankings down",
          atomicSentence: "Keyword rankings have dropped"
        }
      ]
    },
    {
      id: "seo.technical",
      label: "Technical",
      children: [
        {
          id: "seo.technical.general_technical_issue",
          label: "General technical issue",
          atomicSentence: "Technical problems detected"
        }
      ]
    }
  ]
};