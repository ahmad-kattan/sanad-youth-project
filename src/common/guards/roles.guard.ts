import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator.js';
import { UserRole } from '../Enums/index.js';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}
  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(), 
      context.getClass(), 
    ]);
    if (!roles) return true; 
    const req= context.switchToHttp().getRequest();
    const user=req.user;
    if(user.role===UserRole.ADMIN){
      return true;
    }    
    return roles.includes(user?.role);
  }
}
