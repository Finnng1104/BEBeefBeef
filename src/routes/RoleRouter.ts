import { Router } from 'express';
import RoleController from '../controller/RoleController';

const router = Router();

router.post('/addrole', RoleController.AddRole);
router.get('/getrolebyid/:id', RoleController.GetRoleById);
router.get('/getallrole', RoleController.GetAllRole);
router.put('/updaterole/:id', RoleController.UpdateRole);
router.delete('/deleterole/:id', RoleController.DeleteRole);

export default router;
