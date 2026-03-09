import './styles/index.css'
import './styles/App.css'
import Navbar from './components/Navbar'
import AnnouncementBar from './components/AnnouncementBar'
import PageController from './components/PageController'
import PageTransition from './components/PageTransition'
import CmsEditToggle from './components/CmsEditToggle'
import StatusBar from './components/StatusBar'
import CommandPalette from './components/CommandPalette'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { Providers } from './providers'

export const metadata = {
  title: 'CommunityScan Sodex | #1 Data Intelligence Layer',
  description: 'The premier data extraction and visualization layer for Sodex Mainnet trading activity. Track top wallets, analyze PnL, and discover leaderboards.',
  metadataBase: new URL('https://www.communityscan-sodex.com'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'CommunityScan Sodex | Real-time Trading Intelligence',
    description: 'Track top wallets, analyze PnL, and discover leaderboards on Sodex Mainnet.',
    url: 'https://www.communityscan-sodex.com',
    siteName: 'CommunityScan Sodex',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'CommunityScan Sodex — Real-time Trading Intelligence Dashboard',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CommunityScan Sodex',
    description: 'The premier data extraction and visualization layer for Sodex Mainnet.',
    creator: '@sodex',
    images: ['/opengraph-image'],
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preload" href="https://fonts.googleapis.com/css2?family=Lato:wght@300;400;700;900&display=swap" as="style" />
        <link href="https://fonts.googleapis.com/css2?family=Lato:wght@300;400;700;900&display=swap" rel="stylesheet" media="print" onLoad="this.media='all'" />
        <link rel="icon" href="/favicon-cyan.svg" type="image/svg+xml" />
      </head>
      <body>
        {/* Blocking script: apply full theme CSS vars before first paint — prevents all flash */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=JSON.parse(localStorage.getItem('theme'));if(!t)return;var s=t.colorScheme||'cyan',m=t.mode||'dark';if(s==='modern')s='cyan';var V=['cyan','orange','purple','green','monochrome','cli','nsa'];if(V.indexOf(s)<0)s='cyan';var r=document.documentElement;r.setAttribute('data-color-scheme',s);r.setAttribute('data-theme',m);var C={cyan:{dark:{p:'#48cbff',rgb:'72,203,255',bg:'#0A0A0A',b2:'#0f0f0f',b3:'#141414',tx:'#ffffff',t2:'rgba(255,255,255,0.6)',bd:'rgba(255,255,255,0.1)'},light:{p:'#0891b2',rgb:'8,145,178',bg:'#f8fafc',b2:'#f1f5f9',b3:'#e2e8f0',tx:'#0f172a',t2:'rgba(15,23,42,0.7)',bd:'rgba(15,23,42,0.08)'}},orange:{dark:{p:'#f97316',rgb:'249,115,22',bg:'#0A0A0A',b2:'#0f0f0f',b3:'#141414',tx:'#ffffff',t2:'rgba(255,255,255,0.6)',bd:'rgba(255,255,255,0.1)'},light:{p:'#ea580c',rgb:'234,88,12',bg:'#fffbeb',b2:'#fef3c7',b3:'#fde68a',tx:'#1c1917',t2:'rgba(28,25,23,0.7)',bd:'rgba(28,25,23,0.08)'}},purple:{dark:{p:'#a855f7',rgb:'168,85,247',bg:'#0A0A0A',b2:'#0f0f0f',b3:'#141414',tx:'#ffffff',t2:'rgba(255,255,255,0.6)',bd:'rgba(255,255,255,0.1)'},light:{p:'#9333ea',rgb:'147,51,234',bg:'#faf5ff',b2:'#f3e8ff',b3:'#e9d5ff',tx:'#1e1b4b',t2:'rgba(30,27,75,0.7)',bd:'rgba(30,27,75,0.08)'}},green:{dark:{p:'#22c55e',rgb:'34,197,94',bg:'#0A0A0A',b2:'#0f0f0f',b3:'#141414',tx:'#ffffff',t2:'rgba(255,255,255,0.6)',bd:'rgba(255,255,255,0.1)'},light:{p:'#16a34a',rgb:'22,163,74',bg:'#f0fdf4',b2:'#dcfce7',b3:'#bbf7d0',tx:'#14532d',t2:'rgba(20,83,45,0.7)',bd:'rgba(20,83,45,0.08)'}},monochrome:{dark:{p:'#a1a1aa',rgb:'161,161,170',bg:'#09090b',b2:'#18181b',b3:'#27272a',tx:'#fafafa',t2:'rgba(250,250,250,0.6)',bd:'rgba(250,250,250,0.1)'},light:{p:'#52525b',rgb:'82,82,91',bg:'#fafafa',b2:'#f4f4f5',b3:'#e4e4e7',tx:'#09090b',t2:'rgba(9,9,11,0.7)',bd:'rgba(9,9,11,0.08)'}},cli:{dark:{p:'#d4a55a',rgb:'212,165,90',bg:'#000000',b2:'#080808',b3:'#111111',tx:'#cccccc',t2:'rgba(204,204,204,0.7)',bd:'rgba(212,165,90,0.15)'},light:{p:'#d4a55a',rgb:'212,165,90',bg:'#000000',b2:'#080808',b3:'#111111',tx:'#cccccc',t2:'rgba(204,204,204,0.7)',bd:'rgba(212,165,90,0.15)'}},nsa:{dark:{p:'#00ff41',rgb:'0,255,65',bg:'#040804',b2:'#060e06',b3:'#0a150a',tx:'#b8f0b8',t2:'rgba(160,230,160,0.75)',bd:'rgba(0,255,65,0.1)'},light:{p:'#00ff41',rgb:'0,255,65',bg:'#040804',b2:'#060e06',b3:'#0a150a',tx:'#b8f0b8',t2:'rgba(160,230,160,0.75)',bd:'rgba(0,255,65,0.1)'}}};var cs=C[s]||C.cyan,cm=cs[m]||cs.dark,iT=(s==='cli'||s==='nsa');r.style.setProperty('--color-primary',cm.p);r.style.setProperty('--color-primary-rgb',cm.rgb);r.style.setProperty('--color-bg-main',cm.bg);r.style.setProperty('--color-bg-secondary',cm.b2);r.style.setProperty('--color-bg-tertiary',cm.b3);r.style.setProperty('--color-text-main',cm.tx);r.style.setProperty('--color-text-secondary',cm.t2);r.style.setProperty('--color-border-subtle',cm.bd);r.style.setProperty('--theme-font',iT?"'Courier New',monospace":"'Lato',sans-serif");r.style.setProperty('--theme-radius',iT?'0px':'10px');r.style.setProperty('--theme-radius-sm',iT?'0px':'6px');r.style.setProperty('--theme-radius-lg',iT?'0px':'12px');r.style.setProperty('--theme-shadow',iT?'none':'0 2px 8px rgba(0,0,0,0.3)');r.style.background=cm.bg;var fs='<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><g stroke="X" stroke-width="2" stroke-linecap="round"><path d="M3 11V5.5C3 4.12 4.12 3 5.5 3H11"/><path d="M21 3H26.5C27.88 3 29 4.12 29 5.5V11"/><path d="M29 21V26.5C29 27.88 27.88 29 26.5 29H21"/><path d="M11 29H5.5C4.12 29 3 27.88 3 26.5V21"/><path d="M14.5 21.5H11.75C11.06 21.5 10.5 20.94 10.5 20.25V17.5"/><path d="M17.5 21.5H20.25C20.94 21.5 21.5 20.94 21.5 20.25V17.5"/><path d="M13.5003 21.5H16.2503"/><path d="M14.4922 10.5H11.7422C11.0522 10.5 10.4922 11.06 10.4922 11.75V14.5"/><path d="M17.4922 10.5H20.2422C20.9322 10.5 21.4922 11.06 21.4922 11.75V14.5"/><path d="M7.50034 17.5H10.2503"/><path d="M24.6403 17.5H21.8903"/><path d="M11.5 17.5H18.1421"/><path d="M13.5003 10.5H16.2503"/></g></svg>'.replace('X',cm.p);var fu='data:image/svg+xml,'+encodeURIComponent(fs);var lk=document.querySelector('link[rel="icon"]');if(lk){lk.href=fu;lk.type='image/svg+xml';}else{var nk=document.createElement('link');nk.rel='icon';nk.type='image/svg+xml';nk.href=fu;document.head.appendChild(nk);}}catch(e){}})()` }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": "CommunityScan Sodex",
            "url": "https://www.communityscan-sodex.com",
            "logo": "https://www.communityscan-sodex.com/logo.svg",
            "sameAs": [
              "https://twitter.com/sodex",
              "https://t.me/sodex"
            ]
          })
        }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            "name": "CommunityScan Sodex",
            "url": "https://www.communityscan-sodex.com",
            "potentialAction": {
              "@type": "SearchAction",
              "target": {
                "@type": "EntryPoint",
                "urlTemplate": "https://www.communityscan-sodex.com/tracker/{wallet_address}"
              },
              "query-input": "required name=wallet_address"
            }
          })
        }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": "CommunityScan Sodex",
            "applicationCategory": "FinanceApplication",
            "operatingSystem": "Web",
            "url": "https://www.communityscan-sodex.com",
            "description": "Real-time data intelligence layer for Sodex Mainnet. Track wallet performance, analyze PnL rankings, and monitor trading activity across the Sodex futures ecosystem.",
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "USD"
            },
            "featureList": [
              "Wallet performance tracking",
              "PnL leaderboard rankings",
              "Real-time position monitoring",
              "Historical trade analysis",
              "Reverse wallet search",
              "Referral code tracking"
            ]
          })
        }} />
        <Providers>
          <PageTransition>
            <Navbar />
            <AnnouncementBar />
            <PageController />
            <CmsEditToggle />
            {children}
          </PageTransition>
          <StatusBar />
          <CommandPalette />
        </Providers>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
