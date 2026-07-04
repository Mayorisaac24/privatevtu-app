import { ReceiptColors, Overlays } from '../theme/colors/app-colors';
import type { ThemeColors, ThemeGradients } from '../theme/types';
import type { TransactionReceiptData } from './transaction-receipt';
import { POWERED_BY_LABEL } from '../constants/brand';

export type ReceiptTheme = Pick<
  ThemeColors,
  'primary' | 'primaryDark' | 'primaryDeep' | 'success' | 'successLight' | 'error' | 'errorLight' | 'warning' | 'warningLight' | 'dark' | 'muted' | 'surface' | 'white'
> & {
  cardGradient: readonly string[];
};

export function receiptThemeFromApp(colors: ThemeColors, gradients: ThemeGradients): ReceiptTheme {
  return {
    primary: colors.primary,
    primaryDark: colors.primaryDark,
    primaryDeep: colors.primaryDeep,
    success: colors.success,
    successLight: colors.successLight,
    error: colors.error,
    errorLight: colors.errorLight,
    warning: colors.warning,
    warningLight: colors.warningLight,
    dark: colors.dark,
    muted: colors.muted,
    surface: colors.surface,
    white: colors.white,
    cardGradient: gradients.card,
  };
}

function statusColors(tone: TransactionReceiptData['statusTone'], theme: ReceiptTheme) {
  switch (tone) {
    case 'successful':
      return { bg: theme.successLight, text: theme.success, dot: theme.success };
    case 'failed':
      return { bg: theme.errorLight, text: theme.error, dot: theme.error };
    case 'processing':
      return { bg: ReceiptColors.pendingBg, text: ReceiptColors.pendingText, dot: ReceiptColors.pendingDot };
    default:
      return { bg: theme.warningLight, text: theme.warning, dot: theme.warning };
  }
}

/** Wraps a captured receipt PNG in minimal HTML so expo-print produces a PDF that matches the on-screen card. */
export function buildReceiptImagePdfHtml(imageDataUri: string, theme: ReceiptTheme): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    @page { margin: 20px; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background: ${theme.surface};
      display: flex;
      justify-content: center;
      align-items: flex-start;
      min-height: 100%;
      padding: 20px 12px;
    }
    img {
      width: 360px;
      max-width: 100%;
      height: auto;
      display: block;
      border-radius: 20px;
    }
  </style>
</head>
<body>
  <img src="${imageDataUri}" alt="Transaction receipt" />
</body>
</html>`;
}

export function buildReceiptHtml(data: TransactionReceiptData, theme: ReceiptTheme): string {
  const status = statusColors(data.statusTone, theme);
  const gradient = theme.cardGradient;
  const rowsHtml = data.rows.map((row) => `
    <tr>
      <td style="padding:12px 0;color:${theme.muted};font-size:11px;font-weight:600;letter-spacing:0.4px;text-transform:uppercase;vertical-align:top;width:38%;">${escapeHtml(row.label)}</td>
      <td style="padding:12px 0;color:${row.highlight ? theme.primaryDark : theme.dark};font-size:14px;font-weight:${row.highlight ? '700' : '600'};text-align:right;vertical-align:top;line-height:1.45;">${escapeHtml(row.value)}</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background: ${theme.surface};
      color: ${theme.dark};
      padding: 24px;
    }
    .receipt {
      max-width: 420px;
      margin: 0 auto;
      border-radius: 20px;
      overflow: hidden;
      border: 1px solid ${Overlays.borderSubtle};
      background: ${theme.white};
      box-shadow: 0 18px 40px ${Overlays.rgba76_29_149_012};
    }
    .hero {
      padding: 28px 24px 24px;
      background: linear-gradient(135deg, ${gradient[0]}, ${gradient[1]}, ${gradient[2]});
      color: ${theme.white};
      text-align: center;
    }
    .brand {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 1.2px;
      text-transform: uppercase;
      opacity: 0.78;
      margin-bottom: 10px;
    }
    .amount {
      font-size: 34px;
      font-weight: 800;
      letter-spacing: -0.8px;
      margin-bottom: 6px;
    }
    .title {
      font-size: 15px;
      font-weight: 700;
      opacity: 0.95;
      line-height: 1.35;
      margin-bottom: 4px;
    }
    .when {
      font-size: 12px;
      opacity: 0.72;
      margin-bottom: 14px;
    }
    .status {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 14px;
      border-radius: 999px;
      background: ${Overlays.white16};
      border: 1px solid ${Overlays.rgba255_255_255_022};
      font-size: 12px;
      font-weight: 700;
    }
    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: ${status.dot};
    }
    .body {
      padding: 8px 24px 20px;
    }
    .divider {
      border: none;
      border-top: 1px dashed ${Overlays.rgba15_23_42_012};
      margin: 8px 0 4px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    tr + tr td {
      border-top: 1px solid ${Overlays.borderFaint};
    }
    .reference {
      margin-top: 16px;
      padding: 12px 14px;
      border-radius: 14px;
      background: ${theme.surface};
      text-align: center;
    }
    .reference-label {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.8px;
      text-transform: uppercase;
      color: ${theme.muted};
      margin-bottom: 4px;
    }
    .reference-value {
      font-size: 13px;
      font-weight: 700;
      color: ${theme.primaryDeep};
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      word-break: break-all;
    }
    .footer {
      padding: 16px 24px 22px;
      border-top: 1px solid ${Overlays.borderFaint};
      text-align: center;
      background: ${theme.surface};
    }
    .footer-title {
      font-size: 12px;
      font-weight: 700;
      color: ${theme.primaryDark};
      margin-bottom: 4px;
    }
    .footer-sub {
      font-size: 11px;
      color: ${theme.muted};
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="hero">
      <div class="brand">${escapeHtml(data.appName)}</div>
      <div class="amount">${escapeHtml(data.amount)}</div>
      <div class="title">${escapeHtml(data.title)}</div>
      <div class="when">${escapeHtml(data.dateTime)} · ${escapeHtml(data.paymentMethod)}</div>
      <div class="status">
        <span class="status-dot"></span>
        <span>${escapeHtml(data.statusLabel)}</span>
      </div>
    </div>
    <div class="body">
      <hr class="divider" />
      <table>${rowsHtml}</table>
      <div class="reference">
        <div class="reference-label">Transaction reference</div>
        <div class="reference-value">${escapeHtml(data.reference)}</div>
      </div>
    </div>
    <div class="footer">
      <div class="footer-title">Official transaction receipt</div>
      <div class="footer-sub">Generated by ${escapeHtml(data.appName)}<br/>Support: ${escapeHtml(data.supportEmail)}<br/>${escapeHtml(POWERED_BY_LABEL)}</div>
    </div>
  </div>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
