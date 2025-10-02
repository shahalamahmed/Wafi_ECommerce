export interface ProductCategory {
  id: string;
  name: string;           // frontend-friendly
  slug: string;
  isActive: boolean;
  productGroupSlug: string;
  productGroupName: string;
  displayOrder?: number;
  discountPercent?: number;
  productGroupImageUrl?: string;
  productGroupThemeUrl?: string;
}
