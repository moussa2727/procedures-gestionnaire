import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

@Catch(WsException)
export class WsExceptionFilter implements ExceptionFilter {
  catch(exception: WsException, host: ArgumentsHost) {
    const ctx = host.switchToWs();
    const client = ctx.getClient<Socket>();

    const error = exception.getError();
    const message =
      typeof error === 'string'
        ? error
        : (error as any).message || 'WebSocket error';

    client.emit('exception', {
      message: message,
      timestamp: new Date().toISOString(),
    });
  }
}
