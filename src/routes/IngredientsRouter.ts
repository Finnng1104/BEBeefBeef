import { Router } from 'express';
import IngredientController from '../controller/IngredientController';

const router = Router();

router.get('/getall-ingredients', IngredientController.getAllIngredients);
router.post('/create-ingredients', IngredientController.createIngredient);
router.get('/get-ingredients/:slug', IngredientController.getIngredientBySlug);
router.put('/update-ingredients/:id', IngredientController.updateIngredient);

router.delete('/softDelete-ingredients/:id', IngredientController.softDeleteIngredient);
router.get('/trash-ingredients', IngredientController.getTrashIngredients);
router.patch('/restore-ingredients/:id', IngredientController.restoreIngredient);
router.delete('/delete-ingredients/:id', IngredientController.permanentlyDeleteIngredient);

export default router;
