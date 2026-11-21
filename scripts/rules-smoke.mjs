// End-to-end check of firestore.rules against the local emulators.
// Run with: npm run test:rules   (starts the emulators, runs this, shuts them down)
import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, createUserWithEmailAndPassword, getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import {
  arrayUnion, collection, connectFirestoreEmulator, deleteDoc, doc, getDoc, getDocs, getFirestore,
  runTransaction, serverTimestamp, setDoc, updateDoc, writeBatch, deleteField,
} from 'firebase/firestore';

const PROJECT = 'hey-chat-7ea1b';
let failures = 0;
const pass = (m) => console.log('  ✔', m);
const fail = (m, e) => { failures++; console.log('  ✘', m, e ? `(${e.code ?? e.message})` : ''); };
async function allowed(m, p) { try { await p; pass(m); } catch (e) { fail(m, e); } }
async function denied(m, p) {
  try { await p; fail(m + ' — was allowed'); } catch (e) { e.code === 'permission-denied' ? pass(m + ' — denied') : fail(m, e); }
}

async function client(name, email) {
  const app = initializeApp({ apiKey: 'demo', projectId: PROJECT }, name);
  const auth = getAuth(app);
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  const db = getFirestore(app);
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  let cred;
  try { cred = await createUserWithEmailAndPassword(auth, email, 'password123'); }
  catch { cred = await signInWithEmailAndPassword(auth, email, 'password123'); }
  return { db, uid: cred.user.uid, name };
}

// Mirrors RoomService.ensureGeneralMembership
async function joinGeneral({ db, uid, name }) {
  const ref = doc(db, 'rooms', 'general');
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists() && snap.data().members.includes(uid)) return;
    if (!snap.exists()) {
      tx.set(ref, { name: 'General', type: 'group', members: [uid], memberNames: { [uid]: name }, createdBy: uid, updatedAt: serverTimestamp(), lastMessage: null });
    } else {
      tx.update(ref, { members: arrayUnion(uid), [`memberNames.${uid}`]: name });
    }
    tx.set(doc(collection(ref, 'messages')), { type: 'system', text: `${name} joined`, senderId: uid, senderName: name, mood: 'happy', createdAt: serverTimestamp() });
  });
}

async function send({ db, uid, name }, roomId, text) {
  const b = writeBatch(db);
  const m = doc(collection(db, 'rooms', roomId, 'messages'));
  b.set(m, { type: 'text', text, senderId: uid, senderName: name, mood: 'happy', clientId: 'c', createdAt: serverTimestamp() });
  b.update(doc(db, 'rooms', roomId), { updatedAt: serverTimestamp(), lastMessage: { messageId: m.id, text, mood: 'happy', senderId: uid, senderName: name } });
  await b.commit();
  return m;
}

const alice = await client('Alice', 'alice@rules.test');
const bob = await client('Bob', 'bob@rules.test');
const carol = await client('Carol', 'carol@rules.test');

console.log('profiles');
await allowed('own profile write', setDoc(doc(alice.db, 'users', alice.uid), { uid: alice.uid, displayName: 'Alice', email: 'a' }, { merge: true }));
await allowed('bob profile write', setDoc(doc(bob.db, 'users', bob.uid), { uid: bob.uid, displayName: 'Bob', email: 'b' }, { merge: true }));
await denied('write someone else’s profile', updateDoc(doc(bob.db, 'users', alice.uid), { displayName: 'x' }));

console.log('general room');
await allowed('alice joins General', joinGeneral(alice));
await allowed('bob joins General', joinGeneral(bob));
await denied('remove a member from General', updateDoc(doc(bob.db, 'rooms', 'general'), { members: [bob.uid] }));
await denied('carol reads General messages before joining', getDocs(collection(carol.db, 'rooms', 'general', 'messages')));

console.log('messages');
let aliceMsg;
await allowed('alice sends', (async () => { aliceMsg = await send(alice, 'general', 'hello'); })());
await denied('send as someone else', setDoc(doc(collection(bob.db, 'rooms', 'general', 'messages')), { type: 'text', text: 'x', senderId: alice.uid, senderName: 'A', mood: 'happy', createdAt: serverTimestamp() }));
await allowed('author edits', updateDoc(doc(alice.db, aliceMsg.path), { text: 'hello!', editedAt: serverTimestamp() }));
await denied('others edit', updateDoc(doc(bob.db, aliceMsg.path), { text: 'hacked', editedAt: serverTimestamp() }));
await allowed('bob reacts', updateDoc(doc(bob.db, aliceMsg.path), { [`reactions.${bob.uid}`]: 'lovely' }));
await denied('bob sets alice’s reaction', updateDoc(doc(bob.db, aliceMsg.path), { [`reactions.${alice.uid}`]: 'sad' }));
await allowed('bob removes own reaction', updateDoc(doc(bob.db, aliceMsg.path), { [`reactions.${bob.uid}`]: deleteField() }));
await denied('hard delete', deleteDoc(doc(alice.db, aliceMsg.path)));
await allowed('author soft-deletes', updateDoc(doc(alice.db, aliceMsg.path), { text: '', deleted: true }));
await denied('edit after delete', updateDoc(doc(alice.db, aliceMsg.path), { text: 'back', editedAt: serverTimestamp() }));

console.log('DMs and groups');
const dm = [alice.uid, bob.uid].sort().join('_');
await allowed('create DM', setDoc(doc(alice.db, 'rooms', dm), { name: '', type: 'dm', members: [alice.uid, bob.uid], memberNames: {}, createdBy: alice.uid, updatedAt: serverTimestamp(), lastMessage: null }));
await denied('DM with wrong id', setDoc(doc(alice.db, 'rooms', 'not-a-dm-id'), { name: '', type: 'dm', members: [alice.uid, bob.uid], memberNames: {}, createdBy: alice.uid }));
await denied('carol reads the DM', getDoc(doc(carol.db, 'rooms', dm)));
await denied('add carol to a DM', updateDoc(doc(alice.db, 'rooms', dm), { members: arrayUnion(carol.uid) }));
const group = doc(collection(alice.db, 'rooms'));
await allowed('create group', setDoc(group, { name: 'G', type: 'group', members: [alice.uid], memberNames: {}, createdBy: alice.uid, updatedAt: serverTimestamp(), lastMessage: null }));
await allowed('add bob to group', updateDoc(group, { members: arrayUnion(bob.uid), [`memberNames.${bob.uid}`]: 'Bob' }));
await denied('non-member writes typing', setDoc(doc(carol.db, 'rooms', group.id, 'typing', carol.uid), { name: 'C', at: serverTimestamp() }));
await allowed('member writes typing', setDoc(doc(bob.db, 'rooms', group.id, 'typing', bob.uid), { name: 'B', at: serverTimestamp() }));

console.log(failures ? `\n${failures} check(s) failed` : '\nAll rules checks passed');
process.exit(failures ? 1 : 0);
