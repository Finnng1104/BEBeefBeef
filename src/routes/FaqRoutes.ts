import { Router } from 'express';
import FaqController from '../controller/FaqController';
const router = Router();
router.get('/getall', FaqController.getAllFaqs);
router.post('/create', FaqController.createFaq);
router.get('/:id', FaqController.getFaqById);
router.put('/:id', FaqController.updateFaq);
router.delete('/:id', FaqController.deleteFaq);
export default router;
