// routes/TableRouter.ts
import { Router } from 'express';
import {
  getAllTables,
  getTablesByDateTime,
  getTableByCode,
  createTable,
  updateTable,
  toggleTableAvailability,
  deleteTable,
} from '../controller/TableController';

const router = Router();

router.get('/', getAllTables);
router.get('/by-datetime', getTablesByDateTime);
router.get('/:code', getTableByCode);
router.post('/', createTable);
router.patch('/:code', updateTable);
router.patch('/:code/toggle', toggleTableAvailability);
router.delete('/:code', deleteTable);

export default router;
