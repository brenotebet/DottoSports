import * as admin from 'firebase-admin';
import { HttpsError, onCall, onRequest } from 'firebase-functions/v2/https';
import { getStripeClient } from './stripeClient';

const db = admin.firestore();

/**
 * Callable: payOutstandingPayment({ paymentId })
 * Returns: { checkoutUrl, sessionId }
 */
export const payOutstandingPayment = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Sign-in required.');

  const paymentId = String(request.data?.paymentId ?? '');
  if (!paymentId) throw new HttpsError('invalid-argument', 'paymentId is required.');

  const paymentRef = db.collection('payments').doc(paymentId);
  const paymentSnap = await paymentRef.get();
  if (!paymentSnap.exists) throw new HttpsError('not-found', 'Payment not found.');

  const payment = paymentSnap.data() as any;

  // Adjust these field names if yours differ:
  // - payment.amount (number)
  // - payment.currency (string like 'usd')
  // - payment.invoiceId (string)
  // - payment.studentUid (string)
  if (payment.status === 'paid') {
    throw new HttpsError('failed-precondition', 'Payment already paid.');
  }

  const amount = Number(payment.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new HttpsError('failed-precondition', 'Invalid payment amount.');
  }

  const currency = String(payment.currency ?? 'usd').toLowerCase();
  const invoiceId = payment.invoiceId ? String(payment.invoiceId) : '';
  const studentUid = payment.studentUid ? String(payment.studentUid) : uid;

  // IMPORTANT:
  // If your Firestore stores amount in cents already, use: const unitAmount = amount;
  // If it stores dollars, use: amount * 100
  const unitAmount = Math.round(amount * 100);

  const successUrl =
    process.env.APP_SUCCESS_URL ??
    'https://example.com/success?session_id={CHECKOUT_SESSION_ID}';
  const cancelUrl = process.env.APP_CANCEL_URL ?? 'https://example.com/cancel';

  const stripe = getStripeClient();

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    success_url: successUrl,
    cancel_url: cancelUrl,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency,
          unit_amount: unitAmount,
          product_data: {
            name: invoiceId ? `Invoice ${invoiceId}` : `Payment ${paymentId}`,
          },
        },
      },
    ],
    metadata: {
      paymentId,
      invoiceId,
      studentUid,
    },
  });

  // Store mapping for debugging + reconciliation
  await db
    .collection('paymentSessions')
    .doc(session.id)
    .set(
      {
        sessionId: session.id,
        paymentId,
        invoiceId: invoiceId || null,
        studentUid,
        status: 'created',
        checkoutUrl: session.url ?? null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

  return { checkoutUrl: session.url, sessionId: session.id };
});

/**
 * HTTP Webhook: stripeWebhook
 * Signature verification requires the raw request body. Stripe docs emphasize using the raw body. :contentReference[oaicite:4]{index=4}
 */
export const stripeWebhook = onRequest(async (req, res) => {
  const sig = req.headers['stripe-signature'];
  if (!sig || typeof sig !== 'string') {
    res.status(400).send('Missing stripe-signature header');
    return;
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    res.status(500).send('Missing STRIPE_WEBHOOK_SECRET in environment');
    return;
  }

  const stripe = getStripeClient();

  let event: any;
  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
  } catch (err: any) {
    res.status(400).send(`Webhook Error: ${err?.message ?? 'Invalid signature'}`);
    return;
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;

      const paymentId = session?.metadata?.paymentId;
      const invoiceId = session?.metadata?.invoiceId || null;

      if (!paymentId) {
        res.status(200).send('No paymentId in metadata; ignored');
        return;
      }

      const paymentRef = db.collection('payments').doc(String(paymentId));
      const sessionRef = db.collection('paymentSessions').doc(String(session.id));
      const invoiceRef = invoiceId ? db.collection('invoices').doc(String(invoiceId)) : null;

      await db.runTransaction(async (tx) => {
        const paySnap = await tx.get(paymentRef);
        if (!paySnap.exists) return;

        const pay = paySnap.data() as any;
        if (pay.status === 'paid') return; // idempotent on retries

        tx.set(
          sessionRef,
          {
            status: 'completed',
            completedAt: admin.firestore.FieldValue.serverTimestamp(),
            stripePaymentIntentId: session.payment_intent ?? null,
            stripeCustomerId: session.customer ?? null,
          },
          { merge: true },
        );

        tx.set(
          paymentRef,
          {
            status: 'paid',
            paidAt: admin.firestore.FieldValue.serverTimestamp(),
            stripe: {
              checkoutSessionId: session.id,
              paymentIntentId: session.payment_intent ?? null,
            },
          },
          { merge: true },
        );

        if (invoiceRef) {
          tx.set(
            invoiceRef,
            {
              status: 'paid',
              paidAt: admin.firestore.FieldValue.serverTimestamp(),
              stripe: {
                checkoutSessionId: session.id,
                paymentIntentId: session.payment_intent ?? null,
              },
            },
            { merge: true },
          );
        }
      });
    }

    res.status(200).send('ok');
  } catch (err: any) {
    // 500 so Stripe retries
    res.status(500).send(`Handler Error: ${err?.message ?? 'unknown'}`);
  }
});
