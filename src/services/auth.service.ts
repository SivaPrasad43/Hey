import { Injectable } from '@angular/core';

//firebase
import {AngularFireAuth} from '@angular/fire/compat/auth'
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Router } from '@angular/router';
import { DataService } from './data.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  userId: string | undefined = ""
  userName: string | null | undefined = ""
  constructor(
    private auth: AngularFireAuth,
    private router: Router,
    private firestore: AngularFirestore,
    private dataService: DataService
  ) { }


  //login
  login(email: string, password: string) {
    this.auth.signInWithEmailAndPassword(email, password).then((userCredentials) => {
      console.log(userCredentials)
      this.userId = userCredentials.user?.uid;
      this.userName = userCredentials.user?.displayName;
      this.dataService.sendMsg({
        userId: this.userId,
        userName: this.userName,
        time: new Date(),
        isJoined: true
      });
      this.router.navigate(['/chat'],{queryParams:{userId:this.userId, userName:this.userName}});
    },err => {
      alert('Invalid email or password')
    })
  }


  //register
  register(email: string, password: string, displayName: string) {
    this.auth.createUserWithEmailAndPassword(email, password)
      .then((userCredential) => {
        // User registration successful
        const user = userCredential.user;
        
        // Update user profile with display name and profile picture
        user?.updateProfile({
          displayName: displayName
        }).then(() => {
          // Profile updated successfully
          this.login(email, password);
        }).catch((error) => {
          // Handle error while updating profile
          console.error('Error updating profile:', error);
          alert('Error updating profile. Please try again.');
        });
      })
      .catch((error) => {
        // Handle errors during registration
        console.error('Error registering user:', error);
        alert('Invalid email or password');
      });
  }

  logout() {
    this.auth.signOut();
    this.router.navigate(['/login']);
  }

  updateMessagesToOnline(isOnline:boolean) {

    // Retrieve messages associated with the user
    this.firestore.collection('messages', ref => ref.where('senderId', '==', this.userId)).snapshotChanges()
      .subscribe(messages => {
        messages.forEach(message => {
          const messageId = message.payload.doc.id;

          // Update the message to set isOnline to true
          this.firestore.collection('messages').doc(messageId).update({
            isOnline: isOnline
          }).then(() => {
            console.log('Message updated successfully');
          }).catch(error => {
            console.error('Error updating message:', error);
          });
        });
      });
  }
  

}
