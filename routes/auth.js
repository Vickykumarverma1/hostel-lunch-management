const express = require('express');
const router = express.Router();
const Student = require('../models/Student');
const DeliveryMan = require('../models/DeliveryMan');
const DeskOperator = require('../models/DeskOperator');
const Admin = require('../models/Admin');
const { generateToken, verifyToken } = require('../middleware/auth');

// ===== STUDENT AUTH =====
router.post('/student/register', async (req, res) => {
  try {
    const { name, phone, password, college, roomNumber, lunchTime } = req.body;
    if (!name || !phone || !password || !college || !roomNumber || !lunchTime) {
      return res.status(400).json({ error: 'All fields are required.' });
    }
    const exists = await Student.findOne({ phone });
    if (exists) return res.status(400).json({ error: 'Phone number already registered.' });

    const student = await Student.create({ name, phone, password, college, roomNumber, lunchTime });
    res.status(201).json({ message: 'Registration submitted. Wait for admin approval.', id: student._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/student/login', async (req, res) => {
  try {
    const { phone, password } = req.body;
    const student = await Student.findOne({ phone });
    if (!student) return res.status(401).json({ error: 'Invalid phone or password.' });

    const valid = await student.comparePassword(password);
    if (!valid) return res.status(401).json({ error: 'Invalid phone or password.' });

    if (student.status === 'pending') return res.status(403).json({ error: 'Your account is pending approval.' });
    if (student.status === 'rejected') return res.status(403).json({ error: 'Your account has been rejected.' });

    const token = generateToken({ id: student._id, role: 'student' });
    res.json({ token, user: { id: student._id, name: student.name, phone: student.phone, college: student.college, roomNumber: student.roomNumber, lunchTime: student.lunchTime, status: student.status } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== DELIVERY MAN AUTH =====
router.post('/delivery/login', async (req, res) => {
  try {
    const { phone, password } = req.body;
    const dm = await DeliveryMan.findOne({ phone });
    if (!dm) return res.status(401).json({ error: 'Invalid phone or password.' });

    const valid = await dm.comparePassword(password);
    if (!valid) return res.status(401).json({ error: 'Invalid phone or password.' });

    const token = generateToken({ id: dm._id, role: 'delivery' });
    res.json({ token, user: { id: dm._id, name: dm.name, phone: dm.phone, colleges: dm.colleges } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== DESK OPERATOR AUTH =====
router.post('/desk/login', async (req, res) => {
  try {
    const { phone, password } = req.body;
    const op = await DeskOperator.findOne({ phone });
    if (!op) return res.status(401).json({ error: 'Invalid phone or password.' });

    const valid = await op.comparePassword(password);
    if (!valid) return res.status(401).json({ error: 'Invalid phone or password.' });

    const token = generateToken({ id: op._id, role: 'desk' });
    res.json({ token, user: { id: op._id, name: op.name, phone: op.phone } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== ADMIN AUTH =====
router.post('/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const admin = await Admin.findOne({ username });
    if (!admin) return res.status(401).json({ error: 'Invalid credentials.' });

    const valid = await admin.comparePassword(password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials.' });

    const token = generateToken({ id: admin._id, role: 'admin' });
    res.json({ token, user: { id: admin._id, username: admin.username } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== GET CURRENT USER =====
router.get('/me', verifyToken, async (req, res) => {
  try {
    let user;
    switch (req.user.role) {
      case 'student':
        user = await Student.findById(req.user.id).select('-password');
        break;
      case 'delivery':
        user = await DeliveryMan.findById(req.user.id).select('-password');
        break;
      case 'desk':
        user = await DeskOperator.findById(req.user.id).select('-password');
        break;
      case 'admin':
        user = await Admin.findById(req.user.id).select('-password');
        break;
    }
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json({ role: req.user.role, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
