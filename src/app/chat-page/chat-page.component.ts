import { Component , OnInit, ViewChild, ElementRef, OnChanges, SimpleChanges, HostListener } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ChangeDetectorRef } from '@angular/core';

import { DataService } from 'src/services/data.service';
import { AuthService } from 'src/services/auth.service';


@Component({
  selector: 'app-chat-page',
  templateUrl: './chat-page.component.html',
  styleUrls: ['./chat-page.component.css']
})



export class ChatPageComponent implements OnInit {

  @ViewChild('chatBody') chatBody!: ElementRef;

  message: string = '';

  messages: any[] = []

  emojiList: any[] = [
    { emoji: '😊', mode: 'Happy', color:'violet' },
    { emoji: '😡', mode: 'Angry', color:'red' },
    { emoji: '🥺', mode: 'Sad', color:'blue' },
    { emoji: '😍', mode: 'Lovely', color:'pink' },
  ];

  emojiMode: {
    emoji: string,
    mode: string,
    color?: string
  } = {
    emoji: '😊',
    mode: 'Happy',
    color: 'violet'
  }

  shortcuts:any = {
    'alt+a': { emoji: '😡', mode: 'Angry', color:'red' },
    'alt+h' : { emoji: '😊', mode: 'Happy', color:'violet' },
    'alt+s' : { emoji: '🥺', mode: 'Sad', color:'blue' },
    'alt+l' : { emoji: '😍', mode: 'Lovely', color:'pink' },
  }

  constructor(
    private dataService: DataService,
    private authService: AuthService,
    private router: ActivatedRoute,
    private changeDetectorRef: ChangeDetectorRef
  ) {
  }

  userId: string = "";
  username: string = "";
  shadowMode: string = "Happy";

  ngOnInit(): void {

    this.router.queryParams.subscribe(params => {
      this.userId = params['userId'];
      this.username = params['userName'];
    })

    this.dataService.getMsg().subscribe(messages => {
      let lastMsgMode = ""
      this.messages = messages;
      console.log("messages", this.messages)
      this.messages.map(message => {
        let timestampString = new Date(message.time.seconds * 1000).toUTCString(); 
        let date = new Date(timestampString);
        let hours = date.getHours();
        let minutes = date.getMinutes();
        let amOrPm = hours >= 12 ? 'PM' : 'AM';

        if(!message.isJoined && message.text){
          lastMsgMode = message.mode
        }

        // Convert hours from 24-hour to 12-hour format
        let hours12 = hours % 12 || 12; // Ensure 12-hour format and handle 0 as 12

        message.time = `${hours12}:${minutes.toString().padStart(2, '0')} ${amOrPm}`;  
        this.scrollToBottom(); 
      })

      this.shadowMode = lastMsgMode
    });
  }

  sendMsg(){
    console.log(this.username)
    let msgObj={
      text: this.message,
      senderId: this.userId,
      sender: this.username,
      time: new Date(),
      mode: this.emojiMode.mode,
      emoji: this.emojiMode.emoji,
      isOnline: true,
      isJoined: false
    }
    this.message = '';
    this.loadMsg(msgObj)
  }

  loadMsg(msgObj:any){
    this.dataService.sendMsg(msgObj).then((data) => {
      console.log(data);
    })
  }

  setEmoji(emoji: any){
    this.emojiMode = emoji
  }

  logout(){
    
    this.dataService.sendMsg(
      {
        userId: this.userId,
        userName: this.username,
        time: new Date(),
        isJoined: false
      }).then(() => {
      this.authService.logout();
    })
  }

  scrollToBottom(): void {
    try {
        this.chatBody.nativeElement.scrollTop = this.chatBody.nativeElement.scrollHeight;
    } catch(err) { }                 
}

 // Helper method to generate the key combination (e.g., "Ctrl+S")
 getKeyCombination(event: KeyboardEvent): string {
  let combination = '';
  if (event.ctrlKey) combination += 'Ctrl+';
  if (event.altKey) combination += 'Alt+';
  if (event.shiftKey) combination += 'Shift+';
  combination += event.key;
  return combination;
}
}
