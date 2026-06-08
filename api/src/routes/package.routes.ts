import { Router } from 'express';
import { packageController } from '../controllers/package.controller.js';

const router = Router();

router.get('/', packageController.getAllPackages);
router.get('/:id', packageController.getPackageById);
router.post('/', packageController.createPackage);
router.put('/:id', packageController.updatePackage);
router.put('/:id/toggle', packageController.togglePackageStatus);

export default router;
