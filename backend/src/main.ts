import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    // Enable CORS for frontend communication
    app.enableCors({
        origin: [
            'http://localhost:3000', // Frontend
            'http://localhost:8080', // Backend (for self-requests if any)
            // Allow all localhost ports for development
            /^http:\/\/localhost:\d+$/,
        ],
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD', 'PATCH'],
        allowedHeaders: [
            'Content-Type',
            'Authorization',
            'Accept',
            'Origin',
            'X-Requested-With',
            'Access-Control-Request-Method',
            'Access-Control-Request-Headers',
        ],
        credentials: true,
        preflightContinue: false,
        optionsSuccessStatus: 204,
    });

    // Change this line to use port 3001 as default
    await app.listen(process.env.PORT ?? 3001, '0.0.0.0');
}
bootstrap().catch((error) => {
    console.error('Error starting the application:', error);
    process.exit(1);
});