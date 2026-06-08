import { packageRepository } from '../repositories/package.repository.js';
import { deviceRepository } from '../repositories/device.repository.js';
import type { Package, PackageItem, CreatePackageRequest, PackageStatus } from '../../../shared/types.js';

export class PackageService {
  async getAllPackages(status?: PackageStatus): Promise<Package[]> {
    let packages = packageRepository.findAllWithDetails();

    if (status) {
      packages = packages.filter(p => p.status === status);
    }

    return packages;
  }

  async getPackageById(id: number): Promise<(Package & { items: PackageItem[] }) | null> {
    return packageRepository.findByIdWithDetails(id);
  }

  async createPackage(request: CreatePackageRequest): Promise<Package & { items: PackageItem[] }> {
    if (!request.items || request.items.length === 0) {
      throw new Error('套餐至少需要包含一个设备');
    }

    const deviceIds = new Set<number>();
    let originalPrice = 0;

    for (const item of request.items) {
      if (deviceIds.has(item.deviceId)) {
        throw new Error(`设备ID ${item.deviceId} 重复`);
      }
      deviceIds.add(item.deviceId);

      const device = deviceRepository.findById(item.deviceId);
      if (!device) {
        throw new Error(`设备ID ${item.deviceId} 不存在`);
      }

      originalPrice += device.dailyRate * item.quantity;
    }

    originalPrice = Math.round(originalPrice * 100) / 100;
    const totalPrice = Math.round(originalPrice * 0.85 * 100) / 100;

    const packageItems = request.items.map(item => ({
      deviceId: item.deviceId,
      quantity: item.quantity,
    }));

    return packageRepository.create(
      {
        name: request.name,
        description: request.description,
        status: 'active',
        totalPrice,
        originalPrice,
        photoUrl: request.photoUrl,
      },
      packageItems
    );
  }

  async updatePackage(id: number, request: Partial<CreatePackageRequest>): Promise<Package | null> {
    const existingPackage = packageRepository.findById(id);
    if (!existingPackage) {
      throw new Error('套餐不存在');
    }

    const updateData: Partial<Omit<Package, 'id' | 'createdAt' | 'items'>> = {};

    if (request.name !== undefined) {
      updateData.name = request.name;
    }
    if (request.description !== undefined) {
      updateData.description = request.description;
    }
    if (request.photoUrl !== undefined) {
      updateData.photoUrl = request.photoUrl;
    }

    return packageRepository.update(id, updateData);
  }

  async togglePackageStatus(id: number): Promise<Package | null> {
    const existingPackage = packageRepository.findById(id);
    if (!existingPackage) {
      throw new Error('套餐不存在');
    }

    return packageRepository.toggleStatus(id);
  }
}

export const packageService = new PackageService();
