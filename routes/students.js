const express = require('express');
const router = express.Router();
const Student = require('../models/Student');
const { verifyToken, requireRole } = require('../middleware/auth');

// Get all students (admin)
router.get('/', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const { status, search } = req.query;
    const query = {};
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { college: { $regex: search, $options: 'i' } }
      ];
    }
    const students = await Student.find(query).select('-password').sort({ createdAt: -1 });
    res.json(students);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get own profile (student)
router.get('/profile', verifyToken, requireRole('student'), async (req, res) => {
  try {
    const student = await Student.findById(req.user.id).select('-password');
    if (!student) return res.status(404).json({ error: 'Student not found.' });
    res.json(student);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Approve student (admin)
router.put('/:id/approve', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const student = await Student.findByIdAndUpdate(req.params.id, { status: 'approved' }, { new: true }).select('-password');
    if (!student) return res.status(404).json({ error: 'Student not found.' });
    req.io.emit('student:approved', { studentId: student._id, name: student.name });
    res.json(student);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reject student (admin)
router.put('/:id/reject', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const student = await Student.findByIdAndUpdate(req.params.id, { status: 'rejected' }, { new: true }).select('-password');
    if (!student) return res.status(404).json({ error: 'Student not found.' });
    res.json(student);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete student (admin)
router.delete('/:id', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const student = await Student.findByIdAndDelete(req.params.id);
    if (!student) return res.status(404).json({ error: 'Student not found.' });
    res.json({ message: 'Student removed.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
