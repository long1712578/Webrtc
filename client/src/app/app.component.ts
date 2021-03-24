import { AfterViewInit, Component, ElementRef, ViewChild } from '@angular/core';
import * as Peer from 'simple-peer';
import {
  faMicrophone,
  faVideo,
  faDesktop,
  faPhoneSlash,
  faPhone
} from '@fortawesome/free-solid-svg-icons';
import { SocketService } from './services/socket.service';
import { sign } from 'crypto';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements AfterViewInit {
  @ViewChild('videoRef',  {static: false}) videoRef!: ElementRef;
  @ViewChild('partnerVideoRef',  {static: false}) partnerVideoRef!: ElementRef;
  videoElement: any;
  partnerVideoElement: any;
  myStream: any;
  callerStream: any;

  isPlaying = false;
  displayControls = true;
  isStreamAvailable = true;
  incomingCall = false;
  isCallAccepted = false;
  isCallInProgress = false;
  isScreenSharingEnabled = false;

  onlineUsers: string[] = [];
  socket: any;
  myId!: string;
  callerInfo: any;

  isAudioEnabled = false;
  isVideoEnabled = true;

  callerSignal: any;
  constructor(
    private socketService: SocketService) { }
  VIDEO_CONFIG = {
    width: { min: 1024, ideal: 1280, max: 1920 },
    height: { min: 576, ideal: 720, max: 1080 },
  };

  // Icons
  microphone = faMicrophone;
  videoIcon = faVideo;
  desktop = faDesktop;
  endCallIcon = faPhoneSlash;
  callIcon = faPhone;

  ngAfterViewInit(): void {
    this.videoElement = this.videoRef.nativeElement;
    this.partnerVideoElement = this.partnerVideoRef.nativeElement;
    this.startUserMedia();
    this.initSocket();
    this.socketService.OnVideoCallRequest()
    .subscribe((data: any)=>{
      this.incomingCall = true;
      this.callerInfo = data.from;
      this.callerSignal = data.signal;
    });
  }

  startUserMedia(config?: any): void {
    let mediaConfig = {
      video: this.VIDEO_CONFIG,
      audio: this.isAudioEnabled,
    };

    if (config) {
      mediaConfig = config;
    }

    const n = navigator as any;
    n.getUserMedia =
      n.getUserMedia ||
      n.webkitGetUserMedia ||
      n.mozGetUserMedia ||
      n.msGetUserMedia;
    n.getUserMedia(
      mediaConfig,
      (stream: MediaStream) => {
        this.myStream = stream;
        this.videoRef.nativeElement.srcObject = this.myStream;
      },
      (err: any) => {
        this.isStreamAvailable = false;
        console.error(err);
      }
    );
  }

  async initScreenCapture(): Promise<void> {
    this.isScreenSharingEnabled = !this.isScreenSharingEnabled;

    const gdmOptions = {
      video: {
        cursor: 'always',
      },
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        sampleRate: 44100,
      },
    };

    const n = navigator as any;
    n.getUserMedia =
      n.getUserMedia ||
      n.webkitGetUserMedia ||
      n.mozGetUserMedia ||
      n.msGetUserMedia;
    try {
      if (this.isScreenSharingEnabled) {
        const screenCaptureStream = await n.mediaDevices.getDisplayMedia(
          gdmOptions
        );
        this.myStream = screenCaptureStream;
        this.videoRef.nativeElement.srcObject = screenCaptureStream;

        // Fires When Click on Stop Sharing
        screenCaptureStream.oninactive = () => {
          if (this.isVideoEnabled) {
            this.startUserMedia();
          }
        };
      }
    } catch (err) {
      console.error(err);
    }
  }

  toggleAudio(): void {
    this.isAudioEnabled = !this.isAudioEnabled;
    this.startUserMedia();
  }

  toggleVideo(): void {
    this.isVideoEnabled = !this.isVideoEnabled;
    if (this.isVideoEnabled) {
      this.startUserMedia({
        video: this.VIDEO_CONFIG,
        audio: this.isAudioEnabled,
      });
    } else {
      this.stopVideoOnly(this.myStream);
    }
  }

  endCall(): void {}

  initSocket(): void {
    console.log('id1',this.myId);
    this.socketService.OnMyId()
    .subscribe((data: any)=>{
      console.log('id', data);
      this.myId=data;
    })
    console.log('id2',this.myId);
    this.socketService.OnAllUsers()
        .subscribe((users: any)=>{
          console.log('user', users);
         const usersArray = [];
          for (const user in users) {
            if (
              Object.prototype.hasOwnProperty.call(users, user) &&
              user !== this.myId
            ) {
              const element = users[user];
              usersArray.push(element);
            }
          }
          if (usersArray.length) {
            this.onlineUsers = ([] as string[]).concat(usersArray);
          }
        });
  }

  callUser(userId: any): void {
    this.isCallInProgress = true;
    const peer = new Peer({
      initiator: true,
      trickle: false,
      config: {
        iceServers: [
          {
            urls: 'stun:numb.viagenie.ca',
            username: 'sultan1640@gmail.com',
            credential: '98376683',
          },
          {
            urls: 'turn:numb.viagenie.ca',
            username: 'sultan1640@gmail.com',
            credential: '98376683',
          },
        ],
      },
      stream: this.myStream,
    });

    peer.on('signal', (data) => {
      this.socketService.VideoCallRequest({
        signalData: data,
        from: this.myId,
        userToCall: userId,
      })
    });

    peer.on('stream', (stream) => {
      this.partnerVideoRef.nativeElement.srcObject = stream;
      this.callerStream = stream;
    });

    this.socketService.OnVideoCallAccepted()
    .subscribe((signal: any) => {
      this.incomingCall = false;
      this.isCallAccepted = true;
      peer.signal(signal);
    })
  }

  acceptCall(): void {
    this.incomingCall = false;
    this.isCallInProgress = true;
    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream: this.myStream,
    });

    peer.on('signal', (data) => {
      this.socketService.VideoCallAccepted({ signal: data, to: this.callerInfo });
    });

    peer.on('stream', (stream) => {
      this.partnerVideoRef.nativeElement.srcObject = stream;
      this.callerStream = stream;
    });

    peer.signal(this.callerSignal);
  }

  stopBothVideoAndAudio(stream: any): void{
    stream.getTracks().forEach((track: any) => {
      if (track.readyState === 'live') {
        track.stop();
      }
    });
  }

  stopVideoOnly(stream: any): void {
    stream.getTracks().forEach( (track: any) => {
      if (track.readyState === 'live' && track.kind === 'video') {
        track.stop();
      }
    });
  }

  stopAudioOnly(stream: { getTracks: () => { readyState: string; kind: string; stop: () => void; }[]; }): void{
    stream.getTracks().forEach( (track: { readyState: string; kind: string; stop: () => void; }) => {
      if (track.readyState === 'live' && track.kind === 'audio') {
        track.stop();
      }
    });
  }
}