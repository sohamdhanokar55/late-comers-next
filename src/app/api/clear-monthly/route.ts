import { NextResponse } from "next/server";
import { db } from "../../../../firebase";
import {
  collection,
  getDocs,
  writeBatch,
  query,
  limit,
} from "firebase/firestore";

const BATCH_SIZE = 500; // Firestore batch size limit is 500

async function clearFieldsInBatch(documents: any[]) {
  const batch = writeBatch(db);

  documents.forEach((doc) => {
    // Update the document with empty fields
    // Keep only the id field, clear everything else
    batch.update(doc.ref, {
      checkInTime: null,
      checkOutTime: null,
      date: null,
      lateTime: null,
      reason: "",
      status: "",
      // Add any other fields that need to be cleared
    });
  });

  await batch.commit();
}

export async function POST(req: Request) {
  try {
    // Verify the secret token
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    if (token !== process.env.CRON_SECRET_TOKEN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const lateComersRef = collection(db, "late-comers");
    let processedCount = 0;

    // Process documents in batches
    while (true) {
      const q = query(lateComersRef, limit(BATCH_SIZE));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        break;
      }

      const documents = querySnapshot.docs;
      await clearFieldsInBatch(documents);
      processedCount += documents.length;

      if (documents.length < BATCH_SIZE) {
        break;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully cleared fields in ${processedCount} documents`,
    });
  } catch (error: any) {
    console.error("Error clearing fields:", error);
    return NextResponse.json(
      {
        error: "Failed to clear fields",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
