import { Logger } from '@nestjs/common';
import { OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit, SubscribeMessage,
   WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway()
export class AppGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  private logger: Logger = new Logger('AppGateway');
  users = {};
  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    delete this.users[client.id];
  }
  handleConnection(client: Socket, ...args: any[]) {
    console.log(`Client connected: ${client.id}`);
    if (!this.users[client.id]) {
        this.users[client.id] = client.id;
      }
  }
  afterInit(server: Socket) {
    console.log('Gateway initialized');
  }

  @SubscribeMessage('allUsers')
  async allUsers(client: Socket) {
    const event: string = 'allUsers';
    client.emit(event,this.users);
  }

  @SubscribeMessage('myId')
  async myId(client: Socket) {
    const event: string = 'myId';
    client.emit(event,client.id);
  }

  @SubscribeMessage('video-call')
  async onVideoCall(client: Socket, data: any) {
    const event: string = 'video-call';
    client.to(data.userToCall).emit(event, {
      signal: data.signalData,
      from: data.from,
    });
  }

  @SubscribeMessage('video-call-accept')
  async onVideoCallAccept(client: Socket, data: any) {
    const event: string = 'video-call-accept';
    client.to(data.to).emit(event, data.signal);
  }
}
