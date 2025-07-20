import { Request, Response } from 'express';
import RoleService from '../services/RoleService';

class RoleController {
  async AddRole(req: Request, res: Response): Promise<void> {
    try {
      const { name, description, permission } = req.body;
      const role = await RoleService.AddRole(name, description, permission);

      res.status(201).json({ message: 'Role added successfully', role });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  async GetRoleById(req: Request, res: Response): Promise<void> {
    try {
      const role = await RoleService.GetRoleById(req.params.id);
      if (!role) {
        res.status(404).json({ message: 'Role not found' });
      }

      res.status(200).json(role);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  async GetAllRole(req: Request, res: Response): Promise<void> {
    try {
      const roles = await RoleService.GetAllRole();
      if (!roles) {
        res.status(404).json({ message: 'No roles found!' });
      }

      res.status(200).json(roles);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  async UpdateRole(req: Request, res: Response): Promise<void> {
    try {
      const { name, description, permissions } = req.body;
      const role = await RoleService.UpdateRole(req.params.id, {
        name,
        description,
        permissions,
      });

      if (!role) {
        res.status(404).json({ message: 'Role not found' });
      }

      res.status(200).json({ message: 'Role updated successfully', role });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  async DeleteRole(req: Request, res: Response): Promise<void> {
    try {
      const success = await RoleService.DeleteRole(req.params.id);
      if (!success) {
        res.status(404).json({ message: 'Role not found' });
      }

      res.status(200).json({ message: 'Role deleted successfully' });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }
}

export default new RoleController();
