import { Router } from 'express';
import CategoryController from '../controller/CategoryController';
import upload from '../middleware/UploadMiddleWare';
const router = Router();

router.post('/addcategory', upload.single('Cate_img'), CategoryController.AddCategory); // => ok
router.get('/getallcategory', CategoryController.GetAllCategory);
router.get('/getcategorybyid/:id', CategoryController.GetCategoryById);
router.put('/update/:id', upload.single('Cate_img'), CategoryController.UpdateCategory);
router.delete('/delete/:id', CategoryController.DeleteCategory);
router.get('/paginatecategory', CategoryController.PaginateCate);

export default router;
