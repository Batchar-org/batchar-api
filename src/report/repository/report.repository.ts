import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, MoreThan, Repository } from 'typeorm';
import { Report } from '../entities/report.entity';
import { ReportStatus } from '../enum/report-status.enum';

export type ReportTarget = {
  targetUser?: { id: number };
  targetProduct?: { id: number };
  targetMessage?: { id: number };
};

@Injectable()
export class ReportRepository {
  constructor(
    @InjectRepository(Report)
    private readonly repository: Repository<Report>,
  ) {}

  // since 이후 같은 신고자가 같은 대상을 신고한 이력
  findRecentDuplicate(
    reporterId: number,
    target: ReportTarget,
    since: Date,
  ): Promise<Report | null> {
    return this.repository.findOne({
      where: {
        reporter: { id: reporterId },
        ...target,
        createdAt: MoreThan(since),
      },
    });
  }

  findByIdWithReporter(id: number): Promise<Report | null> {
    return this.repository.findOne({
      where: { id },
      relations: { reporter: true },
    });
  }

  findPage(
    status: ReportStatus | undefined,
    skip: number,
    take: number,
  ): Promise<Report[]> {
    return this.repository.find({
      where: status ? { status } : {},
      relations: {
        reporter: true,
        targetUser: true,
        targetProduct: true,
        targetMessage: { sender: true },
        targetChatRoom: true,
      },
      order: { createdAt: 'DESC' },
      skip,
      take,
    });
  }

  findDetailById(id: number): Promise<Report | null> {
    return this.repository.findOne({
      where: { id },
      relations: {
        reporter: true,
        targetUser: true,
        targetProduct: true,
        targetMessage: { sender: true, chat: true },
        targetChatRoom: true,
      },
    });
  }

  create(data: DeepPartial<Report>): Report {
    return this.repository.create(data);
  }

  save(report: Report): Promise<Report> {
    return this.repository.save(report);
  }
}
