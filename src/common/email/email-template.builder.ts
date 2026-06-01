export class EmailTemplateBuilder {
  static buildTempPasswordEmail(tempPassword: string): string {
    return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Apple SD Gothic Neo',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">

          <!-- 헤더 -->
          <tr>
            <td align="center" style="background:linear-gradient(135deg,#6EF0A8,#3DD68C);padding:20px 0;">
              <div style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">BatChar</div>
              <div style="color:rgba(255,255,255,0.85);font-size:13px;margin-top:4px;">한밭대학교 중고 경매 플랫폼</div>
            </td>
          </tr>

          <!-- 본문 -->
          <tr>
            <td style="padding:36px 40px 16px;">
              <p style="margin:0 0 8px;font-size:20px;font-weight:700;color:#111827;">임시 비밀번호 발급</p>
              <p style="margin:0;font-size:14px;color:#6b7280;line-height:1.6;">
                아래 임시 비밀번호로 로그인 후 반드시 비밀번호를 변경해 주세요.
              </p>
            </td>
          </tr>

          <!-- 임시 비밀번호 박스 -->
          <tr>
            <td style="padding:16px 40px;">
              <div style="background:#f0fdf4;border:2px dashed #4ade80;border-radius:12px;padding:24px;text-align:center;">
                <span style="font-size:28px;font-weight:800;letter-spacing:4px;color:#16a34a;">${tempPassword}</span>
              </div>
            </td>
          </tr>

          <!-- 주의 문구 -->
          <tr>
            <td style="padding:16px 40px 36px;">
              <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;">
                본인이 요청하지 않은 경우 즉시 비밀번호를 변경해 주세요.<br/>
                임시 비밀번호는 타인과 공유하지 마세요.
              </p>
            </td>
          </tr>

          <!-- 푸터 -->
          <tr>
            <td align="center" style="background:#f9fafb;padding:20px;border-top:1px solid #f3f4f6;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">© 2025 BatChar. All rights reserved.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  }

  static buildVerificationEmail(code: string): string {
    return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Apple SD Gothic Neo',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">

          <!-- 헤더 -->
          <tr>
            <td align="center" style="background:linear-gradient(135deg,#6EF0A8,#3DD68C);padding:20px 0;">
              <div style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">BatChar</div>
              <div style="color:rgba(255,255,255,0.85);font-size:13px;margin-top:4px;">한밭대학교 중고 경매 플랫폼</div>
            </td>
          </tr>

          <!-- 본문 -->
          <tr>
            <td style="padding:36px 40px 16px;">
              <p style="margin:0 0 8px;font-size:20px;font-weight:700;color:#111827;">이메일 인증 코드</p>
              <p style="margin:0;font-size:14px;color:#6b7280;line-height:1.6;">
                아래 인증 코드를 입력하면 한밭대학교 구성원으로 인증됩니다.<br/>
                코드는 <strong>5분간</strong> 유효합니다.
              </p>
            </td>
          </tr>

          <!-- 인증 코드 박스 -->
          <tr>
            <td style="padding:16px 40px;">
              <div style="background:#f0fdf4;border:2px dashed #4ade80;border-radius:12px;padding:24px;text-align:center;">
                <span style="font-size:36px;font-weight:800;letter-spacing:10px;color:#16a34a;">${code}</span>
              </div>
            </td>
          </tr>

          <!-- 주의 문구 -->
          <tr>
            <td style="padding:16px 40px 36px;">
              <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;">
                본인이 요청하지 않은 경우 이 메일을 무시해 주세요.<br/>
                인증 코드는 타인과 공유하지 마세요.
              </p>
            </td>
          </tr>

          <!-- 푸터 -->
          <tr>
            <td align="center" style="background:#f9fafb;padding:20px;border-top:1px solid #f3f4f6;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">© 2025 BatChar. All rights reserved.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  }
}
