import { Request, Response } from 'express';
import PermissionService from '../services/PermissionService';

class PermissionController {
  async GetAllPermission(req: Request, res: Response) {
    try {
      const permissions = await PermissionService.GetALlPermission();
      res.status(200).json(permissions);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  async AddPermission(req: Request, res: Response) {
    try {
      const { name, description } = req.body;
      const permission = await PermissionService.AddPermission(name, description);
      res.status(200).json(permission);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  async GetPermissionById(req: Request, res: Response) {
    try {
      const id = req.params.id;
      const permission = await PermissionService.GetPermissionById(id);
      res.status(200).json(permission);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  async UpdatePermission(req: Request, res: Response) {
    try {
      const id = req.params.id;
      const permission = await PermissionService.UpdatePermission(id, req.body);
      res.status(200).json(permission);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  async DeletePermission(req: Request, res: Response) {
    try {
      const id = req.params.id;
      const permission = await PermissionService.DeletePermission(id);
      res.status(200).json(permission);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }
}
export default new PermissionController();
