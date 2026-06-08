import { Router } from 'express';
import { contractController } from '../controllers/contract.controller.js';

const router = Router();

router.get('/', contractController.getAllContracts);
router.get('/:id', contractController.getContractById);
router.post('/generate/:orderId', contractController.generateContract);
router.post('/:id/sign', contractController.signContract);
router.put('/:id/terminate', contractController.terminateContract);
router.get('/:id/download', contractController.downloadContractHtml);

export default router;
