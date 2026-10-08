import { Body, Controller, Get, Headers, Post, UnauthorizedException } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService, publicUser } from './auth.service.js';
import { IdentifierDto, LoginDto, RegisterDto, ResetDto, VerifyDto } from './auth.dto.js';

function bearer(header?: string) {
  if (!header?.startsWith('Bearer ')) throw new UnauthorizedException('Inicia sesión para continuar.');
  return header.slice(7);
}

@Controller('auth')
@Throttle({ default: { limit: 5, ttl: 60000 } })
export class AuthController {
  constructor(private readonly auth: AuthService) {}
  @Post('register') register(@Body() body: RegisterDto) { return this.auth.register(body); }
  @Post('verify-email') verifyEmail(@Body() body: VerifyDto) { return this.auth.verifyEmail(body); }
  @Post('resend-verification') resend(@Body() body: IdentifierDto) { return this.auth.requestVerification(body.identifier); }
  @Post('login') login(@Body() body: LoginDto) { return this.auth.login(body); }
  @Post('forgot-password') forgot(@Body() body: IdentifierDto) { return this.auth.requestReset(body.identifier); }
  @Post('reset-password') reset(@Body() body: ResetDto) { return this.auth.resetPassword(body); }
  @Get('me') @Throttle({ default: { limit: 60, ttl: 60000 } })
  async me(@Headers('authorization') header?: string) { return publicUser((await this.auth.authenticate(bearer(header))).user); }
  @Post('logout') async logout(@Headers('authorization') header?: string) {
    const token = bearer(header);
    await this.auth.authenticate(token);
    return this.auth.logout(token);
  }
}
