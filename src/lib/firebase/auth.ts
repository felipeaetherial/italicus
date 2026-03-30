import {
	GoogleAuthProvider,
	createUserWithEmailAndPassword,
	signInWithEmailAndPassword,
	signInWithPopup,
	signOut as firebaseSignOut,
} from "firebase/auth";
import { auth } from "./config";

export async function signIn(email: string, password: string) {
	return signInWithEmailAndPassword(auth, email, password);
}

export async function signUp(email: string, password: string) {
	return createUserWithEmailAndPassword(auth, email, password);
}

export async function signInWithGoogle() {
	const provider = new GoogleAuthProvider();
	return signInWithPopup(auth, provider);
}

export async function signOut() {
	return firebaseSignOut(auth);
}
