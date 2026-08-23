// test/e2e/websocket.e2e-spec.ts
import { INestApplication } from '@nestjs/common';
import { createServer } from 'http';
import { io, Socket } from 'socket.io-client';
import { createTestApp } from '../helpers/create-test-app';
import { resetTestData } from '../helpers/db.helper';
import { loginAs, setTestApp, uniqueEmail, registerStudent } from '../helpers/auth.helper';
import { TEST_PASSWORD } from '../helpers/fixtures.helper';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisService } from '@/redis/redis.service';

describe('WebSocket Gates (e2e)', () => {
  let app: INestApplication;
  let httpServer: any;
  let socket: Socket;
  let prisma: PrismaService;
  let redisService: RedisService;
  let userToken: string;
  let userId: string;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    redisService = app.get(RedisService);
    setTestApp(app);
    await app.listen(10000);
    httpServer = app.getHttpServer();
  });

  beforeEach(async () => {
    await resetTestData(prisma, redisService);

    // Use unique email with timestamp to avoid rate limiting
    const email = uniqueEmail('ws-user-' + Date.now());
    await registerStudent(app, {
      email,
      password: TEST_PASSWORD,
      firstName: 'WebSocket',
      lastName: 'User',
    });

    const session = await loginAs(app, email, TEST_PASSWORD);
    userId = session.user.id;
    userToken = session.cookies.find(c => c.startsWith('access_token='))?.split('=')[1] || '';
  });

  afterAll(async () => {
    if (socket && socket.connected) socket.disconnect();
    await app.close();
  });

  it('WS /users - connection utilisateur', (done) => {
    socket = io('http://localhost:10000/users', {
      path: '/socket.io',
      transports: ['websocket'],
      reconnection: false,
      timeout: 5000,
    });

    socket.on('connect', () => {
      socket.emit('authenticate', { token: userToken });
      socket.on('identified', (data) => {
        expect(data.userId).toBeDefined();
        expect(data.userId).toBe(userId);
        socket.disconnect();
        done();
      });
    });

    socket.on('connect_error', (err) => {
      done(err);
    });

    setTimeout(() => {
      if (socket && socket.connected) {
        socket.disconnect();
        done(new Error('Timeout - connection non établie'));
      }
    }, 5000);
  });

  it('WS /users - ping/pong', (done) => {
    const pingSocket = io('http://localhost:10000/users', {
      path: '/socket.io',
      transports: ['websocket'],
      reconnection: false,
      timeout: 5000,
    });

    pingSocket.on('connect', () => {
      pingSocket.emit('authenticate', { token: userToken });
      pingSocket.on('identified', () => {
        pingSocket.emit('ping');
      });
    });

    pingSocket.on('pong', (data) => {
      expect(data).toBeDefined();
      expect(data.timestamp).toBeDefined();
      pingSocket.disconnect();
      done();
    });

    pingSocket.on('connect_error', (err) => {
      done(err);
    });

    setTimeout(() => {
      if (pingSocket && pingSocket.connected) {
        pingSocket.disconnect();
        done(new Error('Timeout - pong non reçu'));
      }
    }, 5000);
  });
});