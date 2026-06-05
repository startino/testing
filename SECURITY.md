# Security Policy

## What this repo is

`startino/testing` is a **disposable sandbox** used by the Station autonomous
engineering platform to exercise itself: opening PRs, writing commits, and
running end-to-end workflows. There is no deployed service, no production
traffic, no real user data, and no secrets of value stored here. The contents
may be reset or wiped at any time.

Most conventional SECURITY.md fields -- bug-bounty programs, PGP keys, SLAs,
version-support tables -- do not apply. Rather than invent them, this file
omits them.

## Scope

**Out of scope (effectively everything):**

- Vulnerabilities in file contents or markdown -- there is nothing deployed
  from this repo, so findings here have no production impact.
- Secrets or credentials -- none live here; env vars referenced in docs are
  sandbox feature-flag overrides, not real credentials.
- Denial of service, data exfiltration, privilege escalation -- there is no
  service to attack and no user data to exfiltrate.

**Potentially in scope:**

- A security issue in the *Station platform itself* that is demonstrated via
  this sandbox repo. In that case, please report it against the Station
  project, not here.

## Reporting

There is no dedicated security inbox for this repo. If you believe you have
found something worth reporting:

1. Open a GitHub issue in this repo describing what you found.
2. Or contact the Startino team directly through
   [starti.no](https://starti.no).

We will triage promptly, but given this is a throwaway test target the likely
outcome is acknowledgement with no further action unless it points to a real
issue in the Station platform.

## Reminder

Nothing in this repo is production. It is a sandbox for automated agent
workflows and carries no expectation of security hardening.
