import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

@Entity({ name: 'users' })
export class User extends BaseEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ unique: true, nullable: false })
  email: string;

  @Column({ nullable: false })
  password: string;

  @Column({ unique: true, nullable: false })
  name: string;

  @Column({ nullable: false })
  address: string;

  @Column({ name: 'profile_image_url', type: 'varchar', length: 500, nullable: true })
  profileImageUrl: string | null;

  @Column({ name: 'suspended_at', type: 'timestamp', nullable: true })
  suspendedAt: Date | null;

  @Column({ name: 'withdrawn_at', type: 'timestamp', nullable: true })
  withdrawnAt: Date | null;

  @Column({ name: 'is_admin', type: 'boolean', default: false })
  isAdmin: boolean;

  withdraw(): void {
    this.email = `withdrawn_${this.id}@deleted.com`;
    this.name = `탈퇴한 사용자${this.id}`;
    this.address = '';
    this.password = '';
    this.withdrawnAt = new Date();
  }

  isActive(): boolean {
    return this.suspendedAt == null && this.withdrawnAt == null;
  }
}
