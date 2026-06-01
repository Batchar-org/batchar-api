import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ProductMedia } from './entities/product-media.entity';
import { Product } from './entities/product.entity';
import { StorageService } from '../common/storage/storage.service';
import { getProductMediaTypeFromFileName } from './entities/product-media-type.enum';
import { BusinessException } from '../common/exceptions/business.exception';
import { ProductMediaInfo } from './dto/product.dto';

@Injectable()
export class ProductMediaService {
  private readonly logger = new Logger(ProductMediaService.name);

  constructor(
    @InjectRepository(ProductMedia)
    private readonly productMediaRepository: Repository<ProductMedia>,
    private readonly storageService: StorageService,
  ) {}

  async saveMedia(product: Product, files: Express.Multer.File[]): Promise<void> {
    if (!files || files.length === 0) return;

    for (const file of files) {
      const mediaUrl = await this.storageService.upload(file);
      const mediaType = getProductMediaTypeFromFileName(file.originalname);
      const media = ProductMedia.from(product, mediaUrl, mediaType);
      await this.productMediaRepository.save(media);
    }
  }

  async getFirstMediaUrl(productId: number): Promise<string | null> {
    const media = await this.productMediaRepository.findOne({
      where: { product: { id: productId } },
      order: { id: 'ASC' },
    });
    return media ? media.mediaUrl : null;
  }

  async getMediaInfoByProductId(productId: number): Promise<ProductMediaInfo[]> {
    const mediaList = await this.productMediaRepository.find({
      where: { product: { id: productId } },
      order: { id: 'ASC' },
    });

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
    const currentCount = await this.productMediaRepository.count({
      where: { product: { id: productId } },
    });

    const newFilesCount = newFiles ? newFiles.length : 0;
    const remainingCount = currentCount - deleteMediaIds.length + newFilesCount;

    if (remainingCount < 1) {
      throw new BusinessException('PRODUCT_MEDIA_REQUIRED');
    }
  }

  async deleteMediaByIds(productId: number, deleteMediaIds: number[]): Promise<void> {
    const mediaList = await this.productMediaRepository.find({
      where: { id: In(deleteMediaIds), product: { id: productId } },
    });

    if (mediaList.length === 0) return;

    // S3에서 미디어 삭제
    for (const media of mediaList) {
      await this.storageService.delete(media.mediaUrl);
    }

    // DB에서 미디어 삭제
    await this.productMediaRepository.remove(mediaList);
  }

  async deleteAllByProductId(productId: number): Promise<void> {
    const mediaList = await this.productMediaRepository.find({
      where: { product: { id: productId } },
    });

    for (const media of mediaList) {
      await this.storageService.delete(media.mediaUrl);
    }

    await this.productMediaRepository.remove(mediaList);
  }
}
