'use client'

import { useState } from 'react'
import '../styles/StatusBar.css'

export default function StatusBar() {
  const [showDisclaimer, setShowDisclaimer] = useState(false)
  const [showImpressum, setShowImpressum] = useState(false)
  const [showDSGVO, setShowDSGVO] = useState(false)

  return (
    <>
      <div className="status-bar">
        <div className="status-bar-left">
          <a href="https://sodex.com" target="_blank" rel="noopener noreferrer" className="status-link">
            Sodex
          </a>
          <span className="status-divider-text">|</span>
          <button onClick={() => setShowDisclaimer(true)} className="status-link status-btn">
            Disclaimer
          </button>
          <span className="status-divider-text">|</span>
          <button onClick={() => setShowImpressum(true)} className="status-link status-btn">
            Impressum
          </button>
          <span className="status-divider-text">|</span>
          <button onClick={() => setShowDSGVO(true)} className="status-link status-btn">
            Datenschutz
          </button>
          <style>{`
            .disclaimer-content {
              max-height: 70vh;           /* oder welchen Wert du schon hast */
              overflow-y: auto;
              -webkit-overflow-scrolling: touch;
              padding-right: 12px;        /* mehr Platz für dickere Scrollbar */
            }

            /* Dickere, graue Scrollbar (Chrome/Edge/Safari) */
            .disclaimer-content::-webkit-scrollbar {
              width: 7px;               /* ← dicker machen (10–14px sieht meist gut aus) */
            }

            .disclaimer-content::-webkit-scrollbar-track {
              background:#414141;       /* sehr hellgrau – unauffällig */
              border-radius: 6px;
            }

            .disclaimer-content::-webkit-scrollbar-thumb {
              background:hsl(222, 5.70%, 44.90%);       /* schönes mittleres Grau (gray-400 in Tailwind) */
              border-radius: 6px;
              border: 3px solidhsl(0, 0.00%, 39.20%); /* Innenabstand → wirkt sauberer */
            }

            .disclaimer-content::-webkit-scrollbar-thumb:hover {
              background: #6b7280;       /* dunkleres Grau bei Hover (gray-500) */
            }
          `}</style>
          {/* Haftungsausschluss / Disclaimer Modal */}
          {showDisclaimer && (
            <div className="disclaimer-overlay" onClick={() => setShowDisclaimer(false)}>
              <div className="disclaimer-modal" onClick={(e) => e.stopPropagation()}>
                <button className="disclaimer-close" onClick={() => setShowDisclaimer(false)}>×</button>
                <h2>Haftungsausschluss / Disclaimer</h2>
                <div className="disclaimer-content scrollable-content">
                  {/* Deutsch */}
                  <h3>Deutsch</h3>
                  <p><strong>Ich gehöre in keiner Weise zu sodex.com oder sosovalue.com und bin nicht mit diesen affiliiert.</strong></p>
                  <p><strong>Inhalte & Nutzung:</strong> Alle Inhalte dieser Website dienen ausschließlich zu Informationszwecken. Trotz sorgfältiger Prüfung übernehmen wir keine Gewähr für die Aktualität, Vollständigkeit oder Richtigkeit der Inhalte.</p>
                  <p><strong>Haftung:</strong> Die Nutzung der Website erfolgt <strong>auf eigenes Risiko</strong>. Wir übernehmen keine Haftung für direkte oder indirekte Schäden, Datenverlust oder sonstige Nachteile, die durch die Nutzung der Website oder der angezeigten Inhalte entstehen.</p>
                  <p><strong>Externe Daten & APIs:</strong> Inhalte von Dritten (z. B. sodex.com) werden angezeigt, ohne dass wir deren Korrektheit garantieren. Wir haften nicht für Fehler oder Ausfälle dieser Datenquellen.</p>
                  <p><strong>Security:</strong> Trotz technischer Maßnahmen (HTTPS, Authentifizierung, gesicherte Datenbank) übernehmen wir keine Haftung für unbefugten Zugriff, Hacks, Datenverlust oder Sicherheitsvorfälle.</p>
                  <p><strong>Keine Finanz- oder Anlageberatung:</strong> Alle Informationen dienen nur zu Informationszwecken und stellen keine Finanz-, Anlage- oder Rechtsberatung dar. Kryptowährungen und Token-Handel bergen erhebliche Verlustrisiken und sind nicht für jeden geeignet. Vergangene Performance ist keine Garantie für zukünftige Ergebnisse. Nutzer sollten eigene Recherchen durchführen und ggf. qualifizierte Berater konsultieren. Wir übernehmen keine Verantwortung für Verluste, die aufgrund der bereitgestellten Informationen entstehen. Durch die Nutzung dieser Plattform erkennen Sie diese Bedingungen an und akzeptieren sie.</p>
                  
                  {/* Englisch */}
                  <h3>English</h3>
                  <p><strong>I am in no way affiliated with sodex.com or sosovalue.com.</strong></p>
                  <p><strong>Content & Use:</strong> All content on this website is for informational purposes only. Despite careful review, we do not guarantee the accuracy, completeness, or timeliness of the content.</p>
                  <p><strong>Liability:</strong> Use of this website is <strong>at your own risk</strong>. We accept no liability for direct or indirect damages, data loss, or any disadvantages resulting from the use of this website or its content.</p>
                  <p><strong>External Data & APIs:</strong> Third-party content (e.g., sodex.com) is displayed without guarantee of correctness. We are not liable for errors or outages of these data sources.</p>
                  <p><strong>Security:</strong> Despite technical measures (HTTPS, authentication, secured database), we are not liable for unauthorized access, hacks, data loss, or security incidents.</p>
                  <p><strong>No Financial or Investment Advice:</strong> All information provided is for informational purposes only and does not constitute financial, investment, or legal advice. Cryptocurrency and token trading involves substantial risk of loss and is not suitable for every investor. Past performance is not indicative of future results. Users should conduct their own research and consult with qualified advisors. We are not responsible for any losses incurred based on the information provided. By using this platform, you acknowledge and accept these terms.</p>
                </div>
              </div>
            </div>
          )}

          {/* Impressum Modal */}
          {showImpressum && (
            <div className="disclaimer-overlay" onClick={() => setShowImpressum(false)}>
              <div className="disclaimer-modal" onClick={(e) => e.stopPropagation()}>
                <button className="disclaimer-close" onClick={() => setShowImpressum(false)}>×</button>
                <h2>Impressum</h2>
                <div className="disclaimer-content scrollable-content">
                  <p>Luke Steinfartz</p>
                  <p>Zum Schiersteiner Grund 7</p>
                  <p>55127 Mainz-Drais</p>
                  <p>E-Mail: luke@steinfartz.de</p>
                </div>
              </div>
            </div>
          )}

          {/* DSGVO Modal */}
          {showDSGVO && (
            <div className="disclaimer-overlay" onClick={() => setShowDSGVO(false)}>
              <div className="disclaimer-modal" onClick={(e) => e.stopPropagation()}>
                <button className="disclaimer-close" onClick={() => setShowDSGVO(false)}>×</button>
                <h2>Datenschutz / Privacy</h2>
                <div className="disclaimer-content scrollable-content">
                  {/* Deutsch */}
                  <h3>Deutsch</h3>
                  <p><strong>Verantwortlicher:</strong> Luke Steinfartz (<strong>luke@steinfartz.de</strong>)</p>
                  <p><strong>Technischer Kontakt:</strong> Lutz Steinfartz, <strong> Email: lutz@steinfartz.de</strong>, Telegram: <a href="https://t.me/lutzs120" target="_blank" rel="noopener noreferrer">t.me/lutzs120</a></p>
                  <p><strong>Erhobene personenbezogene Daten:</strong> E-Mail, Wallet-Daten, Tags, Gruppen, Profil-Metadaten.</p>
                  <p><strong>Zweck der Verarbeitung:</strong> Verwaltung von Nutzerprofilen, Wallet-Management, Funktionsfähigkeit der Website.</p>
                  <p><strong>Speicherdauer:</strong> Wallets, Tags und Gruppen werden gelöscht, wenn der User sie löscht. Accounts bleiben bestehen, können aber auf Anfrage manuell gelöscht werden.</p>
                  <p><strong>Datenweitergabe / Drittanbieter:</strong> Vercel (Hosting & Analytics), Supabase (DB & Auth). Öffentliche APIs wie sodex.com greifen nicht auf personenbezogene Daten zu.</p>
                  <p><strong>Rechte der Nutzer:</strong> Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit, Widerruf der Einwilligung jederzeit.</p>

                  {/* Englisch */}
                  <h3>English</h3>
                  <p><strong>Controller:</strong> Luke Steinfartz(<strong>luke@steinfartz.de</strong>)</p>
                  <p><strong>Technical Contact:</strong> Lutz Steinfartz, <strong> Email: lutz@steinfartz.de</strong>, Telegram: <a href="https://t.me/lutzs120" target="_blank" rel="noopener noreferrer">t.me/lutzs120</a></p>
                  <p><strong>Collected Personal Data:</strong> Email, wallet data, tags, groups, profile metadata.</p>
                  <p><strong>Purpose of Processing:</strong> User profile management, wallet management, ensuring website functionality.</p>
                  <p><strong>Data Retention:</strong> Wallets, tags, and groups are deleted when the user deletes them. Accounts remain, but email and wallet-related data can be manually deleted on request.</p>
                  <p><strong>Data Sharing / Third Parties:</strong> Vercel (Hosting & Analytics), Supabase (DB & Auth). Public APIs like sodex.com do not access personal data.</p>
                  <p><strong>User Rights:</strong> Access, correction, deletion, restriction of processing, data portability, withdrawal of consent at any time.</p>
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="status-bar-right">
        <div className="status-divider-vertical" />
        {/* Built by Text */}
        <span className="status-built-by font-bold mr-2 text-gray-500">
          Built by:
        </span>
        <a href="https://x.com/Lutz_S120" target="_blank" rel="noopener noreferrer" className="status-icon-link" aria-label="X (Twitter)">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
        </a>
        <a href="https://t.me/LutzS120" target="_blank" rel="noopener noreferrer" className="status-icon-link" aria-label="Telegram">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
          </svg>
        </a>
      </div>
      </div>
    </>
  )
}
