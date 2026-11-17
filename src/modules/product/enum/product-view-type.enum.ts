export enum ProductViewType {
  ALL = 'ALL',
  BIDDING = 'BIDDING',
  BID_CLOSED = 'BID_CLOSED',
  POPULAR = 'POPULAR',
  ENDING_SOON = 'ENDING_SOON',
  LATEST = 'LATEST',
  MY_PRODUCTS = 'MY_PRODUCTS',
  MY_ACTIVE_BIDS = 'MY_ACTIVE_BIDS',
  MY_BIDS = 'MY_BIDS',
}

export function requiresAuth(viewType: ProductViewType): boolean {
  return (
    viewType === ProductViewType.MY_PRODUCTS ||
    viewType === ProductViewType.MY_ACTIVE_BIDS ||
    viewType === ProductViewType.MY_BIDS
  );
}
