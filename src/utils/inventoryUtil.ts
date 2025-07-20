import { InventoryTransaction } from '../models/InventoryTransactionModel';
import mongoose, { Types } from 'mongoose';
import dayjs from 'dayjs';
import { IInventoryDailyBatch, InventoryDailyBatch } from '../models/InventoryDailyBatchModel';
import IngredientModel from '../models/IngredientModel';
import { InventoryAdjustmentBatch } from '../models/InventoryAdjustmentBatchModel';
import PDFDocument from 'pdfkit';
import path from 'path';

interface TransactionItem {
  ingredient_id: Types.ObjectId;
  quantity: number;
  notes?: string;
}

// Get all Inventory Transactions/Dailies Service

export function addLookupStages(pipeline: any[]) {
  pipeline.push(
    {
      $lookup: {
        from: 'ingredients',
        localField: 'ingredient_id',
        foreignField: '_id',
        as: 'ingredient',
      },
    },
    { $unwind: '$ingredient' },

    {
      $lookup: {
        from: 'users',
        localField: 'user_id',
        foreignField: '_id',
        as: 'user',
      },
    },
    { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },

    {
      $lookup: {
        from: 'inventoryadjustmentbatches',
        localField: 'adjustment_batch_id',
        foreignField: '_id',
        as: 'adjustment_batch',
      },
    },
    { $unwind: { path: '$adjustment_batch', preserveNullAndEmptyArrays: true } },
  );
}

export function buildMatchCriteria(
  { ingredient_id, user_id, transaction_type, from, to }: any,
  dateFieldName: string = 'transaction_date',
  allowTypeFilter = true,
) {
  const match: any = {};

  if (ingredient_id && mongoose.Types.ObjectId.isValid(ingredient_id)) {
    match['ingredient_id'] = new mongoose.Types.ObjectId(ingredient_id);
  }
  if (user_id && mongoose.Types.ObjectId.isValid(user_id)) {
    match['user_id'] = new mongoose.Types.ObjectId(user_id);
  }
  if (transaction_type && allowTypeFilter) {
    match['transaction_type'] = transaction_type;
  }
  if (from || to) {
    match[dateFieldName] = {};
    if (from) match[dateFieldName].$gte = dayjs(from).startOf('day').toDate();
    if (to) match[dateFieldName].$lte = dayjs(to).endOf('day').toDate();
  }

  return match;
}

export function addSearchStage(pipeline: any[], search: string) {
  const regex = new RegExp(search, 'i');
  pipeline.push({
    $match: {
      $or: [{ notes: regex }, { 'ingredient.name': regex }, { 'user.name': regex }],
    },
  });
}

const sortMapping: Record<string, { field: string; direction: 1 | -1 }> = {
  transaction_type_asc: { field: 'transaction_type', direction: 1 },
  transaction_type_desc: { field: 'transaction_type', direction: -1 },
  transaction_date_asc: { field: 'transaction_date', direction: 1 },
  transaction_date_desc: { field: 'transaction_date', direction: -1 },
  ingredient_name_asc: { field: 'ingredient.name', direction: 1 },
  ingredient_name_desc: { field: 'ingredient.name', direction: -1 },
  unit_asc: { field: 'ingredient.unit', direction: 1 },
  unit_desc: { field: 'ingredient.unit', direction: -1 },
  quantity_asc: { field: 'quantity', direction: 1 },
  quantity_desc: { field: 'quantity', direction: -1 },
  user_name_asc: { field: 'user.username', direction: 1 },
  user_name_desc: { field: 'user.username', direction: -1 },
};

export function addSortStage(pipeline: any[], sort: string) {
  if (sort === 'transaction_type_asc' || sort === 'transaction_type_desc') {
    pipeline.push({
      $addFields: {
        transaction_type_order: {
          $switch: {
            branches: [
              { case: { $eq: ['$transaction_type', 'export'] }, then: 0 },
              { case: { $eq: ['$transaction_type', 'import'] }, then: 1 },
              { case: { $eq: ['$transaction_type', 'adjustment'] }, then: 2 },
            ],
            default: 3,
          },
        },
      },
    });
    pipeline.push({
      $sort: {
        transaction_type_order: sort === 'transaction_type_asc' ? 1 : -1,
      },
    });
  } else {
    // các trường khác
    const sortConfig = sortMapping[sort];
    if (sortConfig) {
      pipeline.push({
        $sort: {
          [sortConfig.field]: sortConfig.direction,
        },
      });
    } else {
      // fallback
      pipeline.push({ $sort: { transaction_date: -1 } });
    }
  }
}

export function addPaginationStage(pipeline: any[], page?: number, limit?: number) {
  if (typeof limit === 'number' && !isNaN(limit)) {
    const skip = ((page || 1) - 1) * limit;
    pipeline.push({ $skip: skip }, { $limit: limit });
  }
}

export function addProjectionStage(pipeline: any[], projection: Record<string, any>) {
  pipeline.push({ $project: projection });
}

export const projectionForInventoryTransaction = {
  _id: 1,
  transaction_type: 1,
  quantity: 1,
  transaction_date: 1,
  notes: 1,
  createdAt: 1,
  updatedAt: 1,
  ingredient: {
    _id: '$ingredient._id',
    name: '$ingredient.name',
    unit: '$ingredient.unit',
  },
  user: {
    _id: '$user._id',
    name: '$user.username',
    email: '$user.email',
  },
  adjustment_batch: {
    _id: '$adjustment_batch._id',
    adjustment_date: '$adjustment_batch.adjustment_date',
    daily_batch_id: '$adjustment_batch.daily_batch_id',
    // hoặc các trường khác tùy bạn
  },
  adjustment_type: {
    $cond: {
      if: { $ifNull: ['$adjustment_batch.daily_batch_id', false] },
      then: 'audit',
      else: 'manual',
    },
  },
};

export async function getCountAndData(model: mongoose.Model<any>, pipeline: any[]) {
  const countPipeline = pipeline.slice(
    0,
    pipeline.findIndex((p) => '$project' in p),
  );
  countPipeline.push({ $count: 'total' });

  const [docs, countResult] = await Promise.all([
    model.aggregate(pipeline),
    model.aggregate(countPipeline),
  ]);

  const total = countResult[0]?.total || 0;
  return [docs, total];
}

export function buildResponse(docs: any[], page: number, limit: number | undefined, total: number) {
  const paginated = typeof limit === 'number' && !isNaN(limit);
  return {
    docs,
    totalDocs: total,
    page: paginated ? page : 1,
    limit: paginated ? limit : total,
    totalPages: paginated ? Math.ceil(total / limit!) : 1,
    hasNextPage: paginated ? page * limit! < total : false,
    hasPrevPage: paginated ? page > 1 : false,
    offset: paginated ? (page - 1) * limit! : 0,
    pagingCounter: paginated ? (page - 1) * limit! + 1 : 1,
  };
}

// createInventoryBatch function

export async function formatItems(items: any[], type: string) {
  return items.map((item) => {
    const { ingredient_id, quantity, note, initial_quantity } = item;

    if (!ingredient_id || quantity == null || quantity < 0) {
      throw new Error('Thiếu hoặc sai thông tin nguyên liệu!');
    }

    const adjustedQuantity = type === 'export' ? -Math.abs(quantity) : quantity;

    return {
      ingredient_id: new mongoose.Types.ObjectId(ingredient_id),
      initial_quantity: initial_quantity ?? 0,
      quantity: adjustedQuantity,
      notes: note?.trim() || '',
    };
  });
}

export async function checkExistingBatch(batch_date: Date, type: string) {
  const existing = await InventoryDailyBatch.exists({ batch_date, type });
  if (existing) throw new Error(`Đã tồn tại batch ${type} ngày hôm nay!`);
}

export async function checkStockBeforeExport(formattedItems: any[], batch_date: Date) {
  for (const item of formattedItems) {
    const ingredient = await IngredientModel.findById(item.ingredient_id);
    if (!ingredient) continue;

    const currentStock = await getCurrentStock(item.ingredient_id, batch_date);
    const afterExport = currentStock + item.quantity;

    console.log(
      `Kiểm tra xuất kho: ${ingredient.name} hiện còn ${currentStock}, sau khi xuất còn ${afterExport}`,
    );

    if (afterExport < 0) {
      console.warn(
        `⚠️ Xuất vượt tồn kho! ${ingredient.name} hiện còn ${currentStock}, sau khi xuất còn ${afterExport}`,
      );
    }
  }
}

export async function getCurrentStock(ingredientId: mongoose.Types.ObjectId, batch_date: Date) {
  const todayStock = await IngredientModel.aggregate([
    { $match: { _id: ingredientId } },
    {
      $lookup: {
        from: 'inventorydailybatches',
        let: { ingredientId: '$_id' },
        pipeline: [
          { $match: { $expr: { $lte: ['$batch_date', batch_date] } } },
          { $unwind: '$items' },
          { $match: { $expr: { $eq: ['$items.ingredient_id', '$$ingredientId'] } } },
          { $group: { _id: null, total: { $sum: '$items.quantity' } } },
        ],
        as: 'stock',
      },
    },
    { $addFields: { currentStock: { $ifNull: [{ $arrayElemAt: ['$stock.total', 0] }, 0] } } },
  ]);

  return todayStock[0]?.currentStock ?? 0;
}

export async function setInitialQuantities(formattedItems: any[], batch_date: Date) {
  for (const item of formattedItems) {
    item.initial_quantity = await getCurrentStock(item.ingredient_id, batch_date);
  }
}

export async function createBatch(
  formattedItems: any[],
  batch_date: Date,
  userId: string,
  type: string,
) {
  return await InventoryDailyBatch.create({
    batch_date,
    type,
    user_id: new mongoose.Types.ObjectId(userId),
    items: formattedItems,
  });
}

export async function handleAuditAdjustments(
  formattedItems: any[],
  items: any[],
  batch: IInventoryDailyBatch,
  batch_date: Date,
  userId: string,
) {
  const adjustmentItems = formattedItems
    .filter((item) => item.quantity !== item.initial_quantity)
    .map((item) => ({
      ingredient_id: item.ingredient_id,
      estimated_quantity: item.initial_quantity ?? 0,
      actual_quantity: item.quantity,
      difference: item.quantity - (item.initial_quantity ?? 0),
      reason:
        (items.find((i) => i.ingredient_id === item.ingredient_id.toString()) as any)?.reason ||
        'Không rõ',
      notes: item.notes || '',
    }));

  if (adjustmentItems.length > 0) {
    await InventoryAdjustmentBatch.create({
      adjustment_date: batch_date,
      user_id: new mongoose.Types.ObjectId(userId),
      daily_batch_id: batch._id,
      items: adjustmentItems,
    });

    await InventoryDailyBatch.deleteMany({
      type: 'adjustment',
      batch_date,
      'items.ingredient_id': { $in: adjustmentItems.map((i) => i.ingredient_id) },
    });

    console.log('adjustmentItems: ', adjustmentItems);

    await InventoryDailyBatch.create({
      batch_date,
      type: 'adjustment',
      user_id: new mongoose.Types.ObjectId(userId),
      items: adjustmentItems.map((item) => ({
        ingredient_id: item.ingredient_id,
        quantity: item.difference,
        reason: item.reason,
        notes: item.notes,
      })),
    });

    const adjustmentBatch = await InventoryAdjustmentBatch.create({
      adjustment_date: batch_date,
      user_id: new mongoose.Types.ObjectId(userId),
      daily_batch_id: batch._id,
      items: adjustmentItems,
    });

    await InventoryTransaction.insertMany(
      adjustmentItems.map((item) => ({
        transaction_type: 'adjustment',
        quantity: Math.abs(item.difference),
        transaction_date: batch_date,
        notes: item.notes || '',
        ingredient_id: item.ingredient_id,
        user_id: userId,
        adjustment_batch_id: adjustmentBatch._id,
      })),
    );
  }
}

export async function createInventoryTransactions({
  type,
  items,
  batch_date,
  userId,
}: {
  type: 'import' | 'export' | 'adjustment';
  items: TransactionItem[];
  batch_date: Date;
  userId: string | Types.ObjectId;
}) {
  if (!['import', 'export', 'adjustment'].includes(type)) return;

  await InventoryTransaction.insertMany(
    items.map((item) => ({
      transaction_type: type,
      quantity: Math.abs(item.quantity),
      transaction_date: batch_date,
      notes: item.notes || '',
      ingredient_id: item.ingredient_id,
      user_id: userId,
      adjustment_batch_id: null,
    })),
  );
}

// Create export functions for PDF

export function validateQueryParams(query: any, match: any): void {
  if (query.from && query.to) {
    const fromDate = new Date(query.from);
    const toDate = new Date(query.to);

    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      throw new Error('Invalid date format');
    }

    match.transaction_date = {
      $gte: fromDate,
      $lte: toDate,
    };
  }

  if (query.ingredient_id) {
    if (!mongoose.Types.ObjectId.isValid(query.ingredient_id)) {
      throw new Error('Invalid ingredient_id format');
    }
    match.ingredient_id = new mongoose.Types.ObjectId(query.ingredient_id);
  }

  if (query.transaction_type) {
    match.transaction_type = query.transaction_type;
  }
}

export async function createPdfDocument(transactions: any[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        margin: 30,
        bufferPages: true,
      });

      const buffers: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => {
        buffers.push(chunk);
      });

      doc.on('end', () => {
        try {
          const pdfBuffer = Buffer.concat(buffers);
          console.log(`✅ PDF created successfully, size: ${pdfBuffer.length} bytes`);
          resolve(pdfBuffer);
        } catch (error) {
          reject(new Error(`Failed to concatenate PDF buffers: ${error}`));
        }
      });

      doc.on('error', (err: Error) => {
        console.error('❌ PDF generation error:', err);
        reject(err);
      });

      generatePdfContent(doc, transactions);

      doc.end();
    } catch (error) {
      reject(new Error(`PDF creation failed: ${error}`));
    }
  });
}

export function generatePdfContent(doc: any, transactions: any[]): void {
  try {
    const fontPath = path.resolve(__dirname, '../../public/assets/fonts/Roboto-Regular.ttf');
    doc.registerFont('Roboto', fontPath);
    doc.font('Roboto');
    doc.fontSize(16).text('Danh sách giao dịch kho', { align: 'center' });
    doc.moveDown(1);

    doc.fontSize(12).text(`Tổng số giao dịch: ${transactions.length}`, { align: 'left' });
    doc.text(`Ngày xuất báo cáo: ${new Date().toLocaleDateString('vi-VN')}`);
    doc.moveDown(1);

    if (transactions.length === 0) {
      doc.text('Không có giao dịch nào được tìm thấy.', { align: 'center' });
    } else {
      transactions.forEach((tx, index) => {
        try {
          const ingredientName = tx.ingredient_id?.name || 'N/A';
          const username = tx.user_id?.username || 'N/A';
          const transactionType = translateType(tx.transaction_type || '');
          const quantity = tx.quantity || 0;
          const date = tx.transaction_date
            ? new Date(tx.transaction_date).toLocaleDateString('vi-VN')
            : 'N/A';
          const notes = tx.notes || 'Không có ghi chú';

          const line =
            `${index + 1}. [${transactionType}] ` +
            `Nguyên liệu: ${ingredientName}, ` +
            `Số lượng: ${quantity}, ` +
            `Ngày: ${date}, ` +
            `Người thao tác: ${username}, ` +
            `Ghi chú: ${notes}`;

          doc.fontSize(10).text(line, {
            width: doc.page.width - 60,
            align: 'left',
          });
          doc.moveDown(0.5);

          if (doc.y > doc.page.height - 100) {
            doc.addPage();
          }
        } catch (itemError) {
          console.error(`❌ Error processing transaction ${index}:`, itemError);
          doc.text(`${index + 1}. Lỗi xử lý giao dịch này`);
          doc.moveDown(0.5);
        }
      });
    }

    const currentDate = new Date();
    const formattedDate = currentDate.toLocaleDateString('vi-VN');
    const formattedTime = currentDate.toLocaleTimeString('vi-VN');

    doc
      .fontSize(8)
      .text(
        `Được tạo bởi hệ thống quản lý kho - ${formattedDate} ${formattedTime}`,
        30,
        doc.page.height - 50,
        { align: 'center' },
      );
  } catch (error) {
    console.error('❌ Error generating PDF content:', error);
    throw error;
  }
}

export function translateType(type: string): string {
  switch (type.toLowerCase()) {
    case 'import':
      return 'Nhập kho';
    case 'export':
      return 'Xuất kho';
    case 'adjustment':
      return 'Điều chỉnh';
    default:
      return type || 'Không xác định';
  }
}
