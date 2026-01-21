'use client'

import './styles/index.css'
import './styles/App.css'
import Navbar from './components/Navbar'

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Navbar />
        {children}
      </body>
    </html>
  )
}
