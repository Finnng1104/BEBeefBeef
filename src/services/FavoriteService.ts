import { Favorite } from '../models/FavoriteModel';
import { Dish } from '../models/DishModel'; // nhớ import đúng path

export const FavoriteService = {
  async addToFavorite(userId: string, dishId: string) {
    const existing = await Favorite.findOne({ userId, dishId });
    if (existing) return existing;

    const favorite = await Favorite.create({ userId, dishId });
    await Dish.findByIdAndUpdate(dishId, { $inc: { favorites_count: 1 } });

    return favorite;
  },

  async removeFromFavorite(userId: string, dishId: string) {
    const favorite = await Favorite.findOneAndDelete({ userId, dishId });
    if (favorite) {
      await Dish.findByIdAndUpdate(dishId, { $inc: { favorites_count: -1 } });
    }
    return favorite;
  },

  async getFavorites(userId: string) {
    return await Favorite.find({ userId }).populate({
      path: 'dishId',
      populate: {
        path: 'categories',
        model: 'categories',
      },
    });
  },

  async removeFromFavoriteById(favoriteId: string) {
    const favorite = await Favorite.findByIdAndDelete(favoriteId);
    if (favorite) {
      await Dish.findByIdAndUpdate(favorite.dishId, {
        $inc: { favorites_count: -1 },
      });
    }
    return favorite;
  },

  isFavorite(userId: string, dishId: string) {
    return Favorite.findOne({ userId, dishId });
  },
};
