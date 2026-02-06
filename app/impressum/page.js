export default function ImpressumPage() {
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
          {/* Header */}
          <div style={{
            marginBottom: '30px',
            paddingBottom: '20px',
            borderBottom: '1px solid rgba(var(--color-primary-rgb), 0.2)'
          }}>
            <h1 style={{
              fontSize: '32px',
              fontWeight: '700',
              color: 'var(--color-text-main)',
              margin: 0
            }}>
              Impressum
            </h1>
          </div>

          {/* Content */}
          <div style={{
            lineHeight: '1.8',
            fontSize: '16px'
          }}>
            <p style={{
              color: 'var(--color-text-main)',
              marginBottom: '12px',
              fontSize: '18px'
            }}>
              Luke Steinfartz
            </p>
            <p style={{
              color: 'var(--color-text-main)',
              marginBottom: '12px'
            }}>
              Zum Schiersteiner Grund 7
            </p>
            <p style={{
              color: 'var(--color-text-main)',
              marginBottom: '24px'
            }}>
              55127 Mainz-Drais
            </p>
            <p style={{
              color: 'var(--color-text-main)',
              marginTop: '24px'
            }}>
              <strong style={{ color: 'var(--color-primary)' }}>E-Mail:</strong>{' '}
              <a
                href="mailto:luke@steinfartz.de"
                style={{
                  color: 'var(--color-primary)',
                  textDecoration: 'none'
                }}
              >
                luke@steinfartz.de
              </a>
            </p>
          </div>

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
