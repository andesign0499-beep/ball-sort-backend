const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// ==========================================
// 1. KẾT NỐI MONGODB
// ==========================================
mongoose.connect('mongodb+srv://andesign0499_db_user:FOOYc0hCVqGB2jP@cluster0.w7ajjcy.mongodb.net/?appName=Cluster0')
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// ==========================================
// 2. SCHEMA
// ==========================================
const ConfigSchema = new mongoose.Schema({
    gameTitle: { type: String, default: "Ball Sort Magic" },
    showTitle: { type: Boolean, default: true }
});
const Config = mongoose.model('Config', ConfigSchema);

const LevelSchema = new mongoose.Schema({
    matrix: [[String]], 
    level: { type: Number, required: true },
    slot: { type: Number, required: true, min: 1, max: 6 },
    status: { type: String, enum: ['PENDING', 'ACTIVE', 'ARCHIVED'], default: 'ACTIVE' },
    metrics: { minMoves: { type: Number, default: null }, solvable: { type: Boolean, default: null } }
}, { timestamps: true });
const Level = mongoose.model('Level', LevelSchema);

// ==========================================
// 3. API DÀNH CHO GAME NGƯỜI CHƠI
// ==========================================
app.get('/api/game/config', async (req, res) => {
    try {
        let config = await Config.findOne();
        if (!config) config = await Config.create({}); 
        res.json(config);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// Trả về mảng các Level đã có màn chơi (VD: [1, 2, 5])
app.get('/api/game/levels/active', async (req, res) => {
    try {
        const activeLevels = await Level.distinct('level', { status: 'ACTIVE' });
        res.json(activeLevels.sort((a,b) => a - b));
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// Trả về ngẫu nhiên 1 màn trong các slot của Level đó
app.get('/api/admin/levels/list/:levelNum', async (req, res) => {
    try {
        const levels = await Level.find({ level: parseInt(req.params.levelNum), status: 'ACTIVE' });
        res.json(levels);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// ==========================================
// 4. API DÀNH CHO ADMIN CMS
// ==========================================
app.post('/api/admin/config', async (req, res) => {
    const { gameTitle, showTitle } = req.body;
    try {
        let config = await Config.findOne();
        if (config) { config.gameTitle = gameTitle; config.showTitle = showTitle; await config.save(); } 
        else { config = await Config.create({ gameTitle, showTitle }); }
        res.json({ message: "Config updated", config });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/admin/levels', async (req, res) => {
    const { matrix, levelNum, slotNum, minMoves } = req.body;
    try {
        const updatedLevel = await Level.findOneAndUpdate(
            { level: levelNum, slot: slotNum }, 
            { matrix, status: 'ACTIVE', metrics: { solvable: true, minMoves } },
            { new: true, upsert: true }
        );
        res.json({ message: "Level saved successfully", level: updatedLevel });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

const PORT = 3000;
app.listen(PORT, () => { console.log(`🚀 Server CMS is running on http://localhost:${PORT}`); });