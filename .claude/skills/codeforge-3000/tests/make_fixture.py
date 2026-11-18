#!/usr/bin/env python3
"""Create a small Next.js-style app with deliberately planted defects (used by run_tests.sh and the demo).
The fake secret is assembled at runtime so no secret-like literal is stored in the repository."""
import json, pathlib, sys

root = pathlib.Path(sys.argv[1]); (root / "app/api/users").mkdir(parents=True, exist_ok=True); (root / "app/login").mkdir(parents=True, exist_ok=True)
(root / "app/dashboard").mkdir(parents=True, exist_ok=True); (root / "tests").mkdir(exist_ok=True)
(root / "package.json").write_text(json.dumps({"name": "fixture", "scripts": {"dev": "next dev", "test": "vitest"},
    "dependencies": {"next": "14", "react": "18"}, "devDependencies": {"vitest": "1"}}, indent=2))
(root / "app/page.tsx").write_text('''export default function Home() {
  async function save() { await fetch("/api/users", { method: "POST" }); }
  return (
    <main>
      <button onClick={save}>Save user</button>
      <button className="cta">Buy now</button>
      <button onClick={() => {}}>Delete</button>
      <button onClick={() => console.log("clicked")}>Share</button>
      <a href="#">Pricing</a>
      <form className="newsletter"><input name="email" /><button type="button">Join</button></form>
      <form onSubmit={save}><input name="n" /><button>Send</button></form>
    </main>
  );
}
''')
(root / "app/login/page.tsx").write_text('''import Link from "next/link";
export default function Login() {
  async function go() { const r = await fetch("/api/session"); return r.json(); }
  return <div><Link href="/dashboard">Dashboard</Link><Link href="/settings">Settings</Link><button onClick={go}>Login</button></div>;
}
''')
(root / "app/dashboard/page.tsx").write_text("export default function D(){ return <div>ok</div>; } // TODO: load metrics\n")
(root / "app/api/users/route.ts").write_text("export async function POST() { return Response.json({ ok: true }); }\n")
(root / "tests/users.test.ts").write_text("// TST-001 save user\n")
fake = "sk-" + "live" + "A1b2C3d4E5f6G7h8I9j0K1l2"
(root / ".env").write_text(f"OPENAI_API_KEY={fake}\n")
print(root)
