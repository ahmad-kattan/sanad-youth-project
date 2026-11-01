import { ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateAuthDto } from './dto/create-auth.dto.js';
import { LoginDto } from './dto/LoginDto.js';
import { createHash } from 'crypto';
import { UserRole } from '../common/Enums/index.js';


@Injectable()
export class AuthService {
    constructor(private readonly jwtService: JwtService,
        private readonly prisma:PrismaService) {}

    async login(loginDto:LoginDto)    
    {    
        const user = await this.prisma.user.findFirst({   
            where: {email:loginDto.email}});

        if (!user)
        {
        throw new UnauthorizedException('Invalid Email or password');
        }

        const isPasswordValid = await bcrypt.compare
        (loginDto.password,user.password);
        if (!isPasswordValid)
        {     
        throw new UnauthorizedException('Invalid Email or password');
        }
        const session = await this.prisma.session.create({
            data:{
                userId:user.id,
                expiresAt:new Date(Date.now()+7*24*60*60*1000),
                refreshTokenHash:" "
            }
        });
        const tokens = await this.singnTokens(user,session.id);
        await this.saveRefreshHash(session.id,tokens.refresh_token);
        return tokens;
        }

    async register(createAuthDto:CreateAuthDto,role:UserRole=UserRole.STUDENT) {

         const existingUser = await this.prisma.user.findFirst({
            where: {
                  email:createAuthDto.email
            },
        });

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }


        const passwordHash = await bcrypt.hash(createAuthDto.password,10);
        const user=await this.prisma.user.create({
            data:{
                email:createAuthDto.email,
                password:passwordHash,
                firstName:createAuthDto.firstName,
                lastName:createAuthDto.lastName,
                role:role
            },
            omit:{
                password:true
            }
        });

        return {message: 'User registered successfully',user};
 
    }

    async refreshToken(refreshToken:string){
        let payload: { sub: number; sid: number; type: string };
        try{
        payload=await this.jwtService.verifyAsync(refreshToken);
        
        if (payload.type !== 'refresh') {
            throw new UnauthorizedException('Invalid or expired refresh token');

        }
        const session= await this.prisma.session.findUnique({
            where:{
                id:payload.sid
            }
        });
         if(!session || session.revokedAt!==null || session.expiresAt<new Date()){
            throw new UnauthorizedException();
        }
        if (session.refreshTokenHash !== this.hash(refreshToken)){
            await this.prisma.session.update({
                where:{
                    id:session.id
                },
                data:{revokedAt:new Date()}
            })
            throw new  UnauthorizedException()
        };
        const userId= Number(payload.sub)
        if (!Number.isInteger(userId) || userId <= 0) {
            throw new UnauthorizedException();
        }

        const existUser= await this.prisma.user.findUnique({
            where:{
                id:userId
            }
        })
        if (!existUser){
            throw new UnauthorizedException('Invalid or expired refresh token');
        }
        const tokens=await this.singnTokens(existUser,session.id);
        await this.saveRefreshHash(session.id,tokens.refresh_token);
        return tokens;

        }
        catch{
            throw new UnauthorizedException('Invalid or expired refresh token');
        }

    }

    async logout(userId:number,sid:number)
    {

        const result= await this.prisma.session.updateMany({
            where:{id:sid,userId,revokedAt:null,expiresAt:{gt:new Date()}},
            data:{
                revokedAt:  new Date()
            }
        })
        if (result.count===0)
        {
             throw new UnauthorizedException('Session is invalid or revoked');
        }
        return {
            message:'Logged out successfully'
        }
    };

    async getMyProfile(id:number)
    {
        const user=await this.prisma.user.findUnique({
            where:{
                id
            },
            omit:{
                password:true
            }
        })
        if (!user)
        {
            throw new NotFoundException("user not found")
        }
        return user;
    }

    async logoutOthers(userId:number,sid:number){
        const result=await this.prisma.session.updateMany({
            where:{
                userId, id:{not:sid},revokedAt:null
            },
            data:{
                revokedAt:new Date()
            }
        });
        return {
            message:"Other sessions logged out successfully",
            revokedSessions:result.count
        }
    }


    private hash(token:string)
    {
        return createHash('sha256').update(token).digest('hex');
    }



    private async singnTokens( user:{ id: number; email: string;  role: any}
        ,sid:number)
    {
        const[access_token,refresh_token]= await Promise.all([
            this.jwtService.signAsync(
                {
                  sub:user.id,
                  email:user.email,
                  role:user.role,
                  sid:sid,
                  type:'access'
                },
                {
                    expiresIn:'15m'
                }
            ),
            this.jwtService.signAsync({
                sub:user.id,
                sid:sid,
                type:'refresh'
            },
            {
                expiresIn:'7d'
            }
        )])
        return {access_token,refresh_token};
    }

    private saveRefreshHash(sid:number,token:string)
    {
    return this.prisma.session.update({
      where:{
        id:sid
      },
      data:{refreshTokenHash:this.hash(token)}
    });
    }
}