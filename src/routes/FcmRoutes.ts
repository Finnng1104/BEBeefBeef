import { Router } from 'express';
import FCMController from '../controller/FCMController';

const router = Router();

router.post('/register', FCMController.registerToken);

export default router;
