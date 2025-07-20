import { Router } from 'express';
import TableReservationController from '../controller/TableReservationController';
// import { verifyToken } from '../middlewares/authMiddleware';

const router = Router();

router.get('/', TableReservationController.getAllStatus);

router.post('/hold', TableReservationController.holdTable);

router.post('/release', TableReservationController.releaseTable);

export default router;
