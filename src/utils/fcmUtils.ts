import admin from '../firebase/firebase';
import FCMTokenModel from '../models/FCMTokenModel';
import { logger } from '../utils/logger';

export const sendPushNotification = async (
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, string>,
): Promise<void> => {
  if (!tokens.length) return;

  try {
    const multicastPayload = {
      tokens,
      notification: { title, body },
      data: {
        click_action: 'FLUTTER_NOTIFICATION_CLICK',
        ...data,
      },
    };

    const response = await admin.messaging().sendEachForMulticast(multicastPayload);
    const { successCount, failureCount, responses: results } = response;

    logger.info?.(`Push sent: ${successCount} success, ${failureCount} failed`);

    const invalidTokens: string[] = [];
    results.forEach((res, idx) => {
      if (res.error) {
        const code = res.error.code;
        if (
          code === 'messaging/invalid-registration-token' ||
          code === 'messaging/registration-token-not-registered'
        ) {
          invalidTokens.push(tokens[idx]);
        }
      }
    });

    if (invalidTokens.length) {
      await FCMTokenModel.deleteMany({ token: { $in: invalidTokens } });
      logger.warn?.(`Removed ${invalidTokens.length} invalid FCM tokens`);
    }
  } catch (err: any) {
    logger.error?.('FCM push failed', err.message || err);
  }
};
