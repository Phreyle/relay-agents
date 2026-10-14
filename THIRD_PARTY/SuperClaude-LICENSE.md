# SuperClaude (third-party)

The files in `.claude/commands/sc/` (30 commands) and `.claude/agents/` (20 agents) are from
[SuperClaude Framework](https://github.com/SuperClaude-Org/SuperClaude_Framework), version **4.3.0**,
installed unmodified except for one omission: the `README.md` that ships inside the commands folder
was left out, because Claude Code would register it as a command (`/sc:README`).

They are not covered by this repo's license. SuperClaude's own license applies to them:

```
MIT License

Copyright (c) 2024 SuperClaude Framework Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Why a script instead of `superclaude install`

SuperClaude has no Claude Code plugin yet (planned for its v5.0). Its official `superclaude install`
writes the agents into the global `~/.claude/agents`, which would affect every repo. Its Python
installer functions take a target folder, so this repo calls them directly. To reinstall or upgrade
(change the version pin), run from the repo root, then delete `.claude/commands/sc/README.md`:

```bash
uv run --no-project --with superclaude==4.3.0 python -I install_sc.py .
```

where `install_sc.py` is:

```python
import sys
from pathlib import Path
from superclaude.cli.install_commands import install_agents, install_commands

repo = Path(sys.argv[1]).resolve()
install_commands(target_path=repo / ".claude" / "commands" / "sc", force=True)
install_agents(target_path=repo / ".claude" / "agents", force=True)
```
