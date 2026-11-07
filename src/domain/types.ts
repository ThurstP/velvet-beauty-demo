export interface Variant {
  readonly id: string;
  readonly name: string;
  readonly stock: number;
}

export interface Product {
  readonly id: string;
  readonly name: string;
  readonly brand: string;
  readonly description: string;
  readonly priceCop: number;
  readonly provenance: string;
  readonly variants: readonly Variant[];
}

export type Catalog = readonly Product[];

export interface CartItem {
  readonly productId: string;
  readonly variantId: string;
  readonly productName: string;
  readonly variantName: string;
  readonly unitPriceCop: number;
  readonly quantity: 1;
}

export interface CartState {
  readonly item: CartItem | null;
}
