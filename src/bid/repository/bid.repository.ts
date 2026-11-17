import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';

import { ProductStatus } from '../../product/enum/product-status.enum';

import { Bid } from '../entities/bid.entity';

@Injectable()
export class BidRepository {
  constructor(
    @InjectRepository(Bid)
    private readonly repository: Repository<Bid>,
  ) {}

  // 트랜잭션 안에서는 manager를 넘겨 같은 커넥션으로 실행한다.
  private repo(manager?: EntityManager): Repository<Bid> {
    return manager ? manager.getRepository(Bid) : this.repository;
  }

  // 상품의 최고가 입찰 (입찰자 포함)
  findHighestByProduct(
    productId: number,
    manager?: EntityManager,
  ): Promise<Bid | null> {
    return this.repo(manager).findOne({
      where: { product: { id: productId } },
      order: { price: 'DESC' },
      relations: { bidder: true },
    });
  }

  // 특정 입찰자가 해당 상품에 넣은 최고가 입찰
  findHighestByBidderAndProduct(
    bidderId: number,
    productId: number,
  ): Promise<Bid | null> {
    return this.repo().findOne({
      where: { bidder: { id: bidderId }, product: { id: productId } },
      order: { price: 'DESC' },
    });
  }

  findAllByProductWithBidder(
    productId: number,
    manager?: EntityManager,
  ): Promise<Bid[]> {
    return this.repo(manager).find({
      where: { product: { id: productId } },
      relations: { bidder: true },
    });
  }

  findPageByProduct(
    productId: number,
    skip: number,
    take: number,
  ): Promise<Bid[]> {
    return this.repo().find({
      where: { product: { id: productId } },
      relations: { bidder: true },
      order: { price: 'DESC' },
      skip,
      take,
    });
  }

  // 진행 중인 경매에 걸린 입찰
  findOnSaleByBidder(bidderId: number): Promise<Bid | null> {
    return this.repo().findOne({
      where: {
        bidder: { id: bidderId },
        product: { status: ProductStatus.ON_SALE },
      },
    });
  }

  // 입찰자 중복 제외 카운트
  async countDistinctBidders(productId: number): Promise<number> {
    const result = await this.repo()
      .createQueryBuilder('bid')
      .select('COUNT(DISTINCT bid.bidder_id)', 'count')
      .where('bid.product_id = :productId', { productId })
      .getRawOne<{ count: string }>();
    return parseInt(result?.count || '0', 10);
  }

  save(bid: Bid, manager?: EntityManager): Promise<Bid> {
    return this.repo(manager).save(bid);
  }

  async deleteAllByProduct(
    productId: number,
    manager?: EntityManager,
  ): Promise<void> {
    await this.repo(manager)
      .manager.createQueryBuilder()
      .delete()
      .from(Bid)
      .where('product_id = :productId', { productId })
      .execute();
  }
}
