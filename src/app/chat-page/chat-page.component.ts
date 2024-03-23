import { Component , OnInit } from '@angular/core';
import { Observable } from 'rxjs';

import { DataService } from 'src/services/data.service';

@Component({
  selector: 'app-chat-page',
  templateUrl: './chat-page.component.html',
  styleUrls: ['./chat-page.component.css']
})



export class ChatPageComponent implements OnInit {

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

  constructor(
    private dataService: DataService
  ) {
  }

  username: string = 'siva';

  ngOnInit(): void {

    this.dataService.getMsg().subscribe(messages => {
      this.messages = messages;
      this.messages.map(message => {
        let timestampString = new Date(message.time.seconds * 1000).toUTCString(); 
        let date = new Date(timestampString);
        let hours = date.getHours();
        let minutes = date.getMinutes();
        let amOrPm = hours >= 12 ? 'PM' : 'AM';

        // Convert hours from 24-hour to 12-hour format
        let hours12 = hours % 12 || 12; // Ensure 12-hour format and handle 0 as 12

        message.time = `${hours12}:${minutes.toString().padStart(2, '0')} ${amOrPm}`;  
      })
    });
  }

  sendMsg(){
    let msgObj={
      text: this.message,
      sender: 'malu',
      time: new Date(),
      mode: this.emojiMode.mode,
      emoji: this.emojiMode.emoji
    }
    this.dataService.sendMsg(msgObj).then((data) => {
      this.message = '';
      console.log(data);
    })
  }

  setEmoji(emoji: any){
    this.emojiMode = emoji
  }
}
