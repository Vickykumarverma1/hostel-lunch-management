const express = require('express');
const router = express.Router();
const DeliveryMan = require('../models/DeliveryMan');
const { verifyToken, requireRole } = require('../middleware/auth');

// List all delivery men (admin)
router.get('/', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const men = await DeliveryMan.find().select('-password').sort({ createdAt: -1 });
    res.json(men);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add delivery man (admin)
router.post('/', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const { name, phone, password, colleges } = req.body;
    if (!name || !phone || !password) return res.status(400).json({ error: 'Name, phone, password required.' });

    const exists = await DeliveryMan.findOne({ phone });
    if (exists) return res.status(400).json({ error: 'Phone already exists.' });

    const dm = await DeliveryMan.create({ name, phone, password, colleges: colleges || [] });
    res.status(201).json({ _id: dm._id, name: dm.name, phone: dm.phone, colleges: dm.colleges });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update delivery man (admin)
router.put('/:id', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const { name, phone, password, colleges } = req.body;
    const update = {};
    if (name) update.name = name;
    if (phone) update.phone = phone;
    if (colleges) update.colleges = colleges;

    const dm = await DeliveryMan.findById(req.params.id);
    if (!dm) return res.status(404).json({ error: 'Not found.' });

    if (name) dm.name = name;
    if (phone) dm.phone = phone;
    if (colleges) dm.colleges = colleges;
    if (password) dm.password = password; // pre-save hook hashes it

    await dm.save();
    res.json({ _id: dm._id, name: dm.name, phone: dm.phone, colleges: dm.colleges });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete delivery man (admin)
router.delete('/:id', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const dm = await DeliveryMan.findByIdAndDelete(req.params.id);
    if (!dm) return res.status(404).json({ error: 'Not found.' });
    res.json({ message: 'Delivery man removed.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
