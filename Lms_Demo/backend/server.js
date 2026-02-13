const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

const batchRoutes = require('./routes/batchRoutes');
const zoomRoutes = require('./routes/zoomRoutes');
const vimeoRoutes = require('./routes/vimeoRoutes');
const zoomWebhookRoutes = require('./routes/zoomWebhook');

dotenv.config();

const app = express();

app.use(cors());

/* ==============================
   WEBHOOK ROUTE (RAW BODY)
============================== */
app.use(
    '/zoom-webhook',
    express.raw({ type: 'application/json' })
);

app.use('/zoom-webhook', zoomWebhookRoutes);

/* ==============================
   NORMAL JSON ROUTES
============================== */
app.use(express.json());

app.use('/api/batch', batchRoutes);
app.use('/api/zoom', zoomRoutes);
app.use('/api/vimeo', vimeoRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
