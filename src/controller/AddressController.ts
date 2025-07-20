import { Request, Response } from 'express';
import AddressService from '../services/AddressService';
import { CreateAddressSchema } from '../schemas/address.schema';
import mongoose from 'mongoose';
import axios from 'axios';
import https from 'https';
import { Address } from '../models/AddressModel';
import { IUser } from '../models/UserModel';
import { Types } from 'mongoose';

class AddressController {
  async createAddress(req: Request, res: Response): Promise<void> {
    try {
      const parseResult = CreateAddressSchema.safeParse(req.body);
      if (!parseResult.success) {
        const errors = parseResult.error.format();
        console.error('❌ BE: Lỗi validate dữ liệu tạo địa chỉ:', errors);

        res.status(400).json({ success: false, message: 'Validation failed', errors });
        return;
      }

      const input = parseResult.data;
      const userId = (req.user as IUser).id as Types.ObjectId;

      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized: No user_id in token' });
        return;
      }

      // ✅ Giới hạn tối đa 5 địa chỉ
      const addressCount = await Address.countDocuments({ user_id: userId });
      if (addressCount >= 5) {
        res.status(403).json({
          success: false,
          message: 'Bạn chỉ có thể lưu tối đa 5 địa chỉ.',
        });
        return;
      }

      // ✅ Kiểm tra trùng địa chỉ
      const isExisted = await Address.findOne({
        user_id: userId,
        street_address: input.street_address,
        ward: input.ward,
        district: input.district,
        province: input.province,
      });

      if (isExisted) {
        res.status(409).json({
          success: false,
          message: 'Địa chỉ này đã tồn tại.',
        });
        return;
      }

      console.log('📥 Input address:', input);

      const address = await AddressService.createAddress({
        ...input,
        user_id: userId,
      });

      console.log('📦 Address after service:', address);

      res.status(201).json({
        success: true,
        message: 'Địa chỉ đã được chuẩn hóa và lưu thành công',
        data: {
          id: address._id,
          full_name: address.full_name,
          phone: address.phone,
          province: address.province,
          district: address.district,
          ward: address.ward,
          street_address: address.street_address,
          lat: address.lat,
          lon: address.lon,
          is_default: address.is_default,
          address_type: address.address_type,
        },
      });
    } catch (error: any) {
      if (error.response?.data) {
        console.error('❌ Lỗi từ server:', error.response.data);
      } else {
        console.error('❌ Lỗi không rõ:', error);
      }

      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error',
      });
    }
  }

  async getAllAddresses(req: Request, res: Response): Promise<void> {
    try {
      const user_id = (req.user as IUser).id as Types.ObjectId;

      if (!user_id) {
        res.status(401).json({ success: false, message: 'Unauthorized: No user_id in token' });
        return;
      }
      const addresses = await AddressService.getAllAddresses(user_id.toString());
      res.status(200).json({
        success: true,
        message: 'Addresses retrieved successfully',
        data: addresses,
        total: addresses.length,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Error fetching addresses',
      });
    }
  }

  async updateAddress(req: Request, res: Response): Promise<void> {
    try {
      const addressId = req.params.id;
      const parseResult = CreateAddressSchema._def.schema.partial().safeParse(req.body);

      if (!parseResult.success) {
        const errors = parseResult.error.format();
        res.status(400).json({ success: false, message: 'Validation failed', errors });
        return;
      }

      const userId = (req.user as IUser).id as Types.ObjectId;
      const updated = await AddressService.updateAddress(
        addressId,
        parseResult.data,
        userId.toString(),
      );

      res.status(200).json({
        success: true,
        message: 'Address updated successfully',
        data: updated,
      });
    } catch (error: any) {
      console.error('Update error:', error);
      res.status(500).json({ success: false, message: error.message || 'Internal server error' });
    }
  }

  async deleteAddress(req: Request, res: Response): Promise<void> {
    try {
      const addressId = req.params.id;

      if (!mongoose.Types.ObjectId.isValid(addressId)) {
        res.status(400).json({ success: false, message: 'Invalid address ID format' });
        return;
      }

      const deleted = await AddressService.deleteAddress(addressId);

      if (!deleted) {
        res.status(404).json({ success: false, message: 'Address not found' });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Address deleted successfully',
        deletedId: addressId,
      });
    } catch (error: any) {
      console.error('Delete error:', error);
      res.status(500).json({ success: false, message: error.message || 'Internal server error' });
    }
  }

  async setDefaultAddress(req: Request, res: Response): Promise<void> {
    try {
      const addressId = req.params.id;
      const userId = (req.user as IUser).id as Types.ObjectId;

      if (!userId) {
        res.status(403).json({ success: false, message: 'Forbidden: User not authenticated' });
        return;
      }

      if (!mongoose.Types.ObjectId.isValid(addressId)) {
        res.status(400).json({ success: false, message: 'Invalid address ID format' });
        return;
      }

      const updatedAddress = await AddressService.setDefaultAddress(addressId, userId.toString());

      if (!updatedAddress) {
        res.status(404).json({ success: false, message: 'Address not found or not owned by user' });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Default address set successfully',
        data: updatedAddress,
      });
    } catch (error: any) {
      console.error('Set default address error:', error);
      res.status(500).json({ success: false, message: error.message || 'Internal server error' });
    }
  }
  async searchAddress(req: Request, res: Response): Promise<void> {
    const query = req.query.q as string;
    const limit = req.query.limit || 5;
    const agent = new https.Agent({ family: 4 });

    if (!query || query.split(',').length < 3) {
      res.status(400).json({ error: 'Địa chỉ chưa đầy đủ (ít nhất cần có đường, phường, quận)' });
      return;
    }

    try {
      const response = await axios.get('https://nominatim.openstreetmap.org/search', {
        params: {
          q: query,
          format: 'json',
          addressdetails: 1,
          countrycodes: 'vn',
          limit,
          bounded: 1,
          viewbox: '106.3,10.95,107.0,10.6',
        },
        headers: {
          'User-Agent': 'beefbeef-restaurant/1.0 (nguyenngocmy1311@gmail.com)',
          'Accept-Language': 'vi',
        },
        timeout: 10000,
        httpsAgent: agent,
      });

      res.json(response.data);
    } catch (error) {
      console.error('Nominatim API error:', error);
      res.status(500).json({ error: 'Failed to fetch from Nominatim' });
    }
  }
}

export default new AddressController();
