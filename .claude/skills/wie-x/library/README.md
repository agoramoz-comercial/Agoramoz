# WIE-X Template Library

Managed by `scripts/library.py` (Modules 29–31). `index.json` is the searchable index; each template lives in `templates/<TEMPLATE_ID>/` with older versions kept in `history/`.

- Add: `python3 scripts/library.py add path/to/package` (folder with `TEMPLATE-RECORD.md`; secrets are refused)
- Search before planning: `python3 scripts/library.py search "saas stripe nextjs"`
- Qualify: `python3 scripts/template_score.py …` then `python3 scripts/library.py status TPL-X-001 Q4 --score 92 --critical 0 --approved-by "Name"`

The library is persistent only while this folder is committed or kept (Module 29.7).
