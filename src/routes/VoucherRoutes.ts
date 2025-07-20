import { Router } from 'express';
import VoucherController from '../controller/VoucherController';
import AuthMiddleWare from '../middleware/AuthMiddleWare';

const router = Router();
// Route cho user lưu voucher (yêu cầu đăng nhập, không cần quyền admin)
router.post('/save-voucher', AuthMiddleWare.verifyToken, VoucherController.saveVoucherForUser);

router.get('/getAllVouchers', VoucherController.getAllVouchers);
router.post('/createVoucher', AuthMiddleWare.verifyToken, VoucherController.createVoucher);
// Lấy voucher theo id
router.get('/getVoucherById/:id', VoucherController.getVoucherById);
// Cập nhật voucher
router.put('/updateVoucher/:id', AuthMiddleWare.verifyToken, VoucherController.updateVoucher);
// Xoá voucher
router.delete('/deleteVoucher/:id', AuthMiddleWare.verifyToken, VoucherController.deleteVoucher);

// Route public lấy voucher public, active có phân trang (không cần xác thực)
router.get('/public-vouchers', VoucherController.getPublicActiveVouchers);

// Lấy tất cả voucher user đã lưu
router.get('/user-vouchers', AuthMiddleWare.verifyToken, VoucherController.getUserVouchers);

// Khôi phục voucher đã bị soft delete
router.put('/restoreVoucher/:id', AuthMiddleWare.verifyToken, VoucherController.restoreVoucher);

// Lấy danh sách voucher đã bị soft delete (status = 'deleted')
router.get('/getTrashVouchers', AuthMiddleWare.verifyToken, VoucherController.getTrashVouchers);

// Xóa vĩnh viễn voucher từ thùng rác
router.delete(
  '/forceDeleteVoucher/:id',
  AuthMiddleWare.verifyToken,
  VoucherController.forceDeleteVoucher,
);

// Thêm route POST /voucher/:id/add-users, yêu cầu verifyToken, gọi VoucherController.addUsersToVoucher
router.post(
  '/voucher/:id/add-users',
  AuthMiddleWare.verifyToken,
  VoucherController.addUsersToVoucher,
);

export default router;
