import { Router } from 'express';
import InventoryController from '../controller/InventoryController';

const router = Router();

router.get('/inventory-transaction', InventoryController.getInventoryTransaction);
router.post('/inventory-daily/import', InventoryController.importInventoryDaily);
router.post('/inventory-daily/export', InventoryController.exportInventoryDaily);
router.post('/inventory-daily/audit', InventoryController.auditInventoryDaily);
router.get(
  '/inventory-transaction/export-excel',
  InventoryController.exportInventoryTransactionsExcel,
);
router.get('/inventory-transaction/export-csv', InventoryController.exportInventoryTransactionsCsv);
router.get('/inventory-transaction/export-pdf', InventoryController.exportInventoryTransactionsPdf);

export default router;
