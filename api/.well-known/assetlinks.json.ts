import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  const assetLinks = [{
    "relation": [
      "delegate_permission/common.handle_all_urls",
      "delegate_permission/common.get_login_creds"
    ],
    "target": {
      "namespace": "android_app",
      "package_name": "com.surebet.guru",
      "sha256_cert_fingerprints": [
        "9A:F6:3C:05:AE:1F:10:C8:8C:12:2B:0D:06:8F:66:D7:CA:F5:91:4A:15:6F:EE:D0:DA:81:9A:9D:AD:2B:5A:38"
      ]
    }
  }];

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).json(assetLinks);
}
