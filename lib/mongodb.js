/**
 * MongoDB via connection string. Used by Express API.
 * Set MONGODB_URI in .env (or Vercel env).
 */
const { MongoClient, ObjectId } = require('mongodb');

const URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DATABASE || 'attendance';

let client = null;

async function getDb() {
  if (!URI) throw new Error('MONGODB_URI is not set');
  if (!client) {
    client = new MongoClient(URI);
    await client.connect();
  }
  return client.db(DB_NAME);
}

function toDoc(d) {
  if (!d) return null;
  const id = d._id != null && typeof d._id.toString === 'function' ? d._id.toString() : String(d._id);
  return { ...d, _id: id };
}

function toDocs(arr) {
  return arr.map((d) => toDoc(d)).filter(Boolean);
}

// --- Users ---
async function mongoGetUserByFirebaseUid(firebaseUid) {
  const db = await getDb();
  const doc = await db.collection('users').findOne({ firebaseUid });
  return toDoc(doc);
}

async function mongoCreateOrUpdateUser(doc) {
  const db = await getDb();
  const col = db.collection('users');
  const existing = await col.findOne({ firebaseUid: doc.firebaseUid });
  const now = new Date().toISOString();
  if (existing) {
    await col.updateOne(
      { _id: existing._id },
      {
        $set: {
          name: doc.name,
          email: doc.email,
          committedHoursPerDay: doc.committedHoursPerDay,
          weeklyOffDays: doc.weeklyOffDays,
          timezone: doc.timezone,
        },
      }
    );
    return toDoc({ ...existing, ...doc, createdAt: existing.createdAt || now });
  }
  const result = await col.insertOne({ ...doc, createdAt: now });
  return toDoc({ ...doc, _id: result.insertedId, createdAt: now });
}

// --- Attendance ---
async function mongoGetAttendanceByUser(userId) {
  const db = await getDb();
  const list = await db.collection('attendance').find({ userId }).sort({ date: -1 }).toArray();
  return toDocs(list);
}

async function mongoGetAttendanceByUserAndDate(userId, date) {
  const db = await getDb();
  const doc = await db.collection('attendance').findOne({ userId, date });
  return toDoc(doc);
}

async function mongoCreateAttendance(doc) {
  const db = await getDb();
  const result = await db.collection('attendance').insertOne(doc);
  return toDoc({ ...doc, _id: result.insertedId });
}

async function mongoFindAttendanceById(id) {
  const db = await getDb();
  if (!ObjectId.isValid(id)) return null;
  const doc = await db.collection('attendance').findOne({ _id: new ObjectId(id) });
  return toDoc(doc);
}

async function mongoUpdateAttendance(id, update) {
  const db = await getDb();
  if (!ObjectId.isValid(id)) return;
  await db.collection('attendance').updateOne({ _id: new ObjectId(id) }, { $set: update });
}

async function mongoDeleteAttendance(id) {
  const db = await getDb();
  if (!ObjectId.isValid(id)) return false;
  const result = await db.collection('attendance').deleteOne({ _id: new ObjectId(id) });
  return result.deletedCount === 1;
}

// --- Holidays ---
async function mongoGetHolidays(userId) {
  const db = await getDb();
  const list = await db.collection('holidays').find({ userId }).sort({ date: 1 }).toArray();
  return toDocs(list);
}

async function mongoAddHoliday(doc) {
  const db = await getDb();
  const result = await db.collection('holidays').insertOne(doc);
  return toDoc({ ...doc, _id: result.insertedId });
}

async function mongoDeleteHoliday(id) {
  const db = await getDb();
  if (!ObjectId.isValid(id)) return false;
  const result = await db.collection('holidays').deleteOne({ _id: new ObjectId(id) });
  return result.deletedCount === 1;
}

// --- Commitment history ---
async function mongoGetCommitmentHistory(userId) {
  const db = await getDb();
  const list = await db.collection('commitmentHistory').find({ userId }).sort({ effectiveFromDate: 1 }).toArray();
  return toDocs(list);
}

async function mongoAddCommitment(doc) {
  const db = await getDb();
  const result = await db.collection('commitmentHistory').insertOne(doc);
  return toDoc({ ...doc, _id: result.insertedId });
}

module.exports = {
  mongoGetUserByFirebaseUid,
  mongoCreateOrUpdateUser,
  mongoGetAttendanceByUser,
  mongoGetAttendanceByUserAndDate,
  mongoCreateAttendance,
  mongoFindAttendanceById,
  mongoUpdateAttendance,
  mongoDeleteAttendance,
  mongoGetHolidays,
  mongoAddHoliday,
  mongoDeleteHoliday,
  mongoGetCommitmentHistory,
  mongoAddCommitment,
};
