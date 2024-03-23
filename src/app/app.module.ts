import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { LoginComponent } from './login/login.component';
import { RegisterComponent } from './register/register.component';
import { ChatPageComponent } from './chat-page/chat-page.component';
import { NotFoundComponent } from './not-found/not-found.component';

import { FormsModule } from '@angular/forms';

//firebase
import { AngularFireModule } from '@angular/fire/compat'; // for Angular versions 13 and above
// import { AngularFireModule } from '@angular/fire'; // for older Angular versions
import { AngularFireAuthModule } from '@angular/fire/compat/auth';
import { AngularFirestoreModule } from '@angular/fire/compat/firestore'; // Import if using Firestore
import { environment } from 'src/environment/environment';



@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    RegisterComponent,
    ChatPageComponent,
    NotFoundComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    AngularFireModule.initializeApp(environment.firebase),
    AngularFireAuthModule,
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
