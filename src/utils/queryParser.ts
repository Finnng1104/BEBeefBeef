export function parseFoodQueryParams(query: any) {
  return {
    page: Number(query.page) || 1,
    limit: Number(query.limit) || 12,
    sort: query.sort || 'newest',
    search: query.search || '',
    category: query.category || '',
    priceMin: query.priceMin !== undefined ? Number(query.priceMin) : undefined,
    priceMax: query.priceMax !== undefined ? Number(query.priceMax) : undefined,
    discountMin: query.discountMin !== undefined ? Number(query.discountMin) : undefined,
    discountMax: query.discountMax !== undefined ? Number(query.discountMax) : undefined,
    stockMin: query.stockMin !== undefined ? Number(query.stockMin) : undefined,
    stockMax: query.stockMax !== undefined ? Number(query.stockMax) : undefined,
    viewsMin: query.viewsMin !== undefined ? Number(query.viewsMin) : undefined,
    viewsMax: query.viewsMax !== undefined ? Number(query.viewsMax) : undefined,
    orderedMin: query.orderedMin !== undefined ? Number(query.orderedMin) : undefined,
    orderedMax: query.orderedMax !== undefined ? Number(query.orderedMax) : undefined,
    ratingMin: query.ratingMin !== undefined ? Number(query.ratingMin) : undefined,
    ratingMax: query.ratingMax !== undefined ? Number(query.ratingMax) : undefined,
    status: query.status ? query.status.toString() : undefined,
  };
}
