import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';

import { Wish } from '../entities/wish.entity';

@Injectable()
export class WishRepository {
  constructor(
    @InjectRepository(Wish)
    private readonly repository: Repository<Wish>,
  ) {}

  // 트랜잭션 안에서는 manager를 넘겨 같은 커넥션으로 실행한다.
  private repo(manager?: EntityManager): Repository<Wish> {
    return manager ? manager.getRepository(Wish) : this.repository;
  }

  findByUserAndProduct(
    userId: number,
    productId: number,
  ): Promise<Wish | null> {
    return this.repo().findOne({
      where: { user: { id: userId }, product: { id: productId } },
    });
  }

  existsByUserAndProduct(userId: number, productId: number): Promise<boolean> {
    return this.repo().exists({
      where: { user: { id: userId }, product: { id: productId } },
    });
  }

  findPageByUserWithProduct(
    userId: number,
    skip: number,
    take: number,
  ): Promise<Wish[]> {
    return this.repo().find({
      where: { user: { id: userId } },
      relations: { product: { seller: true } },
      order: { createdAt: 'DESC' },
      skip,
      take,
    });
  }

  countByProduct(productId: number): Promise<number> {
    return this.repo().count({ where: { product: { id: productId } } });
  }

  save(wish: Wish): Promise<Wish> {
    return this.repo().save(wish);
  }

  async remove(wish: Wish): Promise<void> {
    await this.repo().remove(wish);
  }

  async deleteAllByUser(userId: number): Promise<void> {
    await this.repo().delete({ user: { id: userId } });
  }

  async deleteAllByProduct(
    productId: number,
    manager?: EntityManager,
  ): Promise<void> {
    await this.repo(manager)
      .manager.createQueryBuilder()
      .delete()
      .from(Wish)
      .where('product_id = :productId', { productId })
      .execute();
  }
}
