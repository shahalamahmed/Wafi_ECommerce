import { SOLR_CORES } from "../constants/solrCores";
import { querySolr } from "../util/solr";

export interface PaginationParams {
    page?: number;
    pageSize?: number;
}

export interface PaginatedResult<T> {
    data: T[];
    pagination: {
        total: number;
        pageSize: number;
        currentPage: number;
        totalPages: number;
        hasNextPage: boolean;
        hasPrevPage: boolean;
    };
}

export class SolrService {

    static async getProductGroups(params?: PaginationParams): Promise<PaginatedResult<any> | null> {
        try {
            const result = await querySolr<any>({
                core: SOLR_CORES.PRODUCT_GROUPS,
                query: '*:*',
                pageSize: params?.pageSize || 10,
                page: params?.page || 1,
            });
            return {
                data: result.docs as any[],
                pagination: {
                    total: result.total,
                    pageSize: result.pageSize,
                    currentPage: result.currentPage,
                    totalPages: result.totalPages,
                    hasNextPage: result.hasNextPage,
                    hasPrevPage: result.hasPrevPage,
                }
            };
        } catch (error) {
            console.error('Error fetching product groups:', error);
            return null;
        }
    }
} 