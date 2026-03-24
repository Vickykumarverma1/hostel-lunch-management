const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const Student = require('../models/Student');
const { verifyToken, requireRole } = require('../middleware/auth');

// Overall summary
router.get('/summary', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const totalStudents = await Student.countDocuments({ status: 'approved' });
    const todayBookings = await Booking.countDocuments({ date: today });
    const todayDelivered = await Booking.countDocuments({ date: today, status: { $in: ['delivered', 'returned'] } });
    const todayReturned = await Booking.countDocuments({ date: today, status: 'returned' });
    const pendingApprovals = await Student.countDocuments({ status: 'pending' });

    res.json({
      totalStudents,
      todayBookings,
      todayDelivered,
      todayReturned,
      todayPending: todayBookings - todayDelivered,
      todayMissing: todayDelivered - todayReturned,
      pendingApprovals,
      deliveryRate: todayBookings > 0 ? Math.round((todayDelivered / todayBookings) * 100) : 0,
      returnRate: todayDelivered > 0 ? Math.round((todayReturned / todayDelivered) * 100) : 0
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Daily trends (last 30 days)
router.get('/daily', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const dates = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().split('T')[0]);
    }

    const bookings = await Booking.find({ date: { $in: dates } });
    const data = dates.map(date => {
      const dayBookings = bookings.filter(b => b.date === date);
      return {
        date,
        booked: dayBookings.length,
        delivered: dayBookings.filter(b => b.status === 'delivered' || b.status === 'returned').length,
        returned: dayBookings.filter(b => b.status === 'returned').length
      };
    });

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// College breakdown (today or selected date)
router.get('/college', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().split('T')[0];
    const bookings = await Booking.find({ date });

    const colleges = {};
    bookings.forEach(b => {
      if (!colleges[b.college]) colleges[b.college] = { booked: 0, delivered: 0, returned: 0 };
      colleges[b.college].booked++;
      if (b.status === 'delivered' || b.status === 'returned') colleges[b.college].delivered++;
      if (b.status === 'returned') colleges[b.college].returned++;
    });

    const result = Object.entries(colleges).map(([name, stats]) => ({ college: name, ...stats }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Peak hours
router.get('/peak-hours', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const students = await Student.find({ status: 'approved' }).select('lunchTime');
    const hours = {};
    students.forEach(s => {
      if (!s.lunchTime) return;
      const h = s.lunchTime.split(':')[0];
      const label = `${h}:00`;
      hours[label] = (hours[label] || 0) + 1;
    });

    const result = Object.entries(hours).map(([hour, count]) => ({ hour, count })).sort((a, b) => a.hour.localeCompare(b.hour));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
