/**
 * 語音識別路由
 * 為前端生成訊飛語音聽寫 (iat) WebAPI 的簽名 WebSocket URL
 *
 * 鑑權算法參考：https://www.xfyun.cn/doc/asr/voicedict/API.html
 * 使用 HMAC-SHA256 對 host + date + request-line 簽名
 */
import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

/**
 * GET /api/speech/ws-url
 * 生成訊飛語音聽寫 WebSocket URL（含鑑權信息）
 *
 * Query 參數:
 *   lang - 語言類型：zh_cn（中文，默認）、en_us（英文）
 */
router.get('/ws-url', (req: Request, res: Response, next: NextFunction) => {
  try {
    const appId = (process.env.XFYUN_APP_ID || '').trim();
    const apiKey = (process.env.XFYUN_API_KEY || '').trim();
    const apiSecret = (process.env.XFYUN_API_SECRET || '').trim();

    if (!appId || !apiKey || !apiSecret) {
      const missing = [
        !appId && 'XFYUN_APP_ID',
        !apiKey && 'XFYUN_API_KEY',
        !apiSecret && 'XFYUN_API_SECRET',
      ]
        .filter(Boolean)
        .join(', ');
      return next(
        new AppError(
          500,
          `訊飛語音識別未配置，缺少: ${missing}。請在 .env 中設置。`,
          'XFYUN_NOT_CONFIGURED'
        )
      );
    }

    const lang = (req.query.lang as string) || 'zh_cn';

    // ========== 生成 iat WebAPI 鑑權 URL ==========
    const host = 'iat-api.xfyun.cn';
    const path = '/v2/iat';
    const date = new Date().toUTCString();

    // 1. 構建待簽名字符串
    const signatureOrigin = `host: ${host}\ndate: ${date}\nGET ${path} HTTP/1.1`;

    // 2. 使用 HMAC-SHA256 + apiSecret 簽名
    const signatureSha = crypto
      .createHmac('sha256', apiSecret)
      .update(signatureOrigin)
      .digest('base64');

    // 3. 構建 authorization 原文
    const authorizationOrigin = `api_key="${apiKey}", algorithm="hmac-sha256", headers="host date request-line", signature="${signatureSha}"`;

    // 4. Base64 編碼
    const authorization = Buffer.from(authorizationOrigin).toString('base64');

    // 5. 構建完整 WebSocket URL
    const wsUrl =
      `wss://${host}${path}` +
      `?authorization=${encodeURIComponent(authorization)}` +
      `&date=${encodeURIComponent(date)}` +
      `&host=${encodeURIComponent(host)}`;

    console.log(`🎤 生成訊飛語音聽寫 (iat) WebSocket URL:`, {
      appId,
      apiKeyPrefix: apiKey.substring(0, 6) + '...',
      date,
      lang,
    });

    res.json({
      success: true,
      data: {
        url: wsUrl,
        appId,
        lang,
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      return next(error);
    }
    console.error('生成語音識別 URL 失敗:', error);
    return next(new AppError(500, '生成語音識別 URL 失敗'));
  }
});

export default router;
