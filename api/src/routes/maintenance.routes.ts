import { Router } from 'express';
import { maintenanceController } from '../controllers/maintenance.controller.js';

const router = Router();

router.get('/', maintenanceController.getAllRecords);
router.get('/:id', maintenanceController.getRecordById);
router.post('/', maintenanceController.createRecord);
router.put('/:id/assign', maintenanceController.assignMaintenance);
router.put('/:id/start', maintenanceController.startMaintenance);
router.put('/:id/complete', maintenanceController.completeMaintenance);
router.put('/:id/cancel', maintenanceController.cancelMaintenance);
router.get('/:id/timeline', maintenanceController.getTimeline);
router.get('/reminders/rules', maintenanceController.getReminderRules);
router.post('/reminders/rules', maintenanceController.createReminderRule);
router.post('/reminders/generate', maintenanceController.generateMaintenanceOrders);

export default router;
