# Oberreviewer Risk Gate V1

Status: active bounded gate
Authority: David
Lane: mission autonomy mode

## Purpose

Keep the Oberreviewer exceptional.
If it becomes constant supervision, the mission cell was cut badly.

## Trigger Conditions

The Oberreviewer gate fires only when one of these is true:

- a true Type-1 boundary is reached
- the mission cell keeps tripping risk because the cut is too wide or unclear
- promotion would affect default behavior without enough replay, eval, or guard evidence

## Required Evidence

Every Oberreviewer escalation must carry:

- exact git truth
- exact test, replay, or runtime truth
- the smallest statement of the boundary being crossed

## Non-Goals

The Oberreviewer is not for:

- ordinary implementation choices
- routine branch work
- fear-based approval theater on reversible changes

## Failure Signal

If the gate fires repeatedly on ordinary work, the correct diagnosis is not "add more oversight".
The correct diagnosis is: shrink the mission cell, sharpen the contract, or move more of the decision back into explicit Type-2 rules.