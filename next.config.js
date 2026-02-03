/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: '/tracker/:address',
        headers: [
          {
            key: 'Link',
            value: '</api/public/wallet/:address>; rel="alternate"; type="application/json"',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
