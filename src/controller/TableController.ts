import { Request, Response } from 'express';
import TableService from '../services/TableService';

export const getAllTables = async (req: Request, res: Response): Promise<void> => {
  try {
    const onlyAllowBooking = req.query.onlyAllowBooking === 'true';
    let tables = await TableService.getAllTables();
    if (onlyAllowBooking) {
      tables = tables.filter((t: any) => t.allowBooking);
    }
    res.json({ success: true, data: tables });
  } catch (error) {
    console.error('Get all tables error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getTablesByDateTime = async (req: Request, res: Response): Promise<void> => {
  try {
    const { date, time, onlyAllowBooking } = req.query;

    if (!date || !time) {
      res.status(400).json({
        message: 'Date and time parameters are required',
      });
      return;
    }

    let tables = await TableService.getTablesByDateTime(date as string, time as string);
    if (onlyAllowBooking === 'true') {
      tables = tables.filter((t: any) => t.allowBooking);
    }
    res.json({ success: true, data: tables });
  } catch (error) {
    console.error('Get tables by date time error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getTableByCode = async (req: Request, res: Response): Promise<void> => {
  try {
    const table = await TableService.getTableByCode(req.params.code);
    if (!table) {
      res.status(404).json({ message: 'Table not found' });
      return;
    }
    res.json({ success: true, data: table });
  } catch (error) {
    console.error('Get table by code error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const createTable = async (req: Request, res: Response): Promise<void> => {
  try {
    const table = await TableService.createTable(req.body);
    res.status(201).json({ success: true, data: table });
  } catch (error) {
    console.error('Create table error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateTable = async (req: Request, res: Response): Promise<void> => {
  try {
    const updated = await TableService.updateTable(req.params.code, req.body);
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Update table error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const toggleTableAvailability = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await TableService.toggleTableAvailability(req.params.code);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Toggle table availability error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteTable = async (req: Request, res: Response): Promise<void> => {
  try {
    const deleted = await TableService.deleteTable(req.params.code);
    res.json({ success: true, data: deleted });
  } catch (error) {
    console.error('Delete table error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
