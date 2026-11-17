import { Injectable, Logger } from '@nestjs/common';
import { EntityManager } from 'typeorm';

import { BusinessException } from '../../common/exceptions/business.exception';
import { StorageService } from '../../common/storage/service/storage.service';

import { ProductMediaInfo } from '../dto/product-media-info.dto';
import { ProductMedia } from '../entities/product-media.entity';
import { Product } from '../entities/product.entity';
import { getProductMediaTypeFromFileName } from '../enum/product-media-type.enum';
import { ProductMediaRepository } from '../repository/product-media.repository';

@Injectable()
export class ProductMediaService {
  private readonly logger = new Logger(ProductMediaService.name);

  constructor(
    private readonly productMediaRepository: ProductMediaRepository,
    private readonly storageService: StorageService,
  ) {}

  async saveMedia(
    product: Product,
    files: Express.Multer.File[],
    manager?: EntityManager,
  ): Promise<void> {
    if (!files || files.length === 0) return;

    // 호출자의 트랜잭션 매니저가 넘어오면 같은 트랜잭션에 참여한다 (기본 풀로 빠지면 FK 락 대기 데드락 발생).

    for (const file of files) {
      const mediaUrl = await this.storageService.upload(file);
      const mediaType = getProductMediaTypeFromFileName(file.originalname);
      const media = ProductMedia.from(product, mediaUrl, mediaType);
      await this.productMediaRepository.save(media, manager);
    }
  }

  async getFirstMediaUrl(productId: number): Promise<string | null> {
    const media =
      await this.productMediaRepository.findFirstByProduct(productId);
    return media ? media.mediaUrl : null;
  }

  async getMediaInfoByProductId(
    productId: number,
  ): Promise<ProductMediaInfo[]> {
    const mediaList =
      await this.productMediaRepository.findAllByProduct(productId);

    return mediaList.map((m) => ({
      id: m.id,
      mediaUrl: m.mediaUrl,
      mediaType: m.mediaType,
    }));
  }

  async validateMinimumMediaCount(
    productId: number,
    deleteMediaIds: number[],
    newFiles?: Express.Multer.File[],
  ): Promise<void> {
    const currentCount =
      await this.productMediaRepository.countByProduct(productId);

    const newFilesCount = newFiles ? newFiles.length : 0;
    const remainingCount = currentCount - deleteMediaIds.length + newFilesCount;

    if (remainingCount < 1) {
      throw new BusinessException('PRODUCT_MEDIA_REQUIRED');
    }
  }

  async deleteMediaByIds(
    productId: number,
    deleteMediaIds: number[],
    manager?: EntityManager,
  ): Promise<void> {
    const mediaList = await this.productMediaRepository.findByIdsAndProduct(
      deleteMediaIds,
      productId,
      manager,
    );

    if (mediaList.length === 0) return;

    // S3에서 미디어 삭제
    for (const media of mediaList) {
      await this.storageService.delete(media.mediaUrl);
    }

    // DB에서 미디어 삭제
    await this.productMediaRepository.remove(mediaList, manager);
  }

  async deleteAllByProductId(
    productId: number,
    manager?: EntityManager,
  ): Promise<void> {
    const mediaList =
      await this.productMediaRepository.findAllByProductForDelete(
        productId,
        manager,
      );

    for (const media of mediaList) {
      await this.storageService.delete(media.mediaUrl);
    }

    await this.productMediaRepository.remove(mediaList, manager);
  }
}
