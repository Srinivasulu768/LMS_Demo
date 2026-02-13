const crypto = require('crypto');

/*
  IMPORTANT:
  In server.js you MUST use:

  app.use('/api/zoom-webhook', express.raw({ type: 'application/json' }));
  app.use(express.json());

  Webhook route must come BEFORE express.json()
*/

module.exports = (req, res, next) => {

    const secret = process.env.ZOOM_WEBHOOK_SECRET_TOKEN;

    if (!secret) {
        console.error('ZOOM_WEBHOOK_SECRET_TOKEN not set');
        return res.status(500).send('Server misconfigured');
    }

    try {

        // Convert raw buffer to string
        const rawBody = req.body.toString();

        const body = JSON.parse(rawBody);

        /* ===============================
           1️⃣ Endpoint URL Validation
        =============================== */
        if (body.event === 'endpoint.url_validation') {

            const plainToken = body.payload.plainToken;

            const encryptedToken = crypto
                .createHmac('sha256', secret)
                .update(plainToken)
                .digest('hex');

            return res.status(200).json({
                plainToken,
                encryptedToken
            });
        }

        /* ===============================
           2️⃣ Signature Verification
        =============================== */

        const signature = req.headers['x-zm-signature'];
        const timestamp = req.headers['x-zm-request-timestamp'];

        if (!signature || !timestamp) {
            return res.status(401).send('Missing Zoom signature headers');
        }

        // Zoom required format:
        // message = "v0:{timestamp}:{rawBody}"
        const message = `v0:${timestamp}:${rawBody}`;

        const hash = crypto
            .createHmac('sha256', secret)
            .update(message)
            .digest('hex');

        const expectedSignature = `v0=${hash}`;

        if (signature !== expectedSignature) {
            console.log('Zoom signature mismatch');
            return res.status(401).send('Invalid signature');
        }

        // Attach parsed JSON body for next handlers
        req.body = body;

        next();

    } catch (error) {
        console.error('Zoom webhook verification error:', error);
        return res.status(400).send('Invalid request');
    }
};
