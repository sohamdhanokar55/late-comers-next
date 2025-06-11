"use strict";
/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.monthlyLateComersReset = void 0;
const functions = __importStar(require("firebase-functions/v1"));
const admin = __importStar(require("firebase-admin"));
// Start writing functions
// https://firebase.google.com/docs/functions/typescript
// export const helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });
// Initialize Firebase Admin
admin.initializeApp();
// Cloud Function that runs at 00:00 (midnight) on the first day of every month
exports.monthlyLateComersReset = functions.pubsub
    .schedule("0 0 1 * *") // This cron expression means: "At 00:00 on day-of-month 1"
    .timeZone("Asia/Kolkata") // Set to Indian timezone
    .onRun(async (context) => {
    try {
        const db = admin.firestore();
        const lateComersRef = db.collection("late-comers");
        // Get all documents in the late-comers collection
        const snapshot = await lateComersRef.get();
        // Batch operations for better performance and atomicity
        const batch = db.batch();
        // For each department document in late-comers collection
        snapshot.docs.forEach((doc) => {
            // Reset the document with an empty object
            // This preserves the document ID but removes all fields
            batch.set(doc.ref, {}, { merge: false });
        });
        // Commit the batch operation
        await batch.commit();
        console.log("Successfully reset late-comers collection for the new month");
        return null;
    }
    catch (error) {
        console.error("Error resetting late-comers collection:", error);
        throw error;
    }
});
//# sourceMappingURL=index.js.map