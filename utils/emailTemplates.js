// ─────────────────────────────────────────────────────────────────────────────
//  DAAR Real Estate — Branded OTP Email Template (Af Soomaali)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {object} opts
 * @param {string}  opts.recipientName   - Magaca qofka email-ka helaya
 * @param {string}  opts.code            - Code-ka 6-lambar ah
 * @param {'verify'|'reset'} opts.type   - Nooca email-ka
 * @param {number}  opts.expireMinutes   - Daqiiqadaha ka hor uu dhaco
 * @param {string}  [opts.appName]       - Magaca app-ka (Setting-ka)
 * @param {string}  [opts.logoUrl]       - URL-ka logo-da app-ka
 */
function buildOtpEmail({
  recipientName,
  code,
  type = 'verify',
  expireMinutes = 10,
  appName = 'DAAR Real Estate',
  logoUrl = '',
}) {
  const isVerify = type === 'verify';

  const now      = new Date();
  const expiresAt = new Date(now.getTime() + expireMinutes * 60 * 1000);
  const timeStr   = expiresAt.toLocaleTimeString('so-SO', {
    hour: '2-digit', minute: '2-digit', hour12: false,
  });

  // ── Midabada ──────────────────────────────────────────────────────────────
  const accentColor = isVerify ? '#00897b' : '#d97706';
  const accentLight = isVerify ? '#e0f2f1' : '#fef3c7';
  const headerBg    = isVerify ? '#0c1b40' : '#451a03';
  const headerSubBg = isVerify ? '#1a3a6b' : '#92400e';

  // ── Qoraallada Af Soomaali ─────────────────────────────────────────────────
  const headingText = isVerify
    ? 'Xaqiijinta Xisaabtaada'
    : 'Dib-u-Dejinta Password-ka';
  const introText = isVerify
    ? `Waad ku mahadsan tahay inaad dooratay <strong>${appName}</strong>. Isticmaal koodka hoose si aad u dhameystirto diiwaangelintaada.`
    : `Codsi dib-u-dejin password ayaa laga soo gudbiyay akoonkaaga. Haddaad adigu codsatay, isticmaal koodka hoose si aad password cusub u sameyso.`;
  const warningText = isVerify
    ? 'Haddaadan codkan codsan, iska joog. Xisaabtaadu way ammaan tahay.'
    : 'Haddaadan codkan codsan, password-kaagu way ammaan yahay. Iska joog oo naga soo wac haddii aad shaki qabtid.';
  const copyHint = 'Taabo koodka oo nuqul ka qaado, kadibna geli app-ka.';

  // ── Digit boxes — mid kasta box gaar ah ───────────────────────────────────
  const digitBoxes = code.split('').map(d =>
    `<td style="padding:0 5px;">
       <div style="
         width:46px;height:58px;line-height:58px;
         background:#ffffff;
         border:2px solid ${accentColor};
         border-radius:12px;
         font-size:30px;font-weight:900;
         color:${accentColor};
         text-align:center;
         box-shadow:0 4px 12px rgba(0,0,0,0.10);
         font-family:'Courier New',monospace;
       ">${d}</div>
     </td>`
  ).join('');

  // ── Logo section ──────────────────────────────────────────────────────────
  const logoSection = logoUrl
    ? `<img src="${logoUrl}" alt="${appName}" style="height:50px;width:auto;object-fit:contain;margin-bottom:10px;" />`
    : `<div style="
        width:64px;height:64px;background:${accentColor};
        border-radius:16px;margin:0 auto 12px;
        display:flex;align-items:center;justify-content:center;
        font-size:32px;line-height:64px;text-align:center;
      ">🏠</div>`;

  return `<!DOCTYPE html>
<html lang="so">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>${appName} — ${headingText}</title>
</head>
<body style="margin:0;padding:0;background:#eef2f7;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#eef2f7;padding:40px 0;">
  <tr><td align="center" style="padding:0 16px;">

    <!--  ╔══════════════ CARD ══════════════╗  -->
    <table width="540" cellpadding="0" cellspacing="0" role="presentation"
      style="max-width:540px;width:100%;border-radius:20px;overflow:hidden;
             box-shadow:0 10px 50px rgba(12,27,64,0.15);">

      <!-- ── HEADER ── -->
      <tr>
        <td style="background:${headerBg};padding:0;">
          <!-- Top stripe -->
          <div style="background:${accentColor};height:5px;"></div>
          <!-- Logo + App name -->
          <div style="padding:32px 32px 24px;text-align:center;">
            ${logoSection}
            <h1 style="margin:0 0 6px;font-size:24px;font-weight:800;
                       color:#ffffff;letter-spacing:0.5px;">
              ${appName}
            </h1>
            <div style="display:inline-block;background:${headerSubBg};
                        border-radius:20px;padding:4px 16px;margin-top:4px;">
              <span style="font-size:13px;color:rgba(255,255,255,0.9);
                           letter-spacing:1.5px;text-transform:uppercase;">
                ${isVerify ? '🔐 Xaqiijinta Akoonka' : '🔑 Dib-u-Dejinta Password'}
              </span>
            </div>
          </div>
        </td>
      </tr>

      <!-- ── BODY ── -->
      <tr>
        <td style="background:#ffffff;padding:36px 36px 28px;">

          <!-- Salaan -->
          <p style="margin:0 0 6px;font-size:22px;font-weight:700;color:#0f172a;">
            Salaan, ${recipientName}! 👋
          </p>
          <p style="margin:0 0 28px;font-size:15px;color:#475569;line-height:1.7;">
            ${introText}
          </p>

          <!-- Label -->
          <p style="margin:0 0 12px;font-size:11px;font-weight:700;
                    color:#94a3b8;letter-spacing:2.5px;text-transform:uppercase;">
            Koodkaaga Xaqiijinta
          </p>

          <!-- Code Digits Box -->
          <div style="background:${accentLight};border-radius:16px;
                      padding:24px 16px 18px;text-align:center;
                      margin-bottom:10px;
                      border:1.5px solid ${accentColor}30;">
            <table cellpadding="0" cellspacing="0" role="presentation"
                   style="margin:0 auto 14px;">
              <tr>${digitBoxes}</tr>
            </table>
            <!-- Copy hint -->
            <p style="margin:0;font-size:12px;color:#64748b;">
              📋 ${copyHint}
            </p>
          </div>

          <!-- Expiry notice -->
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
                 style="margin-bottom:14px;">
            <tr>
              <td style="background:#f8fafc;border-radius:12px;
                         padding:14px 16px;border-left:4px solid ${accentColor};">
                <p style="margin:0;font-size:13px;color:#334155;line-height:1.6;">
                  ⏰ <strong>Waqtiga dhacaya:</strong>
                  Koodkan wuxuu dhacayaa <strong style="color:${accentColor};">
                  ${timeStr}</strong> — <em>${expireMinutes} daqiiqo</em> kadib.<br>
                  Degdeg isticmaal!
                </p>
              </td>
            </tr>
          </table>

          <!-- Security warning -->
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
            <tr>
              <td style="background:#fff5f5;border-radius:12px;
                         padding:14px 16px;border-left:4px solid #e11d48;">
                <p style="margin:0;font-size:13px;color:#9f1239;line-height:1.6;">
                  🔒 <strong>Digniin Amniga:</strong> ${warningText}
                </p>
              </td>
            </tr>
          </table>

        </td>
      </tr>

      <!-- ── DIVIDER ── -->
      <tr>
        <td style="background:#ffffff;padding:0 36px;">
          <div style="border-top:1px solid #e2e8f0;"></div>
        </td>
      </tr>

      <!-- ── FOOTER ── -->
      <tr>
        <td style="background:#f8fafc;padding:22px 36px;text-align:center;">
          <p style="margin:0 0 4px;font-size:13px;color:#64748b;">
            Email-kan waxaa diray <strong style="color:#0c1b40;">${appName}</strong>
          </p>
          <p style="margin:0 0 8px;font-size:12px;color:#94a3b8;">
            Haddii aad su'aal qabtid,
            <a href="mailto:${process.env.SMTP_EMAIL || 'support@realestate.so'}"
               style="color:${accentColor};text-decoration:none;font-weight:600;">
              nala soo xiriir
            </a>
          </p>
          <p style="margin:0;font-size:11px;color:#cbd5e1;">
            © ${new Date().getFullYear()} ${appName} — Dhammaan xuquuqaha way dhowrsanyihiin.
          </p>
        </td>
      </tr>

      <!-- Bottom stripe -->
      <tr>
        <td style="background:${accentColor};height:5px;"></td>
      </tr>

    </table>
    <!--  ╚══════════════ CARD ══════════════╝  -->

  </td></tr>
</table>

</body>
</html>`;
}

module.exports = { buildOtpEmail };
