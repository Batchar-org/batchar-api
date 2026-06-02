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

  // 밭비옥도(0~100, %). 0.5 단위 증감을 정확히 저장하기 위해 DECIMAL 사용. 기본 30%.
  // TypeORM은 decimal을 문자열로 돌려주므로 transformer로 number로 변환한다.
  @Column({
    type: 'decimal',
    precision: 5,
    scale: 1,
    default: 30,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value),
    },
  })
  fertility: number;

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

  canReceiveWater(): boolean {
    return this.fertility < 100;
  }

  canReceiveAcidRain(): boolean {
    return this.fertility > 0;
  }

  water(): void {
    this.fertility = Math.min(100, this.fertility + 0.5);
  }

  acidRain(): void {
    this.fertility = Math.max(0, this.fertility - 0.5);
  }
}
