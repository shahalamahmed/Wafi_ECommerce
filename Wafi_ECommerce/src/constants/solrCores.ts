// src/constants/solrCores.ts

export const SOLR_CORES = {
  PRODUCT_GROUPS: "product_groups",
  PRODUCT_CATEGORIES: "product_categories",
  PRODUCT_DETAILS: "product_details",
} as const;

export type SolrCore = typeof SOLR_CORES[keyof typeof SOLR_CORES];
