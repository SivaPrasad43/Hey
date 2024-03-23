import { Component , OnInit } from '@angular/core';

@Component({
  selector: 'app-chat-page',
  templateUrl: './chat-page.component.html',
  styleUrls: ['./chat-page.component.css']
})



export class ChatPageComponent implements OnInit {

  timeOnly: string;

  message: string = '';

  messages: any[] = [
    {
      text: 'Hi, how are you?',
      sender: 'bot',
      time: new Date(),
      activeStatus: false
    },
    {
      text: 'I am good. What about you?',
      sender: 'siva',
      time: new Date(),
      activeStatus: false
    },
    {
      text: 'I am good. What about you?',
      sender: 'siva',
      time: new Date(),
      activeStatus: false
    },
    {
      text: 'What about you?',
      sender: 'bot',
      time: new Date(),
      activeStatus: false
    }
  ]

  constructor() {
    const currentTime = new Date();
    const hours = currentTime.getHours();
    const minutes = currentTime.getMinutes();
    const seconds = currentTime.getSeconds();

    this.timeOnly = `${hours}:${minutes}:${seconds}`;
  }

  username: string = 'siva';

  ngOnInit(): void {
    this.messages.map((message) => {
      message.time = this.timeOnly
    })
  }

  sendMsg(){
    this.messages.push({
      text: this.message,
      sender: 'siva',
      time: this.timeOnly,
      activeStatus: false
    })
    this.message = '';
  }
}
