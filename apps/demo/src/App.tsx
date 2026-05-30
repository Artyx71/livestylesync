import './App.css'
import './test.scss'
import styles from './Button.module.css'

const FEATURES = [
	{ icon: '↖', title: 'Element picker', desc: 'Click any element on the page to inspect all CSS rules — across selectors, media queries and pseudo-states.' },
	{ icon: ':hover', title: 'Force pseudo-states', desc: 'Toggle :hover, :focus or :active to inspect and edit styles that only appear on interaction.' },
	{ icon: '📐', title: 'Viewport switcher', desc: 'Simulate 375, 768, 1024 px breakpoints — or type any custom width — without resizing the browser.' },
	{ icon: '--x', title: 'CSS custom properties', desc: 'Browse all :root variables grouped by type. Color swatches, search filter, native color picker.' },
	{ icon: '$', title: 'SCSS variables', desc: 'Find and patch $variable declarations across your .scss files. Changes write back to source.' },
	{ icon: '↩', title: 'Session history', desc: 'Every apply is logged as a batch. Undo the last batch or restore any previous state at any time.' },
]

function App() {
	return (
		<div className="page">
			<nav className="nav">
				<div className="nav-inner">
					<span className="nav-logo"><span className="nav-dot" />LiveStyleSync</span>
					<div className="nav-links">
						<a href="#features">Features</a>
						<a href="#setup">Setup</a>
						<a href="https://github.com/Artyx71/livestylesync" target="_blank" rel="noopener">GitHub</a>
						<a href="https://www.npmjs.com/package/livestylesync" target="_blank" rel="noopener">npm</a>
					</div>
					<div className="nav-actions">
						<button type="button" className="counter btn-primary">Get started</button>
					</div>
				</div>
			</nav>

			<section className="hero">
				<div className="hero-badge">v1.0.0 · Stable release</div>
				<h1 className="hero-heading">Edit styles.<br />Ship faster.</h1>
				<p className="hero-sub">
					Click any element — tweak in the panel — changes land directly in your
					source files. No copy-pasting between DevTools and your editor.
				</p>
				<div className="hero-cta">
					<button type="button" className="btn-primary btn-lg">Try the overlay →</button>
					<a href="https://github.com/Artyx71/livestylesync" className="btn-outline btn-lg" target="_blank" rel="noopener">View on GitHub</a>
				</div>
				<div className="hero-hint">Press <kbd>Alt+S</kbd> to open the overlay on this page</div>
			</section>

			<section className="install" id="setup">
				<div className="install-inner">
					<div className="section-label">Quick start</div>
					<h2 className="section-heading">Two lines to get going</h2>
					<div className="code-block">
						<div className="code-line"><span className="code-comment"># install</span></div>
						<div className="code-line"><span className="code-cmd">npm i</span> <span className="code-pkg">livestylesync</span></div>
					</div>
					<div className="code-block" style={{ marginTop: 12 }}>
						<div className="code-line"><span className="code-comment">// vite.config.ts</span></div>
						<div className="code-line"><span className="code-kw">import</span> {'{ liveStyleSync }'} <span className="code-kw">from</span> <span className="code-str">'livestylesync/vite-plugin'</span></div>
						<div className="code-line" style={{ marginTop: 8 }}><span className="code-kw">export default</span> defineConfig({'{'}</div>
						<div className="code-line" style={{ paddingLeft: 20 }}>plugins: [<span className="code-fn">liveStyleSync</span>()],</div>
						<div className="code-line">{'}'}</div>
					</div>
					<div className="code-block" style={{ marginTop: 12 }}>
						<div className="code-line"><span className="code-comment">// main.tsx</span></div>
						<div className="code-line"><span className="code-kw">import</span> {'{ mount }'} <span className="code-kw">from</span> <span className="code-str">'livestylesync/overlay'</span></div>
						<div className="code-line"><span className="code-fn">mount</span>()</div>
					</div>
				</div>
			</section>

			<section className="features" id="features">
				<div className="section-label">Features</div>
				<h2 className="section-heading">Everything in the overlay</h2>
				<div className="features-grid">
					{FEATURES.map((f) => (
						<div key={f.title} className="feature-card">
							<span className="feature-icon">{f.icon}</span>
							<h3 className="feature-title">{f.title}</h3>
							<p className="feature-desc">{f.desc}</p>
						</div>
					))}
				</div>
			</section>

			<section className="formats">
				<div className="formats-inner">
					<div className="section-label">Supported formats</div>
					<div className="formats-grid">
						{[
							['Plain CSS', '✓'],
							['SCSS', '✓'],
							['CSS Modules', '✓'],
							['Vue scoped styles', '✓'],
							['Tailwind', '⚠ detected, warns'],
						].map(([name, status]) => (
							<div key={name} className="format-row">
								<span className="format-name">{name}</span>
								<span className="format-status">{status}</span>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* LSS test targets */}
			<section className="lss-targets">
				<p className="lss-label">↓ SCSS card — open "SCSS $variables" in the overlay</p>
				<div className="demo-card">
					<p className="title">SCSS Variables</p>
					<p className="subtitle">Edit $card-accent, $card-bg, $card-text via the overlay</p>
				</div>

				<p className="lss-label" style={{ marginTop: 24 }}>↓ CSS Modules</p>
				<div className={styles.container}>
					<button type="button" className={styles.button}>CSS Module button</button>
				</div>

				<p className="lss-label" style={{ marginTop: 24 }}>↓ No CSS source — test "Create new rule"</p>
				<div data-testid="no-source-block">
					<span>Unstyled element</span>
				</div>
			</section>

			<footer className="footer">
				<div className="footer-inner">
					<span className="nav-logo" style={{ fontSize: 14 }}><span className="nav-dot" />LiveStyleSync</span>
					<div className="footer-links">
						<a href="https://github.com/Artyx71/livestylesync" target="_blank" rel="noopener">GitHub</a>
						<a href="https://www.npmjs.com/package/livestylesync" target="_blank" rel="noopener">npm</a>
					</div>
					<span className="footer-copy">MIT · by Andrey Gabaraev</span>
				</div>
			</footer>
		</div>
	)
}

export default App
