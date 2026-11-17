import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';
import { ProductMedia } from '../entities/product-media.entity';

@Injectable()
export class ProductMediaRepository {
  constructor(
    @InjectRepository(ProductMedia)
    private readonly repository: Repository<ProductMedia>,
  ) {}

  // 트랜잭션 안에서는 manager를 넘겨 같은 커넥션으로 실행한다.
  private repo(manager?: EntityManager): Repository<ProductMedia> {
    return manager ? manager.getRepository(ProductMedia) : this.repository;
  }

  findFirstByProduct(productId: number): Promise<ProductMedia | null> {
    return this.repo().findOne({
      where: { product: { id: productId } },
      order: { id: 'ASC' },
    });
  }

  findAllByProduct(productId: number): Promise<ProductMedia[]> {
    return this.repo().find({
      where: { product: { id: productId } },
      order: { id: 'ASC' },
    });
  }

  // 삭제 대상 조회용 (정렬 불필요)
  findAllByProductForDelete(
    productId: number,
    manager?: EntityManager,
  ): Promise<ProductMedia[]> {
    return this.repo(manager).find({ where: { product: { id: productId } } });
  }

  findByIdsAndProduct(
    ids: number[],
    productId: number,
    manager?: EntityManager,
  ): Promise<ProductMedia[]> {
    return this.repo(manager).find({
      where: { id: In(ids), product: { id: productId } },
    });
  }

  countByProduct(productId: number): Promise<number> {
    return this.repo().count({ where: { product: { id: productId } } });
  }

  save(media: ProductMedia, manager?: EntityManager): Promise<ProductMedia> {
    return this.repo(manager).save(media);
  }

  async remove(
    mediaList: ProductMedia[],
    manager?: EntityManager,
  ): Promise<void> {
    await this.repo(manager).remove(mediaList);
  }
}
