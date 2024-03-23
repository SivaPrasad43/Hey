import { Injectable } from '@angular/core';

//firebase
import {AngularFireAuth} from '@angular/fire/compat/auth'
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  constructor(
    private auth: AngularFireAuth,
    private router: Router
  ) { }


  //login
  login(email: string, password: string) {
    this.auth.signInWithEmailAndPassword(email, password).then(() => {
      this.router.navigate(['/chat']);
    },err => {
      alert('Invalid email or password')
    })
  }


  //register
  register(email: string, password: string) {
    this.auth.createUserWithEmailAndPassword(email, password).then(() => {
      this.router.navigate(['/login']);
    },err => {
      alert('Invalid email or password')
    })
  }

}
