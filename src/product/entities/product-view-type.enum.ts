export enum ProductViewType {
  ALL = 'ALL',
  POPULAR = 'POPULAR',
  ENDING_SOON = 'ENDING_SOON',
  LATEST = 'LATEST',
  MY_PRODUCTS = 'MY_PRODUCTS',
  MY_BIDS = 'MY_BIDS',
}

export function requiresAuth(viewType: ProductViewType): boolean {
  return viewType === ProductViewType.MY_PRODUCTS || viewType === ProductViewType.MY_BIDS;
}
