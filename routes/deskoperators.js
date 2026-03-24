const express = require('express');
const router = express.Router();
const DeskOperator = require('../models/DeskOperator');
const { verifyToken, requireRole } = require('../middleware/auth');

// List all desk operators (admin)
router.get('/', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const ops = await DeskOperator.find().select('-password').sort({ createdAt: -1 });
    res.json(ops);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add desk operator (admin)
router.post('/', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const { name, phone, password } = req.body;
    if (!name || !phone || !password) return res.status(400).json({ error: 'Name, phone, password required.' });

    const exists = await DeskOperator.findOne({ phone });
    if (exists) return res.status(400).json({ error: 'Phone already exists.' });

    const op = await DeskOperator.create({ name, phone, password });
    res.status(201).json({ _id: op._id, name: op.name, phone: op.phone });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update desk operator (admin)
router.put('/:id', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const { name, phone, password } = req.body;
    const op = await DeskOperator.findById(req.params.id);
    if (!op) return res.status(404).json({ error: 'Not found.' });

    if (name) op.name = name;
    if (phone) op.phone = phone;
    if (password) op.password = password;

    await op.save();
    res.json({ _id: op._id, name: op.name, phone: op.phone });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete desk operator (admin)
router.delete('/:id', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const op = await DeskOperator.findByIdAndDelete(req.params.id);
    if (!op) return res.status(404).json({ error: 'Not found.' });
    res.json({ message: 'Desk operator removed.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
