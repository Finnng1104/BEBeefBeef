export function getSortQuery(sort: string) {
  switch (sort) {
    case 'nameAZ':
      return { name: 1 };
    case 'nameZA':
      return { name: -1 };
    case 'priceLow':
      return { price: 1 };
    case 'priceHigh':
      return { price: -1 };
    case 'discountLow':
      return { discount_price: 1 };
    case 'discountHigh':
      return { discount_price: -1 };
    case 'newest':
      return { isDishNew: -1 };
    case 'relevance':
      return { _id: -1 };
    case 'highestRated':
      return { average_rating: -1 };
    case 'lowestRated':
      return { average_rating: 1 };
    case 'mostViewed':
      return { views: -1 };
    case 'leastViews':
      return { views: 1 };
    case 'mostOrdered':
      return { ordered_count: -1 };
    case 'leastOrdered':
      return { ordered_count: 1 };
    case 'mostFavorite':
      return { favorites_count: -1 };
    case 'recommendDishes':
      return { isRecommend: -1 };
    case 'stockLow':
      return { countInStock: -1 };
    case 'stockHigh':
      return { countInStock: 1 };
    case 'categoryAZ':
      return { categories: 1 };
    case 'categoryZA':
      return { categories: -1 };
    case 'statusAZ':
      return { status: 1 };
    case 'statusZA':
      return { status: -1 };
    case 'deletedAtOld':
      return { deletedAt: 1 };
    case 'deletedAtNew':
      return { deletedAt: -1 };
    default:
      return { createdAt: -1 };
  }
}
