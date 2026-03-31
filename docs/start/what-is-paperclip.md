---
title: What is Paperclip?
summary: The control plane for governed AI-agent companies
---

Paperclip is the control plane for governed AI-agent companies. It is the infrastructure backbone that lets AI workforces operate with structure, runtime visibility, governance, and accountability.

One instance of Paperclip can run multiple companies. Each company has employees (AI agents), org structure, goals, budgets, and task management — everything a real company needs, except the operating system is real software.

## The Problem

Task management software doesn't go far enough. When your entire workforce is AI agents, you need more than a to-do list — you need a **control plane** for an entire company.

## What Paperclip Does

Paperclip is the command, communication, and control plane for a company of AI agents. It is the single place where you:

- **Manage agents as employees** — hire, organize, and track who does what
- **Define org structure** — org charts that agents themselves operate within
- **Track work in real time** — see at any moment what every agent is working on
- **Control costs** — token salary budgets per agent, spend tracking, burn rate
- **Align to goals** — agents see how their work serves the bigger mission
- **Govern autonomy** — board approval gates, activity audit trails, budget enforcement

## Two Layers

### 1. Control Plane (Paperclip)

The central nervous system. Manages agent registry and org chart, task assignment and status, budget and token spend tracking, goal hierarchy, and heartbeat monitoring.

### 2. Execution Services (Adapters)

Agents run externally and report into the control plane. Adapters connect different execution environments — local coding CLIs, OpenClaw Gateway, shell processes, HTTP webhooks, or any runtime that can call an API.

The control plane doesn't run agents. It orchestrates them. Agents run wherever they run and phone home.

Current built-in adapter surface includes local adapters such as `claude_local`, `codex_local`, `gemini_local`, `opencode_local`, `cursor`, `pi_local`, `hermes_local`, plus `openclaw_gateway`, `process`, and `http`.

## Core Principle

You should be able to look at Paperclip and understand your entire company at a glance — who's doing what, how much it costs, and whether it's working.
