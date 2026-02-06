'use client'

import { useState } from 'react'

export default function DatenschutzPage() {
  const [language, setLanguage] = useState('de')

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--color-background)',
      color: 'var(--color-text-main)',
      padding: '80px 20px 40px'
    }}>
      <div style={{
        maxWidth: '900px',
        margin: '0 auto'
      }}>
        <div style={{
          background: 'rgba(var(--color-primary-rgb), 0.05)',
          border: '1px solid rgba(var(--color-primary-rgb), 0.2)',
          borderRadius: '8px',
          padding: '40px',
          marginBottom: '20px'
        }}>
          {/* Header with Language Switcher */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            marginBottom: '30px',
            paddingBottom: '20px',
            borderBottom: '1px solid rgba(var(--color-primary-rgb), 0.2)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <h1 style={{
                fontSize: 'clamp(24px, 5vw, 32px)',
                fontWeight: '700',
                color: 'var(--color-text-main)',
                margin: 0
              }}>
                {language === 'de' ? 'Datenschutz' : 'Privacy Policy'}
              </h1>

              {/* Language Toggle */}
              <div style={{
                display: 'flex',
                gap: '6px',
                background: 'rgba(0, 0, 0, 0.3)',
                padding: '4px',
                borderRadius: '6px',
                border: '1px solid rgba(var(--color-primary-rgb), 0.2)',
                flexShrink: 0
              }}>
                <button
                  onClick={() => setLanguage('de')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '4px',
                    border: 'none',
                    background: language === 'de' ? 'var(--color-primary)' : 'transparent',
                    color: language === 'de' ? '#fff' : 'var(--color-text-muted)',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '600',
                    transition: 'all 0.2s',
                    whiteSpace: 'nowrap'
                  }}
                >
                  DE
                </button>
                <button
                  onClick={() => setLanguage('en')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '4px',
                    border: 'none',
                    background: language === 'en' ? 'var(--color-primary)' : 'transparent',
                    color: language === 'en' ? '#fff' : 'var(--color-text-muted)',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '600',
                    transition: 'all 0.2s',
                    whiteSpace: 'nowrap'
                  }}
                >
                  EN
                </button>
              </div>
            </div>
          </div>

          {/* German Content */}
          {language === 'de' && (
            <div style={{ lineHeight: '1.8' }}>
              <div style={{ marginBottom: '24px' }}>
                <p style={{ color: 'var(--color-text-main)', marginBottom: '12px' }}>
                  <strong style={{ color: 'var(--color-primary)' }}>Verantwortlicher:</strong> Luke Steinfartz (<a href="mailto:luke@steinfartz.de" style={{ color: 'var(--color-primary)', textDecoration: 'none' }}>luke@steinfartz.de</a>)
                </p>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <p style={{ color: 'var(--color-text-main)', marginBottom: '12px' }}>
                  <strong style={{ color: 'var(--color-primary)' }}>Technischer Kontakt:</strong> Lutz Steinfartz, Email: <a href="mailto:lutz@steinfartz.de" style={{ color: 'var(--color-primary)', textDecoration: 'none' }}>lutz@steinfartz.de</a>, Telegram: <a href="https://t.me/lutzs120" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-primary)', textDecoration: 'none' }}>t.me/lutzs120</a>
                </p>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <p style={{ color: 'var(--color-text-main)', marginBottom: '12px' }}>
                  <strong style={{ color: 'var(--color-primary)' }}>Erhobene personenbezogene Daten:</strong> E-Mail-Adresse, Name (bei Google-Login), Profilbild (bei Google-Login), Wallet-Daten, Tags, Gruppen, Profil-Metadaten. Die Referral-Seite zeigt öffentlich beobachtbare Referral-Codes, Wallet-Adressen und Social-Media-Handles.
                </p>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <p style={{ color: 'var(--color-text-main)', marginBottom: '12px' }}>
                  <strong style={{ color: 'var(--color-primary)' }}>Google OAuth Login:</strong> Bei Anmeldung über Google werden Name, E-Mail-Adresse und Profilbild von Google übermittelt. Diese Datenübertragung erfolgt direkt zwischen Ihrem Browser und Google. Wir erhalten nur die von Google freigegebenen Daten. Es gelten zusätzlich die <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}>Datenschutzbestimmungen von Google</a>.
                </p>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <p style={{ color: 'var(--color-text-main)', marginBottom: '12px' }}>
                  <strong style={{ color: 'var(--color-primary)' }}>Zweck der Verarbeitung:</strong> Verwaltung von Nutzerprofilen und Wallets, Sicherstellung der Funktionsfähigkeit der Website sowie Versand von projektbezogenen Informationen per E-Mail (z. B. Updates zum aktuellen Projekt oder Ankündigungen neuer Projekte).
                </p>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <p style={{ color: 'var(--color-text-main)', marginBottom: '12px' }}>
                  <strong style={{ color: 'var(--color-primary)' }}>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. a DSGVO (Einwilligung) und Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an der Information bestehender Nutzer).
                </p>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <p style={{ color: 'var(--color-text-main)', marginBottom: '12px' }}>
                  <strong style={{ color: 'var(--color-primary)' }}>E-Mail-Kommunikation:</strong> Die hinterlegte E-Mail-Adresse kann für projektbezogene Informationen genutzt werden. Eine separate Verwaltung von Kommunikationspräferenzen ist derzeit nicht vorgesehen. Nutzer können der E-Mail-Kommunikation jederzeit widersprechen.
                </p>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <p style={{ color: 'var(--color-text-main)', marginBottom: '12px' }}>
                  <strong style={{ color: 'var(--color-primary)' }}>Speicherdauer:</strong> Wallets, Tags und Gruppen werden gelöscht, wenn der User sie löscht. Accounts bleiben bestehen, können aber auf Anfrage manuell gelöscht werden.
                </p>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <p style={{ color: 'var(--color-text-main)', marginBottom: '12px' }}>
                  <strong style={{ color: 'var(--color-primary)' }}>Datenweitergabe / Drittanbieter:</strong> Vercel (Hosting & Analytics), Supabase (DB & Auth), Google (OAuth-Authentifizierung). Öffentliche APIs wie sodex.com greifen nicht auf personenbezogene Daten zu. Google erhält bei der Anmeldung Kenntnis darüber, dass Sie unsere Website nutzen.
                </p>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <p style={{ color: 'var(--color-text-main)', marginBottom: '12px' }}>
                  <strong style={{ color: 'var(--color-primary)' }}>Referral-Daten Löschung:</strong> Für die Löschung von Referral-Codes, zugehörigen Social-Media-Handles oder anderen Referral-Daten kontaktieren Sie <a href="mailto:communityscan-sodex@outlook.com" style={{ color: 'var(--color-primary)', textDecoration: 'none' }}>communityscan-sodex@outlook.com</a>. Löschanfragen werden innerhalb von 30 Tagen bearbeitet.
                </p>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <p style={{ color: 'var(--color-text-main)', marginBottom: '12px' }}>
                  <strong style={{ color: 'var(--color-primary)' }}>Rechte der Nutzer:</strong> Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit, Widerruf der Einwilligung jederzeit.
                </p>
              </div>
            </div>
          )}

          {/* English Content */}
          {language === 'en' && (
            <div style={{ lineHeight: '1.8' }}>
              <div style={{ marginBottom: '24px' }}>
                <p style={{ color: 'var(--color-text-main)', marginBottom: '12px' }}>
                  <strong style={{ color: 'var(--color-primary)' }}>Controller:</strong> Luke Steinfartz (<a href="mailto:luke@steinfartz.de" style={{ color: 'var(--color-primary)', textDecoration: 'none' }}>luke@steinfartz.de</a>)
                </p>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <p style={{ color: 'var(--color-text-main)', marginBottom: '12px' }}>
                  <strong style={{ color: 'var(--color-primary)' }}>Technical Contact:</strong> Lutz Steinfartz, Email: <a href="mailto:lutz@steinfartz.de" style={{ color: 'var(--color-primary)', textDecoration: 'none' }}>lutz@steinfartz.de</a>, Telegram: <a href="https://t.me/lutzs120" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-primary)', textDecoration: 'none' }}>t.me/lutzs120</a>
                </p>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <p style={{ color: 'var(--color-text-main)', marginBottom: '12px' }}>
                  <strong style={{ color: 'var(--color-primary)' }}>Collected Personal Data:</strong> Email address, name (with Google login), profile picture (with Google login), wallet data, tags, groups, profile metadata. The Referral page displays publicly observable referral codes, wallet addresses, and social media handles.
                </p>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <p style={{ color: 'var(--color-text-main)', marginBottom: '12px' }}>
                  <strong style={{ color: 'var(--color-primary)' }}>Google OAuth Login:</strong> When signing in via Google, your name, email address, and profile picture are transmitted by Google. This data transfer occurs directly between your browser and Google. We only receive the data released by Google. <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}>Google's Privacy Policy</a> also applies.
                </p>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <p style={{ color: 'var(--color-text-main)', marginBottom: '12px' }}>
                  <strong style={{ color: 'var(--color-primary)' }}>Purpose of Processing:</strong> User profile and wallet management, ensuring website functionality, and sending project-related emails (e.g. updates about the current project or announcements of new projects).
                </p>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <p style={{ color: 'var(--color-text-main)', marginBottom: '12px' }}>
                  <strong style={{ color: 'var(--color-primary)' }}>Legal Basis:</strong> Art. 6(1)(a) GDPR (consent) and Art. 6(1)(f) GDPR (legitimate interest in informing existing users).
                </p>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <p style={{ color: 'var(--color-text-main)', marginBottom: '12px' }}>
                  <strong style={{ color: 'var(--color-primary)' }}>Email Communication:</strong> The provided email address may be used for project-related information. Separate communication preferences are currently not available. Users may object to email communication at any time.
                </p>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <p style={{ color: 'var(--color-text-main)', marginBottom: '12px' }}>
                  <strong style={{ color: 'var(--color-primary)' }}>Data Retention:</strong> Wallets, tags, and groups are deleted when the user deletes them. Accounts remain, but personal data can be manually deleted on request.
                </p>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <p style={{ color: 'var(--color-text-main)', marginBottom: '12px' }}>
                  <strong style={{ color: 'var(--color-primary)' }}>Data Sharing / Third Parties:</strong> Vercel (Hosting & Analytics), Supabase (DB & Auth), Google (OAuth authentication). Public APIs like sodex.com do not access personal data. Google receives notice that you are using our website when signing in.
                </p>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <p style={{ color: 'var(--color-text-main)', marginBottom: '12px' }}>
                  <strong style={{ color: 'var(--color-primary)' }}>Referral Data Removal:</strong> For removal of referral codes, associated social media handles, or other referral data, contact <a href="mailto:communityscan-sodex@outlook.com" style={{ color: 'var(--color-primary)', textDecoration: 'none' }}>communityscan-sodex@outlook.com</a>. Removal requests will be processed within 30 days.
                </p>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <p style={{ color: 'var(--color-text-main)', marginBottom: '12px' }}>
                  <strong style={{ color: 'var(--color-primary)' }}>User Rights:</strong> Access, correction, deletion, restriction of processing, data portability, withdrawal of consent at any time.
                </p>
              </div>
            </div>
          )}

          {/* Back Link */}
          <div style={{
            marginTop: '40px',
            paddingTop: '20px',
            borderTop: '1px solid rgba(var(--color-primary-rgb), 0.2)'
          }}>
            <a href="/" style={{
              color: 'var(--color-primary)',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: '600'
            }}>
              ← Back to Home
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
