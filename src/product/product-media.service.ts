import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';
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

  async saveMedia(
    product: Product,
    files: Express.Multer.File[],
    manager?: EntityManager,
  ): Promise<void> {
    if (!files || files.length === 0) return;

    // 호출자의 트랜잭션 매니저가 넘어오면 같은 트랜잭션에 참여한다 (기본 풀로 빠지면 FK 락 대기 데드락 발생).
    const repository = manager ? manager.getRepository(ProductMedia) : this.productMediaRepository;

    for (const file of files) {
      const mediaUrl = await this.storageService.upload(file);
      const mediaType = getProductMediaTypeFromFileName(file.originalname);
      const media = ProductMedia.from(product, mediaUrl, mediaType);
      await repository.save(media);
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

  async deleteMediaByIds(
    productId: number,
    deleteMediaIds: number[],
    manager?: EntityManager,
  ): Promise<void> {
    const repository = manager ? manager.getRepository(ProductMedia) : this.productMediaRepository;

    const mediaList = await repository.find({
      where: { id: In(deleteMediaIds), product: { id: productId } },
    });

    if (mediaList.length === 0) return;

    // S3에서 미디어 삭제
    for (const media of mediaList) {
      await this.storageService.delete(media.mediaUrl);
    }

    // DB에서 미디어 삭제
    await repository.remove(mediaList);
  }

  async deleteAllByProductId(productId: number, manager?: EntityManager): Promise<void> {
    const repository = manager ? manager.getRepository(ProductMedia) : this.productMediaRepository;

    const mediaList = await repository.find({
      where: { product: { id: productId } },
    });

    for (const media of mediaList) {
      await this.storageService.delete(media.mediaUrl);
    }

    await repository.remove(mediaList);
  }
}
