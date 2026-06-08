import { contractRepository } from '../repositories/contract.repository.js';
import { orderRepository } from '../repositories/order.repository.js';
import { customerRepository } from '../repositories/customer.repository.js';
import type {
  Contract,
  ContractStatus,
  ContractSignatureRequest,
  Order,
  Customer,
  OrderItem,
} from '../../../shared/types.js';
import { formatCurrency, calculateDays } from '../utils/helpers.js';
import dayjs from 'dayjs';

export class ContractService {
  async getAllContracts(status?: ContractStatus, customerId?: number): Promise<Contract[]> {
    return contractRepository.findAllWithDetails(status, customerId);
  }

  async getContractById(id: number): Promise<Contract | null> {
    return contractRepository.findById(id);
  }

  async generateContract(orderId: number): Promise<Contract> {
    const order = orderRepository.findByIdWithDetails(orderId);
    if (!order) {
      throw new Error('订单不存在');
    }

    const customer = customerRepository.findById(order.customerId);
    if (!customer) {
      throw new Error('客户信息不存在');
    }

    const existingContract = contractRepository.findByOrderId(orderId);
    if (existingContract) {
      return existingContract;
    }

    const content = this.generateContractContent(order, customer);
    const contractNo = contractRepository.generateContractNo();

    return contractRepository.create({
      orderId: order.id,
      customerId: customer.id,
      status: 'draft',
      contractNo,
      content,
      startDate: order.startDate,
      endDate: order.endDate,
      totalAmount: order.totalRent + order.totalDeposit,
    });
  }

  async createContract(orderId: number): Promise<Contract> {
    return this.generateContract(orderId);
  }

  async signContract(id: number, request: ContractSignatureRequest): Promise<Contract> {
    const contract = contractRepository.findById(id);
    if (!contract) {
      throw new Error('合同不存在');
    }

    if (contract.status === 'terminated' || contract.status === 'expired') {
      throw new Error('合同已终止或过期，无法签署');
    }

    if (request.party === 'lessor' && contract.lessorSignature) {
      throw new Error('出租方已签署');
    }

    if (request.party === 'lessee' && contract.lesseeSignature) {
      throw new Error('承租方已签署');
    }

    const updatedContract = contractRepository.signContract(
      id,
      request.party,
      request.signatureData
    );

    if (!updatedContract) {
      throw new Error('签署失败');
    }

    return updatedContract;
  }

  async terminateContract(id: number): Promise<Contract> {
    const contract = contractRepository.findById(id);
    if (!contract) {
      throw new Error('合同不存在');
    }

    if (contract.status === 'terminated') {
      throw new Error('合同已终止');
    }

    const updatedContract = contractRepository.update(id, {
      status: 'terminated',
    });

    if (!updatedContract) {
      throw new Error('终止失败');
    }

    return updatedContract;
  }

  async downloadContractHtml(id: number): Promise<string> {
    const contract = contractRepository.findById(id);
    if (!contract) {
      throw new Error('合同不存在');
    }

    const order = orderRepository.findByIdWithDetails(contract.orderId);
    const customer = customerRepository.findById(contract.customerId);

    const fullContent = this.generateContractContent(
      order || { id: contract.orderId, items: [] } as Order & { items: OrderItem[] },
      customer || { id: contract.customerId, name: contract.customerName || '', phone: contract.customerPhone || '' } as Customer,
      contract
    );

    return this.wrapHtmlForDownload(fullContent, contract);
  }

  generateContractContent(
    order: Order & { items: OrderItem[] },
    customer: Customer,
    contract?: Contract
  ): string {
    const days = calculateDays(order.startDate, order.endDate);
    const today = dayjs().format('YYYY年MM月DD日');
    const startDate = dayjs(order.startDate).format('YYYY年MM月DD日');
    const endDate = dayjs(order.endDate).format('YYYY年MM月DD日');
    const contractNo = contract?.contractNo || '待生成';
    const signedAt = contract?.signedAt ? dayjs(contract.signedAt).format('YYYY年MM月DD日 HH:mm:ss') : '';

    const lessorSignatureImg = contract?.lessorSignature
      ? `<img src="${contract.lessorSignature}" alt="出租方签章" style="max-width: 150px; max-height: 80px;" />`
      : '';

    const lesseeSignatureImg = contract?.lesseeSignature
      ? `<img src="${contract.lesseeSignature}" alt="承租方签章" style="max-width: 150px; max-height: 80px;" />`
      : '';

    const deviceRows = order.items?.map((item, index) => `
      <tr>
        <td style="border: 1px solid #333; padding: 8px; text-align: center;">${index + 1}</td>
        <td style="border: 1px solid #333; padding: 8px;">${item.deviceName || '设备' + item.deviceId}</td>
        <td style="border: 1px solid #333; padding: 8px; text-align: center;">${item.quantity}</td>
        <td style="border: 1px solid #333; padding: 8px; text-align: right;">${formatCurrency(item.dailyRate)}</td>
        <td style="border: 1px solid #333; padding: 8px; text-align: right;">${formatCurrency(item.depositPerUnit)}</td>
        <td style="border: 1px solid #333; padding: 8px; text-align: right;">${formatCurrency(item.subtotal)}</td>
      </tr>
    `).join('') || '';

    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>设备租赁合同</title>
  <style>
    body {
      font-family: "Microsoft YaHei", "SimSun", sans-serif;
      line-height: 1.8;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px;
      background: #fff;
    }
    .contract-header {
      text-align: center;
      margin-bottom: 30px;
      border-bottom: 2px solid #333;
      padding-bottom: 20px;
    }
    .contract-title {
      font-size: 28px;
      font-weight: bold;
      margin-bottom: 10px;
    }
    .contract-no {
      font-size: 14px;
      color: #666;
    }
    .section-title {
      font-size: 18px;
      font-weight: bold;
      margin: 20px 0 10px 0;
      padding-left: 10px;
      border-left: 4px solid #333;
    }
    .party-info {
      background: #f9f9f9;
      padding: 15px;
      margin: 10px 0;
      border-radius: 4px;
    }
    .party-label {
      font-weight: bold;
      color: #555;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
    }
    th {
      background: #f0f0f0;
      border: 1px solid #333;
      padding: 10px;
      font-weight: bold;
      text-align: center;
    }
    .fee-summary {
      background: #f9f9f9;
      padding: 15px;
      margin: 15px 0;
      border-radius: 4px;
    }
    .fee-row {
      display: flex;
      justify-content: space-between;
      padding: 5px 0;
    }
    .fee-row.total {
      font-weight: bold;
      font-size: 16px;
      border-top: 1px solid #ccc;
      padding-top: 10px;
      margin-top: 5px;
    }
    .clause {
      margin: 10px 0;
      text-indent: 2em;
    }
    .clause-title {
      font-weight: bold;
      display: inline-block;
    }
    .signature-section {
      display: flex;
      justify-content: space-between;
      margin-top: 60px;
      padding-top: 30px;
      border-top: 1px dashed #ccc;
    }
    .signature-block {
      text-align: center;
      width: 45%;
    }
    .signature-line {
      border-bottom: 1px solid #333;
      height: 60px;
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .date-line {
      margin-top: 5px;
    }
    .footer {
      margin-top: 50px;
      text-align: center;
      font-size: 12px;
      color: #999;
      border-top: 1px solid #eee;
      padding-top: 20px;
    }
  </style>
</head>
<body>
  <div class="contract-header">
    <div class="contract-title">设备租赁合同</div>
    <div class="contract-no">合同编号：${contractNo}</div>
    <div class="contract-no">签订日期：${today}</div>
  </div>

  <div class="section-title">第一条 合同双方</div>
  <div class="party-info">
    <p><span class="party-label">出租方（甲方）：</span>设备租赁有限公司</p>
    <p><span class="party-label">地址：</span>北京市朝阳区科技园A座1001室</p>
    <p><span class="party-label">联系电话：</span>400-888-8888</p>
    <p><span class="party-label">法定代表人：</span>张三</p>
  </div>
  <div class="party-info">
    <p><span class="party-label">承租方（乙方）：</span>${customer.name}</p>
    <p><span class="party-label">联系电话：</span>${customer.phone}</p>
    <p><span class="party-label">身份证号：</span>${customer.idCard || '________________'}</p>
    <p><span class="party-label">客户等级：</span>${customer.vipLevel.toUpperCase()}</p>
  </div>

  <div class="section-title">第二条 租赁设备清单</div>
  <table>
    <thead>
      <tr>
        <th style="width: 60px;">序号</th>
        <th>设备名称</th>
        <th style="width: 80px;">数量</th>
        <th style="width: 120px;">日租金</th>
        <th style="width: 120px;">单台押金</th>
        <th style="width: 120px;">小计</th>
      </tr>
    </thead>
    <tbody>
      ${deviceRows}
    </tbody>
  </table>

  <div class="section-title">第三条 租赁期限</div>
  <p class="clause">
    租赁期限自 <strong>${startDate}</strong> 起至 <strong>${endDate}</strong> 止，共计 <strong>${days}</strong> 天。
    乙方应在租赁期满当日归还设备，如需续租，应提前3日书面通知甲方并经甲方同意。
  </p>

  <div class="section-title">第四条 费用明细</div>
  <div class="fee-summary">
    <div class="fee-row">
      <span>设备租金总额：</span>
      <span>${formatCurrency(order.totalRent)}</span>
    </div>
    <div class="fee-row">
      <span>设备押金总额：</span>
      <span>${formatCurrency(order.totalDeposit)}</span>
    </div>
    <div class="fee-row">
      <span>租赁天数：</span>
      <span>${days} 天</span>
    </div>
    <div class="fee-row total">
      <span>合同总金额（租金+押金）：</span>
      <span>${formatCurrency(order.totalRent + order.totalDeposit)}</span>
    </div>
  </div>
  <p class="clause">
    <span class="clause-title">付款方式：</span>乙方应在签订本合同时一次性支付全部租金和押金。
    租赁期满，设备完好归还后，押金在扣除可能产生的费用后无息退还乙方。
  </p>

  <div class="section-title">第五条 双方权利与义务</div>
  <p class="clause">
    <span class="clause-title">5.1 甲方权利义务：</span>
    (1) 甲方保证所出租设备性能良好，符合安全使用标准；
    (2) 甲方有权按照合同约定收取租金及相关费用；
    (3) 甲方应向乙方提供设备使用说明书和必要的操作指导；
    (4) 设备在正常使用情况下发生故障，甲方负责免费维修。
  </p>
  <p class="clause">
    <span class="clause-title">5.2 乙方权利义务：</span>
    (1) 乙方应按时支付租金和押金；
    (2) 乙方应按照设备操作规程合理使用设备，不得擅自改装、转租设备；
    (3) 乙方负责设备在租赁期间的保管和维护，发生损坏或丢失应及时通知甲方；
    (4) 租赁期满，乙方应按时归还设备及其配件。
  </p>

  <div class="section-title">第六条 违约条款</div>
  <p class="clause">
    <span class="clause-title">6.1 逾期归还：</span>
    乙方逾期归还设备的，每逾期一日应按照原日租金的1.5倍支付逾期使用费。
    逾期超过7日的，甲方有权终止合同并要求乙方立即归还设备。
  </p>
  <p class="clause">
    <span class="clause-title">6.2 设备损坏：</span>
    设备因乙方使用不当造成损坏的，乙方应承担维修费用；
    造成设备丢失或严重损坏无法修复的，乙方应按照设备市场价值的100%赔偿。
  </p>
  <p class="clause">
    <span class="clause-title">6.3 提前解除：</span>
    任何一方如需提前解除合同，应提前3日书面通知对方，
    提出解除方应向对方支付合同总金额20%的违约金。
  </p>
  <p class="clause">
    <span class="clause-title">6.4 逾期付款：</span>
    乙方逾期支付租金的，每逾期一日应按照应付金额的0.5%支付违约金。
  </p>

  <div class="section-title">第七条 免责声明</div>
  <p class="clause">
    <span class="clause-title">7.1 不可抗力：</span>
    因地震、火灾、洪水等不可抗力因素导致合同无法履行的，
    双方互不承担违约责任，合同可协商解除或延期。
  </p>
  <p class="clause">
    <span class="clause-title">7.2 设备自然损耗：</span>
    设备在正常使用过程中发生的自然损耗，乙方不承担赔偿责任。
    正常损耗标准以设备出厂说明书规定为准。
  </p>
  <p class="clause">
    <span class="clause-title">7.3 第三方原因：</span>
    因第三方原因导致设备损坏或丢失的，由乙方先行向甲方承担赔偿责任，
    乙方可自行向第三方追偿。
  </p>

  <div class="section-title">第八条 争议解决</div>
  <p class="clause">
    本合同履行过程中发生的争议，双方应首先友好协商解决；
    协商不成的，任何一方有权向合同签订地人民法院提起诉讼。
  </p>

  <div class="section-title">第九条 其他约定</div>
  <p class="clause">
    9.1 本合同自双方签字盖章之日起生效，一式两份，甲乙双方各执一份，具有同等法律效力。
  </p>
  <p class="clause">
    9.2 本合同未尽事宜，双方可另行签订补充协议，补充协议与本合同具有同等法律效力。
  </p>
  <p class="clause">
    9.3 与本合同相关的订单编号：${order.orderNo || order.id}
  </p>

  <div class="signature-section">
    <div class="signature-block">
      <div class="party-label">出租方（甲方）签章：</div>
      <div class="signature-line">${lessorSignatureImg || '____________________'}</div>
      <div>法定代表人：张三</div>
      <div class="date-line">日期：${signedAt || '_______________'}</div>
    </div>
    <div class="signature-block">
      <div class="party-label">承租方（乙方）签章：</div>
      <div class="signature-line">${lesseeSignatureImg || '____________________'}</div>
      <div>签字：${customer.name}</div>
      <div class="date-line">日期：${signedAt || '_______________'}</div>
    </div>
  </div>

  <div class="footer">
    <p>本合同由设备租赁管理系统自动生成</p>
    <p>合同编号：${contractNo} | 生成时间：${dayjs().format('YYYY-MM-DD HH:mm:ss')}</p>
  </div>
</body>
</html>
    `.trim();
  }

  private wrapHtmlForDownload(content: string, contract: Contract): string {
    return content;
  }
}

export const contractService = new ContractService();
