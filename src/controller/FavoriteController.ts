import { Request, Response } from 'express';
import { FavoriteService } from '../services/FavoriteService';
import { IUser } from '../models/UserModel';

export const FavoriteController = {
  add: async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req.user as IUser).id?.toString();
      const { dishId } = req.body;

      if (!userId || !dishId) {
        res.status(400).json({ message: 'Missing userId or dishId' });
        return;
      }

      const existing = await FavoriteService.isFavorite(userId, dishId);
      if (existing) {
        res.status(409).json({ message: 'Dish already in favorite' });
        return;
      }

      const favorite = await FavoriteService.addToFavorite(userId, dishId);
      res.status(201).json({ success: true, data: favorite });
    } catch (error) {
      console.error('Add favorite error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  remove: async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req.user as IUser).id?.toString();
      const { id: favoriteId } = req.params;

      if (!userId || !favoriteId) {
        res.status(400).json({ message: 'Missing userId or favoriteId' });
        return;
      }

      const deleted = await FavoriteService.removeFromFavoriteById(favoriteId);
      if (!deleted) {
        res.status(404).json({ message: 'Favorite not found' });
        return;
      }

      res.json({ success: true, message: 'Removed from favorites' });
    } catch (error) {
      console.error('Remove favorite error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  list: async (req: Request, res: Response) => {
    try {
      const userId = (req.user as IUser).id?.toString();
      const favorites = await FavoriteService.getFavorites(userId);

      res.json({ success: true, data: favorites });
    } catch (error) {
      console.error('List favorite error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },
};
