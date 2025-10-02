import { SOLR_CORES } from "../constants/solrCores";
import { querySolr } from "../util/solr";
import type { ProductGroup } from "../types/productGroup";
import type { ProductCategory } from "../types/productCategory";

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

    static async getProductGroups(params?: PaginationParams): Promise<PaginatedResult<ProductGroup> | null> {
  
        try {
            const result = await querySolr<any>({
                core: SOLR_CORES.PRODUCT_GROUPS,
                query: '*:*',
                pageSize: params?.pageSize || 10,
                page: params?.page || 1,
            });

            return {
                data: result.docs.map((doc: any) => ({
                    id: doc.id,
                    name: doc.name_s,
                    slug: doc.slug_s,
                    iconUrl: doc.icon_url_s,
                    isActive: doc.is_active_b,
                    displayOrder: doc.display_order_i,
                    discountPercent: doc.discount_percent_d,
                    isWithAllProduct: doc.is_with_all_product_b,
                })) as ProductGroup[],
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

    static async getCategoriesByProductGroup(groupSlug: string, params?: PaginationParams): Promise<PaginatedResult<ProductCategory> | null> {
        try {
            const result = await querySolr<any>({
                core: SOLR_CORES.PRODUCT_CATEGORIES,
                query: `product_group_slug_s:${groupSlug}`,
                pageSize: params?.pageSize || 10,
                page: params?.page || 1,
            });

            return {
                data: result.docs.map((doc: any) => ({
                    id: doc.id,
                    name: doc.name_s,
                    slug: doc.slug_s,
                    isActive: doc.is_active_b,
                    productGroupSlug: doc.product_group_slug_s,
                    productGroupName: doc.product_group_name_s,
                    displayOrder: doc.display_order_i,
                    discountPercent: doc.discount_percent_d,
                    productGroupImageUrl: doc.icon_url_s,
                    productGroupThemeUrl: doc.product_group_theme_url_s,
                })) as ProductCategory[],
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
            console.error('Error fetching categories:', error);
            return null;
        }
    }
}
