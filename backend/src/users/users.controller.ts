import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseEnumPipe,
  Patch,
  Req,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { RoleName } from '@prisma/client';
import { diskStorage } from 'multer';
import { existsSync, mkdirSync } from 'fs';
import { extname, join } from 'path';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AssignRoleDto } from './dto/assign-role.dto';
import { UpdateMyProfileDto } from './dto/update-my-profile.dto';
import { UsersService } from './users.service';

type AuthenticatedRequest = {
  user: {
    sub: string;
  };
};

type UploadedUserAvatarFile = {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
};

const USER_AVATAR_UPLOAD_ROOT = join(process.cwd(), 'uploads', 'avatars');

function ensureUserAvatarUploadRoot() {
  if (!existsSync(USER_AVATAR_UPLOAD_ROOT)) {
    mkdirSync(USER_AVATAR_UPLOAD_ROOT, { recursive: true });
  }
}

function buildUserAvatarFileName(originalName: string) {
  const extension = extname(originalName || '').toLowerCase();
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `${stamp}${extension}`;
}

const userAvatarFileInterceptor = FileInterceptor('file', {
  storage: diskStorage({
    destination: (_req, _file, callback) => {
      ensureUserAvatarUploadRoot();
      callback(null, USER_AVATAR_UPLOAD_ROOT);
    },
    filename: (_req, file, callback) => {
      callback(null, buildUserAvatarFileName(file.originalname));
    },
  }),
});

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Req() req: AuthenticatedRequest) {
    return this.usersService.getMe(req.user.sub);
  }

  @Patch('me/profile')
  @UseGuards(JwtAuthGuard)
  updateMyProfile(@Req() req: AuthenticatedRequest, @Body() dto: UpdateMyProfileDto) {
    return this.usersService.updateMyProfile(req.user.sub, dto);
  }

  @Post('me/avatar')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(userAvatarFileInterceptor)
  uploadMyAvatar(
    @Req() req: AuthenticatedRequest,
    @UploadedFile() file: UploadedUserAvatarFile,
  ) {
    return this.usersService.uploadMyAvatar(req.user.sub, file);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN, RoleName.ADMIN_02)
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id/roles')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN, RoleName.ADMIN_02)
  findRoles(@Param('id') id: string) {
    return this.usersService.findRoles(id);
  }

  @Post(':id/roles')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN, RoleName.ADMIN_02)
  assignRole(@Param('id') id: string, @Body() dto: AssignRoleDto) {
    return this.usersService.assignRole(id, dto.roleName);
  }

  @Delete(':id/roles/:roleName')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN, RoleName.ADMIN_02)
  removeRole(
    @Param('id') id: string,
    @Param('roleName', new ParseEnumPipe(RoleName)) roleName: RoleName,
  ) {
    return this.usersService.removeRole(id, roleName);
  }

  @Post(':id/favored-socio')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN)
  assignFavoredSocio(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.usersService.assignFavoredSocio(req.user.sub, id);
  }

  @Delete(':id/favored-socio')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN)
  removeFavoredSocio(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.usersService.removeFavoredSocio(req.user.sub, id);
  }

  @Post(':id/loyalty-diamond')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN)
  assignDiamondLoyalty(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.usersService.assignDiamondLoyalty(req.user.sub, id);
  }

  @Delete(':id/loyalty-diamond')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN)
  removeDiamondLoyalty(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.usersService.removeDiamondLoyalty(req.user.sub, id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN, RoleName.ADMIN_02)
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }
}
