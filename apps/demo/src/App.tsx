import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import heroImg from './assets/hero.png'
import './App.css'
import './test.scss'
import styles from './Button.module.css'

function StatusBadge({ label, count, active }: { label: string; count: number; active: boolean }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '4px 10px', borderRadius: 20,
      background: active ? '#065f46' : '#1a1a2e',
      color: active ? '#6ee7b7' : '#94a3b8',
      border: `1px solid ${active ? '#059669' : '#2d2d4e'}`,
      fontFamily: 'monospace', fontSize: 11,
    }}>
      {label}
      <span style={{ background: active ? '#059669' : '#2d2d4e', borderRadius: 10, padding: '1px 6px' }}>{count}</span>
    </span>
  )
}

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <section id="center">
        <div className="hero">
          <img src={heroImg} className="base" width="170" height="179" alt="" />
          <img src={reactLogo} className="framework" alt="React logo" />
          <img src={viteLogo} className="vite" alt="Vite logo" />
        </div>
        <div>
          <h1>Get started</h1>
          <p>
            Edit <code>src/App.tsx</code> and save to test <code>HMR</code>
          </p>
        </div>
        <button
          type="button"
          className="counter"
          onClick={() => setCount((count) => count + 1)}
        >
          Count is {count}
        </button>
      </section>

      <div className={styles.container}>
        <button type="button" className={styles.button}>CSS Module button</button>
        <button type="button" className={styles.button}>CSS Module button 2</button>
      </div>

      <div style={{ display: 'flex', gap: 8, margin: '12px 0', flexWrap: 'wrap' }}>
        <StatusBadge label="issues" count={42} active={true} />
        <StatusBadge label="PRs" count={7} active={false} />
        <StatusBadge label="stars" count={128} active={true} />
      </div>

      <div className="demo-card">
        <p className="title">SCSS Test Card</p>
        <p className="subtitle">Open "▸ SCSS $variables" in LSS to edit $card-accent, $card-bg, $card-text</p>
      </div>

      <div className="bg-violet-900 rounded-xl p-6 text-white max-w-sm mx-auto mt-4">
        <p className="text-lg font-bold mb-2">Tailwind Card</p>
        <p className="text-sm text-violet-300">
          Pick this element — LSS will warn you it's Tailwind
        </p>
        <button className="mt-4 text-sm py-2 rounded-lg">
          Tailwind button
        </button>
      </div>

      <div className="container-demo">
        <div className="container-inner">@container demo — pick me to edit container-query styles</div>
      </div>

      <div style={{ textAlign: "center", margin: "32px auto", maxWidth: 320 }}>
        <p style={{ color: "#888", fontSize: 13, marginBottom: 12 }}>↓ No CSS source — pick to test rule creation</p>
        <div data-testid="no-source-block">
          <span>Plain unstyled block</span>
        </div>
      </div>

      <div className="ticks"></div>

      <section id="next-steps">
        <div id="docs">
          <svg className="icon" role="presentation" aria-hidden="true">
            <use href="/icons.svg#documentation-icon"></use>
          </svg>
          <h2>Documentation</h2>
          <p>Your questions, answered</p>
          <ul>
            <li>
              <a href="https://vite.dev/" target="_blank">
                <img className="logo" src={viteLogo} alt="" />
                Explore Vite
              </a>
            </li>
            <li>
              <a href="https://react.dev/" target="_blank">
                <img className="button-icon" src={reactLogo} alt="" />
                Learn more
              </a>
            </li>
          </ul>
        </div>
        <div id="social">
          <svg className="icon" role="presentation" aria-hidden="true">
            <use href="/icons.svg#social-icon"></use>
          </svg>
          <h2>Connect with us</h2>
          <p>Join the Vite community</p>
          <ul>
            <li>
              <a href="https://github.com/vitejs/vite" target="_blank">
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#github-icon"></use>
                </svg>
                GitHub
              </a>
            </li>
            <li>
              <a href="https://chat.vite.dev/" target="_blank">
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#discord-icon"></use>
                </svg>
                Discord
              </a>
            </li>
            <li>
              <a href="https://x.com/vite_js" target="_blank">
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#x-icon"></use>
                </svg>
                X.com
              </a>
            </li>
            <li>
              <a href="https://bsky.app/profile/vite.dev" target="_blank">
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#bluesky-icon"></use>
                </svg>
                Bluesky
              </a>
            </li>
          </ul>
        </div>
      </section>

      <div className="ticks"></div>
      <section id="spacer"></section>
    </>
  )
}

export default App
