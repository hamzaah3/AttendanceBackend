/**
 * Express backend for Attendance App.
 * Routes: /api/users, /api/attendance, /api/holidays, /api/commitment
 * Load .env from file in development; on Vercel use dashboard env.
 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongo = require('./lib/mongodb');

const app = express();

app.use(cors({
  origin: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-User-Id', 'X-Firebase-Uid'],
}));
app.use(express.json());

function getUserId(req) {
  return req.headers['x-user-id'] || req.headers['x-firebase-uid'] || null;
}

// --- /api/users ---
app.get('/api/users', async (req, res) => {
  try {
    const firebaseUid = req.query.firebaseUid || getUserId(req);
    if (!firebaseUid) {
      return res.status(400).json({ error: 'Missing firebaseUid' });
    }
    const user = await mongo.mongoGetUserByFirebaseUid(firebaseUid);
    return res.json(user ?? null);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e instanceof Error ? e.message : 'Server error' });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    const { firebaseUid, name, email, committedHoursPerDay = 8, weeklyOffDays = ['Saturday', 'Sunday'], timezone } = req.body;
    if (!firebaseUid || !email) {
      return res.status(400).json({ error: 'Missing firebaseUid or email' });
    }
    const user = await mongo.mongoCreateOrUpdateUser({
      firebaseUid,
      name: name ?? email.split('@')[0],
      email,
      committedHoursPerDay: Number(committedHoursPerDay) || 8,
      weeklyOffDays: Array.isArray(weeklyOffDays) ? weeklyOffDays : ['Saturday', 'Sunday'],
      timezone: timezone ?? 'UTC',
    });
    return res.json(user);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e instanceof Error ? e.message : 'Server error' });
  }
});

// --- /api/attendance ---
app.get('/api/attendance', async (req, res) => {
  try {
    const userId = req.query.userId || getUserId(req);
    const date = req.query.date;
    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' });
    }
    if (date) {
      const one = await mongo.mongoGetAttendanceByUserAndDate(userId, date);
      return res.json(one ?? null);
    }
    const list = await mongo.mongoGetAttendanceByUser(userId);
    return res.json(list);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e instanceof Error ? e.message : 'Server error' });
  }
});

app.post('/api/attendance', async (req, res) => {
  try {
    const { userId, date, checkInTime, checkOutTime, notes, isManual = false } = req.body;
    if (!userId || !date || !checkInTime) {
      return res.status(400).json({ error: 'Missing userId, date, or checkInTime' });
    }
    const existing = await mongo.mongoGetAttendanceByUserAndDate(userId, date);
    if (existing) {
      return res.status(409).json({ error: 'Attendance already exists for this date' });
    }
    const checkIn = new Date(`${date}T${checkInTime}`);
    const checkOut = checkOutTime ? new Date(`${date}T${checkOutTime}`) : null;
    const totalWorkedMinutes = checkOut ? Math.max(0, Math.floor((checkOut.getTime() - checkIn.getTime()) / 60000)) : 0;
    const status = checkOut ? (isManual ? 'manual' : 'complete') : 'incomplete';
    const doc = await mongo.mongoCreateAttendance({
      userId,
      date,
      checkInTime,
      checkOutTime,
      totalWorkedMinutes,
      status,
      notes,
      isManual,
      createdAt: new Date().toISOString(),
    });
    return res.json(doc);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e instanceof Error ? e.message : 'Server error' });
  }
});

app.patch('/api/attendance', async (req, res) => {
  try {
    const { id, checkInTime, checkOutTime, notes } = req.body;
    if (!id) {
      return res.status(400).json({ error: 'Missing id' });
    }
    const current = await mongo.mongoFindAttendanceById(id);
    if (!current) {
      return res.status(404).json({ error: 'Not found' });
    }
    const c = current;
    const date = String(c.date);
    const ci = checkInTime ?? c.checkInTime;
    const co = checkOutTime ?? c.checkOutTime;
    const checkIn = new Date(`${date}T${ci}`);
    const checkOut = co ? new Date(`${date}T${co}`) : null;
    const totalWorkedMinutes = checkOut ? Math.max(0, Math.floor((checkOut.getTime() - checkIn.getTime()) / 60000)) : 0;
    const status = checkOut ? 'manual' : 'incomplete';
    await mongo.mongoUpdateAttendance(id, {
      checkInTime: ci,
      checkOutTime: co,
      notes: notes ?? c.notes,
      totalWorkedMinutes,
      status,
      isManual: true,
    });
    const updated = await mongo.mongoFindAttendanceById(id);
    return res.json(updated ?? null);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e instanceof Error ? e.message : 'Server error' });
  }
});

app.delete('/api/attendance', async (req, res) => {
  try {
    const id = req.query.id;
    if (!id) {
      return res.status(400).json({ error: 'Missing id' });
    }
    const ok = await mongo.mongoDeleteAttendance(id);
    return res.json({ deleted: ok });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e instanceof Error ? e.message : 'Server error' });
  }
});

// --- /api/holidays ---
app.get('/api/holidays', async (req, res) => {
  try {
    const userId = req.query.userId || getUserId(req);
    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' });
    }
    const list = await mongo.mongoGetHolidays(userId);
    return res.json(list);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e instanceof Error ? e.message : 'Server error' });
  }
});

app.post('/api/holidays', async (req, res) => {
  try {
    const { userId, date, title } = req.body;
    if (!userId || !date || !title) {
      return res.status(400).json({ error: 'Missing userId, date, or title' });
    }
    const doc = await mongo.mongoAddHoliday({ userId, date, title });
    return res.json(doc);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e instanceof Error ? e.message : 'Server error' });
  }
});

app.delete('/api/holidays', async (req, res) => {
  try {
    const id = req.query.id;
    if (!id) {
      return res.status(400).json({ error: 'Missing id' });
    }
    const ok = await mongo.mongoDeleteHoliday(id);
    return res.json({ deleted: ok });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e instanceof Error ? e.message : 'Server error' });
  }
});

// --- /api/commitment ---
app.get('/api/commitment', async (req, res) => {
  try {
    const userId = req.query.userId || getUserId(req);
    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' });
    }
    const list = await mongo.mongoGetCommitmentHistory(userId);
    return res.json(list);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e instanceof Error ? e.message : 'Server error' });
  }
});

app.post('/api/commitment', async (req, res) => {
  try {
    const { userId, hoursPerDay, effectiveFromDate } = req.body;
    if (!userId || hoursPerDay == null || !effectiveFromDate) {
      return res.status(400).json({ error: 'Missing userId, hoursPerDay, or effectiveFromDate' });
    }
    const doc = await mongo.mongoAddCommitment({
      userId,
      hoursPerDay: Number(hoursPerDay) || 8,
      effectiveFromDate,
    });
    return res.json(doc);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e instanceof Error ? e.message : 'Server error' });
  }
});

// Health check (optional, for Vercel)
app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

module.exports = app;
