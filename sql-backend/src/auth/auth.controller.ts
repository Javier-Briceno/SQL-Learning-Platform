import { Controller, Post, Body, Patch, HttpCode, Param, ParseIntPipe, HttpStatus, Get, Request, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { ApiTags, ApiResponse, ApiOperation} from '@nestjs/swagger';
import { LoginDto } from './dto/login.dto';
import { AuthGuard } from '@nestjs/passport';
import { ChangePasswordDto } from './dto/change-password.dto';


@ApiTags('auth')
@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    // JWT Implementierung

    @ApiOperation({ summary: 'User login' })
    @ApiResponse({ status: 200, description: 'Login successful' })
    @ApiResponse({ status: 401, description: 'Invalid credentials' })
    @Post('login')
    async login(@Body() loginDto: LoginDto) {
        return this.authService.login(loginDto);
    }


    // Verbindung der Register Methode 

    @Post('register')
    @HttpCode(HttpStatus.CREATED)
    async register(@Body() registerDto: RegisterDto) {
        return this.authService.register(registerDto);
    }

    // Erstellen des Geschützten Endpunktes

    @UseGuards(AuthGuard('jwt'))
    @Get('profile')
    async getProfile(@Request() req: any) {
    const userId = req.user.id;
    const user = await this.authService.getUserProfile(userId);
    return { user };
    }

    @UseGuards(AuthGuard('jwt'))
    @Get('students')
    async getAllStudents() {
        return this.authService.getAllStudents();
    }

    @UseGuards(AuthGuard('jwt'))
    @Get('users')
    async getAllUsers() {
        return this.authService.getAllUsers();
    }

    @Patch('users/:id/ban')
    @UseGuards(AuthGuard('jwt'))
    async banUser(@Param('id', ParseIntPipe) userId: number, @Request() req) {
        return this.authService.banUser(userId);
    }

    @Patch('users/:id/unban')
    @UseGuards(AuthGuard('jwt'))
    async unbanUser(@Param('id', ParseIntPipe) userId: number) {
        return this.authService.unbanUser(userId);
    }

    @UseGuards(AuthGuard('jwt'))
    @Post('change-password')
    async changePassword(@Request() req, @Body() dto: ChangePasswordDto) {
        const userId = req.user.id;
        return this.authService.changePassword(userId, dto);
    }

    @UseGuards(AuthGuard('jwt'))
    @Get('students/online')
    async getOnlineStudents() {
        return { online: await this.authService.getOnlineStudents() };
    }

    @UseGuards(AuthGuard('jwt'))
    @Get('submissions/today')
    async getTodaysSubmissions() {
        return { count: await this.authService.getTodaysSubmittedSubmissions() };
}
}
