const express = require('express');
const cors = require('cors');
const path = require('path');
const apiRoutes = require('./routes/api');

const app = express();

// CORS - Allow all origins for Vercel deployment
app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const db = require('./models');

// Health check
app.get('/api', (req, res) => {
    res.json({
        message: '🚧 Lapor Jalan Rusak API',
        status: 'running'
    });
});

// DB Connection Check
app.get('/api/db-check', async (req, res) => {
    try {
        await db.sequelize.authenticate();
        res.json({ message: '✅ Database Connection State: ESTABLISHED', config: process.env.DATABASE_URL ? 'Using Env Var' : 'Using Config' });
    } catch (error) {
        res.status(500).json({ message: '❌ Database Connection Error', error: error.message });
    }
});







// API routes
app.use('/api', apiRoutes);

// For Vercel serverless
module.exports = app;

// For local development
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 5000;
    const db = require('./models');

    db.sequelize.sync().then(() => {
        app.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
        });
    });
}