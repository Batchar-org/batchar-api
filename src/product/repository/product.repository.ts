import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, LessThan, Repository } from 'typeorm';
import { Product } from '../entities/product.entity';
import { ProductStatus } from '../enum/product-status.enum';
import { ProductViewType } from '../enum/product-view-type.enum';
import { Wish } from '../../wish/entities/wish.entity';

export type ProductListQuery = {
  view: ProductViewType;
  userId: number | null;
  category?: string;
  keywordPattern: string | null;
  blockedUserIds: number[];
  skip: number;
  take: number;
};

@Injectable()
export class ProductRepository {
  constructor(
    @InjectRepository(Product)
    private readonly repository: Repository<Product>,
  ) {}

  // 트랜잭션 안에서는 manager를 넘겨 같은 커넥션으로 실행한다.
  private repo(manager?: EntityManager): Repository<Product> {
    return manager ? manager.getRepository(Product) : this.repository;
  }

  findById(id: number): Promise<Product | null> {
    return this.repo().findOne({ where: { id } });
  }

  existsById(id: number): Promise<boolean> {
    return this.repo().exists({ where: { id } });
  }

  findByIdWithSeller(id: number): Promise<Product | null> {
    return this.repo().findOne({ where: { id }, relations: { seller: true } });
  }

  findByIdWithSellerAndWinner(id: number): Promise<Product | null> {
    return this.repo().findOne({
      where: { id },
      relations: { seller: true, winner: true },
    });
  }

  // 비관적 쓰기 락(PESSIMISTIC_WRITE) 조회 (트랜잭션 전용)
  findByIdForUpdate(
    id: number,
    manager: EntityManager,
  ): Promise<Product | null> {
    return this.repo(manager).findOne({
      where: { id },
      lock: { mode: 'pessimistic_write' },
      relations: { seller: true },
    });
  }

  // 판매자 본인 상품만 비관적 쓰기 락으로 조회 (트랜잭션 전용)
  findBySellerForUpdate(
    id: number,
    sellerId: number,
    manager: EntityManager,
  ): Promise<Product | null> {
    return this.repo(manager).findOne({
      where: { id, seller: { id: sellerId } },
      lock: { mode: 'pessimistic_write' },
      relations: { seller: true },
    });
  }

  findOnSaleBySeller(sellerId: number): Promise<Product | null> {
    return this.repo().findOne({
      where: { seller: { id: sellerId }, status: ProductStatus.ON_SALE },
    });
  }

  findExpiredOnSale(now: Date): Promise<Product[]> {
    return this.repo().find({
      where: { status: ProductStatus.ON_SALE, endTime: LessThan(now) },
    });
  }

  findList(query: ProductListQuery): Promise<Product[]> {
    const { view, userId, category, keywordPattern, blockedUserIds } = query;
    const now = new Date();
    const activeProductCondition =
      'product.status = :onSaleStatus AND product.end_time > :now';

    // View 타입에 맞춰 쿼리 빌더를 이용하여 조회 분기 처리
    const qb = this.repo().createQueryBuilder('product');
    qb.leftJoinAndSelect('product.seller', 'seller');
    qb.leftJoinAndSelect('product.winner', 'winner');
    qb.setParameters({
      onSaleStatus: ProductStatus.ON_SALE,
      now,
    });

    if (view === ProductViewType.MY_PRODUCTS) {
      qb.where('product.seller_id = :userId', { userId });
    } else if (view === ProductViewType.MY_BIDS) {
      qb.innerJoin('bids', 'bid', 'bid.product_id = product.id')
        .where('bid.bidder_id = :userId', { userId })
        .andWhere(
          `(${activeProductCondition} OR product.winner_id = :userId)`,
          { userId },
        )
        .distinct(true);
    } else if (view === ProductViewType.MY_ACTIVE_BIDS) {
      qb.innerJoin('bids', 'bid', 'bid.product_id = product.id')
        .where('bid.bidder_id = :userId', { userId })
        .andWhere(activeProductCondition)
        .distinct(true);
    } else if (view === ProductViewType.ALL) {
      qb.where('1 = 1');
    } else if (view === ProductViewType.BID_CLOSED) {
      qb.where(`NOT (${activeProductCondition})`);
    } else {
      qb.where(activeProductCondition);
    }

    if (category) {
      qb.andWhere('product.category = :category', { category });
    }

    if (keywordPattern) {
      qb.andWhere('LOWER(product.title) LIKE LOWER(:keyword)', {
        keyword: keywordPattern,
      });
    }

    // 삭제 처리된 상품은 모든 뷰에서 제외
    qb.andWhere('product.status != :deletedStatus', {
      deletedStatus: ProductStatus.DELETED,
    });

    // 차단 관계(양방향)인 판매자의 상품 제외
    if (blockedUserIds.length > 0) {
      qb.andWhere('product.seller_id NOT IN (:...blockedUserIds)', {
        blockedUserIds,
      });
    }

    // 정렬 분기
    if (view === ProductViewType.POPULAR) {
      qb.addSelect(
        (subQuery) =>
          subQuery
            .select('COUNT(wish.id)')
            .from(Wish, 'wish')
            .where('wish.product_id = product.id'),
        'wishCountForOrder',
      )
        .orderBy('wishCountForOrder', 'DESC')
        .addOrderBy('product.created_at', 'DESC');
    } else if (view === ProductViewType.ENDING_SOON) {
      qb.orderBy('product.end_time', 'ASC');
    } else {
      // LATEST / ALL / BIDDING / BID_CLOSED / MY_PRODUCTS / MY_ACTIVE_BIDS / MY_BIDS 등은 생성시각 역순
      qb.orderBy('product.created_at', 'DESC');
    }

    return qb.skip(query.skip).take(query.take).getMany();
  }

  // 보존기간이 지난 삭제 상품 (낙찰 이력 있으면 completed 기준, 없으면 default 기준)
  findPurgeableDeleted(
    completedRetentionDate: Date,
    defaultRetentionDate: Date,
    limit: number,
  ): Promise<Product[]> {
    return this.repo()
      .createQueryBuilder('product')
      .where('product.status = :deletedStatus', {
        deletedStatus: ProductStatus.DELETED,
      })
      .andWhere('product.deleted_at IS NOT NULL')
      .andWhere(
        [
          '(',
          '(',
          'product.winner_id IS NOT NULL',
          'AND product.deleted_at <= :completedRetentionDate',
          ')',
          'OR',
          '(',
          'product.winner_id IS NULL',
          'AND product.deleted_at <= :defaultRetentionDate',
          ')',
          ')',
        ].join(' '),
        {
          completedRetentionDate,
          defaultRetentionDate,
        },
      )
      .take(limit)
      .getMany();
  }

  save(product: Product, manager?: EntityManager): Promise<Product> {
    return this.repo(manager).save(product);
  }

  async deleteById(id: number, manager?: EntityManager): Promise<void> {
    await this.repo(manager).delete(id);
  }
}
