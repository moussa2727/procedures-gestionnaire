// test/e2e/18-websocket.e2e-spec.ts
import { INestApplication } from '@nestjs/common';
import { createServer } from 'http';
import { io, Socket } from 'socket.io-client';
import { createTestApp } from '../helpers/create-test-app';
import { resetTestData } from '../helpers/db.helper';
import { loginAs, setTestApp, uniqueEmail, registerStudent } from '../helpers/auth.helper';
import { TEST_PASSWORD, setupStandardUsers } from '../helpers/fixtures.helper';
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
  let consultantToken: string;
  let consultantId: string;

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

    // Créer un utilisateur étudiant
    const email = uniqueEmail('ws-user');
    await registerStudent(app, {
      email,
      password: TEST_PASSWORD,
      firstName: 'WebSocket',
      lastName: 'User',
    });

    const session = await loginAs(app, email, TEST_PASSWORD);
    userId = session.user.id;
    userToken = session.cookies.find(c => c.startsWith('access_token='))?.split('=')[1] || '';

    // Créer un consultant
    const { admin } = await setupStandardUsers(app);
    const consultant = await createConsultantViaAdmin(app, admin.agent);
    consultantId = consultant.user.id;
    consultantToken = consultant.cookies.find(c => c.startsWith('access_token='))?.split('=')[1] || '';
  });

  afterAll(async () => {
    if (socket && socket.connected) socket.disconnect();
    await app.close();
  });

  describe('Users Gateway', () => {
    it('connecte un utilisateur', (done) => {
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

    it('envoie un ping/pong', (done) => {
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

    it('gère la présence Redis', (done) => {
      const presenceSocket = io('http://localhost:10000/users', {
        path: '/socket.io',
        transports: ['websocket'],
        reconnection: false,
        timeout: 5000,
      });

      presenceSocket.on('connect', () => {
        presenceSocket.emit('authenticate', { token: userToken });
        presenceSocket.on('identified', async (data) => {
          const client = redisService.getClient();
          const presenceKey = `ws:presence:${data.userId}`;
          const count = await client.scard(presenceKey);
          expect(count).toBeGreaterThan(0);
          presenceSocket.disconnect();
          done();
        });
      });

      presenceSocket.on('connect_error', (err) => {
        done(err);
      });

      setTimeout(() => {
        if (presenceSocket && presenceSocket.connected) {
          presenceSocket.disconnect();
          done(new Error('Timeout - présence non enregistrée'));
        }
      }, 5000);
    });

    it('nettoie la présence après déconnexion', (done) => {
      const cleanSocket = io('http://localhost:10000/users', {
        path: '/socket.io',
        transports: ['websocket'],
        reconnection: false,
        timeout: 5000,
      });

      let userIdForClean: string;

      cleanSocket.on('connect', () => {
        cleanSocket.emit('authenticate', { token: userToken });
        cleanSocket.on('identified', async (data) => {
          userIdForClean = data.userId;
          cleanSocket.disconnect();

          setTimeout(async () => {
            const client = redisService.getClient();
            const presenceKey = `ws:presence:${userIdForClean}`;
            const count = await client.scard(presenceKey);
            expect(count).toBe(0);
            done();
          }, 1000);
        });
      });

      cleanSocket.on('connect_error', (err) => {
        done(err);
      });

      setTimeout(() => {
        if (cleanSocket && cleanSocket.connected) {
          cleanSocket.disconnect();
          done(new Error('Timeout - nettoyage non effectué'));
        }
      }, 8000);
    });

    it('met à jour le statut en ligne', (done) => {
      const statusSocket = io('http://localhost:10000/users', {
        path: '/socket.io',
        transports: ['websocket'],
        reconnection: false,
        timeout: 5000,
      });

      statusSocket.on('connect', () => {
        statusSocket.emit('authenticate', { token: userToken });
        statusSocket.on('identified', async () => {
          const user = await prisma.user.findUnique({ where: { id: userId } });
          expect(user?.isOnline).toBe(true);
          expect(user?.lastSeen).toBeDefined();
          statusSocket.disconnect();
          done();
        });
      });

      statusSocket.on('connect_error', (err) => {
        done(err);
      });

      setTimeout(() => {
        if (statusSocket && statusSocket.connected) {
          statusSocket.disconnect();
          done(new Error('Timeout - statut en ligne non mis à jour'));
        }
      }, 5000);
    });
  });

  describe('Notifications Gateway', () => {
    it('reçoit une notification en temps réel', (done) => {
      const notificationSocket = io('http://localhost:10000/notifications', {
        path: '/socket.io',
        transports: ['websocket'],
        reconnection: false,
        timeout: 5000,
      });

      let notificationReceived = false;
      let timeoutId: NodeJS.Timeout;

      notificationSocket.on('connect', () => {
        notificationSocket.emit('authenticate', { token: userToken });
        notificationSocket.on('identified', async () => {
          // Créer une notification en base
          const notification = await prisma.notification.create({
            data: {
              userId,
              type: 'SYSTEM',
              title: 'Test Notification',
              message: 'Message de test',
            },
          });

          // Déclencher l'événement via le gateway
          const notificationsGateway = app.get(require('@/notifications/notifications.gateway').NotificationsGateway);
          notificationsGateway.push(notification);
        });
      });

      notificationSocket.on('notification:new', (notification) => {
        expect(notification.userId).toBeDefined();
        expect(notification.title).toBeDefined();
        expect(notification.message).toBeDefined();
        notificationReceived = true;
        clearTimeout(timeoutId);
        notificationSocket.disconnect();
        done();
      });

      notificationSocket.on('connect_error', (err) => {
        clearTimeout(timeoutId);
        done(err);
      });

      timeoutId = setTimeout(() => {
        if (notificationSocket.connected) {
          notificationSocket.disconnect();
        }
        if (!notificationReceived) {
          done(new Error('Timeout - notification:new non reçu'));
        }
      }, 10000);
    });

    it('reçoit le compteur de notifications non lues', (done) => {
      const unreadSocket = io('http://localhost:10000/notifications', {
        path: '/socket.io',
        transports: ['websocket'],
        reconnection: false,
        timeout: 5000,
      });

      let unreadCountReceived = false;
      let timeoutId: NodeJS.Timeout;

      unreadSocket.on('connect', () => {
        unreadSocket.emit('authenticate', { token: userToken });
        unreadSocket.on('identified', async () => {
          // Créer des notifications non lues
          await prisma.notification.createMany({
            data: [
              {
                userId,
                type: 'SYSTEM',
                title: 'Notif 1',
                message: 'Message 1',
                isRead: false,
              },
              {
                userId,
                type: 'SYSTEM',
                title: 'Notif 2',
                message: 'Message 2',
                isRead: false,
              },
            ],
          });

          // Déclencher l'événement
          const notificationsGateway = app.get(require('@/notifications/notifications.gateway').NotificationsGateway);
          notificationsGateway.pushUnreadCount(userId, 2);
        });
      });

      unreadSocket.on('notification:unread-count', (data) => {
        expect(data.count).toBeDefined();
        expect(data.count).toBe(2);
        unreadCountReceived = true;
        clearTimeout(timeoutId);
        unreadSocket.disconnect();
        done();
      });

      unreadSocket.on('connect_error', (err) => {
        clearTimeout(timeoutId);
        done(err);
      });

      timeoutId = setTimeout(() => {
        if (unreadSocket.connected) {
          unreadSocket.disconnect();
        }
        if (!unreadCountReceived) {
          done(new Error('Timeout - notification:unread-count non reçu'));
        }
      }, 10000);
    });
  });

  describe('RendezVous Gateway', () => {
    it('reçoit un événement de création de rendez-vous', (done) => {
      const rdvSocket = io('http://localhost:10000/rendez-vous', {
        path: '/socket.io',
        transports: ['websocket'],
        reconnection: false,
        timeout: 5000,
      });

      let rdvCreated = false;
      let timeoutId: NodeJS.Timeout;

      rdvSocket.on('connect', () => {
        rdvSocket.emit('authenticate', { token: consultantToken });
        rdvSocket.on('identified', () => {
          // Créer un rendez-vous via le service
          // Le gateway notifiera automatiquement
          setTimeout(async () => {
            const { admin } = await setupStandardUsers(app);
            const { destinationId } = await createDestinationWithConsultant(
              app,
              admin.agent,
              consultantId,
            );
            const student = await createStudentSession(app);
            await createRendezVous(app, student.agent, {
              consultantId,
              destinationId,
              date: getNextWorkableDate(5),
              time: TimeSlot.SLOT_1000,
            });
          }, 500);
        });
      });

      rdvSocket.on('rendez-vous:created', (data) => {
        expect(data.id).toBeDefined();
        expect(data.consultantId).toBeDefined();
        rdvCreated = true;
        clearTimeout(timeoutId);
        rdvSocket.disconnect();
        done();
      });

      rdvSocket.on('connect_error', (err) => {
        clearTimeout(timeoutId);
        done(err);
      });

      timeoutId = setTimeout(() => {
        if (rdvSocket.connected) {
          rdvSocket.disconnect();
        }
        if (!rdvCreated) {
          done(new Error('Timeout - rendez-vous:created non reçu'));
        }
      }, 10000);
    });
  });

  describe('Procedure Gateway', () => {
    it('reçoit un événement de création de procédure', (done) => {
      const procSocket = io('http://localhost:10000/procedure', {
        path: '/socket.io',
        transports: ['websocket'],
        reconnection: false,
        timeout: 5000,
      });

      let procCreated = false;
      let timeoutId: NodeJS.Timeout;

      procSocket.on('connect', () => {
        procSocket.emit('authenticate', { token: userToken });
        procSocket.on('identified', () => {
          setTimeout(async () => {
            const { admin } = await setupStandardUsers(app);
            const { destinationId } = await createDestinationWithConsultant(
              app,
              admin.agent,
              consultantId,
            );
            const student = await createStudentSession(app);
            const rdv = await createRendezVous(app, student.agent, {
              consultantId,
              destinationId,
              date: getNextWorkableDate(5),
              time: TimeSlot.SLOT_1000,
            });
            await createProcedureFromRendezVous(app, admin.agent, rdv.id);
          }, 500);
        });
      });

      procSocket.on('procedure:created', (data) => {
        expect(data.id).toBeDefined();
        expect(data.numeroDossier).toBeDefined();
        procCreated = true;
        clearTimeout(timeoutId);
        procSocket.disconnect();
        done();
      });

      procSocket.on('connect_error', (err) => {
        clearTimeout(timeoutId);
        done(err);
      });

      timeoutId = setTimeout(() => {
        if (procSocket.connected) {
          procSocket.disconnect();
        }
        if (!procCreated) {
          done(new Error('Timeout - procedure:created non reçu'));
        }
      }, 10000);
    });
  });

  describe('FollowUpMeeting Gateway', () => {
    it('reçoit un événement de création de rendez-vous de suivi', (done) => {
      const fupSocket = io('http://localhost:10000/follow-up-meeting', {
        path: '/socket.io',
        transports: ['websocket'],
        reconnection: false,
        timeout: 5000,
      });

      let fupCreated = false;
      let timeoutId: NodeJS.Timeout;

      fupSocket.on('connect', () => {
        fupSocket.emit('authenticate', { token: userToken });
        fupSocket.on('identified', () => {
          setTimeout(async () => {
            const { admin } = await setupStandardUsers(app);
            const { destinationId } = await createDestinationWithConsultant(
              app,
              admin.agent,
              consultantId,
            );
            const student = await createStudentSession(app);
            const rdv = await createRendezVous(app, student.agent, {
              consultantId,
              destinationId,
              date: getNextWorkableDate(5),
              time: TimeSlot.SLOT_1000,
            });
            const procedure = await createProcedureFromRendezVous(app, admin.agent, rdv.id);
            await createFollowUpMeeting(app, student.agent, procedure.id);
          }, 500);
        });
      });

      fupSocket.on('follow-up-meeting:created', (data) => {
        expect(data.id).toBeDefined();
        expect(data.procedureId).toBeDefined();
        fupCreated = true;
        clearTimeout(timeoutId);
        fupSocket.disconnect();
        done();
      });

      fupSocket.on('connect_error', (err) => {
        clearTimeout(timeoutId);
        done(err);
      });

      timeoutId = setTimeout(() => {
        if (fupSocket.connected) {
          fupSocket.disconnect();
        }
        if (!fupCreated) {
          done(new Error('Timeout - follow-up-meeting:created non reçu'));
        }
      }, 10000);
    });
  });

  describe('Destinations Gateway', () => {
    it('reçoit un événement de création de destination', (done) => {
      const destSocket = io('http://localhost:10000/destinations', {
        path: '/socket.io',
        transports: ['websocket'],
        reconnection: false,
        timeout: 5000,
      });

      let destCreated = false;
      let timeoutId: NodeJS.Timeout;

      destSocket.on('connect', () => {
        destSocket.emit('authenticate', { token: userToken });
        destSocket.on('identified', () => {
          setTimeout(async () => {
            const { admin } = await setupStandardUsers(app);
            const { consultantId: cId } = await setupStandardUsers(app);
            await createDestinationWithConsultant(app, admin.agent, cId);
          }, 500);
        });
      });

      destSocket.on('destination:created', (data) => {
        expect(data.id).toBeDefined();
        expect(data.country).toBeDefined();
        destCreated = true;
        clearTimeout(timeoutId);
        destSocket.disconnect();
        done();
      });

      destSocket.on('connect_error', (err) => {
        clearTimeout(timeoutId);
        done(err);
      });

      timeoutId = setTimeout(() => {
        if (destSocket.connected) {
          destSocket.disconnect();
        }
        if (!destCreated) {
          done(new Error('Timeout - destination:created non reçu'));
        }
      }, 10000);
    });
  });

  describe('Consultant Unavailability Gateway', () => {
    it('reçoit un événement de création d\'absence', (done) => {
      const absenceSocket = io('http://localhost:10000/consultant-unavailability', {
        path: '/socket.io',
        transports: ['websocket'],
        reconnection: false,
        timeout: 5000,
      });

      let absenceCreated = false;
      let timeoutId: NodeJS.Timeout;

      absenceSocket.on('connect', () => {
        absenceSocket.emit('authenticate', { token: consultantToken });
        absenceSocket.on('identified', () => {
          setTimeout(async () => {
            const { admin } = await setupStandardUsers(app);
            await authenticatedRequest(admin.agent)
              .post(`/api/v1/consultant-unavailability/admin/${consultantId}`)
              .send({
                startDate: getNextWorkableDate(10),
                endDate: getNextWorkableDate(10),
                type: AbsenceType.CONGES,
              })
              .expect(201);
          }, 500);
        });
      });

      absenceSocket.on('unavailability:created', (data) => {
        expect(data.consultantId).toBeDefined();
        expect(data.absence).toBeDefined();
        absenceCreated = true;
        clearTimeout(timeoutId);
        absenceSocket.disconnect();
        done();
      });

      absenceSocket.on('connect_error', (err) => {
        clearTimeout(timeoutId);
        done(err);
      });

      timeoutId = setTimeout(() => {
        if (absenceSocket.connected) {
          absenceSocket.disconnect();
        }
        if (!absenceCreated) {
          done(new Error('Timeout - unavailability:created non reçu'));
        }
      }, 10000);
    });
  });
});