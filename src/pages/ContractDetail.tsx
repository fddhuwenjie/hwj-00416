import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Ban, PenLine, CheckCircle, Clock } from 'lucide-react';
import { contractApi } from '../api/contract.js';
import { useAppStore } from '../store/app.js';
import PageHeader from '../components/Common/PageHeader.js';
import StatusBadge from '../components/Common/StatusBadge.js';
import SignatureModal from '../components/Common/SignatureModal.js';
import type { Contract } from '../../shared/types.js';
import { contractStatusMap, formatCurrency, formatDate, formatDateTime, getDaysBetween } from '../utils/format.js';

type SignatureParty = 'lessor' | 'lessee' | null;

export default function ContractDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [signatureModalOpen, setSignatureModalOpen] = useState(false);
  const [signingParty, setSigningParty] = useState<SignatureParty>(null);
  const { showMessage, setLoading: setAppLoading } = useAppStore();

  useEffect(() => {
    if (id) loadContract();
  }, [id]);

  async function loadContract() {
    try {
      setLoading(true);
      const data = await contractApi.getById(Number(id));
      setContract(data);
    } catch (error) {
      showMessage('error', (error as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleTerminate() {
    if (!contract) return;
    if (!confirm(`确定要终止合同"${contract.contractNo}"吗？终止后合同将无法恢复。`)) return;

    try {
      setAppLoading('terminate', true);
      await contractApi.terminate(contract.id);
      showMessage('success', '合同终止成功');
      loadContract();
    } catch (error) {
      showMessage('error', (error as Error).message);
    } finally {
      setAppLoading('terminate', false);
    }
  }

  async function handleDownload() {
    if (!contract) return;
    try {
      setAppLoading('download', true);
      const htmlContent = await contractApi.download(contract.id);
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${contract.contractNo}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showMessage('success', '合同下载成功');
    } catch (error) {
      showMessage('error', (error as Error).message);
    } finally {
      setAppLoading('download', false);
    }
  }

  function openSignatureModal(party: SignatureParty) {
    setSigningParty(party);
    setSignatureModalOpen(true);
  }

  async function handleSignatureSave(signatureData: string) {
    if (!contract || !signingParty) return;

    try {
      setAppLoading('sign', true);
      await contractApi.sign(contract.id, {
        party: signingParty,
        signatureData,
      });
      showMessage('success', `${signingParty === 'lessor' ? '出租方' : '承租方'}签名成功`);
      loadContract();
    } catch (error) {
      showMessage('error', (error as Error).message);
    } finally {
      setAppLoading('sign', false);
      setSigningParty(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">合同不存在</p>
        <Link to="/contracts" className="mt-4 inline-block text-blue-600 hover:underline">
          返回合同列表
        </Link>
      </div>
    );
  }

  const rentalDays = getDaysBetween(contract.startDate, contract.endDate);

  return (
    <div>
      <PageHeader
        title={`合同详情 - ${contract.contractNo}`}
        description="查看合同详细信息，进行电子签名和合同管理"
        actions={
          <div className="flex items-center gap-3">
            <Link
              to="/contracts"
              className="inline-flex items-center gap-2 px-4 py-2 text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
            >
              <ArrowLeft size={18} />
              返回列表
            </Link>
            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-2 px-4 py-2 text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
            >
              <Download size={18} />
              下载合同
            </button>
            {contract.status === 'active' && (
              <button
                onClick={handleTerminate}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium text-sm shadow-sm"
              >
                <Ban size={18} />
                终止合同
              </button>
            )}
          </div>
        }
      />

      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h3 className="font-semibold text-gray-900 text-lg">合同基本信息</h3>
              <p className="text-sm text-gray-500 mt-1">创建时间: {formatDateTime(contract.createdAt)}</p>
              {contract.signedAt && (
                <p className="text-sm text-gray-500">签署时间: {formatDateTime(contract.signedAt)}</p>
              )}
            </div>
            <StatusBadge
              label={contractStatusMap[contract.status].label}
              color={contractStatusMap[contract.status].color}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-2">合同编号</h4>
              <p className="font-mono font-medium text-blue-600">{contract.contractNo}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-2">关联订单</h4>
              <p className="font-mono text-gray-900">{contract.orderNo}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-2">合同金额</h4>
              <p className="font-semibold text-xl text-blue-600">{formatCurrency(contract.totalAmount)}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-2">客户信息</h4>
              <p className="font-medium text-gray-900">{contract.customerName}</p>
              <p className="text-sm text-gray-500">{contract.customerPhone}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-2">租赁租期</h4>
              <p className="text-gray-900">{formatDate(contract.startDate)} 至 {formatDate(contract.endDate)}</p>
              <p className="text-sm text-gray-500">共 {rentalDays} 天</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-2">合同状态</h4>
              <StatusBadge
                label={contractStatusMap[contract.status].label}
                color={contractStatusMap[contract.status].color}
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-900 text-lg mb-4">合同内容预览</h3>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div
              className="contract-preview p-8 bg-white min-h-[600px] overflow-auto"
              dangerouslySetInnerHTML={{ __html: contract.content }}
            />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-900 text-lg mb-6">电子签名</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border border-gray-200 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium text-gray-900">出租方（甲方）签名</h4>
                {contract.lessorSignature ? (
                  <div className="flex items-center gap-1.5 text-green-600 text-sm">
                    <CheckCircle size={16} />
                    <span>已签名</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-gray-400 text-sm">
                    <Clock size={16} />
                    <span>未签名</span>
                  </div>
                )}
              </div>
              
              {contract.lessorSignature ? (
                <div className="flex items-center justify-center h-32 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                  <img
                    src={contract.lessorSignature}
                    alt="出租方签名"
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              ) : (
                <div className="flex items-center justify-center h-32 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                  <button
                    onClick={() => openSignatureModal('lessor')}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm shadow-sm"
                  >
                    <PenLine size={18} />
                    去签名
                  </button>
                </div>
              )}
            </div>

            <div className="border border-gray-200 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium text-gray-900">承租方（乙方）签名</h4>
                {contract.lesseeSignature ? (
                  <div className="flex items-center gap-1.5 text-green-600 text-sm">
                    <CheckCircle size={16} />
                    <span>已签名</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-gray-400 text-sm">
                    <Clock size={16} />
                    <span>未签名</span>
                  </div>
                )}
              </div>
              
              {contract.lesseeSignature ? (
                <div className="flex items-center justify-center h-32 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                  <img
                    src={contract.lesseeSignature}
                    alt="承租方签名"
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              ) : (
                <div className="flex items-center justify-center h-32 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                  <button
                    onClick={() => openSignatureModal('lessee')}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm shadow-sm"
                  >
                    <PenLine size={18} />
                    去签名
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <SignatureModal
        open={signatureModalOpen}
        onClose={() => {
          setSignatureModalOpen(false);
          setSigningParty(null);
        }}
        onSave={handleSignatureSave}
        title={signingParty === 'lessor' ? '出租方签名' : '承租方签名'}
      />
    </div>
  );
}
