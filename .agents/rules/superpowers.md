# Superpowers Bootstrap

<EXTREMELY-IMPORTANT>
You have superpowers.

If you think there is even a 1% chance a skill might apply to what you are doing, you ABSOLUTELY MUST invoke the skill.

IF A SKILL APPLIES TO YOUR TASK, YOU DO NOT HAVE A CHOICE. YOU MUST USE IT.

This is not negotiable. You cannot rationalize your way out of this.
</EXTREMELY-IMPORTANT>

## The Rule

**Invoke relevant or requested skills BEFORE any response or action** - including clarifying questions, exploring the codebase, or checking files. If it turns out wrong for the situation, you don't have to use it.

**Before entering plan mode or writing code:** if you haven't already brainstormed, invoke the `brainstorming` skill first.

Then announce "Using [skill] to [purpose]" and follow the skill exactly. If it has a checklist, create a todo per item.

## Skill Priority

When multiple skills apply, process skills come first - they set the approach, then implementation skills carry it out. Brainstorming and systematic-debugging are Superpowers' most common process skills, but the rule holds for any of them:

- "Let's build X" -> `brainstorming` first, then implementation skills.
- "Fix this bug" -> `systematic-debugging` first, then domain skills.
- "Implement this plan" -> `executing-plans` or `subagent-driven-development`.
- "Write tests / add unit tests" -> `test-driven-development`.
- "Verify changes / finish up" -> `verification-before-completion`.

## Red Flags

These thoughts mean STOP - you're rationalizing:

| Thought | Reality |
|---------|---------|
| "This is just a simple question" | Questions are tasks. Check for skills. |
| "I need more context first" | Skill check comes BEFORE clarifying questions. |
| "Let me explore the codebase first" | Skills tell you HOW to explore. Check first. |
| "I can check git/files quickly" | Files lack conversation context. Check for skills. |
| "Let me gather information first" | Skills tell you HOW to gather information. |
| "This doesn't need a formal skill" | If a skill exists, use it. |
| "I remember this skill" | Skills evolve. Read current version. |
| "This doesn't count as a task" | Action = task. Check for skills. |
| "The skill is overkill" | Simple things become complex. Use it. |
| "I'll just do this one thing first" | Check BEFORE doing anything. |
| "This feels productive" | Undisciplined action wastes time. Skills prevent this. |
| "I know what that means" | Knowing the concept ≠ using the skill. Invoke it. |

## Antigravity Tool Mapping

Skills speak in actions ("dispatch a subagent", "create a todo", "read a file"). In Antigravity these resolve to:

| Action skills request | Antigravity equivalent |
|----------------------|------------------------|
| Dispatch a subagent (`Subagent (general-purpose):` template) | `invoke_subagent` with a built-in `TypeName` - `self` for full-capability work, `research` for read-only |
| Task tracking ("create a todo", "mark complete") | a **task artifact** - `write_to_file` with `IsArtifact: true` and `ArtifactMetadata.ArtifactType: "task"`. **Not** `manage_task`, which manages background processes. |

### Task Tracking

Antigravity has **no todo tool** (`manage_task` manages background processes - `list`/`kill`/`status`/`send_input` - it is *not* a checklist). When a skill says to create a todo list or track tasks, maintain a **task artifact**: a markdown checklist saved with `write_to_file` (`IsArtifact: true`, `ArtifactMetadata.ArtifactType: "task"`), edited with `replace_file_content` as you go.

At the start of any multi-step task, create the task artifact listing every step of your plan. As you complete each step, edit the artifact to mark it done (`- [x]`).
If the plan changes, update the checklist. Keep it current - it is your source of truth for what remains; once the conversation gets long, re-read it before starting each step.
