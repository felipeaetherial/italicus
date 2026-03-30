import { type FirebaseApp, getApps, initializeApp } from "firebase/app";
import { type Auth, getAuth } from "firebase/auth";
import { type Firestore, getFirestore } from "firebase/firestore";
import { type FirebaseStorage, getStorage } from "firebase/storage";

const firebaseConfig = {
	apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "dummy-key",
	authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
	projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
	storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
	messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
	appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
};

let app: FirebaseApp;
let _auth: Auth;
let _db: Firestore;
let _storage: FirebaseStorage;

function getApp(): FirebaseApp {
	if (app) return app;
	app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
	return app;
}

export const auth = new Proxy({} as Auth, {
	get(_, prop) {
		if (!_auth) _auth = getAuth(getApp());
		return (_auth as unknown as Record<string | symbol, unknown>)[prop];
	},
});

export const db = new Proxy({} as Firestore, {
	get(_, prop) {
		if (!_db) _db = getFirestore(getApp());
		return (_db as unknown as Record<string | symbol, unknown>)[prop];
	},
});

export const storage = new Proxy({} as FirebaseStorage, {
	get(_, prop) {
		if (!_storage) _storage = getStorage(getApp());
		return (_storage as unknown as Record<string | symbol, unknown>)[prop];
	},
});
