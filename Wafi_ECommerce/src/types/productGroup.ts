export interface ProductGroup {
  id: string;
  name: string;         
  slug: string;
  iconUrl?: string;
  isActive: boolean;
  displayOrder: number;
  discountPercent: number;
  isWithAllProduct?: boolean;
}
