'use client';
import Link from "next/link";

export default function Home() {
  return (
    <div className='container'>
      <div>
        <h1>Renderform</h1>
        <Link href='/tile-editor'><button>Map Editor</button></Link>
      </div>
    </div>
  );
}
