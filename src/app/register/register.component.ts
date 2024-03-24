import { Component } from '@angular/core';
import { AuthService } from 'src/services/auth.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {

  username:string = '';
  email:string = '';
  password:string = '';


  constructor(private auth: AuthService) { }
  register(){
    this.auth.register(this.email, this.password, this.username);
  }

}
