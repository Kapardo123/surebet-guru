import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  const assetLinks = [{
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.surebet.guru",
      "sha256_cert_fingerprints": [
        "76:53:1A:90:1C:FF:D7:47:0F:5B:4C:37:7B:65:97:14:45:E3:FC:96:DA:D0:4D:CE:3C:D4:57:51:6C:EA:34:0D"
      ]
    }
  }];

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).json(assetLinks);
}
