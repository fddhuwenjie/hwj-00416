import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ArrowLeft, UserCheck, Play, CheckCircle, XCircle, Camera, Package, Calendar, User, FileText, DollarSign, Wrench } from 'lucide-react';
import { maintenanceApi } from '../api/maintenance.js';
import { useAppStore } from '../store/app.js';
import PageHeader from '../components/Common/PageHeader.js';
import StatusBadge from '../components/Common/StatusBadge.js';
import type { MaintenanceRecord, MaintenanceTimelineItem, AssignMaintenanceRequest, CompleteMaintenanceRequest } from '../../shared/types.js';
import { formatDateTime, formatCurrency, maintenanceStatusMap, maintenancePriorityMap, maintenanceTypeMap } from '../utils/format.js';
import { cn } from '../lib/utils.js';

export default function MaintenanceDetail() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { showMessage, setLoading: setAppLoading } = useAppStore();
  const [record, setRecord] = useState<MaintenanceRecord | null>(null);
  const [timeline, setTimeline] = useState<MaintenanceTimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [assignedTo, setAssignedTo] = useState('');
  const [estimatedRepairDate, setEstimatedRepairDate] = useState('');
  const [actualCost, setActualCost] = useState('');
  const [replacedParts, setReplacedParts] = useState('');
  const [beforePhotoUrl, setBeforePhotoUrl] = useState('');
  const [afterPhotoUrl, setAfterPhotoUrl] = useState('');
  const [repairNotes, setRepairNotes] = useState('');

  useEffect(() => {
    loadData();
  }, [id]);

  useEffect(() => {
    const state = location.state as { openAssign?: boolean; openComplete?: boolean };
    if (state?.openAssign) {
      setShowAssignModal(true);
      navigate(location.pathname, { replace: true, state: {} });
    }
    if (state?.openComplete) {
      setShowCompleteModal(true);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, []);

  async function loadData() {
    if (!id) return;
    try {
      setLoading(true);
      const [recordData, timelineData] = await Promise.all([
        maintenanceApi.getById(Number(id)),
        maintenanceApi.getTimeline(Number(id)),
      ]);
      setRecord(recordData);
      setTimeline(timelineData);
      if (recordData.assignedTo) setAssignedTo(recordData.assignedTo);
      if (recordData.estimatedRepairDate) setEstimatedRepairDate(recordData.estimatedRepairDate);
      if (recordData.actualCost) setActualCost(String(recordData.actualCost));
      if (recordData.replacedParts) setReplacedParts(recordData.replacedParts);
      if (recordData.beforePhotoUrl) setBeforePhotoUrl(recordData.beforePhotoUrl);
      if (recordData.afterPhotoUrl) setAfterPhotoUrl(recordData.afterPhotoUrl);
      if (recordData.repairNotes) setRepairNotes(recordData.repairNotes);
    } catch (error) {
      showMessage('error', (error as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAssign() {
    if (!assignedTo.trim()) {
      showMessage('error', '请输入维修人员姓名');
      return;
    }
    if (!estimatedRepairDate) {
      showMessage('error', '请选择预计修复时间');
      return;
    }
    if (!id) return;

    try {
      setAppLoading('assign', true);
      const request: AssignMaintenanceRequest = {
        assignedTo: assignedTo.trim(),
        estimatedRepairDate,
      };
      await maintenanceApi.assign(Number(id), request);
      showMessage('success', '工单分配成功');
      setShowAssignModal(false);
      loadData();
    } catch (error) {
      showMessage('error', (error as Error).message);
    } finally {
      setAppLoading('assign', false);
    }
  }

  async function handleStart() {
    if (!id || !confirm('确定要开始维修吗？')) return;
    try {
      setAppLoading('start', true);
      await maintenanceApi.start(Number(id));
      showMessage('success', '已开始维修');
      loadData();
    } catch (error) {
      showMessage('error', (error as Error).message);
    } finally {
      setAppLoading('start', false);
    }
  }

  async function handleComplete() {
    if (!actualCost) {
      showMessage('error', '请输入实际费用');
      return;
    }
    if (!replacedParts.trim()) {
      showMessage('error', '请输入更换配件');
      return;
    }
    if (!id) return;

    try {
      setAppLoading('complete', true);
      const request: CompleteMaintenanceRequest = {
        actualCost: Number(actualCost),
        replacedParts: replacedParts.trim(),
        beforePhotoUrl: beforePhotoUrl.trim() || undefined,
        afterPhotoUrl: afterPhotoUrl.trim() || undefined,
        repairNotes: repairNotes.trim() || undefined,
      };
      await maintenanceApi.complete(Number(id), request);
      showMessage('success', '工单已完成');
      setShowCompleteModal(false);
      loadData();
    } catch (error) {
      showMessage('error', (error as Error).message);
    } finally {
      setAppLoading('complete', false);
    }
  }

  async function handleCancel() {
    if (!id || !confirm('确定要取消此维保工单吗？')) return;
    try {
      setAppLoading('cancel', true);
      await maintenanceApi.cancel(Number(id));
      showMessage('success', '工单已取消');
      loadData();
    } catch (error) {
      showMessage('error', (error as Error).message);
    } finally {
      setAppLoading('cancel', false);
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-12 bg-gray-200 rounded w-1/4"></div>
        <div className="h-64 bg-gray-200 rounded"></div>
        <div className="h-64 bg-gray-200 rounded"></div>
      </div>
    );
  }

  if (!record) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">未找到维保记录</p>
      </div>
    );
  }

  function renderActionButtons() {
    return (
      <div className="flex items-center gap-3">
        {record.status === 'pending' && (
          <button
            onClick={() => setShowAssignModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium text-sm shadow-sm"
          >
            <UserCheck size={18} />
            分配工单
          </button>
        )}
        {record.status === 'assigned' && (
          <button
            onClick={handleStart}
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium text-sm shadow-sm"
          >
            <Play size={18} />
            开始维修
          </button>
        )}
        {record.status === 'in_progress' && (
          <button
            onClick={() => setShowCompleteModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm shadow-sm"
          >
            <CheckCircle size={18} />
            完成维修
          </button>
        )}
        {(record.status === 'pending' || record.status === 'assigned') && (
          <button
            onClick={handleCancel}
            className="inline-flex items-center gap-2 px-4 py-2 text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm shadow-sm"
          >
            <XCircle size={18} />
            取消工单
          </button>
        )}
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={`维保工单 #${record.id}`}
        description={record.deviceName || '设备维保详情'}
        actions={
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/maintenance')}
              className="inline-flex items-center gap-2 px-4 py-2 text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm shadow-sm"
            >
              <ArrowLeft size={18} />
              返回列表
            </button>
            {renderActionButtons()}
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FileText size={18} className="text-blue-600" />
              基本信息
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <Package size={18} className="text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-gray-500">设备名称</p>
                  <p className="font-medium text-gray-900">{record.deviceName || '-'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Wrench size={18} className="text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-gray-500">类型</p>
                  <StatusBadge
                    label={maintenanceTypeMap[record.type].label}
                    color={maintenanceTypeMap[record.type].color}
                  />
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-[18px] h-[18px] flex items-center justify-center text-gray-400 mt-0.5 flex-shrink-0">
                  <span className="text-sm">!</span>
                </div>
                <div>
                  <p className="text-sm text-gray-500">紧急程度</p>
                  <StatusBadge
                    label={maintenancePriorityMap[record.priority].label}
                    color={maintenancePriorityMap[record.priority].color}
                  />
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-[18px] h-[18px] flex items-center justify-center text-gray-400 mt-0.5 flex-shrink-0">
                  <span className="text-sm">●</span>
                </div>
                <div>
                  <p className="text-sm text-gray-500">状态</p>
                  <StatusBadge
                    label={maintenanceStatusMap[record.status].label}
                    color={maintenanceStatusMap[record.status].color}
                  />
                </div>
              </div>
              <div className="flex items-start gap-3">
                <User size={18} className="text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-gray-500">报修人</p>
                  <p className="font-medium text-gray-900">{record.reporterName}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar size={18} className="text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-gray-500">报修时间</p>
                  <p className="font-medium text-gray-900">{formatDateTime(record.createdAt)}</p>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-sm text-gray-500 mb-2">故障描述</p>
              <p className="text-gray-700">{record.faultDescription}</p>
            </div>
            {record.photoUrl && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-sm text-gray-500 mb-2 flex items-center gap-2">
                  <Camera size={14} />
                  报修照片
                </p>
                <img
                  src={record.photoUrl}
                  alt="报修照片"
                  className="w-full max-w-md rounded-lg border border-gray-200"
                />
              </div>
            )}
          </div>

          {record.assignedTo && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <UserCheck size={18} className="text-orange-600" />
                工单分配信息
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <User size={18} className="text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-gray-500">维修人员</p>
                    <p className="font-medium text-gray-900">{record.assignedTo}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Calendar size={18} className="text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-gray-500">预计修复时间</p>
                    <p className="font-medium text-gray-900">{record.estimatedRepairDate || '-'}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {record.status === 'completed' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <CheckCircle size={18} className="text-green-600" />
                维修完成信息
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="flex items-start gap-3">
                  <DollarSign size={18} className="text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-gray-500">实际费用</p>
                    <p className="font-medium text-blue-600">{formatCurrency(record.actualCost || 0)}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Wrench size={18} className="text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-gray-500">更换配件</p>
                    <p className="font-medium text-gray-900">{record.replacedParts || '-'}</p>
                  </div>
                </div>
              </div>
              {(record.beforePhotoUrl || record.afterPhotoUrl) && (
                <div className="mb-4 pt-4 border-t border-gray-100">
                  <p className="text-sm text-gray-500 mb-3 flex items-center gap-2">
                    <Camera size={14} />
                    维修前后照片对比
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {record.beforePhotoUrl && (
                      <div>
                        <p className="text-xs text-gray-400 mb-1">维修前</p>
                        <img
                          src={record.beforePhotoUrl}
                          alt="维修前"
                          className="w-full rounded-lg border border-gray-200"
                        />
                      </div>
                    )}
                    {record.afterPhotoUrl && (
                      <div>
                        <p className="text-xs text-gray-400 mb-1">维修后</p>
                        <img
                          src={record.afterPhotoUrl}
                          alt="维修后"
                          className="w-full rounded-lg border border-gray-200"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
              {record.repairNotes && (
                <div className="pt-4 border-t border-gray-100">
                  <p className="text-sm text-gray-500 mb-2">维修备注</p>
                  <p className="text-gray-700">{record.repairNotes}</p>
                </div>
              )}
              {record.completedAt && (
                <div className="mt-4 pt-4 border-t border-gray-100 text-sm text-gray-500">
                  完成时间：{formatDateTime(record.completedAt)}
                </div>
              )}
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <div className="w-[18px] h-[18px] flex items-center justify-center">
                <span className="text-sm text-blue-600">↕</span>
              </div>
              维保历史
            </h3>
            <div className="relative">
              <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-gray-200"></div>
              <div className="space-y-6">
                {timeline.map((item, index) => (
                  <div key={item.id} className="relative flex gap-4">
                    <div className={cn(
                      'w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 z-10',
                      index === 0 ? 'bg-blue-600' : 'bg-gray-300'
                    )}>
                      <div className={cn(
                        'w-2 h-2 rounded-full',
                        index === 0 ? 'bg-white' : 'bg-gray-500'
                      )}></div>
                    </div>
                    <div className="flex-1 pb-6">
                      <div className="flex items-center gap-2 mb-1">
                        <StatusBadge
                          label={maintenanceStatusMap[item.status].label}
                          color={maintenanceStatusMap[item.status].color}
                          small
                        />
                        <span className="text-xs text-gray-400">{formatDateTime(item.createdAt)}</span>
                      </div>
                      <p className="text-gray-900 mb-1">{item.description}</p>
                      {item.operator && (
                        <p className="text-sm text-gray-500">操作人：{item.operator}</p>
                      )}
                    </div>
                  </div>
                ))}
                {timeline.length === 0 && (
                  <p className="text-gray-400 text-center py-4 pl-10">暂无历史记录</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sticky top-6">
            <h3 className="font-semibold text-gray-900 mb-4">操作</h3>
            <div className="space-y-3">
              {record.status === 'pending' && (
                <button
                  onClick={() => setShowAssignModal(true)}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium text-sm"
                >
                  <UserCheck size={18} />
                  分配工单
                </button>
              )}
              {record.status === 'assigned' && (
                <button
                  onClick={handleStart}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium text-sm"
                >
                  <Play size={18} />
                  开始维修
                </button>
              )}
              {record.status === 'in_progress' && (
                <button
                  onClick={() => setShowCompleteModal(true)}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm"
                >
                  <CheckCircle size={18} />
                  完成维修
                </button>
              )}
              {(record.status === 'pending' || record.status === 'assigned') && (
                <button
                  onClick={handleCancel}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors font-medium text-sm"
                >
                  <XCircle size={18} />
                  取消工单
                </button>
              )}
              <button
                onClick={() => navigate('/maintenance')}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors font-medium text-sm"
              >
                <ArrowLeft size={18} />
                返回列表
              </button>
            </div>
          </div>
        </div>
      </div>

      {showAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">分配工单</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">维修人员姓名</label>
                <input
                  type="text"
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  placeholder="请输入维修人员姓名"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">预计修复时间</label>
                <input
                  type="datetime-local"
                  value={estimatedRepairDate}
                  onChange={(e) => setEstimatedRepairDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAssignModal(false)}
                className="flex-1 px-4 py-2 text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
              >
                取消
              </button>
              <button
                onClick={handleAssign}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
              >
                确认分配
              </button>
            </div>
          </div>
        </div>
      )}

      {showCompleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 my-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">完成维修</h3>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">实际费用（元）</label>
                <input
                  type="number"
                  value={actualCost}
                  onChange={(e) => setActualCost(e.target.value)}
                  placeholder="请输入实际费用"
                  min={0}
                  step="0.01"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">更换配件</label>
                <input
                  type="text"
                  value={replacedParts}
                  onChange={(e) => setReplacedParts(e.target.value)}
                  placeholder="请输入更换的配件，多个配件用逗号分隔"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">维修前照片URL（选填）</label>
                <input
                  type="text"
                  value={beforePhotoUrl}
                  onChange={(e) => setBeforePhotoUrl(e.target.value)}
                  placeholder="请输入维修前照片URL"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">维修后照片URL（选填）</label>
                <input
                  type="text"
                  value={afterPhotoUrl}
                  onChange={(e) => setAfterPhotoUrl(e.target.value)}
                  placeholder="请输入维修后照片URL"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">维修备注（选填）</label>
                <textarea
                  value={repairNotes}
                  onChange={(e) => setRepairNotes(e.target.value)}
                  placeholder="请输入维修备注"
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6 pt-4 border-t border-gray-100">
              <button
                onClick={() => setShowCompleteModal(false)}
                className="flex-1 px-4 py-2 text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
              >
                取消
              </button>
              <button
                onClick={handleComplete}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm"
              >
                确认完成
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
