import { Router } from 'express';
import UserController from '../controller/UserController';
import AuthMiddleWare from '../middleware/AuthMiddleWare';
import { canManageUserByRole } from '../middleware/CanManageUserByRole';

const router = Router();

router.get('/getAllUser', AuthMiddleWare.verifyToken, UserController.getAllUser);
router.get('/getAllUserByUserRole', UserController.getAllUserByUserRole);
router.get('/getUserById/:userId', UserController.getUserById);
router.post(
  '/blockUser/:userId',
  AuthMiddleWare.verifyToken,
  AuthMiddleWare.verifyRole(['superadmin', 'manager']),
  (req, res, next) => {
    Promise.resolve(canManageUserByRole(req, res, next)).catch(next);
  },
  UserController.blockUser,
);
router.put(
  '/updateUser/:userId',
  AuthMiddleWare.verifyToken,
  AuthMiddleWare.verifyRole(['superadmin', 'manager']),
  (req, res, next) => {
    Promise.resolve(canManageUserByRole(req, res, next)).catch(next);
  },
  UserController.updateUser,
);
router.post(
  '/check-password/:userId',
  AuthMiddleWare.verifyToken,
  UserController.checkUserPassword,
);
router.post(
  '/changePassword/:userId',
  AuthMiddleWare.verifyToken,
  UserController.changeUserPassword,
);
router.get('/filterUser', (req, res) => {
  UserController.filterUser(req, res).catch(() => {
    res.status(500).json({ message: 'Error filtering users' });
  });
});
router.post(
  '/addUser',
  AuthMiddleWare.verifyToken,
  AuthMiddleWare.verifyRole(['superadmin', 'manager']),
  (req, res, next) => {
    Promise.resolve(canManageUserByRole(req, res, next)).catch(next);
  },
  UserController.addUser,
);

export default router;
