import Link from "next/link";

export function Monogram() {
  return (
    <Link href="/" className="mono" aria-label="SD Beauty Glam, accueil">
      <img className="mono-logo" src="/gallery/logo-sd.png" alt="" width={44} height={44} />
      <span className="mono-word">SD Beauty<br />Glam</span>
    </Link>
  );
}

export function Header({ cta = true }: { cta?: boolean }) {
  return (
    <header className="header">
      <div className="wrap">
        <Monogram />
        <nav className="nav">
          <a className="link" href="/#modeles">Modèles</a>
          <a className="link" href="/#offres">Offres</a>
          <a className="link" href="/#tarifs">Tarifs</a>
          <Link className="link" href="/cadeau">Cadeaux</Link>
          <Link className="link" href="/fidelite">Ma carte</Link>
          {cta && <Link className="btn sm" href="/reserver">Réserver</Link>}
        </nav>
      </div>
    </header>
  );
}
