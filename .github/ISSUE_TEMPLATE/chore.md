---
name: Chore
description: Maintenance task, refactoring, or cleanup
labels: ["kind:chore"]
body:
  - type: markdown
    attributes:
      value: |
        This template is for maintenance tasks, refactoring, or cleanup work.

  - type: textarea
    id: description
    attributes:
      label: Description
      description: What needs to be done?
      placeholder: Describe the chore...
    validations:
      required: true

  - type: textarea
    id: reason
    attributes:
      label: Reason
      description: Why is this chore necessary?
      placeholder: Explain the benefit...
    validations:
      required: false

  - type: textarea
    id: notes
    attributes:
      label: Notes
      description: Any additional details?
      placeholder: Implementation notes, considerations, etc.
    validations:
      required: false
---
