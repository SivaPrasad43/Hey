import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { AngularFirestore, DocumentChangeAction } from '@angular/fire/compat/firestore';

@Injectable({
  providedIn: 'root'
})
export class DataService {

  constructor(private firestore: AngularFirestore) { }

  sendMsg(msg: any) {
    return this.firestore.collection('messages').add(msg);
  }

  getMsg(limit: number = 20): Observable<any[]> {
    return this.firestore.collection('messages', ref => ref.orderBy('time', 'desc').limit(limit)).snapshotChanges().pipe(
      map(actions => {
        return actions.map(a => {
          const data = a.payload.doc.data() as any;
          console.log('data', data)
          const id = a.payload.doc.id;
          return { id, ...data };
        }).reverse();
      })
    );
  }
}
