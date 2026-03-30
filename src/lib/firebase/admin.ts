import {
	type App,
	type ServiceAccount,
	cert,
	getApps,
	initializeApp,
} from "firebase-admin/app";
import { type Auth, getAuth } from "firebase-admin/auth";
import { type Firestore, getFirestore } from "firebase-admin/firestore";

let _app: App | undefined;
let _auth: Auth | undefined;
let _db: Firestore | undefined;

function getApp(): App {
	if (_app) return _app;

	if (getApps().length > 0) {
		_app = getApps()[0];
		return _app;
	}

	const serviceAccount: ServiceAccount = {
		projectId: process.env.FIREBASE_PROJECT_ID,
		clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
		privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
	};

	_app = initializeApp({ credential: cert(serviceAccount) });
	return _app;
}

export const adminAuth: Auth = new Proxy({} as Auth, {
	get(_, prop) {
		if (!_auth) _auth = getAuth(getApp());
		return (_auth as unknown as Record<string | symbol, unknown>)[prop];
	},
});

export const adminDb: Firestore = new Proxy({} as Firestore, {
	get(_, prop) {
		if (!_db) _db = getFirestore(getApp());
		return (_db as unknown as Record<string | symbol, unknown>)[prop];
	},
});
