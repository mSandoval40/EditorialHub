import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { RoleName } from '@prisma/client';
import { diskStorage } from 'multer';
import { existsSync, mkdirSync } from 'fs';
import { extname, join } from 'path';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ApproveWorkDto } from './dto/approve-work.dto';
import { CreateWorkDto } from './dto/create-work.dto';
import { CancelWorkDto } from './dto/cancel-work.dto';
import { RejectWorkDto } from './dto/reject-work.dto';
import { UpsertWorkEditorialDto } from './dto/upsert-work-editorial.dto';
import { UpsertWorkReviewDto } from './dto/upsert-work-review.dto';
import { UpdateWorkDto } from './dto/update-work.dto';
import { WorksService } from './works.service';

type AuthenticatedRequest = {
  user: {
    sub: string;
  };
};

type UploadedWorkFile = {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
};

const WORK_UPLOAD_ROOT = join(process.cwd(), 'uploads', 'works');

function ensureWorkUploadRoot() {
  if (!existsSync(WORK_UPLOAD_ROOT)) {
    mkdirSync(WORK_UPLOAD_ROOT, { recursive: true });
  }
}

function buildWorkFileName(originalName: string) {
  const extension = extname(originalName || '').toLowerCase();
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `${stamp}${extension}`;
}

const workFileInterceptor = FileInterceptor('file', {
  storage: diskStorage({
    destination: (_req, _file, callback) => {
      ensureWorkUploadRoot();
      callback(null, WORK_UPLOAD_ROOT);
    },
    filename: (_req, file, callback) => {
      callback(null, buildWorkFileName(file.originalname));
    },
  }),
});

@Controller()
export class WorksController {
  constructor(private readonly worksService: WorksService) {}

  @Post('works')
  @UseGuards(JwtAuthGuard)
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreateWorkDto) {
    return this.worksService.create(req.user.sub, dto);
  }

  @Get('works/public')
  listPublishedWorks() {
    return this.worksService.listPublishedWorks();
  }

  @Get('works/public/:identifier')
  findPublishedWork(@Param('identifier') identifier: string) {
    return this.worksService.findPublishedWork(identifier);
  }

  @Get('works/public/:identifier/reviews')
  listPublishedWorkReviews(@Param('identifier') identifier: string) {
    return this.worksService.listPublishedWorkReviews(identifier);
  }

  @Get('works/me')
  @UseGuards(JwtAuthGuard)
  findMyWorks(@Req() req: AuthenticatedRequest) {
    return this.worksService.findMyWorks(req.user.sub);
  }

  @Get('works/me/:workId')
  @UseGuards(JwtAuthGuard)
  findMyWork(@Req() req: AuthenticatedRequest, @Param('workId') workId: string) {
    return this.worksService.findMyWork(req.user.sub, workId);
  }

  @Get('works/:workId/reviews/me')
  @UseGuards(JwtAuthGuard)
  findMyReview(@Req() req: AuthenticatedRequest, @Param('workId') workId: string) {
    return this.worksService.findMyReview(req.user.sub, workId);
  }

  @Post('works/:workId/reviews')
  @UseGuards(JwtAuthGuard)
  upsertReview(
    @Req() req: AuthenticatedRequest,
    @Param('workId') workId: string,
    @Body() dto: UpsertWorkReviewDto,
  ) {
    return this.worksService.upsertReview(req.user.sub, workId, dto);
  }

  @Patch('works/:workId')
  @UseGuards(JwtAuthGuard)
  update(
    @Req() req: AuthenticatedRequest,
    @Param('workId') workId: string,
    @Body() dto: UpdateWorkDto,
  ) {
    return this.worksService.update(req.user.sub, workId, dto);
  }

  @Delete('works/:workId')
  @UseGuards(JwtAuthGuard)
  remove(@Req() req: AuthenticatedRequest, @Param('workId') workId: string) {
    return this.worksService.remove(req.user.sub, workId);
  }

  @Post('works/:workId/assets/cover')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(workFileInterceptor)
  uploadCover(
    @Req() req: AuthenticatedRequest,
    @Param('workId') workId: string,
    @UploadedFile() file: UploadedWorkFile,
  ) {
    return this.worksService.uploadCover(req.user.sub, workId, file);
  }

  @Post('works/:workId/assets/back-cover')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(workFileInterceptor)
  uploadBackCover(
    @Req() req: AuthenticatedRequest,
    @Param('workId') workId: string,
    @UploadedFile() file: UploadedWorkFile,
  ) {
    return this.worksService.uploadBackCover(req.user.sub, workId, file);
  }

  @Post('works/:workId/assets/manuscript')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(workFileInterceptor)
  uploadManuscript(
    @Req() req: AuthenticatedRequest,
    @Param('workId') workId: string,
    @UploadedFile() file: UploadedWorkFile,
  ) {
    return this.worksService.uploadManuscript(req.user.sub, workId, file);
  }

  @Post('works/:workId/submit')
  @UseGuards(JwtAuthGuard)
  submitForReview(@Req() req: AuthenticatedRequest, @Param('workId') workId: string) {
    return this.worksService.submitForReview(req.user.sub, workId);
  }

  @Get('works/:workId/assets/manuscript')
  @UseGuards(JwtAuthGuard)
  async downloadManuscript(
    @Req() req: AuthenticatedRequest,
    @Param('workId') workId: string,
    @Res() res: Response,
  ) {
    const download = await this.worksService.prepareWorkManuscriptDownload(req.user.sub, workId);

    res.setHeader('Content-Type', download.mimeType || 'application/octet-stream');
    res.setHeader('X-Download-Filename', download.originalName);
    res.download(download.filePath, download.originalName);
  }

  @Get('admin/works/review')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN, RoleName.ADMIN_02)
  listReviewQueue() {
    return this.worksService.listReviewQueue();
  }

  @Get('admin/works/moderation')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN, RoleName.ADMIN_02)
  listModerationQueue() {
    return this.worksService.listModerationQueue();
  }

  @Post('admin/works/:workId/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN, RoleName.ADMIN_02)
  approve(
    @Req() req: AuthenticatedRequest,
    @Param('workId') workId: string,
    @Body() dto: ApproveWorkDto,
  ) {
    return this.worksService.approve(req.user.sub, workId, dto);
  }

  @Post('admin/works/:workId/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN, RoleName.ADMIN_02)
  reject(
    @Req() req: AuthenticatedRequest,
    @Param('workId') workId: string,
    @Body() dto: RejectWorkDto,
  ) {
    return this.worksService.reject(req.user.sub, workId, dto);
  }

  @Post('admin/works/:workId/publish')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN, RoleName.ADMIN_02)
  publish(@Req() req: AuthenticatedRequest, @Param('workId') workId: string) {
    return this.worksService.publish(req.user.sub, workId);
  }

  @Post('admin/works/:workId/editorial')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN)
  upsertEditorialLayer(
    @Req() req: AuthenticatedRequest,
    @Param('workId') workId: string,
    @Body() dto: UpsertWorkEditorialDto,
  ) {
    return this.worksService.upsertEditorialLayer(req.user.sub, workId, dto);
  }

  @Post('admin/works/:workId/cancel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN, RoleName.ADMIN_02)
  cancelPublication(
    @Req() req: AuthenticatedRequest,
    @Param('workId') workId: string,
    @Body() dto: CancelWorkDto,
  ) {
    return this.worksService.cancelPublication(req.user.sub, workId, dto);
  }
}
