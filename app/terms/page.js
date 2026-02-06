'use client'

import { useState } from 'react'

export default function TermsPage() {
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
                {language === 'de' ? 'Nutzungsbedingungen' : 'Terms and Conditions'}
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
              <div style={{ marginBottom: '32px' }}>
                <h2 style={{ color: 'var(--color-primary)', fontSize: '20px', marginBottom: '16px', fontWeight: '600' }}>1. Geltungsbereich und Annahme</h2>
                <p style={{ color: 'var(--color-text-main)', marginBottom: '12px' }}>
                  Diese Nutzungsbedingungen gelten für die Nutzung der Website CommunityScan (im Folgenden "Website" oder "Plattform") betrieben durch Luke Steinfartz. <strong>Durch die Nutzung, Registrierung oder den Zugriff auf diese Website erklären Sie sich ausdrücklich mit diesen Bedingungen, der Datenschutzerklärung und dem Disclaimer einverstanden.</strong> Wenn Sie mit diesen Bedingungen nicht einverstanden sind, dürfen Sie die Website nicht nutzen.
                </p>
              </div>

              <div style={{ marginBottom: '32px' }}>
                <h2 style={{ color: 'var(--color-primary)', fontSize: '20px', marginBottom: '16px', fontWeight: '600' }}>2. Leistungsbeschreibung</h2>
                <p style={{ color: 'var(--color-text-main)', marginBottom: '12px' }}>
                  Die Website bietet Informationen zu Kryptowährungs-Wallets, Trading-Performance, Referral-Codes und Social-Media-Handles. Alle Daten werden aus öffentlich zugänglichen Quellen aggregiert und dienen ausschließlich zu Informationszwecken.
                </p>
              </div>

              <div style={{ marginBottom: '32px' }}>
                <h2 style={{ color: 'var(--color-primary)', fontSize: '20px', marginBottom: '16px', fontWeight: '600' }}>3. Registrierung und Account</h2>
                <p style={{ color: 'var(--color-text-main)', marginBottom: '12px' }}>
                  <strong style={{ color: 'var(--color-primary)' }}>3.1 Account-Erstellung:</strong> Nutzer können sich über E-Mail oder Google-Login registrieren. Die Angabe korrekter Daten ist erforderlich.
                </p>
                <p style={{ color: 'var(--color-text-main)', marginBottom: '12px' }}>
                  <strong style={{ color: 'var(--color-primary)' }}>3.2 Verantwortung:</strong> Nutzer sind für die Geheimhaltung ihrer Zugangsdaten selbst verantwortlich.
                </p>
                <p style={{ color: 'var(--color-text-main)', marginBottom: '12px' }}>
                  <strong style={{ color: 'var(--color-primary)' }}>3.3 Google OAuth:</strong> Bei der Anmeldung über Google werden Ihr Name, E-Mail-Adresse und Profilbild von Google übertragen. Diese Daten werden gemäß unserer Datenschutzerklärung verarbeitet.
                </p>
              </div>

              <div style={{ marginBottom: '32px' }}>
                <h2 style={{ color: 'var(--color-primary)', fontSize: '20px', marginBottom: '16px', fontWeight: '600' }}>4. Nutzungsrechte und -pflichten</h2>
                <p style={{ color: 'var(--color-text-main)', marginBottom: '12px' }}>
                  <strong style={{ color: 'var(--color-primary)' }}>4.1 Erlaubte Nutzung:</strong> Die Website darf ausschließlich für legale Zwecke genutzt werden.
                </p>
                <p style={{ color: 'var(--color-text-main)', marginBottom: '12px' }}>
                  <strong style={{ color: 'var(--color-primary)' }}>4.2 Verbotene Handlungen:</strong> Untersagt sind insbesondere:
                </p>
                <ul style={{ color: 'var(--color-text-main)', marginLeft: '24px', marginBottom: '12px' }}>
                  <li>Manipulation oder unbefugter Zugriff auf Systeme</li>
                  <li>Verbreitung schädlicher Software</li>
                  <li>Verwendung automatisierter Tools ohne Genehmigung</li>
                  <li>Verletzung von Rechten Dritter</li>
                  <li>Kommerzielle Nutzung ohne schriftliche Zustimmung</li>
                </ul>
              </div>

              <div style={{ marginBottom: '32px' }}>
                <h2 style={{ color: 'var(--color-primary)', fontSize: '20px', marginBottom: '16px', fontWeight: '600' }}>5. Haftungsausschluss</h2>
                <p style={{ color: 'var(--color-text-main)', marginBottom: '12px' }}>
                  <strong style={{ color: 'var(--color-primary)' }}>5.1 Keine Gewährleistung:</strong> Alle Informationen werden ohne Gewähr für Richtigkeit, Vollständigkeit oder Aktualität bereitgestellt. Die Website wird "as is" und "as available" ohne jegliche Garantien bereitgestellt.
                </p>
                <p style={{ color: 'var(--color-text-main)', marginBottom: '12px' }}>
                  <strong style={{ color: 'var(--color-primary)' }}>5.2 Keine Anlageberatung:</strong> Die bereitgestellten Informationen stellen keine Finanz-, Anlage- oder Rechtsberatung dar. Kryptowährungshandel birgt erhebliche Risiken einschließlich des Totalverlusts. Vergangene Performance ist kein Indikator für zukünftige Ergebnisse. Sie handeln auf eigenes Risiko.
                </p>
                <p style={{ color: 'var(--color-text-main)', marginBottom: '12px' }}>
                  <strong style={{ color: 'var(--color-primary)' }}>5.3 Haftungsbeschränkung:</strong> Der Betreiber haftet nicht für direkte oder indirekte Schäden, entgangene Gewinne, Datenverlust oder Folgeschäden, die durch die Nutzung oder Nichtnutzung der Website entstehen, außer bei Vorsatz, grober Fahrlässigkeit oder Verletzung wesentlicher Vertragspflichten. Die Haftung ist auf vorhersehbare Schäden begrenzt.
                </p>
                <p style={{ color: 'var(--color-text-main)', marginBottom: '12px' }}>
                  <strong style={{ color: 'var(--color-primary)' }}>5.4 Drittanbieter:</strong> Keine Haftung für Inhalte, Fehler, Ausfälle oder Datenschutzverletzungen externer Datenquellen und Dienste (z.B. sodex.com, Google, Supabase, Vercel).
                </p>
                <p style={{ color: 'var(--color-text-main)', marginBottom: '12px' }}>
                  <strong style={{ color: 'var(--color-primary)' }}>5.5 Eigenes Risiko:</strong> Sie erkennen an, dass die Nutzung dieser Website vollständig auf Ihr eigenes Risiko erfolgt und dass Sie allein für alle Entscheidungen verantwortlich sind, die Sie auf Basis der bereitgestellten Informationen treffen.
                </p>
              </div>

              <div style={{ marginBottom: '32px' }}>
                <h2 style={{ color: 'var(--color-primary)', fontSize: '20px', marginBottom: '16px', fontWeight: '600' }}>6. Datenschutz</h2>
                <p style={{ color: 'var(--color-text-main)', marginBottom: '12px' }}>
                  Die Verarbeitung personenbezogener Daten erfolgt gemäß unserer <a href="/datenschutz" style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}>Datenschutzerklärung</a>. Bei Nutzung von Google-Login gelten zusätzlich die Datenschutzbestimmungen von Google.
                </p>
              </div>

              <div style={{ marginBottom: '32px' }}>
                <h2 style={{ color: 'var(--color-primary)', fontSize: '20px', marginBottom: '16px', fontWeight: '600' }}>7. Verfügbarkeit und Änderungen</h2>
                <p style={{ color: 'var(--color-text-main)', marginBottom: '12px' }}>
                  <strong style={{ color: 'var(--color-primary)' }}>7.1 Verfügbarkeit:</strong> Es besteht kein Anspruch auf ständige Verfügbarkeit der Website.
                </p>
                <p style={{ color: 'var(--color-text-main)', marginBottom: '12px' }}>
                  <strong style={{ color: 'var(--color-primary)' }}>7.2 Änderungen:</strong> Der Betreiber behält sich vor, diese Nutzungsbedingungen jederzeit zu ändern. Nutzer werden über wesentliche Änderungen informiert.
                </p>
              </div>

              <div style={{ marginBottom: '32px' }}>
                <h2 style={{ color: 'var(--color-primary)', fontSize: '20px', marginBottom: '16px', fontWeight: '600' }}>8. Beendigung</h2>
                <p style={{ color: 'var(--color-text-main)', marginBottom: '12px' }}>
                  Der Betreiber kann Accounts bei Verstoß gegen diese Bedingungen ohne Vorankündigung sperren oder löschen. Nutzer können ihren Account jederzeit durch Kontaktaufnahme löschen lassen.
                </p>
              </div>

              <div style={{ marginBottom: '32px' }}>
                <h2 style={{ color: 'var(--color-primary)', fontSize: '20px', marginBottom: '16px', fontWeight: '600' }}>9. Geistiges Eigentum</h2>
                <p style={{ color: 'var(--color-text-main)', marginBottom: '12px' }}>
                  Alle Inhalte der Website (Design, Code, Texte, Logos) sind urheberrechtlich geschützt. Eine Nutzung ohne schriftliche Genehmigung ist untersagt.
                </p>
              </div>

              <div style={{ marginBottom: '32px' }}>
                <h2 style={{ color: 'var(--color-primary)', fontSize: '20px', marginBottom: '16px', fontWeight: '600' }}>10. Keine Affiliation</h2>
                <p style={{ color: 'var(--color-text-main)', marginBottom: '12px' }}>
                  Diese Website ist weder mit sodex.com noch mit sosovalue.com oder Google affiliiert oder von diesen autorisiert.
                </p>
              </div>

              <div style={{ marginBottom: '32px' }}>
                <h2 style={{ color: 'var(--color-primary)', fontSize: '20px', marginBottom: '16px', fontWeight: '600' }}>11. Salvatorische Klausel</h2>
                <p style={{ color: 'var(--color-text-main)', marginBottom: '12px' }}>
                  Sollten einzelne Bestimmungen dieser Nutzungsbedingungen unwirksam sein oder werden, bleibt die Wirksamkeit der übrigen Bestimmungen davon unberührt. An die Stelle der unwirksamen Bestimmung tritt eine wirksame Regelung, die dem wirtschaftlichen Zweck der unwirksamen Bestimmung am nächsten kommt.
                </p>
              </div>

              <div style={{ marginBottom: '32px' }}>
                <h2 style={{ color: 'var(--color-primary)', fontSize: '20px', marginBottom: '16px', fontWeight: '600' }}>12. Anwendbares Recht und Gerichtsstand</h2>
                <p style={{ color: 'var(--color-text-main)', marginBottom: '12px' }}>
                  Es gilt deutsches Recht unter Ausschluss des UN-Kaufrechts. Gerichtsstand ist, soweit gesetzlich zulässig, Mainz, Deutschland.
                </p>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <h2 style={{ color: 'var(--color-primary)', fontSize: '20px', marginBottom: '16px', fontWeight: '600' }}>13. Kontakt</h2>
                <p style={{ color: 'var(--color-text-main)', marginBottom: '12px' }}>
                  Bei Fragen kontaktieren Sie: <a href="mailto:communityscan-sodex@outlook.com" style={{ color: 'var(--color-primary)', textDecoration: 'none' }}>communityscan-sodex@outlook.com</a>
                </p>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '14px', marginTop: '20px' }}>
                  Stand: Februar 2025
                </p>
              </div>
            </div>
          )}

          {/* English Content */}
          {language === 'en' && (
            <div style={{ lineHeight: '1.8' }}>
              <div style={{ marginBottom: '32px' }}>
                <h2 style={{ color: 'var(--color-primary)', fontSize: '20px', marginBottom: '16px', fontWeight: '600' }}>1. Scope and Acceptance</h2>
                <p style={{ color: 'var(--color-text-main)', marginBottom: '12px' }}>
                  These Terms and Conditions apply to the use of the CommunityScan website (hereinafter "Website" or "Platform") operated by Luke Steinfartz. <strong>By using, registering, or accessing this Website, you expressly agree to these Terms, the Privacy Policy, and the Disclaimer.</strong> If you do not agree to these terms, you may not use the Website.
                </p>
              </div>

              <div style={{ marginBottom: '32px' }}>
                <h2 style={{ color: 'var(--color-primary)', fontSize: '20px', marginBottom: '16px', fontWeight: '600' }}>2. Service Description</h2>
                <p style={{ color: 'var(--color-text-main)', marginBottom: '12px' }}>
                  The Website provides information about cryptocurrency wallets, trading performance, referral codes, and social media handles. All data is aggregated from publicly accessible sources and is for informational purposes only.
                </p>
              </div>

              <div style={{ marginBottom: '32px' }}>
                <h2 style={{ color: 'var(--color-primary)', fontSize: '20px', marginBottom: '16px', fontWeight: '600' }}>3. Registration and Account</h2>
                <p style={{ color: 'var(--color-text-main)', marginBottom: '12px' }}>
                  <strong style={{ color: 'var(--color-primary)' }}>3.1 Account Creation:</strong> Users can register via email or Google login. Providing accurate information is required.
                </p>
                <p style={{ color: 'var(--color-text-main)', marginBottom: '12px' }}>
                  <strong style={{ color: 'var(--color-primary)' }}>3.2 Responsibility:</strong> Users are responsible for keeping their login credentials confidential.
                </p>
                <p style={{ color: 'var(--color-text-main)', marginBottom: '12px' }}>
                  <strong style={{ color: 'var(--color-primary)' }}>3.3 Google OAuth:</strong> When signing in via Google, your name, email address, and profile picture are transmitted by Google. This data is processed according to our Privacy Policy.
                </p>
              </div>

              <div style={{ marginBottom: '32px' }}>
                <h2 style={{ color: 'var(--color-primary)', fontSize: '20px', marginBottom: '16px', fontWeight: '600' }}>4. Usage Rights and Obligations</h2>
                <p style={{ color: 'var(--color-text-main)', marginBottom: '12px' }}>
                  <strong style={{ color: 'var(--color-primary)' }}>4.1 Permitted Use:</strong> The Website may only be used for legal purposes.
                </p>
                <p style={{ color: 'var(--color-text-main)', marginBottom: '12px' }}>
                  <strong style={{ color: 'var(--color-primary)' }}>4.2 Prohibited Actions:</strong> Specifically prohibited are:
                </p>
                <ul style={{ color: 'var(--color-text-main)', marginLeft: '24px', marginBottom: '12px' }}>
                  <li>Manipulation or unauthorized access to systems</li>
                  <li>Distribution of malicious software</li>
                  <li>Use of automated tools without permission</li>
                  <li>Violation of third-party rights</li>
                  <li>Commercial use without written consent</li>
                </ul>
              </div>

              <div style={{ marginBottom: '32px' }}>
                <h2 style={{ color: 'var(--color-primary)', fontSize: '20px', marginBottom: '16px', fontWeight: '600' }}>5. Disclaimer</h2>
                <p style={{ color: 'var(--color-text-main)', marginBottom: '12px' }}>
                  <strong style={{ color: 'var(--color-primary)' }}>5.1 No Warranty:</strong> All information is provided without warranty for accuracy, completeness, or timeliness. The Website is provided "as is" and "as available" without any warranties of any kind.
                </p>
                <p style={{ color: 'var(--color-text-main)', marginBottom: '12px' }}>
                  <strong style={{ color: 'var(--color-primary)' }}>5.2 No Investment Advice:</strong> The information provided does not constitute financial, investment, or legal advice. Cryptocurrency trading involves substantial risks including total loss. Past performance is not indicative of future results. You act at your own risk.
                </p>
                <p style={{ color: 'var(--color-text-main)', marginBottom: '12px' }}>
                  <strong style={{ color: 'var(--color-primary)' }}>5.3 Limitation of Liability:</strong> The operator is not liable for direct or indirect damages, lost profits, data loss, or consequential damages arising from the use or non-use of the Website, except in cases of intent, gross negligence, or violation of essential contractual obligations. Liability is limited to foreseeable damages.
                </p>
                <p style={{ color: 'var(--color-text-main)', marginBottom: '12px' }}>
                  <strong style={{ color: 'var(--color-primary)' }}>5.4 Third Parties:</strong> No liability for content, errors, failures, or privacy violations of external data sources and services (e.g., sodex.com, Google, Supabase, Vercel).
                </p>
                <p style={{ color: 'var(--color-text-main)', marginBottom: '12px' }}>
                  <strong style={{ color: 'var(--color-primary)' }}>5.5 Own Risk:</strong> You acknowledge that use of this Website is entirely at your own risk and that you are solely responsible for all decisions you make based on the information provided.
                </p>
              </div>

              <div style={{ marginBottom: '32px' }}>
                <h2 style={{ color: 'var(--color-primary)', fontSize: '20px', marginBottom: '16px', fontWeight: '600' }}>6. Privacy</h2>
                <p style={{ color: 'var(--color-text-main)', marginBottom: '12px' }}>
                  Personal data is processed according to our <a href="/datenschutz" style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}>Privacy Policy</a>. When using Google login, Google's privacy terms also apply.
                </p>
              </div>

              <div style={{ marginBottom: '32px' }}>
                <h2 style={{ color: 'var(--color-primary)', fontSize: '20px', marginBottom: '16px', fontWeight: '600' }}>7. Availability and Changes</h2>
                <p style={{ color: 'var(--color-text-main)', marginBottom: '12px' }}>
                  <strong style={{ color: 'var(--color-primary)' }}>7.1 Availability:</strong> There is no guarantee of continuous availability of the Website.
                </p>
                <p style={{ color: 'var(--color-text-main)', marginBottom: '12px' }}>
                  <strong style={{ color: 'var(--color-primary)' }}>7.2 Changes:</strong> The operator reserves the right to modify these Terms at any time. Users will be notified of significant changes.
                </p>
              </div>

              <div style={{ marginBottom: '32px' }}>
                <h2 style={{ color: 'var(--color-primary)', fontSize: '20px', marginBottom: '16px', fontWeight: '600' }}>8. Termination</h2>
                <p style={{ color: 'var(--color-text-main)', marginBottom: '12px' }}>
                  The operator may suspend or delete accounts for violations of these terms without prior notice. Users may request account deletion at any time.
                </p>
              </div>

              <div style={{ marginBottom: '32px' }}>
                <h2 style={{ color: 'var(--color-primary)', fontSize: '20px', marginBottom: '16px', fontWeight: '600' }}>9. Intellectual Property</h2>
                <p style={{ color: 'var(--color-text-main)', marginBottom: '12px' }}>
                  All website content (design, code, text, logos) is protected by copyright. Use without written permission is prohibited.
                </p>
              </div>

              <div style={{ marginBottom: '32px' }}>
                <h2 style={{ color: 'var(--color-primary)', fontSize: '20px', marginBottom: '16px', fontWeight: '600' }}>10. No Affiliation</h2>
                <p style={{ color: 'var(--color-text-main)', marginBottom: '12px' }}>
                  This Website is not affiliated with or authorized by sodex.com, sosovalue.com, or Google.
                </p>
              </div>

              <div style={{ marginBottom: '32px' }}>
                <h2 style={{ color: 'var(--color-primary)', fontSize: '20px', marginBottom: '16px', fontWeight: '600' }}>11. Severability Clause</h2>
                <p style={{ color: 'var(--color-text-main)', marginBottom: '12px' }}>
                  If any provision of these Terms is or becomes invalid, the validity of the remaining provisions shall remain unaffected. The invalid provision shall be replaced by a valid provision that comes closest to the economic purpose of the invalid provision.
                </p>
              </div>

              <div style={{ marginBottom: '32px' }}>
                <h2 style={{ color: 'var(--color-primary)', fontSize: '20px', marginBottom: '16px', fontWeight: '600' }}>12. Applicable Law and Jurisdiction</h2>
                <p style={{ color: 'var(--color-text-main)', marginBottom: '12px' }}>
                  German law applies, excluding UN sales law. Place of jurisdiction is, to the extent legally permissible, Mainz, Germany.
                </p>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <h2 style={{ color: 'var(--color-primary)', fontSize: '20px', marginBottom: '16px', fontWeight: '600' }}>13. Contact</h2>
                <p style={{ color: 'var(--color-text-main)', marginBottom: '12px' }}>
                  For questions, contact: <a href="mailto:communityscan-sodex@outlook.com" style={{ color: 'var(--color-primary)', textDecoration: 'none' }}>communityscan-sodex@outlook.com</a>
                </p>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '14px', marginTop: '20px' }}>
                  Last updated: February 2025
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
