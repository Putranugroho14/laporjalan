const { User } = require('../models');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { SECRET_KEY } = require('../middleware/auth');

exports.register = async (req, res) => {
  try {
    const { nama, email, password } = req.body;
    if (password.length < 6) return res.status(400).json({ message: "Password minimal 6 karakter!" });
    const hashedPassword = await bcrypt.hash(password, 10);
    await User.create({ nama, email, password: hashedPassword });
    res.json({ message: "Registrasi berhasil!" });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(404).json({ message: "User tidak ditemukan" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ message: "Password salah" });

    const token = jwt.sign({ id: user.id, role: user.role }, SECRET_KEY);
    res.json({ message: "Login sukses", token, role: user.role, nama: user.nama });
  } catch (err) { res.status(500).json({ error: err.message }); }
};