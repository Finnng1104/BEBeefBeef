import { InventoryTransaction } from '../models/InventoryTransactionModel';
import { IInventoryDailyBatch } from '../models/InventoryDailyBatchModel';
import {
  buildMatchCriteria,
  addLookupStages,
  addSearchStage,
  addSortStage,
  addPaginationStage,
  addProjectionStage,
  buildResponse,
  checkExistingBatch,
  checkStockBeforeExport,
  formatItems,
  setInitialQuantities,
  createBatch,
  handleAuditAdjustments,
  createInventoryTransactions,
  projectionForInventoryTransaction,
  translateType,
  validateQueryParams,
  createPdfDocument,
  generatePdfContent,
} from '../utils/inventoryUtil';
import dayjs from 'dayjs';
import { GetTransactionQuery } from '../types/inventoryTypes';
import ExcelJS from 'exceljs';
import mongoose from 'mongoose';

class InventoryService {
  async getInventoryTransactions(query: GetTransactionQuery): Promise<any> {
    const { search, ingredient_id, user_id, transaction_type, from, to } = query;

    const limit = query.limit !== undefined ? Number(query.limit) : 12;
    const page = query.page !== undefined ? Number(query.page) : 1;
    const sort = query.sort || 'transaction_date:desc';

    const basePipeline: any[] = [];
    addLookupStages(basePipeline); // JOIN ingredient and user

    const match = buildMatchCriteria({ ingredient_id, user_id, transaction_type, from, to });
    if (Object.keys(match).length > 0) {
      basePipeline.push({ $match: match });
    }

    if (search) {
      addSearchStage(basePipeline, search);
    }

    const countPipeline = [...basePipeline, { $count: 'total' }];

    addSortStage(basePipeline, sort);
    addPaginationStage(basePipeline, page, limit);
    addProjectionStage(basePipeline, projectionForInventoryTransaction);

    const [docs, countResult] = await Promise.all([
      InventoryTransaction.aggregate(basePipeline),
      InventoryTransaction.aggregate(countPipeline),
    ]);

    const total = countResult[0]?.total || 0;
    return buildResponse(docs, page, limit, total);
  }

  async createInventoryBatch(
    type: 'import' | 'export' | 'audit' | 'adjustment',
    items: {
      ingredient_id: string;
      quantity: number;
      unit?: string;
      note?: string;
      initial_quantity?: number;
    }[],
    userId: string,
  ): Promise<IInventoryDailyBatch> {
    if (!items?.length) {
      throw new Error('Danh sách nguyên liệu không hợp lệ!');
    }

    const batch_date = dayjs().startOf('day').toDate();
    const formattedItems = await formatItems(items, type);

    await checkExistingBatch(batch_date, type);

    if (type === 'export') {
      await checkStockBeforeExport(await formattedItems, batch_date);
    } else if (type === 'audit') {
      await setInitialQuantities(await formattedItems, batch_date);
    }

    const batch = await createBatch(await formattedItems, batch_date, userId, type);
    if (type !== 'audit') {
      await createInventoryTransactions({ type, items: formattedItems, batch_date, userId });
    }

    if (type === 'audit') {
      await handleAuditAdjustments(await formattedItems, items, batch, batch_date, userId);
    }

    return batch;
  }

  async generateInventoryExcel(query: any): Promise<Buffer> {
    const match: any = {};

    if (query.from && query.to) {
      match.transaction_date = {
        $gte: new Date(query.from),
        $lte: new Date(query.to),
      };
    }

    if (query.ingredient_id) {
      match.ingredient_id = new mongoose.Types.ObjectId(query.ingredient_id);
    }

    if (query.transaction_type) {
      match.transaction_type = query.transaction_type;
    }

    const sortField = query.sortBy || 'transaction_date';
    const sortOrder = query.order === 'asc' ? 1 : -1;

    const transactions = await InventoryTransaction.find(match)
      .populate('ingredient_id', 'name')
      .populate('user_id', 'username')
      .sort({ [sortField]: sortOrder });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Inventory Transactions');

    sheet.columns = [
      { header: 'STT', key: 'index', width: 8 },
      { header: 'Loại giao dịch', key: 'type', width: 20 },
      { header: 'Nguyên liệu', key: 'ingredient', width: 30 },
      { header: 'Số lượng', key: 'quantity', width: 15 },
      { header: 'Ngày giao dịch', key: 'date', width: 20 },
      { header: 'Người thao tác', key: 'user', width: 25 },
      { header: 'Ghi chú', key: 'notes', width: 30 },
      { header: 'Lý do', key: 'reason', width: 30 },
    ];

    transactions.forEach((tx, index) => {
      sheet.addRow({
        index: index + 1,
        type: translateType(tx.transaction_type),
        ingredient: tx.ingredient_id ? (tx.ingredient_id as any).name || 'N/A' : 'N/A',
        quantity: tx.quantity,
        date: tx.transaction_date.toLocaleDateString('vi-VN'),
        user: (tx.user_id as any)?.username || 'N/A',
        notes: tx.notes || '',
      });
    });

    const buffer: any = await workbook.xlsx.writeBuffer();
    return buffer;
  }

  async generateInventoryCsv(query: any): Promise<Buffer> {
    const match: any = {};

    if (query.from && query.to) {
      match.transaction_date = {
        $gte: new Date(query.from),
        $lte: new Date(query.to),
      };
    }

    if (query.ingredient_id) {
      match.ingredient_id = new mongoose.Types.ObjectId(query.ingredient_id);
    }

    if (query.transaction_type) {
      match.transaction_type = query.transaction_type;
    }

    const sortField = query.sortBy || 'transaction_date';
    const sortOrder = query.order === 'asc' ? 1 : -1;

    const transactions = await InventoryTransaction.find(match)
      .populate('ingredient_id', 'name')
      .populate('user_id', 'username')
      .sort({ [sortField]: sortOrder });

    // CSV generation
    const csvRows: string[] = [];
    csvRows.push(
      'STT,Loại giao dịch,Nguyên liệu,Số lượng,Ngày giao dịch,Người thao tác,Ghi chú,Lý do',
    );

    transactions.forEach((tx, index) => {
      csvRows.push(
        [
          index + 1,
          translateType(tx.transaction_type),
          tx.ingredient_id ? (tx.ingredient_id as any).name || 'N/A' : 'N/A',
          tx.quantity,
          tx.transaction_date.toLocaleDateString('vi-VN'),
          (tx.user_id as any)?.username || 'N/A',
          tx.notes || '',
        ].join(','),
      );
    });

    return Buffer.from(csvRows.join('\n'), 'utf-8');
  }

  async generateInventoryPdf(query: any): Promise<Buffer> {
    try {
      const match: any = {};

      validateQueryParams(query, match);

      const sortField = query.sortBy || 'transaction_date';
      const sortOrder = query.order === 'asc' ? 1 : -1;

      const transactions = await InventoryTransaction.find(match)
        .populate('ingredient_id', 'name')
        .populate('user_id', 'username')
        .sort({ [sortField]: sortOrder })
        .lean()
        .exec();

      if (!transactions || transactions.length === 0) {
        console.log('⚠️ No transactions found for the given criteria');
      }

      return await createPdfDocument(transactions);
    } catch (error) {
      console.error('❌ Error in generateInventoryPdf:', error);
      throw error;
    }
  }
}

export default new InventoryService();
