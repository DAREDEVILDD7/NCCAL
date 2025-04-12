import './globals.css'


export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, backgroundColor: '#1a1a2e', color: 'white', fontFamily: 'sans-serif' }}>
        {children}
      </body>
    </html>
  )
}
