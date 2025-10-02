
const SOLR_URL = process.env.SOLR_URL;
const SOLR_USERNAME = process.env.SOLR_USERNAME;
const SOLR_PASSWORD = process.env.SOLR_PASSWORD;

// Create base64 encoded credentials for Basic Auth
export const getAuthHeader = () => {
  if (!SOLR_USERNAME || !SOLR_PASSWORD) {
    throw new Error('Solr credentials are not configured');
  }
  const credentials = Buffer.from(`${SOLR_USERNAME}:${SOLR_PASSWORD}`).toString('base64');
  return `Basic ${credentials}`;
};

export interface SolrQueryResult<T = any> {
  docs: T[];
  total: number;
  pageSize: number;
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  facets?: Record<string, any>;
  groupedDocs?: Array<{ groupValue: string; docs: T[] }>;
}

// Generic version with multiple core support
export const querySolr = async <T = any>(params: {
  core: string; // core name
  query?: string;
  additionalParams?: Record<string, string>;
  enableFacets?: boolean;
  pageSize?: number;
  page?: number; // Page number (0-based)
  offset?: number; // Alternative to page - direct offset
  facets?: string[];
  revalidate?: number;
  tags?: string[];
}): Promise<SolrQueryResult<T>> => {
  const {
    core,
    query = '*:*',
    additionalParams = {},
    enableFacets = false,
    pageSize = 20,
    page = 1,
    offset,
    facets,
    revalidate = 3600,
    tags = ['solr'],
  } = params;

  if (!core) throw new Error('Solr core is required');

  const searchParams = new URLSearchParams();
  searchParams.set('q', query);
  searchParams.set('rows', pageSize.toString());
  searchParams.set('wt', 'json');

  // Calculate start/offset for pagination
  const startOffset = offset !== undefined ? offset : (page - 1) * pageSize;
  searchParams.set('start', startOffset.toString());

  Object.entries(additionalParams).forEach(([key, value]) => {
    searchParams.set(key, value);
  });

  const isServer = typeof window === 'undefined';
  const solrUrl = isServer
    ? `${SOLR_URL}/${core}/select?${searchParams.toString()}`
    : `/api/solr/${core}?${searchParams.toString()}`;

  try {
    const fetchInit: RequestInit & { next?: { revalidate: number; tags: string[] } } = isServer
      ? {
          headers: {
            Authorization: getAuthHeader(),
            'Content-Type': 'application/json',
          },
          next: { revalidate, tags },
        }
      : {
          headers: {
            'Content-Type': 'application/json',
          },
        };

    const response = await fetch(solrUrl, fetchInit);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Solr error response:", errorText);
      throw new Error(`Solr request failed with status ${response.status}. Check console for full error.`);
    }

    const result = await response.json();
    const docs = result.response?.docs || [];
    const total = result.response?.numFound || 0;
    const totalPages = Math.ceil(total / pageSize);
    const currentPage = Math.floor(startOffset / pageSize);

    return {
      docs,
      total,
      pageSize,
      currentPage,
      totalPages,
      hasNextPage: currentPage < totalPages - 1,
      hasPrevPage: currentPage > 0,
    };
  } catch (error: any) {
    console.error("Fetch Solr failed:", error.message || error);
    throw error;
  }
};

export const querySolrForGrouping = async <T = any>(params: {
  core: string; // core name
  query?: string;
  additionalParams?: Record<string, string>;
  enableFacets?: boolean;
  pageSize?: number;
  page?: number; // Page number (0-based)
  offset?: number; // Alternative to page - direct offset
  facets?: string[];
  revalidate?: number;
  tags?: string[];
  group?: boolean;
  groupField?: string;
  groupLimit?: number;
  groupSort?: string;
}): Promise<SolrQueryResult<T>> => {
  const {
    core,
    query = '*:*',
    additionalParams = {},
    enableFacets = false,
    pageSize = 20,
    page = 1,
    offset,
    facets,
    revalidate = 3600,
    tags = ['solr'],
    group = false,
    groupField,
    groupLimit,
    groupSort
  } = params;

  if (!core) throw new Error('Solr core is required');

  const searchParams = new URLSearchParams();
  searchParams.set('q', query);
  searchParams.set('rows', pageSize.toString());
  searchParams.set('wt', 'json');

  // Calculate start/offset for pagination
  const startOffset = offset !== undefined ? offset : (page - 1) * pageSize;
  searchParams.set('start', startOffset.toString());

  // Add grouping parameters if enabled
  if (group) {
    searchParams.set('group', 'true');
    if (groupField) searchParams.set('group.field', groupField);
    if (groupLimit) searchParams.set('group.limit', groupLimit.toString());
    if (groupSort) searchParams.set('group.sort', groupSort);
  }

  Object.entries(additionalParams).forEach(([key, value]) => {
    searchParams.set(key, value);
  });

  const isServer = typeof window === 'undefined';
  const solrUrl = isServer
    ? `${SOLR_URL}/${core}/select?${searchParams.toString()}`
    : `/api/solr/${core}?${searchParams.toString()}`;

  try {
    const fetchInit: RequestInit & { next?: { revalidate: number; tags: string[] } } = isServer
      ? {
          headers: {
            Authorization: getAuthHeader(),
            'Content-Type': 'application/json',
          },
          next: { revalidate, tags },
        }
      : {
          headers: {
            'Content-Type': 'application/json',
          },
        };

    const response = await fetch(solrUrl, fetchInit);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Solr error response:", errorText);
      throw new Error(`Solr request failed with status ${response.status}. Check console for full error.`);
    }

    const result = await response.json();
    const docs = result.grouped.parent_name_s.groups;
    const total = result.grouped.parent_name_s.matches || 0;
    const totalPages = Math.ceil(total / pageSize);
    const currentPage = Math.floor(startOffset / pageSize);

    return {
      docs,
      total,
      pageSize,
      currentPage,
      totalPages,
      hasNextPage: currentPage < totalPages - 1,
      hasPrevPage: currentPage > 0,
    };
  } catch (error: any) {
    console.error("Fetch Solr failed:", error.message || error);
    throw error;
  }
};
