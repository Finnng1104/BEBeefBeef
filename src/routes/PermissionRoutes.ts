import { Router } from 'express';
import PermissionController from '../controller/PermissionController';
import AuthMiddleWare from '../middleware/AuthMiddleWare';
const router = Router();
router.get(
  '/getall',
  AuthMiddleWare.verifyToken,
  AuthMiddleWare.verifyRole(['superadmin']),
  PermissionController.GetAllPermission,
);
router.post(
  '/create',
  AuthMiddleWare.verifyToken,
  AuthMiddleWare.verifyRole(['superadmin']),
  PermissionController.AddPermission,
);
router.get(
  '/getbyid/:id',
  AuthMiddleWare.verifyToken,
  AuthMiddleWare.verifyRole(['superadmin']),
  PermissionController.GetPermissionById,
);
router.put(
  '/update/:id',
  AuthMiddleWare.verifyToken,
  AuthMiddleWare.verifyRole(['superadmin']),
  PermissionController.UpdatePermission,
);
router.delete(
  '/delete/:id',
  AuthMiddleWare.verifyToken,
  AuthMiddleWare.verifyRole(['superadmin']),
  PermissionController.DeletePermission,
);

export default router;
