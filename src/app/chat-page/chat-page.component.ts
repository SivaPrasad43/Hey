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
  allMessages: any[] = []
  messageLimit: number = 20;
  isLoadingMore: boolean = false;

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
  ambienceMode: string = "Happy";
  isInitialLoad: boolean = true;
  lastMessageCount: number = 0;
  showScrollButton: boolean = false;

  ngOnInit(): void {

    this.router.queryParams.subscribe(params => {
      this.userId = params['userId'];
      this.username = params['userName'];
    })

    this.dataService.getMsg(1000).subscribe(messages => {
      let lastMsgMode = "Happy"
      this.allMessages = messages;
      
      this.allMessages.map(message => {
        let timestampString = new Date(message.time.seconds * 1000).toUTCString(); 
        let date = new Date(timestampString);
        let hours = date.getHours();
        let minutes = date.getMinutes();
        let amOrPm = hours >= 12 ? 'PM' : 'AM';

        if(!message.isJoined && message.text){
          lastMsgMode = message.mode
        }

        let hours12 = hours % 12 || 12;
        message.time = `${hours12}:${minutes.toString().padStart(2, '0')} ${amOrPm}`;  
      })

      const shouldScrollToBottom = this.isInitialLoad || this.allMessages.length > this.lastMessageCount;
      this.lastMessageCount = this.allMessages.length;
      
      this.messages = this.allMessages.slice(-this.messageLimit);
      this.ambienceMode = lastMsgMode
      
      if(shouldScrollToBottom) {
        setTimeout(() => this.scrollToBottom(), 100);
        this.isInitialLoad = false;
      }
    });
  }

  sendMsg(){
    if(!this.message.trim()) return;
    
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

  handleEnter(event: any): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMsg();
    }
  }

  autoResize(event: any): void {
    const textarea = event.target;
    textarea.style.height = 'auto';
    const scrollHeight = textarea.scrollHeight;
    const lineHeight = 24;
    const maxHeight = lineHeight * 3;
    
    if (scrollHeight > maxHeight) {
      textarea.style.height = maxHeight + 'px';
      textarea.style.overflowY = 'auto';
    } else {
      textarea.style.height = scrollHeight + 'px';
      textarea.style.overflowY = 'hidden';
    }
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

  onScroll(event: any): void {
    const element = event.target;
    const isNearBottom = element.scrollHeight - element.scrollTop - element.clientHeight < 100;
    this.showScrollButton = !isNearBottom;
    
    if (element.scrollTop < 100 && !this.isLoadingMore && this.messages.length < this.allMessages.length) {
      this.loadMoreMessages();
    }
  }

  loadMoreMessages(): void {
    if (this.isLoadingMore) return;
    
    this.isLoadingMore = true;
    const previousScrollHeight = this.chatBody.nativeElement.scrollHeight;
    
    this.messageLimit += 20;
    const startIndex = Math.max(0, this.allMessages.length - this.messageLimit);
    this.messages = this.allMessages.slice(startIndex);
    
    setTimeout(() => {
      const newScrollHeight = this.chatBody.nativeElement.scrollHeight;
      this.chatBody.nativeElement.scrollTop = newScrollHeight - previousScrollHeight;
      this.isLoadingMore = false;
    }, 100);
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
