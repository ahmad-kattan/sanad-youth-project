import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { CreateAuthDto } from './dto/create-auth.dto.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { CurrentUser } from '../common/decorators/index.js';
import { LoginDto } from './dto/LoginDto.js';
import { currentUserDto } from '../user/dto/currentUserDto.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';
import { Throttle } from '@nestjs/throttler';

@Controller('auth')
export class AuthController {

    constructor(private readonly authService: AuthService) {}

    @Throttle({ default: { limit: 5, ttl: 60_000 } })
    @Post('login')
    @HttpCode(HttpStatus.OK)
    login(@Body() body: LoginDto) {
        return this.authService.login(body);    
    }

    @Get('profile')
    @UseGuards(JwtAuthGuard)
    getProfile(@CurrentUser('userId') id : number) {
        return this.authService.getMyProfile(id);
    }

    @Post('register')
    register(@Body() body:CreateAuthDto)
    {
        return this.authService.register(body);
    }

    @Post('refresh')
    refreshToken(@Body()dto:RefreshTokenDto)
    {
        return this.authService.refreshToken(dto.refresh_token)
    }

    @Post("logout")
    @UseGuards(JwtAuthGuard)
    logout(@CurrentUser()currentUser:currentUserDto)
    {
        return this.authService.logout(currentUser.userId,currentUser.sid)
    }

    @Post("logout-others")
    @UseGuards(JwtAuthGuard)
    logoutOthers(@CurrentUser()currentUser:currentUserDto)
    {
        return this.authService.logoutOthers(currentUser.userId,currentUser.sid)
    }





}