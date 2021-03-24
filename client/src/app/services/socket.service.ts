import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import * as io from 'socket.io-client';
@Injectable({
  providedIn: 'root'
})
export class SocketService {
  socket: any;
  constructor() { 
    this.socket = io('http://localhost:3000');
  }
  public VideoCallRequest(data: any) {
    this.socket.emit('video-call', {
       data
     });
  }
  public OnVideoCallRequest(): Observable<any> {
    return new Observable((subscriber) => {
      this.socket.on('video-call', (data: any) => {
        subscriber.next(data);
      });
    });
  }
  public VideoCallAccepted(data: any) {
    this.socket.emit('video-call-accept', {
       data
     });
  }
  public OnVideoCallAccepted() {
    return new Observable((subscriber) => {
      this.socket.on('video-call-accept', (data: any) => {
        subscriber.next(data);
      });
    });
  }
  public OnMyId() {
    return new Observable((subscriber) => {
      this.socket.on('myId', (data: any) => {
        subscriber.next(data);
      });
    });
  }
  public OnAllUsers() {
    return new Observable((subscriber) => {
      this.socket.on('allUsers', (data: string[]) => {
        subscriber.next(data);
      });
    });
  }
}
