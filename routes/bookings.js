const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const Student = require('../models/Student');
const { verifyToken, requireRole } = require('../middleware/auth');

function todayStr() { return new Date().toISOString().split('T')[0]; }

// Book lunch (student)
router.post('/', verifyToken, requireRole('student'), async (req, res) => {
  try {
    const student = await Student.findById(req.user.id);
    if (!student) return res.status(404).json({ error: 'Student not found.' });
    if (student.status !== 'approved') return res.status(403).json({ error: 'Account not approved.' });

    const date = req.body.date || todayStr();
    const existing = await Booking.findOne({ studentId: student._id, date });
    if (existing) return res.status(400).json({ error: 'Already booked for this date.' });

    const booking = await Booking.create({
      studentId: student._id,
      date,
      college: student.college,
      status: 'booked'
    });

    req.io.emit('booking:new', { booking, student: { name: student.name, college: student.college } });
    res.status(201).json(booking);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Cancel booking (student)
router.delete('/:id', verifyToken, requireRole('student'), async (req, res) => {
  try {
    const booking = await Booking.findOne({ _id: req.params.id, studentId: req.user.id });
    if (!booking) return res.status(404).json({ error: 'Booking not found.' });
    if (booking.status !== 'booked') return res.status(400).json({ error: 'Cannot cancel after delivery.' });

    await Booking.findByIdAndDelete(req.params.id);
    req.io.emit('booking:cancel', { bookingId: req.params.id, college: booking.college });
    res.json({ message: 'Booking cancelled.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get today's bookings — filtered by role
router.get('/today', verifyToken, async (req, res) => {
  try {
    const date = req.query.date || todayStr();
    let query = { date };

    if (req.user.role === 'student') {
      query.studentId = req.user.id;
    }

    const bookings = await Booking.find(query).populate('studentId', 'name phone college roomNumber lunchTime').sort({ createdAt: -1 });

    // For delivery man: only show booked & delivered (no return info)
    let results = bookings.map(b => {
      const s = b.studentId;
      const obj = {
        _id: b._id,
        date: b.date,
        college: b.college,
        status: b.status,
        deliveredAt: b.deliveredAt,
        student: s ? { _id: s._id, name: s.name, phone: s.phone, college: s.college, roomNumber: s.roomNumber, lunchTime: s.lunchTime } : null
      };
      // Include return info only for desk operators and admin
      if (req.user.role === 'desk' || req.user.role === 'admin') {
        obj.returnedAt = b.returnedAt;
        obj.returnedBy = b.returnedBy;
      }
      return obj;
    });

    // Delivery man sees only their assigned colleges
    if (req.user.role === 'delivery') {
      const DeliveryMan = require('../models/DeliveryMan');
      const dm = await DeliveryMan.findById(req.user.id);
      if (dm && dm.colleges.length > 0) {
        results = results.filter(r => dm.colleges.includes(r.college));
      }
    }

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mark as delivered (delivery man)
router.put('/:id/deliver', verifyToken, requireRole('delivery'), async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Booking not found.' });
    if (booking.status !== 'booked') return res.status(400).json({ error: 'Can only deliver booked items.' });

    booking.status = 'delivered';
    booking.deliveredAt = new Date();
    booking.deliveryManId = req.user.id;
    await booking.save();

    const student = await Student.findById(booking.studentId).select('name phone college roomNumber');
    req.io.emit('booking:delivered', { booking, student });
    res.json(booking);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mark as returned (desk operator)
router.put('/:id/return', verifyToken, requireRole('desk'), async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Booking not found.' });
    if (booking.status !== 'delivered') {
      return res.status(400).json({ error: 'Return can only be marked if lunch is already delivered!' });
    }

    booking.status = 'returned';
    booking.returnedAt = new Date();
    booking.returnedBy = req.user.id;
    await booking.save();

    const student = await Student.findById(booking.studentId).select('name phone college roomNumber');
    req.io.emit('booking:returned', { booking, student });
    res.json(booking);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
