import { Router } from 'express';
import StaffController from '../controller/StaffController';
const router = Router();

router.get('/getAllStaff', async (req, res) => {
  try {
    await StaffController.getAllStaff(req, res);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching staff' });
  }
});

router.post('/createStaff', async (req, res) => {
  try {
    await StaffController.createStaff(req, res);
  } catch (error) {
    res.status(500).json({ message: 'Error creating staff' });
  }
});

router.put('/updateStaff/:staffId', async (req, res) => {
  try {
    await StaffController.updateStaff(req, res);
  } catch (error) {
    res.status(500).json({ message: 'Error updating staff' });
  }
});

router.delete('/deleteStaff/:staffId', async (req, res) => {
  try {
    await StaffController.deleteStaff(req, res);
  } catch (error) {
    res.status(500).json({ message: 'Error deleting staff' });
  }
});

router.get('/filterStaff', async (req, res) => {
  try {
    await StaffController.filterStaff(req, res);
  } catch (error) {
    res.status(500).json({ message: 'Error filtering staff' });
  }
});

export default router;
