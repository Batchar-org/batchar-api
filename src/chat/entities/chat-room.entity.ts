import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToOne, JoinColumn, BaseEntity as TypeOrmBaseEntity } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Product } from '../../product/entities/product.entity';
import { User } from '../../user/entities/user.entity';
import { ChatStatus } from './chat-status.enum';

@Entity({ name: 'chat_room' })
export class ChatRoom extends BaseEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @OneToOne(() => Product, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'seller_id' })
  seller: User;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'buyer_id' })
  buyer: User;

  @Column({
    type: 'enum',
    enum: ChatStatus,
    nullable: false,
  })
  status: ChatStatus;

  @Column({ name: 'seller_confirmed', type: 'boolean', default: false })
  sellerConfirmed: boolean;

  @Column({ name: 'buyer_confirmed', type: 'boolean', default: false })
  buyerConfirmed: boolean;

  @Column({ name: 'seller_deleted', type: 'boolean', default: false })
  sellerDeleted: boolean;

  @Column({ name: 'buyer_deleted', type: 'boolean', default: false })
  buyerDeleted: boolean;

  static createChatRoom(product: Product, seller: User, buyer: User): ChatRoom {
    const cr = new ChatRoom();
    cr.product = product;
    cr.seller = seller;
    cr.buyer = buyer;
    cr.status = ChatStatus.ACTIVE;
    cr.sellerConfirmed = false;
    cr.buyerConfirmed = false;
    cr.sellerDeleted = false;
    cr.buyerDeleted = false;
    return cr;
  }

  isParticipant(userId: number): boolean {
    return Number(this.seller.id) === Number(userId) || Number(this.buyer.id) === Number(userId);
  }

  markAsDeleted(userId: number): void {
    if (Number(this.seller.id) === Number(userId)) {
      this.sellerDeleted = true;
    } else {
      this.buyerDeleted = true;
    }
  }

  isBothDeleted(): boolean {
    return this.sellerDeleted && this.buyerDeleted;
  }

  confirmTrade(userId: number): void {
    if (Number(this.seller.id) === Number(userId)) {
      this.sellerConfirmed = true;
    } else {
      this.buyerConfirmed = true;
    }
  }

  isBothConfirmed(): boolean {
    return this.sellerConfirmed && this.buyerConfirmed;
  }

  isAlreadyConfirmedBy(userId: number): boolean {
    if (Number(this.seller.id) === Number(userId)) {
      return this.sellerConfirmed;
    } else {
      return this.buyerConfirmed;
    }
  }
}
