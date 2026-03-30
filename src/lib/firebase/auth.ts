import {
	createUserWithEmailAndPassword,
	onAuthStateChanged,
	sendPasswordResetEmail,
	signInWithEmailAndPassword,
	signOut as firebaseSignOut,
	updateProfile,
	type User,
} from "firebase/auth";
import { auth } from "./config";

export async function signInWithEmail(email: string, password: string) {
	return signInWithEmailAndPassword(auth, email, password);
}

export async function signUpWithEmail(
	email: string,
	password: string,
	displayName: string,
) {
	const credential = await createUserWithEmailAndPassword(auth, email, password);
	await updateProfile(credential.user, { displayName });
	return credential;
}

export async function signOut() {
	return firebaseSignOut(auth);
}

export async function resetPassword(email: string) {
	return sendPasswordResetEmail(auth, email);
}

export function onAuthChange(callback: (user: User | null) => void) {
	return onAuthStateChanged(auth, callback);
}

export async function getIdToken(): Promise<string | null> {
	const user = auth.currentUser;
	if (!user) return null;
	return user.getIdToken();
}
