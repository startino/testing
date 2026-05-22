<!-- station-agent-docs-start -->

<!-- station-section:rs77q871pfvfmbmd1fhm6yxxvn86gv5f@f165dc97c88da0c4 -->
<!-- section-name: Rebase Only (scope: platform) -->
## Rebase only — never merge commits

Linear history. Repo settings reject `--squash` and `--merge`; only `Rebase and merge` works. Use `gh pr merge <N> --rebase` or the Rebase-and-merge UI. Local `git pull` rebases by default (config below); never escape to `--no-rebase` or `git merge`.                                                                                                                                                                 
```sh
[pull]
    rebase = true
[branch]                                                                                                                                                                                                                                                                                                                                                                                                                       autosetuprebase = always
[rebase]
    autoStash = true
```
<!-- /station-section:rs77q871pfvfmbmd1fhm6yxxvn86gv5f -->

<!-- station-section:rs77jeqs969qkcst6hca3w6bed86g5cd@642efec715796832 -->
<!-- section-name: Env vars for secrets only — never toggles or config (scope: platform) -->
Env vars are reserved for (a) real secrets that must never enter the DB (API keys, signing secrets, OAuth client secrets) and (b) irreducible boot-time context needed before any data layer is available (`PUBLIC_CONVEX_URL`, `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET`, credential dir paths). Nothing else.

Feature flags, kill switches, behavioral toggles, prompt templates, default columns, model selections, debounce/retry tunables — anything a non-engineer might want to change — live in the web UI backed by Convex tables (`projects` per-project, `orgs` per-org, singleton `appSettings` for global). Migrating an existing env-var toggle: add the field to the right Convex table with the previous default, gate a mu
tation by permission, surface in settings, delete the env-var read site. Tests are the only exception (test fixture switching modes via env var on fresh-process invocation).
<!-- /station-section:rs77jeqs969qkcst6hca3w6bed86g5cd -->

<!-- station-section:rs70nw1619zft89chmpdt0nehx86n5a0@bf2ce9d0feff010e -->
<!-- section-name: Autonomy (scope: platform) -->
Now, I am going to go over who you are speaking to, because who you are speaking to isn't just anyone. So, I don't want you to be pair programming with the user.

The user is effectively an equity holder in whatever you're building. They are a stakeholder and should be talked to as such. And at best, they function as a technical architect. They should not be reviewing line-by-line decisions. They should not be reviewing code decisions. They should, if anything, be reviewing the technical architecture.

But even then, the best-case scenario is that they're not involved at all. If you can solve a problem through reading code, read code. If you can solve a problem in any way by yourself, solve it yourself. If you have solutions that you can implement, implement the solutions. The user should plainly be presenting you with problems, you are the solution-izer.

The less you need input from the user, the better. Please act as autonomously as possible. Use your sub-agents, use all the systems set in place for you, all your tools, everything you can to not have to ask the user questions. If you think there's a real risk for repercussions if the user is not consulted, of course, consult the user. But apart from that, do not consult the user. 

Please try to maximize your own autonomy. You are very smart. You're using the most expensive of AI models. A lot of the time, your decisions might even be better than the user's because you have context of the code. The user does, however, have a better ability of high-level architecture. So the user could be consulted only for higher-level things, not for low-level, implementation-level things.
<!-- /station-section:rs70nw1619zft89chmpdt0nehx86n5a0 -->

<!-- station-section:rs73teynm12hnwthn67bz1tjwh86m48v@5521aa50b3b8bca6 -->
<!-- section-name: Idempotency (scope: platform) -->
Everything that can be idempotent should absolutely be idempotent. Try to rely as little on status flags, up-next signals, and things that need to be handed off and picked up as possible, and instead rely on idempotent crons and polling systems over state. 

I want as much as possible to be stateless and idempotent, that can run against whatever system is being worked on and correctly do it every single time. This will also cause the system to be much more testable because if it relies on stateful variables, it just exponentially multiplies the amount of tests that would need to be created and, more realistically, it multiplies the amount of edge cases which exist. 

So, less state, more stateless and idempotent functionality.
<!-- /station-section:rs73teynm12hnwthn67bz1tjwh86m48v -->

<!-- station-section:rs7fpp705geggzevbjymwjwff9870ty7@566f8c5c3e16b95e -->
<!-- section-name: Delegate to `startino-{model}-{effort}` subagents (scope: platform) -->
Any chain of tool calls (OTP sign-in, multi-step UI flow, poll deployment, scrape log) → delegate to a `startino-{model}-{effort}` subagent. Plans must name the delegation strategy.

Matrix: `{haiku,sonnet,opus}` × `{low,medium,high}` (+ `opus-xhigh`, `opus-max`). Pick BOTH axes deliberately — table in `skills/station/primitives/session.md`. Default `sonnet-low`/`sonnet-medium`; `sonnet-high`. `opus-*` for real judgment and skill, with coding should always be xhigh; `haiku-{low,medium}` for straightforward tasks. Never `general-purpose`.

Brief subagents like colleagues who walked in: URL, credentials path, what to watch for, exact answer form ("report under 200 words"). Exception: user actively watching the walk → drive in main.
<!-- /station-section:rs7fpp705geggzevbjymwjwff9870ty7 -->

<!-- station-section:rs75txqh3q7zbfrth2k8w04bm9870etp@8d4be277afdad118 -->
<!-- section-name: Work should never be paused indefinitely (scope: platform) -->
The retry system is intentionally designed around a core principle of the platform:

**Work should never be paused indefinitely.**

The system assumes continuous development and continuous improvement of the platform itself. Because of that, retries are designed to delay and back off intelligently — not permanently stop execution.

A failure state is not considered equivalent to “requires human intervention.” Errors are expected to be recoverable over time through fixes to the underlying system. The intended workflow is:

1. An item errors.
2. The platform surfaces the failure.
3. We identify and fix the root cause in the system itself.
4. The item succeeds automatically on a future retry.

The retry mechanism exists specifically to support this autonomous recovery model.

The only valid reason for something to leave the autonomous execution flow is when it genuinely requires external human input or decision-making. In those cases, it should move into the “needs input” state.

Even then, the long-term KPI of the platform is to minimize reliance on that state as much as possible. “Needs input” is a necessary transitional mechanism, not a normal operational destination.

Because of this philosophy, systems should be designed to recover, retry, and self-heal wherever possible — not fail permanently. A crash-without-recovery approach works against the core architectural direction of the platform.
<!-- /station-section:rs75txqh3q7zbfrth2k8w04bm9870etp -->

<!-- station-section:rs7b2mkgrv3hddqwc5ncq0kym9871n4c@4457a6f55a629d65 -->
<!-- section-name: Playwright screenshots: omit filename, use the returned path (scope: platform) -->
When calling `mcp__playwright__browser_take_screenshot`, **do not pass a `filename` argument**. The MCP routes auto-named files (e.g. `page-2026-05-19T13-24-07-651Z.png`) through its `--output-dir` and returns the absolute path it wrote to. User-supplied filenames take a different code path that resolves against the client workspace root — relative names scatter to the repo root, and absolute names only work if every caller remembers to make them absolute.

**Rule:** call the tool with no `filename`. Use the returned absolute path to embed, copy, or inspect the file. The MCP physically cannot scatter in this mode.

The only reason to pass `filename` is when you need a stable, predictable path *before* the call. That is rare. If you genuinely need it, pass an absolute path under `/shared/station/.data/prose-runs/${STATION_RUN_ID}/workspace/<service>/screenshots/<name>.png` (or `/shared/station/.data/tmp/playwright-mcp/<name>.png` for ad-hoc captures). Never a bare relative name. Never the repo root.

Applies to `mcp__playwright__browser_take_screenshot` and `mcp__playwright__browser_snapshot` (its `filename` field behaves the same way). `mcp__playwright__browser_evaluate`'s `filename` follows the same rule.

**Why:** prior runs hit the relative-name pitfall and scattered ~30 PNGs across the repo root before anyone noticed; `git status` is still littered with deletes from the cleanup. Auto-named + returned-path is mechanically safe — agents can't get it wrong because the choice has been removed.
<!-- /station-section:rs7b2mkgrv3hddqwc5ncq0kym9871n4c -->

<!-- station-section:rs740daj8ww5at51nj4engjg6h871q4p@5469f82c2079c43c -->
<!-- section-name: Never stash changes (scope: platform) -->
There may be other agents working on the same project as you and at the same time as you. If you stash changes, you cause complete chaos. Do not ever stash changes, only work on your own changes. If you see unrelated changes or changes you don't recognize, do not stash them. Just leave them be. If they're preventing your tests or anything, it's better to use some skip test things to avoid messing with the other agent. If there is something in progress, it means another thing is working on it. Please don't disrupt other people's work.
<!-- /station-section:rs740daj8ww5at51nj4engjg6h871q4p -->

<!-- station-section:rs7d90taszavxdey2g0dxvymnx875m4a@bdc1fb2f5e8e70e8 -->
<!-- section-name: AskUserQuestion: question text must be non-control ASCII (scope: platform) -->
                                                                                               `AskUserQuestion` validates the `answers` object's property names as non-control ASCII, and the implementation uses each `question` string verbatim as that key.
 Any non-ASCII character in `question` — em-dash `—` (U+2014), en-dash `–` (U+2013), ellipsis `…` (U+2026), curly quotes `" " ' '`, non-breaking space, etc. — f
ails server-side with `Field name <text> has invalid character '<char>': Field names can only contain non-control ASCII characters` and the whole tool call is r
ejected.                                                                                                                                                                                                                                                                                                                        **Rule:** in every `AskUserQuestion.question`, use ASCII substitutes: `--` not `—`, `-` not `–`, `...` not `…`, straight `"` and `'`, regular space. Same for `h
eader`, `options[].label`, `options[].description` to be safe. Pasted text from logs, PR descriptions, or LLM-prose output frequently contains em-dashes — norma
lize before passing.                                                                                                                                            
**Why:** the constraint is in Anthropic's tool schema, not ours, so we can't relax it. Failure cost is the whole question being rejected mid-run, which on a lon
g autonomous loop terminates the agent's only path to surface ambiguity. Subagents running browser flows or scope decisions need this to surface friction reliably. 
<!-- /station-section:rs7d90taszavxdey2g0dxvymnx875m4a -->

<!-- station-agent-docs-end -->
