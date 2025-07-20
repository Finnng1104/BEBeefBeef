import { Router } from 'express';
import { ReviewController } from '../controller/ReviewController';
import AuthMiddleWare from '../middleware/AuthMiddleWare';

const router = Router();

router.get('/', ReviewController.list);

router.post('/', AuthMiddleWare.verifyToken, ReviewController.create);

router.put('/:id', AuthMiddleWare.verifyToken, ReviewController.update);

router.patch(
  '/:id/hide',
  AuthMiddleWare.verifyToken,
  AuthMiddleWare.verifyRole(['admin']),
  ReviewController.toggleVisibility,
);

router.delete('/:id', AuthMiddleWare.verifyToken, ReviewController.remove);

export default router;
