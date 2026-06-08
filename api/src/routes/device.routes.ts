import { Router } from 'express';
import { deviceController } from '../controllers/device.controller.js';

const router = Router();

router.get('/categories', deviceController.getCategories);
router.get('/available', deviceController.getAvailableDevices);
router.get('/low-stock', deviceController.getLowStockDevices);
router.get('/:id/availability', deviceController.checkAvailability);
router.get('/:id', deviceController.getDeviceById);
router.get('/', deviceController.getAllDevices);
router.post('/', deviceController.createDevice);
router.put('/:id', deviceController.updateDevice);
router.delete('/:id', deviceController.deleteDevice);

export default router;
